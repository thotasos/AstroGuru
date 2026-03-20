# AstrologyCore Architecture Document

## Overview

This document specifies the architecture for porting TypeScript Vedic astrology calculations to native Swift, enabling the macOS app to work WITHOUT the CLI server.

## Current Architecture

```
┌─────────────────┐     HTTP/5199      ┌─────────────────┐
│  SwiftUI App    │ ─────────────────▶│  CLI Server     │
│                 │                    │  (Node.js)      │
│  - APIService  │◀───────────────────│  - Swiss Eph    │
│  - ViewModels  │                    │  - Calculations │
└─────────────────┘                    └─────────────────┘
                                                │
                                                ▼
                                        ┌─────────────────┐
                                        │  SQLite DB      │
                                        │  (shared)       │
                                        │  - profiles     │
                                        │  - calculations │
                                        └─────────────────┘
```

## Target Architecture

```
┌─────────────────┐                    ┌─────────────────┐
│  SwiftUI App    │                    │  SQLite DB      │
│                 │                    │  (shared)       │
│  - ViewModels  │ ──────────────────▶│  - profiles     │
│  - Views       │◀───────────────────│  - calculations │
└─────────────────┘                    └─────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  AstrologyCore (Pure Swift)                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │ Ephemeris   │  │Calculations │  │  Services        │  │
│  │ - JulianDay │  │ - Vargas    │  │  - Calculation   │  │
│  │ - Positions │  │ - Dashas    │  │    Service       │  │
│  │ (from cache)│  │ - Yogas     │  │  - Cache Service │  │
│  │             │  │ - Shadbala  │  │                  │  │
│  │             │  │ - Ashtakav  │  │                  │  │
│  │             │  │ - Transit   │  │                  │  │
│  │             │  │ - Predictions│  │                  │  │
│  └─────────────┘  └─────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Module Structure

```
AstrologyCore/
├── Models/
│   ├── AstroEnums.swift          # Planet, Sign, House, Varga, Ayanamsa
│   ├── PlanetPosition.swift      # Internal planet position model
│   ├── ChartData.swift          # Internal chart data model
│   ├── NakshatraInfo.swift      # Nakshatra data structure
│   ├── DashaData.swift          # Dasha period structures
│   ├── YogaData.swift           # Yoga detection results
│   ├── ShadbalaData.swift       # Six-fold strength results
│   └── AshtakavargaData.swift   # Ashtakavarga results
│
├── Ephemeris/
│   ├── JulianDate.swift          # JD calculation utilities
│   ├── PlanetCalculator.swift   # Planet position calculations
│   ├── Ayanamsa.swift           # Ayanamsa calculations
│   ├── HouseCalculator.swift     # House/Ascendant calculations
│   └── PositionCache.swift       # Read cached positions from DB
│
├── Calculations/
│   ├── VargasCalculator.swift    # Divisional chart signs
│   ├── DashaCalculator.swift     # Vimshottari dasha system
│   ├── NakshatraCalculator.swift # Nakshatra/pada calculations
│   ├── YogaDetector.swift       # 50+ yoga detection
│   ├── ShadbalaCalculator.swift  # Six-fold planetary strength
│   ├── AshtakavargaCalculator.swift # Ashtakavarga calculations
│   ├── TransitCalculator.swift   # Transit positions & scores
│   └── PredictionEngine.swift    # Text predictions generation
│
├── Services/
│   ├── CalculationService.swift  # Main API for calculations
│   ├── DatabaseCache.swift       # Read from existing SQLite cache
│   └── CompatibilityChecker.swift # Cache validation
│
└── Utilities/
    ├── Constants.swift           # Dasha sequences, sign rulers, etc.
    ├── Extensions.swift          # Helper extensions
    └── AstroMath.swift           # Mathematical utilities
```

---

## 2. Ephemeris Strategy

### Constraint
Swiss Ephemeris is a C library and cannot be directly ported to Swift.

### Chosen Approach: **Hybrid Cache-First**

#### Strategy
1. **Primary**: Read pre-computed planet positions from SQLite `calculations_cache` table
2. **Fallback**: Use simplified astronomical approximations for cases not in cache

#### Implementation

**Reading from Cache (Primary):**
```swift
// The existing DB already has this table from CLI:
// calculations_cache(profile_id, calculation_type, computed_at, data_json)

struct CachedPosition {
    let planet: Planet
    let tropicalLongitude: Double
    let latitude: Double
    let speed: Double
    let isRetrograde: Bool
    let computedAt: Date
}
```

**Approximation Formulas (Fallback/Enhancement):**
For future enhancement, implement simplified mean planetary position algorithms:
- Mean longitude = mean_anomaly + node_correction
- Use established astronomical constants (e.g., VSOP87 simplified)
- Accuracy target: ~1-2 degrees (sufficient for varga calculations)

**Note**: The CLI writes to this cache. The Swift app reads from it. This maintains backward compatibility.

---

## 3. Data Flow

```
Profile (Birth Data)
        │
        ▼
┌───────────────────┐
│ CalculationService│
│ .calculateChart() │
└───────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 1: Get Planet Positions                                 │
│   - Check cache for profile_id + D1 calculation             │
│   - If cached: read positions                               │
│   - If not: compute using ephemeris (future)               │
└──────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 2: Calculate Ascendant & Houses                        │
│   - Use cached or compute house cusps                       │
└──────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 3: Calculate Vargas (Divisional Charts)                │
│   - D1, D2, D3, D7, D9, D10, D12, D16, D20, D24...       │
│   - Pure Swift based on sidereal longitudes                 │
└──────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 4: Calculate Dashas                                    │
│   - Get Moon's nakshatra from sidereal longitude            │
│   - Calculate Vimshottari dasha periods (5 levels)         │
└──────────────────────────────────────────────────────────────┘
        │
        ├───────────────────┬───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ YogaDetector  │  │ ShadbalaCalc  │  │ Ashtakavarga │
│ - Pancha Maha │  │ - Ucha Bala   │  │ - BAV        │
│ - Raja Yoga  │  │ - Sthaana     │  │ - SAV        │
│ - Dhana Yoga │  │ - Dig Bala    │  │ - Shodhana   │
│ - ...        │  │ - KAla Bala   │  │              │
└───────────────┘  └───────────────┘  └───────────────┘
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ PredictionEngine    │
                 │ - Generate summaries│
                 │ - Transit analysis  │
                 │ - Period strength   │
                 └─────────────────────┘
```

---

## 4. Service Layer Design

### CalculationService (Main Entry Point)

```swift
actor CalculationService {
    static let shared = CalculationService()

    // Main calculation - returns complete chart data
    func calculateChart(
        profile: BirthProfile,
        varga: Varga = .D1
    ) async throws -> ChartData

    // Full calculation with all vargas and analysis
    func calculateFull(
        profile: BirthProfile
    ) async throws -> FullChartData

    // Individual calculations
    func calculateDashas(moonLongitude: Double, birthDate: Date) -> [DashaPeriod]
    func calculateYogas(chart: ChartData) -> [YogaResult]
    func calculateShadbala(chart: ChartData) -> [ShadbalaResult]
    func calculateAshtakavarga(chart: ChartData) -> AshtakavargaResult

    // Predictions
    func getHourlyPredictions(
        profile: BirthProfile,
        date: Date
    ) async throws -> [HourlyPrediction]

    func getMonthlyPredictions(
        profile: BirthProfile,
        year: Int,
        month: Int
    ) async throws -> MonthlyPrediction

    // Cache management
    func getCachedCalculation(profileId: String, type: CalculationType) -> CachedData?
    func invalidateCache(profileId: String)
}
```

### DatabaseCache Service

```swift
actor DatabaseCache {
    // Read from existing SQLite (same DB as CLI)
    func getPlanetPositions(profileId: String, varga: Varga) -> [CachedPosition]?
    func getChartData(profileId: String, varga: Varga) -> ChartData?
    func isCacheValid(profileId: String, type: CalculationType) -> Bool

    // Write results (for future local computation)
    func saveCalculation(profileId: String, type: CalculationType, data: Data)
}
```

---

## 5. Compatibility

### Reading Existing Cached Calculations

The SQLite schema (from `database/schema.sql`) includes:
- `profiles` - Birth profiles
- `calculations_cache` - Pre-computed chart data

**Strategy:**
1. On app launch, check if CLI has computed data for a profile
2. Read from `calculations_cache` table using existing DatabaseService
3. If valid cache exists, use it directly (no recomputation)
4. If cache invalid/missing, fall back to CLI or show error

### Cache Validation

```swift
struct CacheValidation {
    static func isValid(
        cached: Date,
        for profile: BirthProfile,
        calculationType: CalculationType
    ) -> Bool {
        // Check if profile was modified after cache
        // Check if calculation type matches
        // Check expiration (e.g., 30 days for transit)
    }
}
```

### Compatibility Checklist

- [x] Keep existing SQLite database schema
- [x] CLI continues to write to `calculations_cache`
- [x] Swift reads from same database
- [x] Profile CRUD operations unchanged
- [x] ViewModels can use either APIService (CLI) or CalculationService (native)

---

## 6. File-by-File Porting Guide

### Phase 1: Core Infrastructure (Priority: Critical)

| TypeScript File | Swift File | Description |
|----------------|------------|-------------|
| `swissEph.ts` | `JulianDate.swift` | JD calculation from birth datetime |
| `swissEph.ts` | `Ayanamsa.swift` | Ayanamsa value calculation |
| `swissEph.ts` | `PlanetCalculator.swift` | Planet position from cache |
| `swissEph.ts` | `HouseCalculator.swift` | Ascendant/house cusps |

### Phase 2: Primary Calculations (Priority: High)

| TypeScript File | Swift File | Description |
|----------------|------------|-------------|
| `vargas.ts` | `VargasCalculator.swift` | All 16 varga sign calculations |
| `dashas.ts` | `NakshatraCalculator.swift` | Nakshatra/pada from longitude |
| `dashas.ts` | `DashaCalculator.swift` | Vimshottari 5-level dasha |

### Phase 3: Chart Analysis (Priority: High)

| TypeScript File | Swift File | Description |
|----------------|------------|-------------|
| `yogas.ts` | `YogaDetector.swift` | 50+ yoga detection |
| `shadbala.ts` | `ShadbalaCalculator.swift` | Six-fold strength |
| `ashtakavarga.ts` | `AshtakavargaCalculator.swift` | BAV/SAV calculations |

### Phase 4: Predictions (Priority: Medium)

| TypeScript File | Swift File | Description |
|----------------|------------|-------------|
| `transit.ts` | `TransitCalculator.swift` | Transit positions & hourly scores |
| `predictions.ts` | `PredictionEngine.swift` | Text prediction generation |
| - | `HourlyPredictionGenerator.swift` | Hourly category predictions |
| - | `MonthlyAggregator.swift` | Monthly prediction aggregation |

---

## 7. Key Design Decisions

### Decision 1: Use Actor for CalculationService

**Rationale**: Swift actors provide thread-safe, isolated state management ideal for complex calculations that might be called from multiple ViewModels.

### Decision 2: Reuse Existing Swift Models

**Rationale**: The existing Swift models in `Models/` are already optimized for SwiftUI display. Create parallel internal models for calculation, then convert to display models.

### Decision 3: Port Calculations to Pure Swift

**Rationale**:
- All varga, dasha, yoga, shadbala, ashtakavarga calculations are pure mathematical/logic functions
- No external dependencies needed
- These are deterministic and testable
- Only ephemeris requires external data (cache)

### Decision 4: Preserve CLI Compatibility

**Rationale**:
- CLI remains the "source of truth" for initial computations
- Swift app reads cached data
- Both write to same SQLite database
- Users can use either CLI or App for calculations

---

## 8. Migration Path

### Step 1: Create AstrologyCore module
- Create directory structure
- Implement core models and utilities

### Step 2: Implement CalculationService
- Add cache reading from existing DB
- Implement fallback to CLI for invalid cache

### Step 3: Port Calculations (Priority Order)
- Vargas (used everywhere)
- Dashas (used for predictions)
- Yogas, Shadbala, Ashtakavarga

### Step 4: Update ViewModels
- Add toggle between APIService and CalculationService
- Default to CalculationService when cache valid

### Step 5: Deprecate CLI Dependency
- Mark APIService as deprecated
- Remove HTTP calls once CalculationService is proven

---

## 9. Testing Strategy

### Unit Tests
- Test each calculation against known TypeScript outputs
- Use golden test data from CLI predictions
- Test edge cases (retrograde planets, exalted/debilitated positions)

### Integration Tests
- Test full calculation pipeline
- Verify cache read/write
- Test prediction accuracy

---

## 10. Future Enhancements

### Local Ephemeris (Phase 2)
- Implement simplified astronomical algorithms
- Pre-compute position tables for common dates
- Reduce dependency on CLI entirely

### Enhanced Predictions
- Add ML-based prediction refinement
- Add user feedback loop
- Personalized interpretation database
