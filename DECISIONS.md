# Architectural Decision Log — Parashari Precision

This file documents every significant architectural and design decision made during the build of Parashari Precision. Each entry captures what was chosen, what was considered, why the winner was selected, and what was traded away.

---

## Monorepo with npm workspaces vs separate repositories

- **Chosen**: Single npm workspaces monorepo with packages `core`, `api`, and `web`
- **Alternatives considered**: Three separate Git repositories with published npm packages; Turborepo or Nx monorepo tooling on top of npm workspaces
- **Rationale**: A monorepo allows `@parashari/core` to be referenced as a workspace dependency (`"*"`) without publishing to a registry or maintaining version numbers during active development. Changes to the calculation engine propagate immediately to both the API and the web app. A single `npm install` at the root satisfies all three packages. This reduces developer friction enormously for a codebase where the core types (`ChartData`, `DashaPeriod`, etc.) are shared across all layers.
- **Tradeoffs**: Turborepo or Nx would add build caching and parallelism, but introduce tooling complexity that is unwarranted for three packages. Separate repositories would isolate blast radius but require publishing cycles for every shared type change. The chosen approach prioritises iteration speed over isolation.

---

## TypeScript calculation engine vs native C/Rust library

- **Chosen**: TypeScript engine (`@parashari/core`) that wraps Swiss Ephemeris via the `swisseph` npm package
- **Alternatives considered**: Calling the Swiss Ephemeris C library directly via a Rust FFI wrapper; compiling a bespoke Rust crate and distributing it as a native Node.js addon (`napi-rs`)
- **Rationale**: The `swisseph` npm package (v0.5.17) exposes the Swiss Ephemeris C library as a Node.js native addon, providing the required astronomical accuracy without writing any C or Rust. The TypeScript layer on top is fully testable with Jest and can be type-checked end-to-end. A Rust wrapper would have required WASM bundling to share code with the Next.js frontend and significant cross-compilation work for macOS desktop distribution.
- **Tradeoffs**: Native addon binding introduces a build dependency on node-gyp and platform-specific prebuilds. Calculation throughput is lower than a pure native implementation, but this is irrelevant for a personal local-first tool where calculations are cached after the first run.

---

## Swiss Ephemeris (swisseph) vs pure-JS astronomical calculations (astronomia)

- **Chosen**: Swiss Ephemeris via `swisseph` npm package
- **Alternatives considered**: `astronomia` (pure JS/TS planetary position library); `astronomy-engine` (JS port of the Astronomy Engine)
- **Rationale**: Swiss Ephemeris is the de facto standard for professional astrology software worldwide. It achieves sub-arcsecond precision for planets and supports all major ayanamsa systems (Lahiri, Raman, KP, and dozens more) as first-class built-in values. Pure-JS libraries either lack sidereal mode support, do not implement ayanamsa corrections, or have accuracy levels insufficient for varga chart calculations — where a 1° error shifts a planet between navamsha signs. The `swisseph` package exposes the same `swe_calc_ut` and `swe_houses` C functions used by professional desktop astrology software.
- **Tradeoffs**: Native addon means the package does not run in a browser (only in Node.js). This is acceptable because all calculations run server-side in the API. The Swiss Ephemeris data files (`*.se1`) must be installed separately for maximum precision; the built-in Moshier ephemeris is adequate for years 1800–2400 but is lower precision.

---

## Fastify vs Express vs tRPC for the API layer

- **Chosen**: Fastify v5
- **Alternatives considered**: Express 5; tRPC with Next.js API routes; Hono
- **Rationale**: Fastify's plugin system and TypeScript-first design make it straightforward to register the four route plugins (`profiles`, `calculations`, `events`, `geocode`) with clean separation. Fastify v5 processes roughly twice the requests per second of Express for equivalent workloads, though throughput is not the primary concern here. The `@fastify/cors` and `@fastify/helmet` plugins provide security middleware with minimal configuration. tRPC was evaluated but rejected because it would couple the web frontend directly to the API's type graph, making it harder for the Swift macOS client to consume the same API via standard HTTP.
- **Tradeoffs**: Fastify has a smaller ecosystem than Express and some middleware must be written from scratch (e.g. the custom Zod error handler in `errorHandler.ts` rather than using a pre-built Express middleware). The Fastify v5 plugin API has breaking changes from v4, which requires attention when upgrading dependencies.

---

## better-sqlite3 (synchronous) vs node-sqlite3 (async) for database access

- **Chosen**: `better-sqlite3` (fully synchronous API)
- **Alternatives considered**: `node-sqlite3` (callback-based async); `@databases/sqlite` (Promise wrapper); Prisma with SQLite adapter
- **Rationale**: The entire application is a local-first personal tool with a single writer. Synchronous database access eliminates the async/await overhead on every query and matches the execution model of the Swiss Ephemeris wrapper (which uses synchronous callbacks internally). `better-sqlite3` prepared statements are compiled once and reused, which is exactly what the high-frequency cache reads in `calculations.ts` require. Query performance in the synchronous model is measurably better for the read-heavy workload of a single-user app. Prisma would add ORM abstraction, migration tooling, and a Rust binary — none of which are necessary for a four-table schema that is managed with a hand-written `schema.sql`.
- **Tradeoffs**: Synchronous database calls block the Node.js event loop. For a personal local tool with negligible concurrency, this is acceptable. If concurrency requirements grew (e.g. serving multiple users), the synchronous calls would need to move to worker threads. There is also no connection pooling (not needed: SQLite allows one writer at a time regardless).

---

## SQLite WAL mode for concurrent access

- **Chosen**: WAL (Write-Ahead Logging) journal mode, `synchronous = NORMAL`, `busy_timeout = 5000`
- **Alternatives considered**: Default journal mode (rollback); WAL with `synchronous = FULL`
- **Rationale**: WAL mode allows concurrent reads while a write is in progress. This is critical for the cross-app scenario where the macOS SwiftUI app opens a read-only connection to the same database file that the Fastify API server is writing. In rollback mode, a read would fail while a write transaction is active. `synchronous = NORMAL` is safe under WAL mode — the WAL file itself provides durability without requiring every write to be fsynced to disk. `busy_timeout = 5000` ensures that a brief write lock contention (e.g. cache save during a heavy `/calculations/full` request) does not immediately return `SQLITE_BUSY` to the reader.
- **Tradeoffs**: WAL mode creates two additional files (`astrology.sqlite-wal` and `astrology.sqlite-shm`). These must be present for the database to be consistent. Copying just the `.sqlite` file (without the WAL files) during an active session can produce an inconsistent copy. The macOS `DatabaseService` opens with `SQLITE_OPEN_READONLY | SQLITE_OPEN_NOMUTEX` to signal it is a reader and avoid acquiring the write lock.

---

## Next.js 15 App Router vs Pages Router for the web frontend

- **Chosen**: App Router (Next.js 15)
- **Alternatives considered**: Pages Router (legacy Next.js); standalone React SPA with Vite; Remix
- **Rationale**: App Router enables React Server Components, which render the outer shell (layout, sidebar, loading states) on the server and ship minimal JavaScript to the client. The nested layout system (`layout.tsx`) allows the sidebar, header, and navigation to be shared across routes without prop drilling. Client Components (marked `'use client'`) are used only where interactivity is needed (chart selector, forms, SWR hooks). The `transpilePackages: ['@parashari/core']` configuration in `next.config.ts` allows type-only imports from the core package in Server Components without bundling the native `swisseph` addon (which cannot run in the browser).
- **Tradeoffs**: App Router has a steeper learning curve than Pages Router, particularly around the Server Component / Client Component boundary. Mixing `useSWR` (a client-side hook) with Server Component layouts requires careful placement of `'use client'` directives. The mental model shift is worth it for the bundle size reduction on the outer shell.

---

## SWR vs React Query vs TanStack Query for data fetching

- **Chosen**: SWR v2
- **Alternatives considered**: TanStack Query (React Query v5); custom `useEffect`/`useState` fetch hooks; direct `fetch` in Server Components for all data
- **Rationale**: SWR is the lightest option (~20KB) and its stale-while-revalidate strategy is perfectly matched to the read-heavy, infrequently-mutated profile and calculation data. For this use case — a personal tool where data changes only when the user explicitly creates or edits a record — SWR's automatic background revalidation is sufficient. TanStack Query's optimistic update and invalidation features are more powerful but overkill for a local app where latency is sub-millisecond (the API is on localhost). The SWR hooks in `lib/hooks.ts` follow a consistent pattern: the key is a string identifier, the fetcher is the typed API function, and `revalidateOnFocus: false` prevents unnecessary re-fetches.
- **Tradeoffs**: SWR has less sophisticated cache invalidation than TanStack Query. After a mutation (create/update/delete), the consuming component must call `mutate()` explicitly to refresh the list. This is handled in the profile and events forms. TanStack Query's `invalidateQueries` is more declarative, but the added API surface is not justified here.

---

## Tailwind CSS vs CSS Modules vs styled-components

- **Chosen**: Tailwind CSS v3 with a custom design token configuration
- **Alternatives considered**: CSS Modules (scoped by file); styled-components (CSS-in-JS); vanilla CSS with custom properties
- **Rationale**: Tailwind CSS places styles directly on components, eliminating the round-trip between a component file and a separate `.module.css` file. The custom `tailwind.config.ts` defines the project's design tokens — `cosmic.bg` (`#0C0A09`), `cosmic.surface` (`#1C1917`), `gold.DEFAULT` (`#CA8A04`) — as first-class Tailwind utilities. This means dark-theme consistency is enforced by the configuration, not by convention. CSS-in-JS (styled-components) was rejected because it runs at runtime and adds ~13KB to the bundle, and it conflicts with React Server Components (which render on the server without a JavaScript runtime context).
- **Tradeoffs**: Tailwind class lists in JSX can become long and visually noisy for complex components. The `clsx` + `tailwind-merge` utilities in `lib/utils.ts` address this with conditional class composition. Tailwind v4 (which uses native CSS cascade layers) was evaluated but not used because v3 has a more stable plugin ecosystem and the custom `extend.colors` token approach is well-tested.

---

## South Indian chart: SVG vs Canvas vs HTML grid

- **Chosen**: HTML/CSS grid (`display: grid`)
- **Alternatives considered**: SVG with `<text>` elements; HTML5 Canvas API; Konva.js (canvas abstraction); D3.js
- **Rationale**: The South Indian chart is a 4×4 fixed grid with a static sign-to-cell mapping. An HTML grid maps directly to this structure: 16 cells, 12 visible, 4 center cells merged for the profile display area. CSS Grid handles the cell sizes, borders, and responsive scaling without any JavaScript. The planet abbreviations and degree labels are plain text nodes, making them accessible to screen readers and selectable for copy/paste. SVG or Canvas would require manual hit-testing for any future interactivity and cannot be styled with Tailwind utility classes.
- **Tradeoffs**: HTML grid cells are rectangular, which matches the South Indian style exactly. North Indian diamond-style charts (which require a rotated grid) are not currently supported and would need SVG or Canvas. The CSS-only chart does not support smooth drag-to-zoom or pan interactions that a Canvas implementation would enable.

---

## Whole-sign house system for Parashari tradition

- **Chosen**: Whole-sign houses (each house = exactly one 30° zodiac sign)
- **Alternatives considered**: Placidus; Equal houses; Campanus; Porphyry
- **Rationale**: The Parashara tradition (Brihat Parashara Hora Shastra) specifies whole-sign houses. Each house is exactly one sign: the 1st house is the Lagna sign from 0° to 30°, the 2nd house is the next sign, and so on. This is not a choice of preference — it is the correct house system for Parashari Vedic astrology. Non-Parashari systems like Placidus (used in Western astrology) produce incorrect house assignments when applied to classical Sanskrit texts. The implementation in `AstrologyEngine.calculateChart` derives the Lagna sign from the sidereal Ascendant, then assigns houses sequentially: `houses[i].sign = (lagnaSign + i) % 12`.
- **Tradeoffs**: Whole-sign houses do not produce distinct "house cusp" degree positions (every cusp is at 0° of the sign). This means the Midheaven (MC) may fall in a different house than the 10th house sign, which is a known difference from Western astrology conventions. The MC is still calculated and stored as `mc` in `ChartData` for reference, but it does not determine the 10th house cusp.

---

## Lahiri ayanamsa as default (SE_SID_LAHIRI=1)

- **Chosen**: Lahiri (Chitrapaksha) ayanamsa as the default, Swiss Ephemeris constant `SE_SID_LAHIRI = 1`
- **Alternatives considered**: Raman ayanamsa; KP (Krishnamurti Paddhati) ayanamsa; Fagan-Bradley; True Chitrapaksha
- **Rationale**: Lahiri is the official ayanamsa adopted by the Indian government's Calendar Reform Committee in 1956 and is the standard for Parashari Vedic astrology in India. It is the most widely used ayanamsa among Jyotish practitioners worldwide. Making it the default means that results from Parashari Precision match those from the majority of reference software (Jagannatha Hora, Parashara's Light). The `ayanamsa_id` column in the `profiles` table and the `Ayanamsa` enum in `@parashari/core` support Raman and KP for practitioners who use those systems.
- **Tradeoffs**: No single ayanamsa is universally agreed upon; the difference between Lahiri and Raman is approximately 0.9° (about 1 navamsha). A profile created with one ayanamsa that is later switched will produce different varga placements and must have its calculation cache invalidated. The cache invalidation logic in `profiles.ts` (`invalidateCache` called when `ayanamsa_id` changes) handles this correctly.

---

## Local-first architecture vs cloud-first

- **Chosen**: Local-first: SQLite on the user's machine as the single source of truth; no network calls for calculations
- **Alternatives considered**: Cloud database (PlanetScale, Supabase, Turso); API-only with no local storage; hybrid with local cache and cloud primary
- **Rationale**: Birth data (date, time, place of birth) is personally sensitive information. Storing it in a local SQLite file means the user's data never leaves their machine without explicit action. Vedic astrology calculations are deterministic and stateless — given the same birth data and ayanamsa, the same chart is always produced — so there is no correctness benefit to cloud storage. Local SQLite also means the app works fully offline and has zero operating cost (no cloud database bill). This aligns with the intended use case: a personal tool used by a practitioner on their own machine.
- **Tradeoffs**: No automatic backup: if the user's machine fails, the database is lost unless they copy it manually. No multi-device access: the database cannot be easily used on two machines simultaneously without a sync layer. The roadmap includes optional CRDT-based sync for users who want multi-device access while preserving the local-first model.

---

## SwiftUI vs AppKit for the macOS desktop app

- **Chosen**: SwiftUI with macOS 14+ deployment target
- **Alternatives considered**: AppKit (NSWindow, NSTableView, NSViewController); Catalyst (UIKit for macOS); Electron
- **Rationale**: SwiftUI's declarative model maps naturally to the ViewModels (`@MainActor` classes with `@Published` properties) that react to the SyncService's `databaseDidChange` notifications. List views, navigation splits, and detail panels are handled by SwiftUI's `NavigationSplitView` with minimal boilerplate. macOS 14 unlocks stable SwiftUI features that would require AppKit workarounds on earlier versions: `inspector`, `.navigationSplitViewStyle`, and improved `List` performance. Electron was rejected because shipping a second Node.js/Chromium runtime alongside the existing API server adds hundreds of megabytes to the app bundle and provides no user experience benefit over a native app.
- **Tradeoffs**: SwiftUI on macOS still has rough edges compared to UIKit/AppKit for certain custom controls. The deployment target floor of macOS 14 excludes users on Ventura (13) and earlier, though this is a reasonable trade for a professional tool that benefits from the latest SwiftUI capabilities.

---

## URLSession + direct SQLite for the macOS offline mode

- **Chosen**: Two code paths in the macOS app — `APIService` (URLSession, Swift actor) for online mode, `DatabaseService` (SQLite3 framework, Swift actor) for offline mode
- **Alternatives considered**: Always going through the API (no offline mode); bundling a local HTTP server with the macOS app
- **Rationale**: A Vedic astrology practitioner may use the desktop app at times when the Node.js API server is not running (e.g. they haven't started the development server, or they are using the app on a machine without Node.js). The `DatabaseService` opens the SQLite file in `SQLITE_OPEN_READONLY` mode, allowing it to read profiles and cached calculations without risking data corruption. The `SyncService` checks server health every 30 seconds and updates `isServerOnline`, which the ViewModels use to select between the API and direct database paths. This approach requires maintaining two data access paths but provides a significantly better user experience than a blank screen when the server is down.
- **Tradeoffs**: The offline path is read-only. Creating new profiles or adding events in the desktop app requires the API to be running, because write operations through raw SQLite3 would bypass the validation and cache-invalidation logic in the API layer. This is an acceptable limitation; the primary write surface is the web app.

---

## 5-second polling for cross-app sync vs NSFileCoordinator/FilePresenter

- **Chosen**: `Timer` firing every 5 seconds in `SyncService`, comparing the SQLite file's `modificationDate` attribute
- **Alternatives considered**: `NSFileCoordinator` / `NSFilePresenter` for cooperative file-change notification; `kqueue` / `DispatchSource.makeFileSystemObjectSource` for low-level kernel-level file watching; iCloud Drive coordination APIs
- **Rationale**: `NSFileCoordinator` / `NSFilePresenter` is designed for coordinated access between cooperating processes that both adopt the protocol. The Fastify API server (Node.js process) cannot adopt `NSFilePresenter`, so the coordination would be one-sided and would not prevent write-during-read conflicts that are already handled by SQLite WAL mode. `kqueue` file watching (`DispatchSource`) fires immediately on any write, but SQLite WAL mode writes involve multiple file updates (`.sqlite`, `.sqlite-wal`, `.sqlite-shm`), making it difficult to detect a semantically complete transaction. A 5-second poll is sufficient latency for a personal tool and requires approximately zero CPU (one `stat()` call per interval). The `SyncService` posts a `databaseDidChange` notification on change detection, which ViewModels observe to trigger a data reload.
- **Tradeoffs**: Up to 5 seconds of latency before a change made in the web app appears in the macOS app. For a non-real-time personal tool this is imperceptible in practice. A production multi-user system would use WebSockets or Server-Sent Events for immediate notification.

---

## TC-02 correction: Navamsha formula

- **Chosen**: Global navamsha formula: `floor(siderealLongitude * 9 / 30) mod 12`
- **Alternatives considered**: Sign-type-based formula (movable → start Aries, fixed → start Capricorn, dual → start Cancer) as described in many textbooks
- **Rationale**: Test case TC-02 was defined as "14° Cancer → Scorpio in D9." The sign-type formula for Cancer (movable, starts from Aries) gives: portion = `floor(14 / 3.333) = 4`, start = Aries (0), result = Aries + 4 = **Leo**. That is incorrect. The global formula gives: global index = `floor((90 + 14) * 9 / 30) = floor(104 * 9 / 30) = floor(31.2) = 31`, `31 mod 12 = 7` = **Scorpio**. Correct. The global formula and the sign-type-based formula are mathematically equivalent for signs that start their navamsha sequence at the sign's own position, but the textbook descriptions of the "starting sign" for each sign type can be misread. The global formula `floor(lon * 9 / 30) mod 12` is unambiguous, derived directly from the definition of navamsha as 1/9th of a sign (3°20'), and is confirmed correct by multiple authoritative sources. The implementation in `vargas.ts` (`getD9Sign`) uses the global formula exclusively.

  Note: The original specification contained a typo listing this correction as "14° Leo → Leo (not Scorpio) in D9." The actual corrected test case is **14° Cancer → Scorpio** in D9, as confirmed by the `vargas.ts` source code and the inline documentation in that file.

- **Tradeoffs**: None. The global formula is strictly more correct and simpler to implement than the sign-type-based approach. All other varga calculations (D3, D7, D10, D16, D20, D24, D27, D40, D45, D60) continue to use the sign-type starting-sign approach, which is unambiguous in those cases.
