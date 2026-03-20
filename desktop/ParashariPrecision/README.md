# ParashariPrecision

Vedic astrology predictions with standalone Swift calculations.

## What It Does

ParashariPrecision is a macOS app for Vedic (Indian) astrology predictions. It calculates birth charts (Kundli), Vimshottari dasha periods, planetary yogas, Shadbala strength, Ashtakavarga, and delivers hourly/monthly predictions.

## Key Features

- **Birth Chart Display** - South Indian chart layout with all 9 planets
- **Divisional Charts (Vargas)** - D1 through D24+ varga calculations
- **Vimshottari Dashas** - Mahadasha, Antardasha, Pratyantardasha, Sookshmadasha, Dwikadasha
- **Yoga Detection** - 50+ planetary combinations (Raja Yoga, Dhana Yoga, etc.)
- **Shadbala** - Six-fold planetary strength analysis
- **Ashtakavarga** - Bindu and Sarva Ashtakavarga charts
- **Predictions** - Hourly and monthly transit-based predictions
- **Offline-First** - Pure Swift calculations (no CLI server needed after initial cache)

## Tech Stack

- **Swift** - Native Swift 5.9+
- **SwiftUI** - Modern declarative UI framework
- **SQLite** - Local data storage (shared with CLI)
- **MVVM + Actors** - Architecture pattern with thread-safe services

## Architecture

```
┌─────────────────┐                    ┌─────────────────┐
│  SwiftUI App    │                    │  SQLite DB      │
│                 │                    │  (shared)       │
│  - Views       │ ──────────────────▶│  - profiles     │
│  - ViewModels  │◀───────────────────│  - chart_cache  │
└─────────────────┘                    └─────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  AstrologyCore (Pure Swift)                                 │
│  - Vargas, Dashas, Yogas, Shadbala, Ashtakavarga, Predictions│
└─────────────────────────────────────────────────────────────┘
```

## How to Run

### Prerequisites

- macOS 13.0+ (Ventura or later)
- Xcode 15.0+

### Build & Run

```bash
cd desktop/ParashariPrecision
open ParashariPrecision.xcodeproj
```

In Xcode:
1. Select the ParashariPrecision scheme
2. Press ⌘R to build and run

### Initial Setup (First Run)

1. **Option A: Use CLI to populate cache**
   - Run the CLI server to compute initial charts
   - App will read cached calculations from SQLite

2. **Option B: Wait for local calculations (future)**
   - When Swift calculation modules are complete
   - App will compute locally without CLI

## Known Limitations

- **Initial computation requires CLI** - If the SQLite cache is empty, you must run the CLI server once to compute birth charts before using the app
- **Transits require cache** - Hourly predictions depend on transit calculations in cache
- **Some vargas pending** - Not all 16+ vargas may be fully implemented in pure Swift yet

## Project Structure

```
ParashariPrecision/
├── Models/                    # Data models (ChartData, Profile, etc.)
├── Views/                     # SwiftUI views
│   ├── Profile/             # Profile management
│   ├── Chart/               # Birth chart display
│   ├── Components/          # Reusable UI
│   ├── Ashtakavarga/        # Ashtakavarga views
│   └── Shadbala/            # Shadbala views
├── ViewModels/              # MVVM view models
├── Services/                # Business logic
│   ├── DatabaseService.swift
│   ├── APIService.swift
│   ├── CalculationService.swift
│   └── AstrologyCore/       # Pure Swift calculations
└── Resources/               # Assets
```

## Development

### Running Tests

```bash
xcodebuild test -scheme ParashariPrecision
```

### Adding Features

1. Create calculation in `Services/AstrologyCore/Calculations/`
2. Add service method in `CalculationService`
3. Create ViewModel in `ViewModels/`
4. Add View in `Views/`

## Credits

- Based on Parashari astrology traditions
- Calculations reference Swiss Ephemeris (via CLI cache)
- UI built with SwiftUI and macOS design guidelines
