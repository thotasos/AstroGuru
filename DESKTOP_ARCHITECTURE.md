# AstroGuru Desktop Architecture

## Overview
This document describes the architecture of the Parashari Precision macOS desktop application, which provides a native UI for the AstroGuru Vedic astrology suite.

## Current Architecture

### Technology Stack
- **Platform**: macOS 14.0+ (native)
- **UI Framework**: SwiftUI
- **Architecture Pattern**: MVVM
- **Data Layer**: REST API + local SQLite caching
- **State Management**: Combine + @Published properties

### Project Structure

```
ParashariPrecision/
├── App/
│   ├── ParashariPrecisionApp.swift    # App entry point
│   └── AppDelegate.swift               # App delegate
├── Models/
│   ├── Profile.swift                   # Birth profile model
│   ├── ChartData.swift                 # Chart calculation results
│   ├── DashaPeriod.swift               # Vimshottari Dasha periods
│   ├── YogaResult.swift                 # Yoga detection results
│   └── Prediction.swift                 # Hourly/Monthly predictions
├── ViewModels/
│   ├── ProfilesViewModel.swift          # Profile management
│   ├── ChartViewModel.swift             # Chart calculations
│   ├── DashaViewModel.swift             # Dasha timeline
│   └── PredictionsViewModel.swift       # Predictions (NEW)
├── Views/
│   ├── MainWindowView.swift             # Main window
│   ├── Sidebar/
│   ├── Profile/
│   ├── Chart/
│   ├── Dasha/
│   ├── Yoga/
│   ├── Predictions/                     # NEW
│   │   ├── PredictionsView.swift
│   │   ├── HourlyPredictionsView.swift
│   │   └── MonthlyPredictionsView.swift
│   └── Components/
│       ├── DesignSystem.swift           # Colors, typography, spacing
│       ├── GoldButton.swift
│       └── ...
└── Services/
    ├── APIService.swift                 # REST API client
    ├── DatabaseService.swift             # Local SQLite
    └── SyncService.swift                 # Server sync
```

## New Features (v1.1)

### Predictions Tab
The desktop app now includes a new "Predictions" tab in the profile detail view that displays:

1. **Hourly Predictions**
   - 24-hour view with expandable cards
   - Score badges with color coding
   - Dasha information (Sookshma, Prana)
   - Transit positions (Moon nakshatra, sign, degree)
   - Plain English prediction text

2. **Monthly Predictions**
   - Calendar grid view
   - Daily score indicators
   - Monthly summary with statistics

### API Integration
New endpoints added to support predictions:
- `GET /api/predictions/:profileId/hourly?date=YYYY-MM-DD`
- `GET /api/predictions/:profileId/monthly?year=Y&month=M`
- `DELETE /api/predictions/:profileId/cache`

## Design System

### Colors
- Background: #0C09 (deep space black)
- Surface: #1C1917
- Gold accent: #CA8A04
- Text: #FAFAF9 / #A8A29E / #6B6360

### Typography
- SF Pro family
- Monospace for technical data (degrees, times)

### Spacing
- 4px base unit (xs=4, sm=8, md=12, base=16, lg=24, xl=32)

## Data Flow

```
User selects profile
       ↓
ProfileDetailView loads
       ↓
ViewModel fetches data from APIService
       ↓
APIService calls REST endpoints
       ↓
API returns JSON → Swift Codable models
       ↓
SwiftUI Views render
```

## Future Enhancements

1. Settings view for app preferences
2. Timezone selector improvements
3. Report generation UI
4. Offline prediction caching
