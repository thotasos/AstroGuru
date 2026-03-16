# Architecture Reference — Parashari Precision

Full technical reference for the Parashari Precision codebase. Intended for engineers who need to understand, debug, or extend the system.

---

## 1. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       User Interface Layer                       │
│                                                                  │
│  ┌────────────────────────┐    ┌──────────────────────────────┐ │
│  │   SwiftUI Desktop App  │    │    Next.js 15 Web App         │ │
│  │   (macOS 14+)          │    │    (localhost:3000)           │ │
│  │                        │    │                              │ │
│  │  ProfilesViewModel     │    │  app/dashboard/page.tsx      │ │
│  │  ChartViewModel        │    │  app/chart/page.tsx          │ │
│  │  DashaViewModel        │    │  app/profile/page.tsx        │ │
│  │  @MainActor + Combine  │    │  SWR hooks (lib/hooks.ts)    │ │
│  └──────────┬─────────────┘    └──────────────┬───────────────┘ │
│             │                                  │                 │
│             │  URLSession                      │  fetch /api/*   │
│             │  http://localhost:3001           │  (Next.js proxy │
│             │                                  │   rewrite)      │
└─────────────┼──────────────────────────────────┼─────────────────┘
              │                                  │
              │         ┌────────────────────────▼─────────────────┐
              │         │       Fastify v5 API Server               │
              │         │       (@parashari/api — localhost:3001)   │
              │         │                                           │
              │         │  /api/profiles         profileRoutes      │
              │         │  /api/calculations     calculationRoutes  │
              │         │  /api/events           eventRoutes        │
              │         │  /api/geocode          geocodeRoutes      │
              │         │                                           │
              │         │  ┌─────────────────────────────────────┐ │
              │         │  │     @parashari/core                  │ │
              │         │  │     AstrologyEngine                  │ │
              │         │  │                                      │ │
              │         │  │  ┌──────────┐  ┌─────────────────┐  │ │
              │         │  │  │  Swiss   │  │  Calculations   │  │ │
              │         │  │  │  Eph.    │  │  ─ vargas.ts    │  │ │
              │         │  │  │  (C lib) │  │  ─ dashas.ts    │  │ │
              │         │  │  │  swisseph│  │  ─ shadbala.ts  │  │ │
              │         │  │  │  npm pkg │  │  ─ ashtakavar.. │  │ │
              │         │  │  └──────────┘  │  ─ yogas.ts     │  │ │
              │         │  │                └─────────────────┘  │ │
              │         │  └─────────────────────────────────────┘ │
              │         │                                           │
              │         │  better-sqlite3 (synchronous writes)      │
              │         └──────────────────────┬────────────────────┘
              │                                 │
              │  SQLite3 READONLY               │  better-sqlite3 READ/WRITE
              │  (direct file access)           │
              │                                 │
              └─────────────────────────────────▼
                      ┌────────────────────────────┐
                      │   SQLite Database (WAL)     │
                      │                             │
                      │  ~/Library/Application      │
                      │  Support/ParashariApp/      │
                      │  astrology.sqlite           │
                      │                             │
                      │  tables:                    │
                      │  ─ ayanamsas                │
                      │  ─ profiles                 │
                      │  ─ calculations_cache        │
                      │  ─ events_journal            │
                      │  ─ settings                  │
                      └────────────────────────────┘
```

**Cross-app sync flow (SyncService):**

```
macOS app SyncService
    │
    ├─ Timer (5s) ──► stat(astrology.sqlite) ──► modificationDate changed?
    │                                                      │
    │                                                      ▼ YES
    │                                      NotificationCenter.post(databaseDidChange)
    │                                                      │
    │                                                      ▼
    │                             ViewModels observe notification
    │                             └── reload from APIService or DatabaseService
    │
    └─ Timer (30s) ──► GET /api/health ──► update isServerOnline
```

---

## 2. Package Structure

```
parashari-precision/
│
├── package.json                    Root workspace manifest; defines npm scripts dev/build/test
├── tsconfig.base.json              Shared TypeScript compiler options (strict, ES2022, NodeNext modules)
├── package-lock.json               Lockfile for reproducible installs
│
├── packages/
│   │
│   ├── core/                       @parashari/core — calculation engine, zero runtime deps except swisseph
│   │   ├── package.json            type:module, exports ./ → dist/index.js
│   │   ├── tsconfig.json           Extends tsconfig.base; outDir=dist; rootDir=src
│   │   └── src/
│   │       ├── index.ts            AstrologyEngine class + barrel exports for all types and functions
│   │       │
│   │       ├── types/
│   │       │   └── index.ts        All enums (Planet, Sign, House, Varga, Nakshatra, Ayanamsa)
│   │       │                       and interfaces (PlanetPosition, HousePosition, ChartData,
│   │       │                       VargaChart, DashaPeriod, DashaLevel, YogaResult,
│   │       │                       ShadbalaResult, AshtakavargaResult, BirthData,
│   │       │                       GridCell, NakshatraInfo)
│   │       │
│   │       ├── ephemeris/
│   │       │   └── swissEph.ts     Wraps swisseph npm package.
│   │       │                       Exports: initEphemeris, getJulianDay, getPlanetPosition,
│   │       │                       getAscendant, getSiderealLongitude, getAyanamsa,
│   │       │                       normalizeDegrees, signFromLongitude, FLAGS_TROPICAL,
│   │       │                       FLAGS_SIDEREAL, SE_PLANET_IDS.
│   │       │                       Maintains singleton ayanamsa state.
│   │       │                       Ketu derived as Rahu + 180°.
│   │       │
│   │       ├── calculations/
│   │       │   ├── vargas.ts       getVargaSign(lon, varga) dispatcher + 16 varga implementations
│   │       │   │                   getAllVargaSigns(lon) batch helper
│   │       │   ├── dashas.ts       getNakshatra(lon), calculateDasha(moonLon, birthDate),
│   │       │   │                   getDashaLordAtDate, getDashaLordsAtDate, getMahadashas
│   │       │   │                   DASHA_SEQUENCE and NAKSHATRA_LORD exported constants
│   │       │   ├── shadbala.ts     calculateShadbala(chart) → ShadbalaResult[]
│   │       │   │                   6 bala components in Virupas; helper exports for yoga detection
│   │       │   ├── ashtakavarga.ts calculateAshtakavarga(chart) → AshtakavargaResult
│   │       │   │                   BAV per planet (Map<Planet, number[12]>)
│   │       │   │                   SAV total (number[12])
│   │       │   │                   Trikona + Ekadhipatya Shodhana reductions
│   │       │   └── yogas.ts        YogaDetector class + detectAllYogas(chart)
│   │       │                       50+ yoga rules; YogaResult[] sorted by strength
│   │       │
│   │       └── chart/
│   │           └── southIndian.ts  GRID_SIGN_AT: fixed [row][col] → Sign mapping
│   │                               GRID_POSITION: Sign → [row, col]
│   │                               getSouthIndianLayout(chart) → GridCell[][]
│   │                               renderSouthIndianASCII(chart) → string (debugging)
│   │                               getSignName, getSignShortName, getPlanetSymbol
│   │
│   ├── api/                        @parashari/api — Fastify server
│   │   ├── package.json            type:module; dev script uses tsx watch
│   │   ├── tsconfig.json
│   │   ├── jest.config.js
│   │   └── src/
│   │       ├── index.ts            Fastify instance; registers CORS, helmet, errorHandler,
│   │       │                       and the four route plugins under /api prefix; starts server
│   │       │
│   │       ├── database/
│   │       │   ├── db.ts           getDb() singleton (better-sqlite3); sets WAL/FK/busy_timeout;
│   │       │   │                   getDbPath() resolves platform-appropriate path
│   │       │   ├── profiles.ts     getAllProfiles, getProfile, createProfile, updateProfile,
│   │       │   │                   deleteProfile, searchProfiles — prepared statement wrappers
│   │       │   ├── cache.ts        getCachedCalculation, saveCachedCalculation (UPSERT),
│   │       │   │                   invalidateCache, isCacheValid (TTL=7 days)
│   │       │   ├── events.ts       getEventsForProfile, getEventsInDateRange, createEvent,
│   │       │   │                   updateEvent, deleteEvent — prepared statement wrappers
│   │       │   ├── migrate.ts      Reads schema.sql; executes DDL; idempotent (IF NOT EXISTS)
│   │       │   └── seed.ts         Inserts 3 test profiles with known birth data
│   │       │
│   │       ├── middleware/
│   │       │   └── errorHandler.ts Fastify setErrorHandler; maps ZodError→400, FastifyError→statusCode,
│   │       │                       anything else→500; strips stack traces in production
│   │       │
│   │       └── routes/
│   │           ├── profiles.ts     CRUD for birth profiles; Zod validation; cache invalidation on
│   │           │                   birth data change; search endpoint
│   │           ├── calculations.ts Engine factory (memoised per ayanamsa); 7 calculation endpoints;
│   │           │                   partial cache (per-column) and full cache paths;
│   │           │                   Map<Varga,VargaChart> serialised as [K,V][] for JSON
│   │           ├── events.ts       CRUD for life events journal; date-range query
│   │           └── geocode.ts      Static 55-city dataset; searchCities, lookupTimezone;
│   │                               no external API calls
│   │
│   └── web/                        @parashari/web — Next.js 15 App Router
│       ├── package.json
│       ├── next.config.ts          /api/* rewrite to localhost:3001; transpilePackages: ['@parashari/core']
│       ├── tailwind.config.ts      Custom tokens: cosmic.bg/surface/elevated/border, gold.*
│       ├── playwright.config.ts    e2e browser test config
│       └── src/
│           ├── app/
│           │   ├── layout.tsx      Root layout: DM Sans font, dark class on <html>, sidebar
│           │   ├── dashboard/      Profile list; birthdate; navigation to chart/dasha views
│           │   ├── chart/          Varga selector; South Indian HTML grid; planet detail panel
│           │   └── profile/        Create/edit profile form; geocode search; timezone picker
│           │
│           ├── components/
│           │   ├── chart/          SouthIndianChart.tsx (HTML grid), VargaSelector.tsx,
│           │   │                   PlanetList.tsx, ChartCell.tsx
│           │   ├── forms/          ProfileForm.tsx, EventForm.tsx, LocationSearch.tsx
│           │   └── ui/             Card.tsx (Liquid Glass backdrop-blur surface),
│           │                       Button.tsx, Badge.tsx
│           │
│           └── lib/
│               ├── api.ts          Typed fetch client; all API calls via /api proxy
│               ├── hooks.ts        SWR hooks: useProfiles, useProfile, useChart, useDashas,
│               │                   useYogas, useShadbala, useAshtakavarga, useEvents
│               ├── constants.ts    PLANET_NAMES, PLANET_ABBR, PLANET_COLORS, SIGN_NAMES,
│               │                   SIGN_ABBR, NAKSHATRA_NAMES, DASHA_YEARS, SI_GRID, VARGAS
│               └── utils.ts        cn() (clsx + tailwind-merge), date formatters
│
├── desktop/
│   ├── ParashariPrecision.xcodeproj/   Xcode project; scheme "Parashari Precision"
│   └── ParashariPrecision/             Swift source tree
│       ├── App/
│       │   ├── ParashariPrecisionApp.swift  @main entry; injects SyncService as @StateObject
│       │   └── AppDelegate.swift             macOS-specific lifecycle (NSApplicationDelegate)
│       │
│       ├── Models/                    Codable structs mirroring API JSON shapes
│       │   ├── Profile.swift          id, name, dob_utc, lat, lon, timezone, place_name, notes
│       │   ├── ChartData.swift        PlanetPosition, HousePosition, ChartData (Decodable)
│       │   ├── DashaPeriod.swift      DashaPeriod (5-level nested Decodable)
│       │   └── YogaResult.swift       YogaResult (Decodable)
│       │
│       ├── ViewModels/
│       │   ├── ProfilesViewModel.swift  @MainActor ObservableObject; loads profiles from
│       │   │                            APIService or DatabaseService based on isServerOnline;
│       │   │                            observes databaseDidChange notification
│       │   ├── ChartViewModel.swift     Loads chart + vargas for selected profile; varga selection
│       │   └── DashaViewModel.swift     Loads dashas; computes current period
│       │
│       ├── Views/
│       │   ├── Sidebar/         NavigationSplitView sidebar; profile list with search
│       │   ├── Profile/         Profile detail; birth data display; events list
│       │   ├── Chart/           South Indian chart rendered in SwiftUI; varga tabs
│       │   ├── Dasha/           Timeline of Maha-dashas and Antar-dashas
│       │   ├── Yoga/            List of active yogas with descriptions
│       │   └── Components/      Shared: PlanetBadge, SignLabel, LoadingView, ErrorView
│       │
│       └── Services/
│           ├── APIService.swift     Swift actor; URLSession with 10s timeout;
│           │                        Codable JSON decode; isServerAvailable() health check
│           ├── DatabaseService.swift  Swift actor; opens SQLite3 READONLY; executes SQL
│           │                          to read profiles and cached calculations
│           └── SyncService.swift    @MainActor ObservableObject; 5s file-modification Timer;
│                                    30s server health Timer; posts databaseDidChange
│
├── database/
│   └── schema.sql                  Complete DDL: CREATE TABLE IF NOT EXISTS for all 5 tables;
│                                   indexes; default INSERT OR IGNORE for ayanamsas + settings
│
└── tests/
    ├── unit/                       Jest tests for @parashari/core
    │   ├── vargas.test.ts          Known-value varga assertions (TC-02: 14° Cancer → Scorpio in D9)
    │   ├── dashas.test.ts          Nakshatra calculation; dasha sequence; date boundary tests
    │   ├── shadbala.test.ts        Digbala, sthanabala component values for sample chart
    │   └── ashtakavarga.test.ts    BAV bindu counts; SAV totals
    │
    ├── integration/                Jest tests against the running Fastify server
    │   ├── profiles.test.ts        CRUD round-trip; cache invalidation on PUT
    │   └── calculations.test.ts    Full calculation round-trip; cache hit on second request
    │
    └── e2e/                        Playwright browser tests
        └── chart.spec.ts           Create profile → view chart → select D9 varga
```

---

## 3. Component Breakdown

### `AstrologyEngine` (`packages/core/src/index.ts`)

- **Responsibility**: High-level facade over all calculation functions. Manages ayanamsa state; coordinates the pipeline from `BirthData` to all output types.
- **Inputs**: `BirthData` (name, ISO 8601 UTC datetime string, latitude, longitude, UTC offset number, optional `Ayanamsa` enum)
- **Outputs**: `ChartData`, `Map<Varga, VargaChart>`, `DashaPeriod[]`, `YogaResult[]`, `ShadbalaResult[]`, `AshtakavargaResult`, `GridCell[][]`
- **Key dependencies**: `swisseph` (via `swissEph.ts`); all five calculation modules; `southIndian.ts`
- **Engine factory in API**: `getEngine(ayanamsa)` in `calculations.ts` memoises one `AstrologyEngine` instance per ayanamsa (up to 3), avoiding repeated `initEphemeris` calls.

### Fastify API Server (`packages/api/src/`)

- **Responsibility**: HTTP interface between the web frontend and the calculation engine + database. Manages the calculation cache lifecycle.
- **Inputs**: HTTP requests from Next.js (proxied) and SwiftUI (direct)
- **Outputs**: JSON responses; SQLite writes
- **Key dependencies**: `@parashari/core`, `better-sqlite3`, Fastify v5, Zod
- **Cache strategy**: Per-profile UPSERT into `calculations_cache`. Each JSON column is independent; a `/calculations/chart` request only fills `chart_json`, leaving others null. A `/calculations/full` request fills all columns in one transaction.

### Next.js Web App (`packages/web/src/`)

- **Responsibility**: Browser UI for all chart viewing, profile management, and event journaling.
- **Inputs**: User interactions; SWR-fetched data from `/api/*`
- **Outputs**: Rendered HTML; `POST`/`PUT`/`DELETE` requests to the API
- **Key dependencies**: Next.js 15, SWR v2, Tailwind CSS, Lucide React, `@parashari/core` (type imports only — the native addon is never bundled)
- **Proxy**: `next.config.ts` rewrites `/api/:path*` to `http://localhost:3001/api/:path*`. All fetch calls in `lib/api.ts` target `/api/...` (relative), so no `NEXT_PUBLIC_API_URL` configuration is required in development.

### SQLite Database (`database/schema.sql`)

- **Responsibility**: Persistent store for profiles, events, calculation cache, settings. Single source of truth.
- **Inputs**: SQL from `better-sqlite3` (API) and SQLite3 C API (macOS app)
- **Outputs**: Rows read by API and macOS app
- **Key properties**: WAL mode for concurrent reads; FK cascades delete orphaned cache rows and events when a profile is deleted.

### SwiftUI macOS App (`desktop/ParashariPrecision/`)

- **Responsibility**: Native macOS UI; offline read access; cross-app change detection.
- **Inputs**: HTTP responses from API (online mode); SQLite3 reads (offline mode); `databaseDidChange` notifications
- **Outputs**: UI state; `POST`/`PUT`/`DELETE` requests to the API for mutations
- **Key concurrency model**: `APIService` and `DatabaseService` are Swift `actor` types (compile-time data race protection). `ProfilesViewModel`, `ChartViewModel`, `DashaViewModel`, and `SyncService` are `@MainActor` `ObservableObject` types (always run on the main thread, safe for SwiftUI bindings).

---

## 4. Data Flow

### "User creates a new profile"

```
1. User fills ProfileForm (web) → submits
2. ProfileForm calls createProfile(payload) in lib/api.ts
3. fetch POST /api/profiles → (Next.js proxy) → Fastify POST /api/profiles
4. Fastify: Zod validates CreateProfileSchema
5. On validation pass: createProfile(input) in database/profiles.ts
   → db.prepare(INSERT INTO profiles ...).run(...)
   → returns profile row with generated UUID
6. Fastify replies 201 { data: profile }
7. React: ProfileForm receives the new profile
8. SWR: mutate('profiles') is called → useProfiles() re-fetches
9. Dashboard profile list updates with new entry
10. Chart is not yet calculated; chart view shows "Calculate" CTA
```

### "Chart calculation — cache hit"

```
1. User navigates to chart view for profile P
2. useChart(profileId, 'D1') → SWR fetches /api/calculations/chart
3. Fastify POST /api/calculations/chart receives { profile_id: P }
4. resolveBirthData loads profile from DB
5. isCacheValid(P) → checks cache_version=1 AND computed_at within 7 days → TRUE
6. getCachedCalculation(P) → row.chart_json is not null
7. chart = JSON.parse(row.chart_json)
8. Reply: { data: chart, cached: true, computed_at: "..." }
9. SWR caches the response; chart component renders
Total DB round-trips: 2 (getProfile + getCachedCalculation)
Swiss Ephemeris calls: 0
```

### "Chart calculation — cache miss"

```
1. Same entry as cache hit up to step 5
5. isCacheValid(P) → cache row does not exist (or expired) → FALSE
6. getEngine(Ayanamsa.Lahiri) → returns memoised AstrologyEngine instance
7. engine.calculateChart(birthData):
   a. new Date(birthData.dateOfBirth) → UTC year/month/day/hour/minute/second
   b. getJulianDay(..., timezone=0) → Julian Day number (UT)
   c. getAyanamsa(jd) → Lahiri ayanamsa value in degrees
   d. getRawAscendant(jd, lat, lon, 'W') → tropical Ascendant + MC
   e. getSiderealLongitude(ascendantTropical, jd) → sidereal Ascendant
   f. lagnaSign = floor(ascendantSidereal / 30)
   g. Build houses[12]: sign = (lagnaSign + i) % 12 for i in 0..11
   h. For each of 9 planets:
      i.   getRawPlanetPosition(jd, seId) → tropical longitude, speed, latitude
      ii.  siderealLon = (tropicalLon - ayanamsaValue + 360) % 360
      iii. sign = floor(siderealLon / 30)
      iv.  nakshatra = floor(siderealLon / 13.333)
      v.   isRetrograde = speed < 0
8. saveCachedCalculation(P, { julian_day, ayanamsa_value, chart_json, others: null })
9. Reply: { data: chart, cached: false, computed_at: "..." }
Total Swiss Ephemeris calls: 10 (1 for houses + 9 for planets; Ketu derived from Rahu)
```

### "macOS app detects web app wrote a new event"

```
1. User creates an event in web app → POST /api/events/:profile_id
2. Fastify writes event row to events_journal; SQLite updates astrology.sqlite
3. SQLite WAL: astrology.sqlite modification timestamp advances
4. macOS SyncService Timer fires (≤5 seconds):
   a. stat(astrology.sqlite) → modificationDate = T2 > lastKnownModDate T1
   b. lastKnownModDate ← T2
   c. lastSyncDate ← now
   d. NotificationCenter.default.post(name: .databaseDidChange, object: nil)
5. ProfilesViewModel.init subscribes to .databaseDidChange
6. Notification received on @MainActor → viewModel.loadProfiles()
7. If isServerOnline: APIService.fetchProfiles() → GET /api/profiles
   Else: DatabaseService.fetchProfiles() → SELECT * FROM profiles
8. profiles @Published property updates → SwiftUI body re-evaluates
9. Profile row in sidebar shows updated event count badge (if applicable)
```

---

## 5. Database Schema

Full DDL with field descriptions (from `database/schema.sql`):

```sql
-- WAL mode and FK enforcement — applied at connection time, not at CREATE time
PRAGMA journal_mode = WAL;       -- Concurrent reads during writes
PRAGMA foreign_keys = ON;        -- Enforce REFERENCES constraints
PRAGMA synchronous = NORMAL;     -- Safe under WAL; no fsync on every commit

-- ─────────────────────────────────────────────────────────────
-- ayanamsas
-- Lookup table for the three supported ayanamsa systems.
-- Seeded with IDs 1 (Lahiri), 2 (Raman), 3 (KP) at migration time.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ayanamsas (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,     -- 'Lahiri', 'Raman', 'KP'
  description TEXT               -- Human-readable description
);

-- ─────────────────────────────────────────────────────────────
-- profiles
-- One row per birth profile (one person, possibly multiple charts
-- if different ayanamsas are explored).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id               TEXT PRIMARY KEY,   -- UUID v4, generated in application layer
  name             TEXT NOT NULL,      -- Display name: 'Mahatma Gandhi'
  dob_utc          TEXT NOT NULL,      -- ISO 8601 UTC: '1869-10-02T04:50:00Z'
                                       -- Caller must convert local birth time to UTC
  lat              REAL NOT NULL,      -- Birth latitude: 21.1702 (Porbandar)
                                       -- Decimal degrees; -90 to 90
  lon              REAL NOT NULL,      -- Birth longitude: 70.0577 (Porbandar)
                                       -- Decimal degrees; -180 to 180
  timezone         TEXT NOT NULL,      -- IANA timezone: 'Asia/Kolkata'
                                       -- Used for display only; calculations use dob_utc
  utc_offset_hours REAL NOT NULL,      -- UTC offset at birth time: 5.5
                                       -- Stored separately from timezone because historical
                                       -- DST rules may differ from current rules
  place_name       TEXT,               -- Human-readable: 'Porbandar, India' (nullable)
  ayanamsa_id      INTEGER NOT NULL    -- FK → ayanamsas.id; defaults to 1 (Lahiri)
                   DEFAULT 1,
  notes            TEXT,               -- Free-text practitioner notes (nullable)
  created_at       TEXT NOT NULL       -- ISO 8601 UTC; set by DEFAULT
                   DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL       -- ISO 8601 UTC; updated by application on PUT
                   DEFAULT (datetime('now')),
  FOREIGN KEY (ayanamsa_id) REFERENCES ayanamsas(id)
);

-- ─────────────────────────────────────────────────────────────
-- calculations_cache
-- One row per profile. All heavy JSON blobs live here.
-- Each JSON column is independently nullable: a partial cache
-- (chart only) is valid; missing columns trigger recalculation
-- for that specific endpoint.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calculations_cache (
  profile_id        TEXT NOT NULL,     -- FK → profiles.id; PRIMARY KEY (one row per profile)
  cache_version     INTEGER NOT NULL   -- Incremented when JSON shape changes; stale rows
                    DEFAULT 1,         -- with old version are treated as cache misses
  julian_day        REAL NOT NULL,     -- Julian Day (UT) at birth; stored for validation
  ayanamsa_value    REAL NOT NULL,     -- Ayanamsa in degrees at julian_day; e.g. 23.8517
  chart_json        TEXT NOT NULL,     -- JSON: ChartData (D1 natal chart)
                                       -- Includes ascendant, planets[9], houses[12], mc
  vargas_json       TEXT,              -- JSON: [Varga, VargaChart][] (16 divisional charts)
                                       -- Serialised as array-of-pairs (Map cannot JSON.stringify)
  shadbala_json     TEXT,              -- JSON: ShadbalaResult[] (9 planets × 6 bala components)
  ashtakavarga_json TEXT,              -- JSON: { bav: [Planet, number[]][], sav: number[],
                                       --         planetBav: [Planet, number[]][] }
  dashas_json       TEXT,              -- JSON: DashaPeriod[] (full 120-year tree, 5 levels deep)
                                       -- Large: ~50–200KB for full tree
  yogas_json        TEXT,              -- JSON: YogaResult[] sorted descending by strength
  computed_at       TEXT NOT NULL      -- ISO 8601 UTC; TTL baseline
                    DEFAULT (datetime('now')),
  PRIMARY KEY (profile_id),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
  -- ON DELETE CASCADE: deleting a profile automatically removes its cache row
);

-- ─────────────────────────────────────────────────────────────
-- events_journal
-- Life events entered by the user. Correlated with dasha periods
-- for pattern analysis.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events_journal (
  id          TEXT PRIMARY KEY,        -- UUID v4
  profile_id  TEXT NOT NULL,           -- FK → profiles.id
  event_date  TEXT NOT NULL,           -- ISO 8601 date (no time): '2003-06-15'
  category    TEXT NOT NULL,           -- 'Career' | 'Relationship' | 'Health' |
                                       -- 'Finance' | 'Travel' | 'Education' | 'Other'
  title       TEXT NOT NULL,           -- Short label: 'Started new job at Google'
  description TEXT,                    -- Extended notes (nullable)
  sentiment   INTEGER,                 -- -1=negative, 0=neutral, 1=positive (nullable)
  created_at  TEXT NOT NULL
              DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────
-- settings
-- Key-value store for application-wide settings.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,         -- 'default_ayanamsa', 'app_version', 'ephemeris_path'
  value      TEXT NOT NULL,            -- String value; callers parse as needed
  updated_at TEXT NOT NULL
             DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_events_profile_date
    ON events_journal(profile_id, event_date);   -- date-range queries by profile

CREATE INDEX IF NOT EXISTS idx_profiles_name
    ON profiles(name);                            -- full-text search by name

CREATE INDEX IF NOT EXISTS idx_cache_profile
    ON calculations_cache(profile_id);            -- redundant with PK; explicit for clarity

-- ─────────────────────────────────────────────────────────────
-- Seed data
-- ─────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO ayanamsas VALUES
  (1, 'Lahiri', 'Chitrapaksha ayanamsa, official Indian standard'),
  (2, 'Raman',  'B.V. Raman ayanamsa'),
  (3, 'KP',     'Krishnamurti Paddhati ayanamsa');

INSERT OR IGNORE INTO settings VALUES
  ('default_ayanamsa', '1',     datetime('now')),  -- Lahiri
  ('app_version',      '1.0.0', datetime('now')),
  ('ephemeris_path',   '',      datetime('now'));   -- Empty = use Swiss Ephemeris default
```

---

## 6. API Routes Reference

All routes are prefixed with `/api`. The Next.js proxy rewrites `/api/*` from port 3000 to port 3001.

### Profiles

| Method | Path | Request body | Response | Notes |
|--------|------|-------------|----------|-------|
| `GET` | `/api/profiles` | — | `{ data: Profile[] }` | All profiles, ordered by created_at desc |
| `GET` | `/api/profiles/search?q=<query>` | — | `{ data: Profile[] }` | Case-insensitive substring match on name and place_name. Must be registered before `/:id` to prevent "search" being parsed as a UUID. |
| `GET` | `/api/profiles/:id` | — | `{ data: Profile }` | 404 if not found |
| `POST` | `/api/profiles` | `CreateProfileSchema` | `{ data: Profile }` 201 | Zod-validated; generates UUID |
| `PUT` | `/api/profiles/:id` | `UpdateProfileSchema` (partial) | `{ data: Profile }` | Invalidates cache if birth data fields change |
| `DELETE` | `/api/profiles/:id` | — | 204 No Content | ON DELETE CASCADE removes cache + events |

**CreateProfileSchema fields**: `name` (string 1–200), `dob_utc` (ISO 8601 UTC datetime), `lat` (−90–90), `lon` (−180–180), `timezone` (IANA string), `utc_offset_hours` (−14–14), `place_name` (string, optional), `ayanamsa_id` (1–10, optional, defaults to 1), `notes` (string ≤2000, optional).

### Calculations

All calculation endpoints accept either `{ profile_id: UUID }` or `{ birth_data: BirthDataSchema }`. At least one must be provided (Zod `refine`). When `profile_id` is given, the profile is loaded from the database and the calculation result is cached.

**BirthDataSchema fields**: `name` (string), `dateOfBirth` (ISO 8601 UTC), `latitude` (−90–90), `longitude` (−180–180), `timezone` (number, UTC offset hours), `ayanamsaId` (Ayanamsa enum, optional).

| Method | Path | Request body | Response | Notes |
|--------|------|-------------|----------|-------|
| `POST` | `/api/calculations/chart` | `CalcBodySchema` | `{ data: ChartData, cached: bool, computed_at: string }` | D1 natal chart |
| `POST` | `/api/calculations/vargas` | `CalcBodySchema` | `{ data: [Varga, VargaChart][], cached: bool, ... }` | All 16 varga charts serialised as array-of-pairs |
| `POST` | `/api/calculations/dashas` | `CalcBodySchema` | `{ data: DashaPeriod[], cached: bool, ... }` | Full 120-year tree, 5 levels |
| `POST` | `/api/calculations/yogas` | `CalcBodySchema` | `{ data: YogaResult[], cached: bool, ... }` | Sorted descending by `strength` |
| `POST` | `/api/calculations/shadbala` | `CalcBodySchema` | `{ data: ShadbalaResult[], cached: bool, ... }` | 9 planets × 6 bala components |
| `POST` | `/api/calculations/ashtakavarga` | `CalcBodySchema` | `{ data: { bav: [...], sav: number[], planetBav: [...] }, cached: bool, ... }` | Maps serialised as arrays |
| `POST` | `/api/calculations/full` | `CalcBodySchema` | `{ data: FullCalcResult, cached: bool, ... }` | All of the above in one response; parallelises with `Promise.all` on cache miss |
| `GET` | `/api/calculations/dasha-at-date/:profile_id?date=YYYY-MM-DD` | — | `{ data: DashaPeriod, date: string }` | Returns the Maha/Antar/Pratyantar/Sookshma/Prana period active on the given date |
| `GET` | `/api/calculations/cache/:profile_id` | — | `{ data: { exists, valid, computed_at, has_chart, has_vargas, ... } }` | Cache status inspection |
| `DELETE` | `/api/calculations/cache/:profile_id` | — | `{ data: { invalidated: true } }` | Force cache invalidation |

### Events

| Method | Path | Request body | Response | Notes |
|--------|------|-------------|----------|-------|
| `GET` | `/api/events/:profile_id` | — | `{ data: Event[] }` | All events for a profile, chronological |
| `GET` | `/api/events/:profile_id/range?from=YYYY-MM-DD&to=YYYY-MM-DD` | — | `{ data: Event[] }` | Date-range query. Must be registered before `/:profile_id`. |
| `POST` | `/api/events/:profile_id` | `CreateEventSchema` | `{ data: Event }` 201 | `event_date` is YYYY-MM-DD (date only, no time) |
| `PUT` | `/api/events/:id` | `UpdateEventSchema` (partial) | `{ data: Event }` | 404 if event not found |
| `DELETE` | `/api/events/:id` | — | 204 No Content | |

**CreateEventSchema fields**: `event_date` (YYYY-MM-DD), `category` (one of 7 enum values), `title` (string 1–300), `description` (string ≤2000, optional), `sentiment` (−1 | 0 | 1, optional).

### Geocode

| Method | Path | Request body | Response | Notes |
|--------|------|-------------|----------|-------|
| `GET` | `/api/geocode/search?q=<city>` | — | `{ data: GeocodeResult[] }` | Up to 10 ranked matches; static 55-city dataset; no external API |
| `GET` | `/api/geocode/timezone?lat=&lon=` | — | `{ data: { timezone, utc_offset_hours, dst_active: false } }` | Reverse-lookup by bounding box; `dst_active` always false (static data) |

**Error envelope** (all error responses): `{ error: string, code?: string, details?: [{ path, message, code }] }`. Validation errors are 400 with `code: "VALIDATION_ERROR"`. Server errors are 500 with `code: "INTERNAL_ERROR"` (stack trace stripped in production).

---

## 7. Calculation Pipeline

The complete pipeline from raw birth data to all chart products:

```
BirthData
  { name, dateOfBirth (ISO 8601 UTC), latitude, longitude,
    timezone (UTC offset hours), ayanamsaId }
  │
  ▼ 1. PARSE DATE
  Date.UTC(year, month, day, hour, minute, second)
  │
  ▼ 2. JULIAN DAY
  getJulianDay(year, month, day, hour, minute, second, tzOffset=0)
  → JD = 2451545.0 + (UT days since J2000.0)
  Algorithm: based on Meeus "Astronomical Algorithms" ch.7
  │
  ▼ 3. AYANAMSA VALUE
  getAyanamsa(jd)
  → swe_get_ayanamsa_ut(jd) via swisseph
  → Lahiri value at JD (e.g. 23.8517° for year 2000)
  │
  ▼ 4. ASCENDANT (TROPICAL)
  getAscendant(jd, latitude, longitude, houseSystem='W')
  → swe_houses(jd, lat, lon, 'W') via swisseph
  → angles.ascendant (tropical degrees), angles.mc (tropical degrees)
  │
  ▼ 5. SIDEREAL CONVERSION
  siderealAscendant = (tropicalAscendant - ayanamsaValue + 360) % 360
  siderealMC        = (tropicalMC - ayanamsaValue + 360) % 360
  │
  ▼ 6. WHOLE-SIGN HOUSES
  lagnaSign = floor(siderealAscendant / 30)     // 0=Aries … 11=Pisces
  for i in 0..11:
    houses[i].house = i + 1
    houses[i].sign  = (lagnaSign + i) % 12
    houses[i].degreeOnCusp = houses[i].sign * 30
  │
  ▼ 7. PLANET POSITIONS (×9)
  for each planet in [Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu]:
    getPlanetPosition(jd, sePlanetId)
    → swe_calc_ut(jd, seId, SEFLG_SWIEPH | SEFLG_SPEED)
    → { longitude (tropical), speed (°/day), latitude }
    siderealLon = (tropicalLon - ayanamsaValue + 360) % 360
    sign        = floor(siderealLon / 30)
    degreeInSign = siderealLon % 30
    nakshatra   = floor(siderealLon / 13.333...)
    pada        = floor((siderealLon % 13.333) / 3.333) + 1
    isRetrograde = speed < 0

  Ketu: siderealLon = (Rahu.siderealLon + 180) % 360
  │
  ▼ 8. CHART DATA ASSEMBLED
  ChartData { ascendant, planets[9], houses[12], julianDay, ayanamsa, ayanamsaType, mc }
  │
  ├──► 9a. VARGA CALCULATIONS
  │         for each varga in D1…D60:
  │           for each planet:
  │             getVargaSign(planet.siderealLongitude, varga)
  │             → sign-specific algorithm (see vargas.ts section comments)
  │           lagnaVargaSign = getVargaSign(chart.ascendant, varga)
  │           vargaHouses[i].sign = (lagnaVargaSign + i) % 12
  │         → Map<Varga, VargaChart>
  │
  ├──► 9b. VIMSHOTTARI DASHA TREE
  │         Moon nakshatra index = floor(moon.siderealLon / 13.333)
  │         dasha lord = NAKSHATRA_LORD[nakshatraIndex]
  │         fraction elapsed in nakshatra = degreeInNakshatra / 13.333
  │         balance of first dasha = (1 - fraction) × dashaYears × 365.25 days
  │         Expand 5 levels: Maha → Antar → Pratyantar → Sookshma → Prana
  │         Sub-period duration = (subLordYears / totalCycleYears) × parentDuration
  │         → DashaPeriod[] (full tree, ~5,000 nodes for 5 levels)
  │
  ├──► 9c. YOGA DETECTION
  │         YogaDetector evaluates 50+ rules against ChartData
  │         Each rule checks: sign placement, house position, aspect, conjunction
  │         → YogaResult[] sorted descending by strength (0.0–1.0)
  │
  ├──► 9d. SHADBALA
  │         For each planet:
  │           Sthanabala (positional): exaltation/debilitation/own/friend sign status
  │           Digbala (directional): distance from optimal house (e.g. Sun: 10th)
  │           Kalabala (temporal): day/night, hora lord, paksha (lunar phase)
  │           Chestabala (motional): retrograde bonus, speed vs. mean speed
  │           Naisargikabala (natural): fixed constants (Sun=60, Moon=51.4, ...)
  │           Drigbala (aspectual): aspect strength from other planets
  │           Total in Virupas; convert to Rupas (÷ 60)
  │         → ShadbalaResult[]
  │
  └──► 9e. ASHTAKAVARGA
            For each planet P:
              For each sign S (0..11):
                Count contributing planets (Bindu) for sign S from P's perspective
                → BAV[P][S] = count (0–8)
            SAV[S] = sum of BAV[P][S] for all P (maximum = 56 per sign)
            Apply Trikona Shodhana: subtract minimum of the 4 trikona houses' BAV
            Apply Ekadhipatya Shodhana: redistribute points for signs with same lord
            → AshtakavargaResult { bav: Map<Planet, number[12]>, sav: number[12],
                                   planetBav: Map<Planet, number[12]> }
```

---

## 8. South Indian Chart Layout

The South Indian chart is a 4×4 grid where each of the 12 outer cells is permanently assigned to a zodiac sign. The center 4 cells (rows 1–2, columns 1–2) are merged into a single panel for profile information, the current dasha period, or a selected planet's details.

**Fixed sign assignments:**

```
[row 0, col 0] = Pisces  (11)    [row 0, col 1] = Aries  (0)
[row 0, col 2] = Taurus  (1)     [row 0, col 3] = Gemini (2)
[row 1, col 0] = Aquarius(10)    [row 1, col 1] = CENTER
[row 1, col 2] = CENTER          [row 1, col 3] = Cancer (3)
[row 2, col 0] = Capricorn(9)    [row 2, col 1] = CENTER
[row 2, col 2] = CENTER          [row 2, col 3] = Leo    (4)
[row 3, col 0] = Sagittarius(8)  [row 3, col 1] = Scorpio(7)
[row 3, col 2] = Libra   (6)     [row 3, col 3] = Virgo  (5)
```

**Why fixed signs?** The South Indian style is the traditional chart format of South India (Tamil Nadu, Andhra Pradesh, Karnataka, Kerala). Unlike the North Indian style (where the Ascendant is always at the top and signs rotate), the South Indian grid is fixed. The Ascendant sign is indicated by an "As" label or a distinctive border/highlight, not by position. This makes comparison across charts easier: a planet in Taurus is always in the top-middle row, regardless of which chart you are looking at.

**How the Lagna is indicated:** The cell corresponding to the sidereal Ascendant sign receives a visual highlight (gold border in the web app, outlined cell in the macOS app). The text "As" is placed in the cell alongside any planets also occupying that sign.

**How planets are placed:** For each planet, `GRID_POSITION[planet.sign]` gives the `[row, col]` of the cell where that planet is displayed. Multiple planets in the same sign are stacked vertically within that cell. Planet abbreviations are two letters (Su, Mo, Ma, Me, Ju, Ve, Sa, Ra, Ke). Retrograde planets append "R" (e.g. "Ve R"). The degree within the sign is shown as a small number (e.g. "14°27'").

**In varga charts:** The same grid is used, but planets are placed in their varga sign positions (computed by `getVargaSign(planet.siderealLongitude, varga)`). The Lagna cell is the varga Ascendant sign (`getVargaSign(chart.ascendant, varga)`).

**Code path:** `getSouthIndianLayout(chart)` in `packages/core/src/chart/southIndian.ts` returns a `GridCell[][]` (4×4 array). Each `GridCell` has `{ sign, isCenter, planets[], lagnaSign }`. The React component `SouthIndianChart.tsx` renders this as a `grid grid-cols-4` div with 16 cells, using `col-span-2 row-span-2` for the center cells.

---

## 9. Async/Concurrency Model

### Node.js API (`@parashari/api`)

- **Event loop**: Single-threaded Node.js. All Fastify route handlers are `async` functions, but `better-sqlite3` calls are synchronous.
- **Swiss Ephemeris**: The `swisseph` native addon uses synchronous callbacks internally. All `swe_calc_ut` calls in `swissEph.ts` are wrapped to return synchronously, then `AstrologyEngine` methods are declared `async` for future-proofing but do not actually await any I/O.
- **Parallelism in `/calculations/full`**: The five sub-calculations are launched with `Promise.all([vargas, dashas, yogas, shadbala, ashtakavarga])` after the base chart is computed. Since all computation is CPU-bound (no I/O), this does not actually run in parallel on a single-threaded Node.js process, but it makes the intent clear and will benefit from worker thread migration if concurrency grows.
- **Engine memoisation**: `getEngine(ayanamsa)` stores up to 3 `AstrologyEngine` instances (one per ayanamsa). This avoids re-running `initEphemeris` (which calls `swe_set_sid_mode`) on every request.

### Next.js (`@parashari/web`)

- **Server Components**: `app/layout.tsx` and outer page shells render on the server. They do not fetch dynamic data (no `fetch` calls from Server Components to the API — all dynamic data comes from SWR on the client).
- **Client Components**: Components that use `useSWR`, `useState`, or event handlers are marked `'use client'`. The boundary is at the top of each interactive component file.
- **SWR revalidation**: `revalidateOnFocus: false` on all SWR hooks. Revalidation is triggered by explicit `mutate()` calls after create/update/delete, or by the 7-day cache TTL on the API side.

### SwiftUI macOS App

- **`@MainActor`**: `ProfilesViewModel`, `ChartViewModel`, `DashaViewModel`, and `SyncService` are all `@MainActor`. All `@Published` property mutations happen on the main thread, which is required for SwiftUI to observe them correctly.
- **Swift actors**: `APIService` and `DatabaseService` are `actor` types. The compiler enforces that their internal state (URLSession, SQLite3 pointer) is only accessed from their actor's executor, preventing data races at compile time.
- **`async`/`await`**: ViewModels call `await APIService.shared.fetchProfiles()` inside `Task { }` blocks. Tasks created inside `@MainActor` contexts inherit the main actor.
- **`Combine`**: Not used directly in ViewModels. `SyncService` posts via `NotificationCenter`; ViewModels subscribe with `.onReceive(NotificationCenter.default.publisher(for: .databaseDidChange))`.

### SQLite WAL Mode Concurrency

- **Writers**: Only the Fastify API server (via `better-sqlite3`) writes. All writes are single-threaded (no connection pool needed).
- **Readers**: The macOS `DatabaseService` opens with `SQLITE_OPEN_READONLY | SQLITE_OPEN_NOMUTEX`. In WAL mode, reads and writes do not block each other — a reader sees the last committed state before the current write transaction began.
- **Busy timeout**: `PRAGMA busy_timeout = 5000` in `db.ts` means that if a write lock is held, a concurrent read will wait up to 5 seconds before returning `SQLITE_BUSY`. This prevents spurious errors during heavy cache writes.

---

## 10. Error Handling Strategy

### API Layer (`errorHandler.ts`)

Fastify's `setErrorHandler` is registered globally. The handler discriminates on error type:

1. **`ZodError`** → HTTP 400 with `{ error: "Validation failed", code: "VALIDATION_ERROR", details: [{ path, message, code }] }`. Field-level error detail is always included.
2. **`FastifyError`** (built-in: 404 route not found, 405 method not allowed, 413 payload too large) → HTTP `statusCode` with the Fastify error message. No details.
3. **Anything else** (calculation errors, `Error` thrown from route handlers, unexpected exceptions) → HTTP 500 with `{ error: "Internal server error", code: "INTERNAL_ERROR" }`. The original `err.message` is included only in development (`NODE_ENV !== 'production'`). Stack traces are never sent to clients.

All errors are logged via Fastify's built-in Pino logger at `warn` level (for 4xx) or `error` level (for 5xx), with `{ ts, method, url, status, error }` fields.

### Cache Errors

Cache write failures in `calculations.ts` are caught and logged (`console.error`) but do not propagate to the caller. A cache write failure means the next request for the same profile will simply recalculate. This is correct behavior — cache is always a performance optimisation, never a correctness requirement.

### Desktop Offline Mode

When `isServerAvailable()` returns `false`, `ProfilesViewModel` falls back to `DatabaseService.fetchProfiles()`. If the database file does not exist (fresh install, no migration run), `DatabaseService.openDatabase()` throws `DatabaseError.notFound`, which the ViewModel catches and presents as an empty-state UI with a "Start the API server to create profiles" message.

### Web App

SWR captures fetch errors in the `error` property of each hook. Components check `if (error)` and render an error state. The `ApiError` class in `lib/api.ts` carries the HTTP status code, allowing components to distinguish 404 (profile deleted elsewhere) from 500 (server error).

---

## 11. Extension Points

### Adding a new varga chart

1. Add the new varga identifier to the `Varga` enum in `packages/core/src/types/index.ts`, e.g. `D108 = 'D108'`.
2. Implement `getD108Sign(longitude: number): number` in `packages/core/src/calculations/vargas.ts` following the same sign-offset pattern as the existing implementations.
3. Add the `case Varga.D108: return getD108Sign(longitude)` branch in the `getVargaSign` dispatcher.
4. Add `[Varga.D108]: 108` to the `divisors` record in `getVargaDivisor` in `packages/core/src/index.ts`.
5. Add the display label and description to the `VARGAS` array in `packages/web/src/lib/constants.ts`.
6. Add a unit test with a known-value assertion in `tests/unit/vargas.test.ts`.

### Adding a new yoga rule

1. Open `packages/core/src/calculations/yogas.ts`.
2. Add a new method to the `YogaDetector` class (or a standalone function) that evaluates the yoga condition from a `ChartData` argument.
3. Return a `YogaResult` with `{ name, description, isPresent, planets, houses, strength, category }`.
4. Register the new method in `detectAllYogas(chart)` so it is included in the full scan.
5. Add a unit test with a chart that satisfies the yoga condition.

### Adding a new dasha system (e.g. Yogini, Char)

1. Create `packages/core/src/calculations/yoginiDasha.ts` (or `charDasha.ts`).
2. Export a function matching the signature `calculateYoginiDasha(chart: ChartData): DashaPeriod[]`.
3. Add a new API endpoint in `packages/api/src/routes/calculations.ts` (e.g. `POST /calculations/yogini-dasha`).
4. Add a new nullable JSON column to `calculations_cache` (requires a schema migration).
5. Add a SWR hook in `packages/web/src/lib/hooks.ts` and a UI view in the web app.

### Adding a new ayanamsa

1. Add the new value to the `Ayanamsa` enum in `packages/core/src/types/index.ts`.
2. Add the `swisseph` constant ID to `AYANAMSA_IDS` in `packages/core/src/ephemeris/swissEph.ts`. Swiss Ephemeris supports 30+ ayanamsas; find the numeric ID in the `swe.h` header or the Swiss Ephemeris documentation.
3. Add a row to the `ayanamsas` table in `database/schema.sql` (`INSERT OR IGNORE INTO ayanamsas VALUES (newId, 'Name', 'Description')`).
4. Add the mapping case in `ayanamsaFromId()` in `packages/api/src/routes/calculations.ts`.
5. Run `npm run db:migrate` to apply the schema change.

### Changing the cache TTL

Edit `CACHE_TTL_MS` in `packages/api/src/database/cache.ts`. The current value is 7 days (`7 * 24 * 60 * 60 * 1000` ms). Birth charts do not change, so the TTL is essentially arbitrary; the main reason to expire the cache is to pick up engine version upgrades (controlled by `CURRENT_CACHE_VERSION`). Increment `CURRENT_CACHE_VERSION` when the shape of any cached JSON type changes; this ensures all existing cache rows are treated as misses without a database migration.
