# Architectural Decisions

This document records major architectural decisions for the ParashariPrecision Swift app.

## Decision 1: Ephemeris Strategy - Hybrid Cache-First

**Problem:** Swiss Ephemeris is a C library and cannot be directly ported to Swift.

**Solution:** Use a hybrid cache-first strategy:
1. **Primary:** Read pre-computed planet positions from SQLite `chart_cache` table (written by CLI)
2. **Fallback:** Pure Swift astronomical approximations (future enhancement)

**Trade-offs:**
- CLI must run first to populate cache (initial computation)
- Swift app depends on CLI for first-time calculations
- Both share same SQLite database - no duplication

## Decision 2: Actor-based CalculationService

**Solution:** Use Swift actors for thread-safe async calculations.

```swift
actor CalculationService {
    static let shared = CalculationService()
    // ... methods
}
```

**Rationale:**
- Swift actors provide built-in thread safety
- Calculations can be called from multiple ViewModels safely
- No manual synchronization needed
- Isolated state prevents race conditions

## Decision 3: Cache-first Data Flow

**Pattern:**
1. Check SQLite cache for existing calculation
2. If cached and valid: return cached data
3. If not cached: compute locally using Swift calculations
4. Save result to cache for future use

**Benefits:**
- Fast app startup (no wait for computation)
- Offline-capable after initial CLI run
- Consistent results (same cache used by CLI)

## Decision 4: CLI Compatibility Preserved

**Solution:** Both CLI and Swift app read/write to the same SQLite database.

- CLI writes: `chart_cache`, `profiles` tables
- Swift reads: Same tables via DatabaseService
- No data duplication or sync needed
- Users can use CLI or App interchangeably

## Decision 5: Pure Swift Calculations Ported

All astrological calculations have been ported to pure Swift:
- **Vargas:** Divisional chart sign calculations (D1-D24+)
- **Dashas:** Vimshottari dasha system (5 levels)
- **Yogas:** 50+ yoga detection
- **Shadbala:** Six-fold planetary strength
- **Ashtakavarga:** BAV/SAV calculations
- **Transit:** Transit positions and hourly scores
- **Predictions:** Text prediction generation

**Rationale:**
- All calculations are pure mathematical/logic functions
- No external dependencies required
- Deterministic and testable
- Only ephemeris data comes from cache

## Decision 6: Keep APIService for Profile CRUD

**Solution:** APIService handles profile operations (create, update, delete, fetch). CalculationService handles astrological calculations.

**Rationale:**
- Profile data managed by backend (source of truth)
- Calculations can be local (Chart, Dashas, etc.)
- Separation of concerns

## Decision 7: Model Layer Separation

**Pattern:** Internal calculation models → Display models

- Internal models in `Models/` for SwiftUI display
- Parallel internal models in `AstrologyCore/` for calculations
- Convert between them as needed

**Trade-offs:**
- Slight code duplication
- Clean separation of concerns
- Models optimized for their specific use case

---

*Last updated: 2026-03-20*
