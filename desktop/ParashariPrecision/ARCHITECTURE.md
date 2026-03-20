# ParashariPrecision Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ParashariPrecision                          │
│                    (Vedic Astrology Predictions)                    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   SwiftUI App  │      │    SQLite DB     │      │   CLI Server    │
│                 │      │   (shared)      │      │   (Node.js)     │
│ - Views        │      │                 │      │                 │
│ - ViewModels   │─────▶│ - profiles      │◀─────│ - Swiss Eph     │
│ - Services     │◀─────│ - chart_cache   │─────▶│ - Calculations  │
└─────────────────┘      └─────────────────┘      └─────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AstrologyCore (Pure Swift)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐  │
│  │ Ephemeris   │  │Calculations │  │       Services            │  │
│  │ - JulianDay │  │ - Vargas    │  │  - CalculationService    │  │
│  │ - Positions │  │ - Dashas    │  │  - DatabaseCache         │  │
│  │ (from cache)│  │ - Yogas     │  │  - CompatibilityChecker  │  │
│  │             │  │ - Shadbala  │  │                          │  │
│  │             │  │ - Ashtakav  │  │                          │  │
│  │             │  │ - Transit   │  │                          │  │
│  │             │  │ - Predictions│  │                          │  │
│  └─────────────┘  └─────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. Views Layer (`Views/`)

SwiftUI views for user interface:
- `Profile/` - Profile list, detail, and creation views
- `Chart/` - Birth chart display with South Indian layout
- `Components/` - Reusable UI components and design system
- `Ashtakavarga/` - Ashtakavarga charts and results
- `Shadbala/` - Shadbala strength visualization

### 2. ViewModels Layer (`ViewModels/`)

- `ProfileViewModel` - Profile CRUD operations
- `ChartViewModel` - Chart loading and display
- `AshtakavargaViewModel` - Ashtakavarga calculations
- `ShadbalaViewModel` - Shadbala calculations

### 3. Services Layer (`Services/`)

| Service | Responsibility |
|---------|----------------|
| `DatabaseService` | SQLite read/write via SQLite3 C API |
| `APIService` | HTTP calls to CLI server (legacy) |
| `CalculationService` | Local Swift calculations (actor-based) |
| `SyncService` | Profile sync between app and CLI |
| `AstrologyCore/` | Pure Swift calculation modules |

### 4. Models Layer (`Models/`)

- `Profile.swift` - Birth profile data
- `ChartData.swift` - Planet positions, houses, ascendant
- `DashaPeriod.swift` - Vimshottari dasha periods
- `YogaResult.swift` - Detected yogas with descriptions
- `ShadbalaResult.swift` - Six-fold strength results
- `AshtakavargaResult.swift` - BAV/SAV data
- `Prediction.swift` - Hourly/monthly predictions

## Data Flow: Profile → Chart → Predictions

```
1. User creates/selects Profile
         │
         ▼
2. ViewModel requests Chart from CalculationService
         │
         ▼
3. CalculationService checks cache (DatabaseService)
         │
         ├───── Cache hit ─────▶ Return ChartData
         │
         └───── Cache miss ────▶ Compute locally (future)
                                    │
                                    ▼
4. ChartData returned with:
   - Planet positions (9 planets)
   - House cusps (12 houses)
   - Ascendant sign/degree
   - Ayanamsa value
         │
         ▼
5. Additional calculations requested:
   - Dashas (from Moon's nakshatra)
   - Yogas (from planet positions)
   - Shadbala (strength analysis)
   - Ashtakavarga (bindu analysis)
         │
         ▼
6. Predictions generated:
   - Hourly predictions (transit-based)
   - Monthly aggregations
```

## State Management

**Pattern:** ObservableObject ViewModels with @Published properties

```swift
class ChartViewModel: ObservableObject {
    @Published var chart: ChartData?
    @Published var isLoading = false
    @Published var error: Error?

    func loadChart(for profile: BirthProfile) async { ... }
}
```

**Flow:**
1. View calls ViewModel method
2. ViewModel calls Service (async)
3. Service returns data
4. ViewModel updates @Published property
5. View automatically refreshes via @StateObject

## Storage Schema (SQLite)

### Tables

**profiles**
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | UUID |
| name | TEXT | Profile name |
| dob_utc | TEXT | ISO8601 datetime |
| lat | REAL | Latitude |
| lon | REAL | Longitude |
| timezone | TEXT | IANA timezone |
| place_name | TEXT | Location name |

**chart_cache**
| Column | Type | Description |
|--------|------|-------------|
| profile_id | TEXT | Foreign key to profiles |
| varga | TEXT | Divisional chart (D1, D9, etc.) |
| data | TEXT | JSON-encoded ChartData |
| calculated_at | TEXT | ISO8601 timestamp |

**notes**
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| profile_id | TEXT | Foreign key |
| content | TEXT | Note content |
| created_at | TEXT | ISO8601 timestamp |

## Async/Concurrency Model

**Pattern:** Swift async/await with Actors

```swift
actor CalculationService {
    func calculateChart(for profile: BirthProfile) async throws -> ChartData
    func calculateDashas(for profile: BirthProfile) async throws -> [DashaPeriod]
}
```

**Benefits:**
- Thread-safe calculations without locks
- No race conditions on shared state
- Structured concurrency with cancellation support
- Integration with SwiftUI's .task() modifier

## Extension Points

### Adding New Calculations

1. Create calculation file in `AstrologyCore/Calculations/`
2. Add method to `CalculationService`
3. Add result model in `Models/`
4. Create ViewModel and View as needed

### Adding New Vargas

1. Update `VargasCalculator` with varga formula
2. Add to varga enum if needed
3. View will automatically render new varga

### Adding New Predictions

1. Add prediction logic to `PredictionEngine`
2. Return new prediction type
3. Update View to display

---

## Technical Stack

- **Language:** Swift 5.9+
- **UI Framework:** SwiftUI
- **Database:** SQLite3 (via C API)
- **Architecture:** MVVM with Actors
- **Concurrency:** async/await
- **Platform:** macOS (standalone app)

## Dependencies

None - fully standalone with pure Swift calculations.
