# ParashariPrecision Desktop App — QA & Bug Fix Design Spec

**Date:** 2026-03-20
**Status:** Approved
**Approach:** B — Bug Fixes + Full Unit + UI Test Target, module-by-module

---

## 1. Goals

1. Fix all known bugs in the macOS SwiftUI desktop app
2. Build a complete test suite (unit + UI) covering every module
3. Test each module thoroughly with expert QA and PM review
4. Compile a release build and deploy to `~/Applications/myApps`

---

## 2. Bugs to Fix

### BUG-1: Invalid dobUTC string in NewProfileView (Profiles module)
**File:** `Views/Profile/NewProfileView.swift:157`
**Issue:** `formatter.string(from: formState.dob) + "Z"` appends "Z" to an ISO8601 string that already includes a timezone designator (e.g. `"2024-01-01T12:00:00+05:30Z"`), producing invalid dates.
**Fix:** Set `formatter.timeZone = TimeZone(identifier: "UTC")` before formatting, then do NOT append "Z" — the formatter will output a proper UTC string ending in `+00:00`. Strip the offset and use bare `Z` format by setting `formatOptions = [.withFullDate, .withFullTime, .withDashSeparatorInDate, .withColonSeparatorInTime, .withTimeZone]` and `timeZone = .init(secondsFromGMT: 0)`.

### BUG-2: Tab switching broken in MainView (Navigation)
**File:** `Views/MainView.swift`
**Issue:** Analysis section labels (Chart, Dasha, etc.) sit inside `List(selection: $selectedProfile)` which is bound to `Profile?`. The `.tag(MainTab)` types mismatch the binding type, so clicking tabs has no effect — users are permanently stuck on Chart.
**Fix (Option B):** Remove Analysis section from sidebar List entirely. The sidebar shows only profiles. The detail pane adds a `Picker(.segmented)` at the top to switch tabs. `selectedTab` becomes `@State` inside `DetailView`, initialized to `.chart`.

### BUG-3: Force-unwrap crash in ProfilesViewModel.init
**File:** `ViewModels/ProfilesViewModel.swift:13`
**Issue:** `(try? DatabaseService())!` will crash if DatabaseService init throws.
**Fix:** Replace with proper error propagation or a safe fallback using a do/catch.

---

## 3. Navigation Architecture (Post-Fix)

```
MainView (NavigationSplitView)
├── Sidebar
│   └── List(selection: $selectedProfile) — profiles only
│       └── ForEach(profiles) → NavigationLink
└── Detail
    └── if selectedProfile != nil:
            DetailView(profile:)
                ├── Picker("", selection: $selectedTab, style: .segmented)
                │     [Chart | Dasha | Shadbala | Ashtakavarga | Yogas | Predictions]
                └── TabView(selection: $selectedTab)
                      ├── ChartView
                      ├── DashaView
                      ├── ShadbalaView
                      ├── AshtakavargaView
                      ├── YogaListView
                      └── PredictionsView
        else: ContentUnavailableView("Select a Profile")
```

`selectedTab` lives as `@State` in `DetailView`. It resets to `.chart` when a new profile is selected (via `.onChange(of: profile)`).

---

## 4. Test Strategy

### 4.1 Unit Test Target (ParashariPrecisionTests — existing)

Expand coverage for every module:

| Module | Tests |
|--------|-------|
| Profiles | Form validation, save/load/delete, date formatting (UTC correctness), sample profiles |
| Chart | ViewModel state, planet count (9), sign/nakshatra values |
| Dasha | Period calculation, current dasha detection, antardasha count |
| Shadbala | All 6 bala components, isExalted/isDebilitated thresholds |
| Ashtakavarga | BAV/SAV computation, shodhana, bindu color intensity |
| Yogas | Raj Yoga, Gajakesari, filtering, sorting, category grouping |
| Predictions | Prediction generation, date range, sentiment values |
| Navigation | MainTab enum, DetailView tab switching |
| Database | CRUD, in-memory, cache read/write, foreign key cascade |

### 4.2 UI Test Target (ParashariPrecisionUITests — new)

New XCUITest target added to `project.yml`. Tests:

- App launches and shows sidebar
- Profile list shows sample profiles on first launch
- Clicking a profile shows detail pane with segmented tab control
- All 6 tabs switch correctly (Chart → Dasha → Shadbala → Ashtakavarga → Yogas → Predictions)
- New Profile sheet opens, validates required fields, saves profile
- Profile deletion removes from list and clears detail pane
- Chart loads and shows planet positions table
- Dasha tab shows period list
- Predictions tab shows prediction entries

### 4.3 Module Execution Order

1. **Profiles** — fix bugs, unit tests, UI tests, QA + PM review
2. **Chart** — verify calculation, unit tests, UI tests
3. **Dasha** — period tree, unit tests, UI tests
4. **Shadbala** — bala components, unit tests, UI tests
5. **Ashtakavarga** — BAV/SAV grid, unit tests, UI tests
6. **Yogas** — detection, filtering/sorting, unit tests, UI tests
7. **Predictions** — generation, display, unit tests, UI tests

---

## 5. Build & Deployment

- Build configuration: **Release**, `macOS arm64`
- Output: `build/Release/ParashariPrecision.app`
- Destination: `~/Applications/myApps/ParashariPrecision.app`
- Command:
  ```
  xcodebuild -project ParashariPrecision.xcodeproj \
    -scheme ParashariPrecision \
    -configuration Release \
    -destination 'platform=macOS,arch=arm64' \
    -derivedDataPath build \
    build
  cp -R build/Build/Products/Release/ParashariPrecision.app ~/Applications/myApps/
  ```

---

## 6. Constraints

- Swift 6 / strict concurrency — all fixes must be Swift 6 compliant
- macOS 14+ deployment target
- No new dependencies — pure Swift
- All ViewModels remain `@MainActor final class ObservableObject`
- Tests use in-memory DatabaseService (`inMemory: true`)
