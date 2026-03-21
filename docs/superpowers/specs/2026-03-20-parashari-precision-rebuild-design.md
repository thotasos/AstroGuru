# Parashari Precision - Desktop App Rebuild Design

## Overview

Rebuild the Parashari Precision macOS app with an incremental, test-driven approach. No HTTP/API runtime dependency — all calculations run locally via JavaScriptCore bridging to the existing `@parashari/core` calculation engine.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    macOS App (SwiftUI)                      │
│                                                             │
│  ┌──────────────┐   ┌─────────────┐   ┌────────────────┐  │
│  │   Views      │◄──│ ViewModels  │◄──│ DatabaseService │  │
│  │  (SwiftUI)   │   │ @MainActor  │   │    (SQLite)    │  │
│  └──────────────┘   └──────┬──────┘   └────────────────┘  │
│                             │                                │
│                    ┌────────▼────────┐                      │
│                    │ AstrologyCore   │                      │
│                    │ (JSContext)     │                      │
│                    │ @parashari/core │                      │
│                    └─────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

**No Node.js API server at runtime.** JavaScriptCore embeds the calculation engine directly in the macOS app.

---

## Build Order (TDD)

### Phase 1: Foundation
1. **Models** — Pure Swift structs: Profile, ChartData, PlanetPosition, HousePosition, DashaPeriod, YogaResult, ShadbalaResult, AshtakavargaResult
2. **DatabaseService** — SQLite CRUD for profiles and cache. No API dependency.
3. **AstrologyCore** — JavaScriptCore bridge to `@parashari/core`. Swift calls JS, receives JSON, decodes to Swift models.

### Phase 2: Core Features
4. **Profile Management** — ProfileListView, NewProfileView, ProfileDetailView
5. **Chart View** — South Indian chart rendering, varga selector
6. **Dasha View** — Vimshottari Dasha timeline, period display

### Phase 3: Advanced Calculations
7. **Shadbala View** — Strength calculations per planet
8. **Ashtakavarga View** — BAV/SAV display
9. **Yoga List View** — Detected yogas with descriptions

### Phase 4: Predictions
10. **LocalPredictionGenerator** — Rule-based natal predictions
11. **PredictionsView** — Display predictions by dasha period

---

## Database Schema

Stored in `~/Library/Application Support/ParashariPrecision/astrology.sqlite`

```sql
CREATE TABLE profiles (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  dob_utc      TEXT NOT NULL,
  lat          REAL NOT NULL,
  lon          REAL NOT NULL,
  timezone     TEXT NOT NULL,
  utc_offset   REAL NOT NULL,
  place_name   TEXT,
  ayanamsa_id  INTEGER DEFAULT 1,
  notes        TEXT,
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE calculation_cache (
  profile_id       TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  chart_json       TEXT,
  vargas_json      TEXT,
  dashas_json      TEXT,
  yogas_json       TEXT,
  shadbala_json    TEXT,
  ashtakavarga_json TEXT,
  computed_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE events_journal (
  id          TEXT PRIMARY KEY,
  profile_id  TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  event_date  TEXT NOT NULL,
  category    TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  sentiment   INTEGER,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE ayanamsas (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT
);
```

---

## AstrologyCore Bridge

- Use JavaScriptCore (`JavaScriptCore.framework`) to load `@parashari/core`
- Bundle `node_modules/@parashari/core` in the app bundle
- Swift creates a `JSContext`, evaluates the module, calls exported functions
- Results are JSON strings → decoded to Swift models via `Codable`
- Fallback: if JavaScriptCore ESM support is insufficient, use Process spawning with a thin Node wrapper

---

## Sample Test Profiles

Create 3 sample profiles for testing:
1. Mahatma Gandhi (1869-10-02 04:50 UTC, Porbandar)
2. Steve Jobs (1955-02-24 10:15 UTC, San Francisco)
3. Test User (2000-01-01 12:00 UTC, New Delhi)

---

## Testing Strategy

- **Unit tests**: XCTest for each Swift model, ViewModel, DatabaseService
- **UI tests**: XCTest UI testing for profile creation, chart navigation
- **Integration**: Full calculation round-trip with sample profiles
- All tests must pass before each phase is marked complete
