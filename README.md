# Parashari Precision

**Professional Vedic astrology suite — macOS native + Next.js web, local-first SQLite**

`macOS 14+` | `Next.js 15` | `TypeScript 5.7` | `SQLite WAL` | `Swiss Ephemeris`

---

## What it is

Parashari Precision is a dual-platform Vedic astrology application built on the Parashara school (Parashari) methodology. It runs as a native SwiftUI macOS application and as a Next.js web application, both sharing a single local SQLite database as the source of truth. All heavy calculations — varga charts, dashas, yogas, shadbala, and ashtakavarga — are performed by a TypeScript engine wrapping the Swiss Ephemeris C library, served through a local Fastify API.

---

## Chart Layout

South Indian fixed-sign 4×4 grid. Signs are always in the same cell; planets move based on the chart being displayed.

```
South Indian Chart (4×4 fixed grid):
┌─────┬─────┬─────┬─────┐
│ Pis │ Ari │ Tau │ Gem │
├─────┼─────┴─────┼─────┤
│ Aqu │  [Profile │ Can │
├─────┤   details]├─────┤
│ Cap │           │ Leo │
├─────┼─────┬─────┼─────┤
│ Sag │ Sco │ Lib │ Vir │
└─────┴─────┴─────┴─────┘

Cell positions (row, col):
  Pisces [0,0]  Aries [0,1]  Taurus [0,2]   Gemini [0,3]
  Aquarius [1,0]                             Cancer [1,3]
  Capricorn [2,0]                            Leo [2,3]
  Sagittarius [3,0] Scorpio [3,1] Libra [3,2] Virgo [3,3]

The Lagna (Ascendant) sign cell is marked with "As" or highlighted.
Planet abbreviations: Su Mo Ma Me Ju Ve Sa Ra Ke
Retrograde planets are marked with "R" suffix (e.g. "Ve R").
```

---

## Features

**Calculation engine (`@parashari/core`)**
- Natal chart (D1 Rashi) with 9 planets: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu (Mean Node), Ketu (derived)
- All 16 standard varga (divisional) charts: D1 through D60 (Rashi, Hora, Drekkana, Chaturthamsha, Saptamsha, Navamsha, Dashamsha, Dwadashamsha, Shodashamsha, Vimshamsha, Chaturvimshamsha, Bhamsha, Trimshamsha, Khavedamsha, Akshavedamsha, Shashtiamsha)
- Vimshottari Dasha to 5 levels: Maha-dasha, Antar-dasha, Pratyantar-dasha, Sookshma-dasha, Prana-dasha (full 120-year tree)
- Shadbala planetary strength: 6 components in Virupas — Sthanabala, Digbala, Kalabala, Chestabala, Naisargikabala, Drigbala
- Ashtakavarga: Bindu Ashtakavarga (BAV) per planet, Sarvashtakavarga (SAV), Shodhana reductions (Trikona + Ekadhipatya)
- Yoga detection: 50+ classical yogas — Pancha Mahapurusha (Ruchaka, Bhadra, Hamsa, Malavya, Shasha), Raja Yogas, Dhana Yogas, Viparita Raja Yogas, Gajakesari, and more
- Nakshatra calculation with pada for all planets
- Lahiri ayanamsa (SE_SID_LAHIRI=1) as default; Raman and KP also supported
- Whole-sign house system throughout

**Web application (`@parashari/web` — Next.js 15)**
- Birth profile management: create, edit, delete; full-text search
- South Indian chart rendered as responsive HTML/CSS grid
- Varga selector (D1–D60) with per-varga chart display
- Dasha timeline showing current Maha-dasha and Antar-dasha periods
- Yoga list sorted by strength, categorised by type
- Shadbala table with per-component breakdown and Rupa totals
- Ashtakavarga grid (BAV per planet + SAV totals)
- Life events journal: categorised entries (Career, Relationship, Health, Finance, Travel, Education, Other) with date and sentiment, overlaid on dasha timeline
- Location search backed by a 55-city offline dataset (no API key required)
- Dark cosmic design: #0C0A09 background, #CA8A04 gold accent, DM Sans typeface, Liquid Glass card surfaces

**macOS desktop app (SwiftUI — macOS 14+)**
- Native SwiftUI interface with sidebar-based navigation
- Profile list with full CRUD operations
- Chart view, dasha view, yoga view (delegating calculations to local API)
- Offline mode: direct SQLite3 read when the API server is not running
- SyncService: 5-second file-modification polling, posts `databaseDidChange` notification when another process (e.g. the web app) modifies the database
- Server health indicator (online/offline status)

**API server (`@parashari/api` — Fastify 5)**
- Full CRUD for birth profiles, life events
- Calculation endpoints: `/calculations/chart`, `/calculations/vargas`, `/calculations/dashas`, `/calculations/yogas`, `/calculations/shadbala`, `/calculations/ashtakavarga`, `/calculations/full`
- `/calculations/dasha-at-date/:profile_id?date=YYYY-MM-DD` — look up the active dasha on any date
- Offline-capable geocode search and timezone reverse-lookup (no external services)
- SQLite calculation cache: 7-day TTL, per-profile, version-gated; invalidated automatically on birth data changes
- Zod request validation with structured error responses
- CORS and helmet middleware

---

## Tech Stack

| Component | Technology | Why chosen |
|-----------|-----------|------------|
| Monorepo | npm workspaces | Zero-config, no extra tooling; packages share TypeScript config and node_modules |
| Calculation engine | TypeScript (`@parashari/core`) | Type-safe, testable, runs in both Node.js API and (via transpile) Next.js |
| Astronomical backend | Swiss Ephemeris via `swisseph` v0.5.17 | Industry-standard C library; sub-arcsecond accuracy for planet positions |
| API server | Fastify v5 | ~2× faster than Express; first-class TypeScript; plugin architecture |
| Database access | `better-sqlite3` (synchronous) | Synchronous API matches Swiss Ephemeris sync callbacks; eliminates callback/Promise overhead for local-only use |
| Database | SQLite in WAL mode | File-based, zero-config, survives process crashes, concurrent reads |
| Web frontend | Next.js 15 App Router | Server Components reduce client bundle; layouts simplify page structure |
| Data fetching (web) | SWR | Lightweight stale-while-revalidate; ideal for mostly-read local data |
| Styling | Tailwind CSS | Utility classes keep component files self-contained; dark mode via `class` strategy |
| Chart rendering | HTML/CSS grid | No external dependency; fully responsive; accessible |
| Desktop | SwiftUI (macOS 14+) | Declarative UI, native performance, Combine publishers for reactive state |
| SQLite (desktop) | SQLite3 (system framework) | Direct read access without needing Node.js; works offline |
| Cross-app sync | 5-second file-modification poll | Simple and reliable; avoids NSFileCoordinator complexity for a local personal app |

---

## Prerequisites

```bash
node --version    # must be >= 20.0.0
npm --version     # must be >= 10.0.0
swift --version   # must be >= 6.0 (for macOS desktop build only)

# Swiss Ephemeris data files (required for accurate calculations beyond built-in Moshier)
brew install swiss-ephemeris
# Data files are installed to /usr/local/share/ephe/ or /opt/homebrew/share/ephe/
# Set EPHEMERIS_PATH env var if in a non-standard location
```

---

## Installation

```bash
git clone https://github.com/thotas/parashari-precision
cd parashari-precision
npm install

# Create the SQLite database at ~/Library/Application Support/ParashariApp/astrology.sqlite
npm run db:migrate

# Optional: seed with 3 test profiles
npm run db:seed
```

---

## Running

```bash
# Start API server (port 3001) and web app (port 3000) concurrently
npm run dev

# Or individually:
npm run dev:api             # Fastify API server only  — http://localhost:3001
npm run dev:web             # Next.js web app only     — http://localhost:3000
```

The web app proxies all `/api/*` requests to the API server. Both must be running for full functionality. If the API server is unavailable, the macOS app falls back to direct SQLite access (read-only).

---

## macOS Desktop App

```bash
# Build from command line
cd desktop
xcodebuild -project ParashariPrecision.xcodeproj \
           -scheme "Parashari Precision" \
           -configuration Debug \
           build

# The built app is located at:
# ~/Library/Developer/Xcode/DerivedData/ParashariPrecision-*/Build/Products/Debug/Parashari Precision.app

# Or open in Xcode and run (Cmd+R)
open desktop/ParashariPrecision.xcodeproj
```

### App Icon

The app icon is generated using a Python script located at `generate_icon.py`. To regenerate the icon:

```bash
python3 generate_icon.py
```

This creates all required icon sizes in `desktop/ParashariPrecision/Resources/Assets.xcassets/AppIcon.appiconset/`. The icon follows Apple's design guidelines with a cosmic/astrology theme matching the app's dark gold aesthetic.

Minimum deployment target: macOS 14 (Sonoma). The desktop app reads the same SQLite file that the API server writes to, so changes made in the web app are reflected in the native app within 5 seconds.

---

## Testing

```bash
# Unit tests for @parashari/core and @parashari/api
npm test

# Unit tests + Playwright e2e (requires both servers running)
npm run test:all

# e2e only
npx playwright test

# Watch mode (core unit tests)
npm -w packages/core run test:watch
```

Test files live in `tests/unit/`, `tests/integration/`, and `tests/e2e/`. Core calculation tests include known-value fixtures (e.g. TC-02: 14° Cancer → Scorpio in D9 via global navamsha formula).

---

## Configuration

Environment variables (place in `.env` at repo root for development):

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_PATH` | `~/Library/Application Support/ParashariApp/astrology.sqlite` (macOS) | Override SQLite file path (useful for tests) |
| `EPHEMERIS_PATH` | `''` (Swiss Ephemeris default search path) | Directory containing Swiss Ephemeris `.se1` data files |
| `PORT` | `3001` | Fastify API server port |
| `NODE_ENV` | `development` | Set to `production` to suppress stack traces in error responses |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | API base URL (used by Next.js client; overrides the proxy rewrite) |

The `ephemeris_path` setting is also stored in the `settings` table and read at API startup if `EPHEMERIS_PATH` is not set. Update it via `npm run db:migrate` after editing the seed value, or directly with SQLite.

---

## Architecture Overview

The architecture follows a **Local-First Shared State** pattern. The SQLite database is the single source of truth, written by the API server and read by both the web frontend (through the API) and the macOS app (directly).

```
parashari-precision/
├── packages/
│   ├── core/           @parashari/core — calculation engine (TypeScript)
│   │   └── src/
│   │       ├── types/         — Planet, Sign, House, Varga enums; ChartData, DashaPeriod interfaces
│   │       ├── ephemeris/     — Swiss Ephemeris wrapper (swissEph.ts)
│   │       ├── calculations/  — vargas.ts, dashas.ts, shadbala.ts, ashtakavarga.ts, yogas.ts
│   │       ├── chart/         — southIndian.ts (layout + ASCII renderer)
│   │       └── index.ts       — AstrologyEngine class + barrel exports
│   │
│   ├── api/            @parashari/api — Fastify server
│   │   └── src/
│   │       ├── database/      — db.ts (singleton), profiles.ts, cache.ts, events.ts, migrate.ts, seed.ts
│   │       ├── middleware/    — errorHandler.ts
│   │       ├── routes/        — profiles.ts, calculations.ts, events.ts, geocode.ts
│   │       └── index.ts       — server registration + startup
│   │
│   └── web/            @parashari/web — Next.js 15 web app
│       └── src/
│           ├── app/           — App Router pages: dashboard, chart, profile
│           ├── components/    — chart/, forms/, ui/ (Button, Card, Badge)
│           └── lib/           — api.ts (fetch client), hooks.ts (SWR hooks), constants.ts, utils.ts
│
├── desktop/
│   └── ParashariPrecision/    — SwiftUI macOS app
│       ├── App/               — AppDelegate, ParashariPrecisionApp
│       ├── Models/            — Profile, ChartData, DashaPeriod, YogaResult (Codable structs)
│       ├── ViewModels/        — ProfilesViewModel, ChartViewModel, DashaViewModel (@MainActor)
│       ├── Views/             — Sidebar, Profile, Chart, Dasha, Yoga, Components
│       └── Services/          — APIService (actor), DatabaseService (actor), SyncService (@MainActor)
│
├── database/
│   └── schema.sql             — DDL for all tables; run via npm run db:migrate
│
└── tests/
    ├── unit/                  — @parashari/core calculation unit tests
    ├── integration/           — API route integration tests
    └── e2e/                   — Playwright browser tests
```

See `ARCHITECTURE.md` for the full system diagram, data flow, and API reference.

---

## Known Limitations

- **Swiss Ephemeris data files required**: The `swisseph` npm package ships with a built-in Moshier ephemeris (lower precision). For accurate results, install the full Swiss Ephemeris data files (`brew install swiss-ephemeris`) and set `EPHEMERIS_PATH` to the directory containing the `.se1` files.
- **No cloud sync**: The SQLite database is local only. There is no cloud backup, multi-device sync, or user authentication. This is intentional for a privacy-first local tool.
- **macOS desktop only**: The Swift/SwiftUI desktop app targets macOS 14+. There is no iOS, Windows, or Linux native app.
- **Geocode dataset is static**: The built-in city dataset covers approximately 55 cities worldwide. For births in unlisted locations, coordinates and timezone must be entered manually.
- **Offline limitation (web)**: The web app requires the Fastify API server to be running. It does not have its own offline mode; only the macOS native app has direct SQLite fallback.
- **Ayanamsa options**: Three ayanamsa systems are implemented (Lahiri, Raman, KP). Other systems (Fagan-Bradley, Yukteshwar, etc.) are not currently supported.
- **Single user**: There is no multi-user or access control system. The app is designed for personal use.

---

## Roadmap

The following features are candidates for future development:

- **Transit charts**: Overlay current planetary positions on the natal chart; transit-to-natal aspect detection
- **Muhurta (electional astrology)**: Find auspicious times for events based on planetary positions and lunar tithi
- **Horary astrology (Prashna)**: Cast a chart for the moment a question is asked
- **Synastry**: Overlay two charts for relationship compatibility analysis
- **Yogini Dasha**: Alternative dasha system (8 planets × 8 lords cycle)
- **Char Dasha** (Jaimini): Sign-based dasha system
- **Cloud sync via CRDTs**: Optional sync layer using a conflict-free replicated data type approach to preserve the local-first model
- **iOS app**: SwiftUI-based companion app sharing the same data model
- **PDF/PNG chart export**: Print-quality chart export from both web and desktop
- **Additional ayanamsas**: Fagan-Bradley, Yukteshwar, True Chitrapaksha

---

## License

MIT License. See `LICENSE` for full text.
