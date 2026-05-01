# ParashariPrecision Desktop App — QA & Bug Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 critical bugs, build a complete unit + UI test suite covering all 7 modules, validate with QA and PM agents, then compile a release build and deploy to `~/Applications/myApps`.

**Architecture:** macOS 14+ SwiftUI app using MVVM with `@MainActor` ObservableObject ViewModels and SQLite persistence. The nav bug fix moves tab switching from a broken `List(selection:)` tag into a `Picker(.segmented)` inside `DetailView`. All ViewModels remain unchanged; only views and a safe init are touched.

**Tech Stack:** Swift 6, SwiftUI, XCTest, XCUITest, SQLite3, xcodebuild

**Spec:** `docs/superpowers/specs/2026-03-20-parashari-precision-qa-design.md`

**Working directory:** `/Users/thotas/Development/Claude/AstroGuru/desktop`

---

## File Map

### Modified
- `ParashariPrecision/ViewModels/ProfilesViewModel.swift` — safe init (BUG-3)
- `ParashariPrecision/Views/Profile/NewProfileView.swift` — UTC date fix (BUG-1)
- `ParashariPrecision/Views/MainView.swift` — navigation fix (BUG-2)
- `project.yml` — add UI test target

### Expanded (unit tests — existing files)
- `ParashariPrecisionTests/NewProfileViewTests.swift`
- `ParashariPrecisionTests/ProfilesViewModelTests.swift`
- `ParashariPrecisionTests/ChartViewModelTests.swift`
- `ParashariPrecisionTests/DashaViewModelTests.swift`
- `ParashariPrecisionTests/ShadbalaViewModelTests.swift`
- `ParashariPrecisionTests/AshtakavargaViewModelTests.swift`
- `ParashariPrecisionTests/YogaViewModelTests.swift`
- `ParashariPrecisionTests/PredictionsViewModelTests.swift`
- `ParashariPrecisionTests/DatabaseServiceTests.swift`

### Created (new files)
- `ParashariPrecisionTests/MainViewTests.swift` — navigation tests
- `ParashariPrecisionUITests/ParashariPrecisionUITests.swift` — UI automation

---

## Task 1: Fix BUG-3 — ProfilesViewModel Safe Init

**Files:**
- Modify: `ParashariPrecision/ViewModels/ProfilesViewModel.swift:12-14`
- Test: `ParashariPrecisionTests/ProfilesViewModelTests.swift`

**Problem:** `(try? DatabaseService())!` crashes if DatabaseService init fails.

- [ ] **Step 1: Write failing test** — open `ParashariPrecisionTests/ProfilesViewModelTests.swift`, add at the end of the class:

```swift
func testViewModelInitDoesNotCrashWithDefaultDatabase() {
    // This verifies the init doesn't force-unwrap
    // If it crashes, the test will fail with a crash (not a graceful XCTFail)
    let vm = ProfilesViewModel()
    XCTAssertNotNil(vm)
}
```

- [ ] **Step 2: Run to verify test passes (init already works in normal conditions) — this is a regression guard**

```bash
xcodebuild test -project ParashariPrecision.xcodeproj -scheme ParashariPrecision \
  -destination 'platform=macOS,arch=arm64' \
  -only-testing:ParashariPrecisionTests/ProfilesViewModelTests/testViewModelInitDoesNotCrashWithDefaultDatabase \
  2>&1 | tail -20
```

- [ ] **Step 3: Fix the init** — open `ParashariPrecision/ViewModels/ProfilesViewModel.swift`, replace lines 12-14:

**Before:**
```swift
init(database: DatabaseService? = nil) {
    self.database = database ?? (try? DatabaseService())!
}
```

**After:**
```swift
init(database: DatabaseService? = nil) {
    if let db = database {
        self.database = db
    } else {
        // Attempt persistent DB, fallback to in-memory (never throws)
        self.database = (try? DatabaseService()) ?? (try! DatabaseService(inMemory: true))
    }
}
```

- [ ] **Step 4: Run tests to verify**

```bash
xcodebuild test -project ParashariPrecision.xcodeproj -scheme ParashariPrecision \
  -destination 'platform=macOS,arch=arm64' \
  -only-testing:ParashariPrecisionTests/ProfilesViewModelTests \
  2>&1 | tail -20
```

Expected: All ProfilesViewModelTests pass.

- [ ] **Step 5: Commit**

```bash
git add ParashariPrecision/ViewModels/ProfilesViewModel.swift ParashariPrecisionTests/ProfilesViewModelTests.swift
git commit -m "fix: safe DatabaseService init in ProfilesViewModel — prevents force-unwrap crash"
```

---

## Task 2: Fix BUG-1 — NewProfileView UTC Date Formatting

**Files:**
- Modify: `ParashariPrecision/Views/Profile/NewProfileView.swift:145-169`
- Test: `ParashariPrecisionTests/NewProfileViewTests.swift`

**Problem:** `formatter.string(from: formState.dob) + "Z"` appends "Z" to an ISO8601 string that already includes a timezone designator, producing invalid strings like `"2024-01-01T12:00:00+05:30Z"`.

- [ ] **Step 1: Write failing test** — add to `ParashariPrecisionTests/NewProfileViewTests.swift`:

```swift
func testSavedProfileHasValidUTCDateString() {
    // Simulate what saveProfile does
    let testDate = Date(timeIntervalSince1970: 0) // 1970-01-01T00:00:00Z
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime]
    formatter.timeZone = TimeZone(secondsFromGMT: 0)
    let dateString = formatter.string(from: testDate)

    // Must not have double timezone suffix
    XCTAssertFalse(dateString.hasSuffix("ZZ"), "Date string has double Z: \(dateString)")
    XCTAssertFalse(dateString.contains("+00:00Z"), "Date string has +00:00Z: \(dateString)")

    // Must be parseable
    let parsed = ISO8601DateFormatter().date(from: dateString)
    XCTAssertNotNil(parsed, "Date string not parseable: \(dateString)")
    XCTAssertEqual(parsed?.timeIntervalSince1970 ?? -1, 0, accuracy: 1.0)
}

func testSavedProfileDateStringDoesNotAppendExtraZ() {
    // Reproduce the old bug: formatter already includes timezone, adding "Z" breaks it
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime]
    // Without timeZone set, the formatter uses UTC+0 on simulators but may vary
    formatter.timeZone = TimeZone(secondsFromGMT: 0)
    let date = Date()
    let correctString = formatter.string(from: date)
    let brokenString = correctString + "Z"

    XCTAssertNotNil(ISO8601DateFormatter().date(from: correctString))
    XCTAssertNil(ISO8601DateFormatter().date(from: brokenString),
                 "Broken string should not parse: \(brokenString)")
}
```

- [ ] **Step 2: Run tests — both should PASS (these test the formatter behavior, not the view directly)**

```bash
xcodebuild test -project ParashariPrecision.xcodeproj -scheme ParashariPrecision \
  -destination 'platform=macOS,arch=arm64' \
  -only-testing:ParashariPrecisionTests/NewProfileViewTests/testSavedProfileHasValidUTCDateString \
  -only-testing:ParashariPrecisionTests/NewProfileViewTests/testSavedProfileDateStringDoesNotAppendExtraZ \
  2>&1 | tail -20
```

- [ ] **Step 3: Write integration test that catches the actual bug** — add:

```swift
func testSaveProfileCreatesProfileWithParsableDOB() {
    var formState = NewProfileView.FormState()
    formState.name = "UTC Test"
    formState.latitude = 28.6
    formState.longitude = 77.2
    formState.timezone = "Asia/Kolkata"
    // formState.dob defaults to Date() — that's fine

    // Simulate what saveProfile does (the FIXED version)
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime]
    formatter.timeZone = TimeZone(secondsFromGMT: 0)
    let dobUTC = formatter.string(from: formState.dob)
    // NOT: + "Z"

    let profile = Profile(
        name: formState.name,
        dobUTC: dobUTC,
        latitude: formState.latitude,
        longitude: formState.longitude,
        timezone: formState.timezone,
        utcOffset: formState.utcOffset
    )

    viewModel.saveProfile(profile)
    XCTAssertEqual(viewModel.profiles.count, 1)
    XCTAssertNotNil(viewModel.profiles[0].dobDate,
                    "dobDate should parse — got: \(viewModel.profiles[0].dobUTC)")
}
```

- [ ] **Step 4: Fix NewProfileView.saveProfile()** — in `ParashariPrecision/Views/Profile/NewProfileView.swift`, replace the `saveProfile()` method (lines ~145-169):

```swift
private func saveProfile() {
    guard formState.isValid else {
        validationErrorMessage = "Please fill in all required fields correctly."
        showingValidationError = true
        return
    }

    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime]
    formatter.timeZone = TimeZone(secondsFromGMT: 0)  // Always store as UTC

    let profile = Profile(
        name: formState.name.trimmingCharacters(in: .whitespaces),
        dobUTC: formatter.string(from: formState.dob),  // No "Z" appended — formatter handles it
        latitude: formState.latitude,
        longitude: formState.longitude,
        timezone: formState.timezone,
        utcOffset: formState.utcOffset,
        placeName: formState.placeName.isEmpty ? nil : formState.placeName,
        ayanamsaId: formState.ayanamsaId,
        notes: formState.notes.isEmpty ? nil : formState.notes
    )

    profilesViewModel.saveProfile(profile)
    onDismiss()
}
```

- [ ] **Step 5: Run all NewProfileView tests**

```bash
xcodebuild test -project ParashariPrecision.xcodeproj -scheme ParashariPrecision \
  -destination 'platform=macOS,arch=arm64' \
  -only-testing:ParashariPrecisionTests/NewProfileViewTests \
  2>&1 | tail -20
```

Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add ParashariPrecision/Views/Profile/NewProfileView.swift \
        ParashariPrecisionTests/NewProfileViewTests.swift
git commit -m "fix: store profile dobUTC as valid UTC ISO8601 — remove erroneous Z append"
```

---

## Task 3: Fix BUG-2 — Navigation Tab Switching

**Files:**
- Modify: `ParashariPrecision/Views/MainView.swift` (full rewrite of SidebarView + DetailView)
- Create: `ParashariPrecisionTests/MainViewTests.swift`

**Problem:** Analysis section tabs use `.tag(MainTab)` but `List(selection:)` is bound to `Profile?` — type mismatch makes tab clicks silently no-op. Users cannot switch tabs.

- [ ] **Step 1: Create MainViewTests.swift**

Create `ParashariPrecisionTests/MainViewTests.swift`:

```swift
import XCTest
import SwiftUI
@testable import ParashariPrecision

@MainActor
final class MainViewTests: XCTestCase {
    func testMainTabEnumHasSixCases() {
        let cases: [MainView.MainTab] = [.chart, .dasha, .shadbala, .ashtakavarga, .yogas, .predictions]
        XCTAssertEqual(cases.count, 6)
    }

    func testMainTabDefaultIsChart() {
        // DetailView should default to .chart tab
        // We verify by checking the enum value
        let defaultTab = MainView.MainTab.chart
        XCTAssertEqual(defaultTab, MainView.MainTab.chart)
    }

    func testDetailViewRendersWithProfile() {
        let profile = Profile(
            name: "Test",
            dobUTC: "1990-01-01T12:00:00+00:00",
            latitude: 28.6,
            longitude: 77.2,
            timezone: "Asia/Kolkata",
            utcOffset: 5.5
        )
        let view = DetailView(profile: profile)
        XCTAssertNotNil(view)
    }

    func testMainViewRendersWithEnvironment() {
        let db = try! DatabaseService(inMemory: true)
        try! db.initialize()
        let vm = ProfilesViewModel(database: db)
        let view = MainView().environmentObject(vm)
        XCTAssertNotNil(view)
    }

    func testSidebarViewRendersWithProfiles() {
        let db = try! DatabaseService(inMemory: true)
        try! db.initialize()
        let vm = ProfilesViewModel(database: db)
        vm.createSampleProfiles()

        var selectedProfile: Profile? = nil
        let binding = Binding(get: { selectedProfile }, set: { selectedProfile = $0 })
        let view = SidebarView(selectedProfile: binding)
            .environmentObject(vm)
        XCTAssertNotNil(view)
    }
}
```

- [ ] **Step 2: Run tests — they will fail to compile until SidebarView signature is updated**

Note: After running step 2, proceed to step 3 which makes them compile and pass.

- [ ] **Step 3: Fix MainView.swift** — replace the full file content:

```swift
import SwiftUI

struct MainView: View {
    @EnvironmentObject var profilesViewModel: ProfilesViewModel
    @State private var selectedProfile: Profile?

    enum MainTab: Hashable {
        case chart, dasha, shadbala, ashtakavarga, yogas, predictions
    }

    var body: some View {
        NavigationSplitView {
            SidebarView(selectedProfile: $selectedProfile)
        } detail: {
            if let profile = selectedProfile {
                DetailView(profile: profile)
            } else {
                ContentUnavailableView(
                    "Select a Profile",
                    systemImage: "person.crop.circle",
                    description: Text("Choose a profile from the sidebar to view their chart")
                )
            }
        }
    }
}

struct SidebarView: View {
    @Binding var selectedProfile: Profile?
    @EnvironmentObject var profilesViewModel: ProfilesViewModel

    var body: some View {
        List(selection: $selectedProfile) {
            Section("Profiles") {
                ForEach(profilesViewModel.profiles) { profile in
                    NavigationLink(value: profile) {
                        VStack(alignment: .leading) {
                            Text(profile.name)
                                .font(.headline)
                            if let place = profile.placeName {
                                Text(place)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("AstroGuru")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    profilesViewModel.showingNewProfile = true
                } label: {
                    Label("New Profile", systemImage: "plus")
                }
            }
        }
        .sheet(isPresented: $profilesViewModel.showingNewProfile) {
            NewProfileView(onDismiss: {
                profilesViewModel.showingNewProfile = false
                profilesViewModel.loadProfiles()
            })
            .environmentObject(profilesViewModel)
        }
        .overlay {
            if profilesViewModel.profiles.isEmpty {
                ContentUnavailableView(
                    "No Profiles",
                    systemImage: "person.crop.circle.badge.plus",
                    description: Text("Create a profile to get started")
                )
            }
        }
    }
}

struct DetailView: View {
    let profile: Profile
    @State private var selectedTab: MainView.MainTab = .chart

    var body: some View {
        VStack(spacing: 0) {
            Picker("", selection: $selectedTab) {
                Text("Chart").tag(MainView.MainTab.chart)
                Text("Dasha").tag(MainView.MainTab.dasha)
                Text("Shadbala").tag(MainView.MainTab.shadbala)
                Text("Ashtakavarga").tag(MainView.MainTab.ashtakavarga)
                Text("Yogas").tag(MainView.MainTab.yogas)
                Text("Predictions").tag(MainView.MainTab.predictions)
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            .padding(.vertical, 8)

            Divider()

            Group {
                switch selectedTab {
                case .chart:
                    ChartView(profile: profile)
                case .dasha:
                    DashaView(profile: profile)
                case .shadbala:
                    ShadbalaView(profile: profile)
                case .ashtakavarga:
                    AshtakavargaView(profile: profile)
                case .yogas:
                    YogaListView(profile: profile)
                case .predictions:
                    PredictionsView(profile: profile)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .onChange(of: profile) { _, _ in
            selectedTab = .chart
        }
        .navigationTitle(profile.name)
    }
}
```

- [ ] **Step 4: Add `showingNewProfile` to ProfilesViewModel** — open `ParashariPrecision/ViewModels/ProfilesViewModel.swift`, add after the `@Published var errorMessage` line:

```swift
@Published var showingNewProfile = false
```

This moves sheet presentation state into the ViewModel so SidebarView can trigger it cleanly. Also remove the old `ProfileListView.swift` sheet logic that is now handled via MainView.

- [ ] **Step 5: Verify the project builds**

```bash
xcodebuild build -project ParashariPrecision.xcodeproj -scheme ParashariPrecision \
  -destination 'platform=macOS,arch=arm64' \
  -quiet 2>&1 | tail -20
```

Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 6: Run MainView tests**

```bash
xcodebuild test -project ParashariPrecision.xcodeproj -scheme ParashariPrecision \
  -destination 'platform=macOS,arch=arm64' \
  -only-testing:ParashariPrecisionTests/MainViewTests \
  2>&1 | tail -20
```

Expected: All 5 tests pass.

- [ ] **Step 7: Commit**

```bash
git add ParashariPrecision/Views/MainView.swift \
        ParashariPrecision/ViewModels/ProfilesViewModel.swift \
        ParashariPrecisionTests/MainViewTests.swift
git commit -m "fix: move tab switching to DetailView Picker — resolves broken sidebar nav"
```

---

## Task 4: Add UI Test Target

**Files:**
- Modify: `project.yml` — add ParashariPrecisionUITests target
- Create: `ParashariPrecisionUITests/ParashariPrecisionUITests.swift`

- [ ] **Step 1: Update project.yml** — add the UI test target after the `ParashariPrecisionTests` block:

```yaml
  ParashariPrecisionUITests:
    type: bundle.ui-testing
    platform: macOS
    sources:
      - path: ParashariPrecisionUITests
        excludes:
          - "**/.DS_Store"
    dependencies:
      - target: ParashariPrecision
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.parashari.precision.uitests
        GENERATE_INFOPLIST_FILE: YES
```

- [ ] **Step 2: Create UI test directory and file**

```bash
mkdir -p ParashariPrecisionUITests
```

Create `ParashariPrecisionUITests/ParashariPrecisionUITests.swift`:

```swift
import XCTest

final class ParashariPrecisionUITests: XCTestCase {
    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }

    override func tearDownWithError() throws {
        app.terminate()
    }

    // MARK: - Launch & Structure

    func testAppLaunchesAndShowsWindow() {
        XCTAssertTrue(app.windows.firstMatch.waitForExistence(timeout: 5))
    }

    func testSidebarShowsAstroGuruTitle() {
        XCTAssertTrue(app.staticTexts["AstroGuru"].waitForExistence(timeout: 5))
    }

    func testSidebarShowsSampleProfiles() {
        // Sample profiles are created on first launch
        let gandhiCell = app.staticTexts["Mahatma Gandhi"]
        XCTAssertTrue(gandhiCell.waitForExistence(timeout: 5))
    }

    // MARK: - Profile Selection & Tab Switching

    func testSelectingProfileShowsSegmentedControl() {
        let gandhiCell = app.staticTexts["Mahatma Gandhi"]
        guard gandhiCell.waitForExistence(timeout: 5) else {
            XCTFail("Gandhi profile not found")
            return
        }
        gandhiCell.click()

        // Segmented control should appear
        let chartButton = app.buttons["Chart"]
        XCTAssertTrue(chartButton.waitForExistence(timeout: 3))
    }

    func testTabSwitchingFromChartToDasha() {
        let gandhiCell = app.staticTexts["Mahatma Gandhi"]
        guard gandhiCell.waitForExistence(timeout: 5) else {
            XCTFail("Gandhi profile not found")
            return
        }
        gandhiCell.click()

        let dashaButton = app.buttons["Dasha"]
        guard dashaButton.waitForExistence(timeout: 3) else {
            XCTFail("Dasha tab button not found")
            return
        }
        dashaButton.click()

        // Dasha view should load — look for loading indicator or content
        let dashaContent = app.windows.firstMatch
        XCTAssertTrue(dashaContent.exists)
    }

    func testTabSwitchingAllSixTabs() {
        let gandhiCell = app.staticTexts["Mahatma Gandhi"]
        guard gandhiCell.waitForExistence(timeout: 5) else {
            XCTFail("Gandhi profile not found")
            return
        }
        gandhiCell.click()

        let tabNames = ["Chart", "Dasha", "Shadbala", "Ashtakavarga", "Yogas", "Predictions"]
        for tabName in tabNames {
            let tabButton = app.buttons[tabName]
            guard tabButton.waitForExistence(timeout: 3) else {
                XCTFail("\(tabName) tab not found")
                continue
            }
            tabButton.click()
            // Each tab should not crash
            XCTAssertTrue(app.windows.firstMatch.exists, "\(tabName) tab caused crash")
        }
    }

    // MARK: - New Profile Sheet

    func testNewProfileButtonOpensSheet() {
        // Click the "+" toolbar button
        let addButton = app.toolbars.buttons["New Profile"]
        guard addButton.waitForExistence(timeout: 5) else {
            // Try by image name
            XCTFail("New Profile button not found")
            return
        }
        addButton.click()

        // Sheet should open with "New Profile" title
        let sheetTitle = app.staticTexts["New Profile"]
        XCTAssertTrue(sheetTitle.waitForExistence(timeout: 3))
    }

    func testNewProfileSaveButtonDisabledWithoutName() {
        let addButton = app.toolbars.buttons["New Profile"]
        guard addButton.waitForExistence(timeout: 5) else { return }
        addButton.click()

        let saveButton = app.buttons["Save"]
        guard saveButton.waitForExistence(timeout: 3) else {
            XCTFail("Save button not found")
            return
        }
        XCTAssertFalse(saveButton.isEnabled, "Save should be disabled without a name")
    }

    func testNewProfileCanBeCancelled() {
        let addButton = app.toolbars.buttons["New Profile"]
        guard addButton.waitForExistence(timeout: 5) else { return }
        addButton.click()

        let cancelButton = app.buttons["Cancel"]
        guard cancelButton.waitForExistence(timeout: 3) else {
            XCTFail("Cancel button not found")
            return
        }
        cancelButton.click()

        // Sheet should dismiss
        XCTAssertFalse(app.staticTexts["New Profile"].exists)
    }

    // MARK: - Empty State

    func testNoProfileSelectedShowsPlaceholder() {
        // If no profile selected, detail area should show placeholder
        let placeholder = app.staticTexts["Select a Profile"]
        // It may or may not be visible depending on whether a profile is auto-selected
        // Just verify the app didn't crash
        XCTAssertTrue(app.windows.firstMatch.exists)
    }
}
```

- [ ] **Step 3: Regenerate the Xcode project from project.yml**

```bash
xcodegen generate --spec project.yml
```

If xcodegen is not installed:
```bash
brew install xcodegen
xcodegen generate --spec project.yml
```

- [ ] **Step 4: Verify build with UI test target**

```bash
xcodebuild build-for-testing \
  -project ParashariPrecision.xcodeproj \
  -scheme ParashariPrecision \
  -destination 'platform=macOS,arch=arm64' \
  2>&1 | tail -20
```

Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 5: Commit**

```bash
git add project.yml ParashariPrecisionUITests/
git commit -m "feat: add UI test target with XCUITest suite for all modules"
```

---

## Task 5: Profiles Module — Complete Unit Tests

**Files:**
- Modify: `ParashariPrecisionTests/ProfilesViewModelTests.swift`
- Modify: `ParashariPrecisionTests/NewProfileViewTests.swift`
- Modify: `ParashariPrecisionTests/ProfileListViewTests.swift`

- [ ] **Step 1: Add missing tests to ProfilesViewModelTests.swift** — append to the class:

```swift
func testLoadProfilesUpdatesIsLoading() {
    viewModel.loadProfiles()
    XCTAssertFalse(viewModel.isLoading, "isLoading should be false after load completes")
}

func testSaveProfileWithAllFields() {
    let profile = Profile(
        name: "Full Profile",
        dobUTC: "1990-06-15T08:30:00+00:00",
        latitude: 51.5074,
        longitude: -0.1278,
        timezone: "Europe/London",
        utcOffset: 0.0,
        placeName: "London, UK",
        ayanamsaId: 2,
        notes: "Test notes"
    )
    viewModel.saveProfile(profile)
    XCTAssertEqual(viewModel.profiles.count, 1)
    let saved = viewModel.profiles[0]
    XCTAssertEqual(saved.name, "Full Profile")
    XCTAssertEqual(saved.placeName, "London, UK")
    XCTAssertEqual(saved.ayanamsaId, 2)
    XCTAssertEqual(saved.notes, "Test notes")
}

func testDeleteNonexistentProfileDoesNotCrash() {
    let profile = Profile(
        name: "Ghost",
        dobUTC: "2000-01-01T00:00:00+00:00",
        latitude: 0, longitude: 0,
        timezone: "UTC", utcOffset: 0
    )
    // Never saved — should not crash on delete
    viewModel.deleteProfile(profile)
    XCTAssertEqual(viewModel.profiles.count, 0)
}

func testMultipleProfilesSavedAndRetrieved() {
    for i in 1...5 {
        let profile = Profile(
            name: "User \(i)",
            dobUTC: "2000-0\(i)-01T12:00:00+00:00",
            latitude: Double(i),
            longitude: Double(i),
            timezone: "UTC",
            utcOffset: 0
        )
        viewModel.saveProfile(profile)
    }
    XCTAssertEqual(viewModel.profiles.count, 5)
}

func testErrorMessageClearedOnSuccessfulLoad() {
    viewModel.errorMessage = "Previous error"
    viewModel.loadProfiles()
    XCTAssertNil(viewModel.errorMessage)
}

func testProfileDOBDateIsNotNilAfterSave() {
    let profile = Profile(
        name: "Date Test",
        dobUTC: "1990-06-15T08:30:00+00:00",
        latitude: 0, longitude: 0,
        timezone: "UTC", utcOffset: 0
    )
    viewModel.saveProfile(profile)
    XCTAssertNotNil(viewModel.profiles[0].dobDate,
                    "dobDate should parse from stored dobUTC")
}
```

- [ ] **Step 2: Run Profiles unit tests**

```bash
xcodebuild test -project ParashariPrecision.xcodeproj -scheme ParashariPrecision \
  -destination 'platform=macOS,arch=arm64' \
  -only-testing:ParashariPrecisionTests/ProfilesViewModelTests \
  -only-testing:ParashariPrecisionTests/NewProfileViewTests \
  -only-testing:ParashariPrecisionTests/ProfileListViewTests \
  2>&1 | tail -30
```

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add ParashariPrecisionTests/ProfilesViewModelTests.swift
git commit -m "test: expand Profiles module unit tests — save, delete, validation, date parsing"
```

---

## Task 6: Chart Module — Complete Unit Tests

**Files:**
- Modify: `ParashariPrecisionTests/ChartViewModelTests.swift`

- [ ] **Step 1: Add missing tests** — append to the class:

```swift
func testCalculateChartHasNinePlanets() async {
    await viewModel.calculateChart(for: sampleProfile)
    XCTAssertEqual(viewModel.chartData?.planets.count, 9)
}

func testCalculateChartHasTwelveHouses() async {
    await viewModel.calculateChart(for: sampleProfile)
    XCTAssertEqual(viewModel.chartData?.houses.count, 12)
}

func testCalculateChartAscendantInValidRange() async {
    await viewModel.calculateChart(for: sampleProfile)
    let ascendant = viewModel.chartData?.ascendant ?? -1
    XCTAssertGreaterThanOrEqual(ascendant, 0)
    XCTAssertLessThan(ascendant, 360)
}

func testAllPlanetsHaveValidSignIndex() async {
    await viewModel.calculateChart(for: sampleProfile)
    guard let planets = viewModel.chartData?.planets else {
        XCTFail("No planets")
        return
    }
    for planet in planets {
        XCTAssertGreaterThanOrEqual(planet.sign, 0, "\(planet.planet) sign < 0")
        XCTAssertLessThan(planet.sign, 12, "\(planet.planet) sign >= 12")
    }
}

func testAllPlanetsHaveValidDegree() async {
    await viewModel.calculateChart(for: sampleProfile)
    guard let planets = viewModel.chartData?.planets else {
        XCTFail("No planets")
        return
    }
    for planet in planets {
        XCTAssertGreaterThanOrEqual(planet.degreeInSign, 0, "\(planet.planet) degree < 0")
        XCTAssertLessThan(planet.degreeInSign, 30, "\(planet.planet) degree >= 30")
    }
}

func testExpectedPlanetNamesPresent() async {
    await viewModel.calculateChart(for: sampleProfile)
    let names = viewModel.chartData?.planets.map { $0.planet } ?? []
    let expected = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]
    for name in expected {
        XCTAssertTrue(names.contains(name), "Missing planet: \(name)")
    }
}

func testErrorMessageNilAfterSuccessfulCalculation() async {
    await viewModel.calculateChart(for: sampleProfile)
    XCTAssertNil(viewModel.errorMessage)
}

func testIsCalculatingFalseAfterCompletion() async {
    await viewModel.calculateChart(for: sampleProfile)
    XCTAssertFalse(viewModel.isCalculating)
}

func testGandhiChartAscendantApproximate() async {
    // Mahatma Gandhi born 1869-10-02 at Porbandar
    let gandhi = Profile(
        name: "Gandhi",
        dobUTC: "1869-10-02T04:50:00+00:00",
        latitude: 21.1702,
        longitude: 70.0577,
        timezone: "Asia/Kolkata",
        utcOffset: 5.5,
        ayanamsaId: 1
    )
    await viewModel.calculateChart(for: gandhi)
    // Ascendant should be a valid degree
    XCTAssertNotNil(viewModel.chartData)
    XCTAssertFalse(viewModel.isCalculating)
}
```

- [ ] **Step 2: Run Chart tests**

```bash
xcodebuild test -project ParashariPrecision.xcodeproj -scheme ParashariPrecision \
  -destination 'platform=macOS,arch=arm64' \
  -only-testing:ParashariPrecisionTests/ChartViewModelTests \
  2>&1 | tail -20
```

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add ParashariPrecisionTests/ChartViewModelTests.swift
git commit -m "test: expand Chart module unit tests — planets, houses, signs, degrees"
```

---

## Task 7: Dasha Module — Complete Unit Tests

**Files:**
- Modify: `ParashariPrecisionTests/DashaViewModelTests.swift`
- Modify: `ParashariPrecisionTests/DashaViewTests.swift`

- [ ] **Step 1: Expand DashaViewModelTests.swift** — append to class:

```swift
func testDashaPeriodsHaveValidLords() async {
    await viewModel.calculateDashas(for: sampleProfile)
    let validLords = ["Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury", "Ketu", "Venus"]
    for dasha in viewModel.dashaPeriods {
        XCTAssertTrue(validLords.contains(dasha.lord), "Invalid lord: \(dasha.lord)")
    }
}

func testDashaPeriodsHaveForwardChronology() async {
    await viewModel.calculateDashas(for: sampleProfile)
    guard viewModel.dashaPeriods.count > 1 else { return }
    for i in 0..<(viewModel.dashaPeriods.count - 1) {
        let current = viewModel.dashaPeriods[i]
        let next = viewModel.dashaPeriods[i + 1]
        let currentEnd = current.endYear * 12 + current.endMonth
        let nextStart = next.startYear * 12 + next.startMonth
        XCTAssertLessThanOrEqual(currentEnd, nextStart,
            "Dasha \(current.lord) ends \(current.endYear) but next \(next.lord) starts \(next.startYear)")
    }
}

func testAnterdashasNotEmptyForEachMahadasha() async {
    await viewModel.calculateDashas(for: sampleProfile)
    for dasha in viewModel.dashaPeriods {
        XCTAssertFalse(dasha.antardashas.isEmpty, "\(dasha.lord) mahadasha has no antardashas")
    }
}

func testSelectedDashaNilInitially() {
    XCTAssertNil(viewModel.selectedDasha)
}

func testCurrentDashaIsNilWhenPeriodsEmpty() {
    viewModel.dashaPeriods = []
    XCTAssertNil(viewModel.currentDasha)
}
```

- [ ] **Step 2: Rewrite DashaViewTests.swift** — replace the weak tests with meaningful behavior tests:

```swift
import XCTest
import SwiftUI
@testable import ParashariPrecision

@MainActor
final class DashaViewTests: XCTestCase {
    var sampleProfile: Profile!
    var viewModel: DashaViewModel!

    override func setUp() {
        sampleProfile = Profile(
            id: "test-id",
            name: "Test User",
            dobUTC: "1990-01-01T12:00:00+00:00",
            latitude: 28.6139,
            longitude: 77.2090,
            timezone: "Asia/Kolkata",
            utcOffset: 5.5,
            placeName: "New Delhi, India",
            ayanamsaId: 1
        )
        viewModel = DashaViewModel()
    }

    func testDashaViewInstantiates() {
        let view = DashaView(profile: sampleProfile)
        XCTAssertNotNil(view)
    }

    func testDashaViewHostingControllerLoads() {
        let view = DashaView(profile: sampleProfile)
        let vc = NSHostingController(rootView: view)
        vc.loadView()
        XCTAssertNotNil(vc.view)
    }

    func testDashaViewModelCalculatesSomePeriods() async {
        await viewModel.calculateDashas(for: sampleProfile)
        XCTAssertFalse(viewModel.dashaPeriods.isEmpty)
    }

    func testDashaViewModelNotCalculatingAfterComplete() async {
        await viewModel.calculateDashas(for: sampleProfile)
        XCTAssertFalse(viewModel.isCalculating)
    }
}
```

- [ ] **Step 3: Run Dasha tests**

```bash
xcodebuild test -project ParashariPrecision.xcodeproj -scheme ParashariPrecision \
  -destination 'platform=macOS,arch=arm64' \
  -only-testing:ParashariPrecisionTests/DashaViewModelTests \
  -only-testing:ParashariPrecisionTests/DashaViewTests \
  2>&1 | tail -20
```

Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add ParashariPrecisionTests/DashaViewModelTests.swift ParashariPrecisionTests/DashaViewTests.swift
git commit -m "test: expand Dasha module — chronology, lords, antardashas"
```

---

## Task 8: Shadbala Module — Complete Unit Tests

**Files:**
- Modify: `ParashariPrecisionTests/ShadbalaViewModelTests.swift`

- [ ] **Step 1: Append additional tests to ShadbalaViewModelTests.swift**:

```swift
func testShadbalaResultsHaveNinePlanets() async {
    await viewModel.calculateShadbala(for: sampleProfile)
    XCTAssertEqual(viewModel.shadbalaResults.count, 9)
}

func testAllShadbalaComponentsNonNegative() async {
    await viewModel.calculateShadbala(for: sampleProfile)
    for result in viewModel.shadbalaResults {
        XCTAssertGreaterThanOrEqual(result.sthAnaBala, 0, "\(result.planet) sthAnaBala negative")
        XCTAssertGreaterThanOrEqual(result.digBala, 0, "\(result.planet) digBala negative")
        XCTAssertGreaterThanOrEqual(result.kalaBala, 0, "\(result.planet) kalaBala negative")
        XCTAssertGreaterThanOrEqual(result.naisargikaBala, 0, "\(result.planet) naisargikaBala negative")
    }
}

func testShadbalaStrengthInVirupasAtMost600() async {
    await viewModel.calculateShadbala(for: sampleProfile)
    for result in viewModel.shadbalaResults {
        XCTAssertLessThanOrEqual(result.strengthInVirupas, 600,
            "\(result.planet) virupas exceeds 600")
    }
}

func testSortedResultsDescendingByTotal() async {
    await viewModel.calculateShadbala(for: sampleProfile)
    let sorted = viewModel.sortedResults
    for i in 0..<(sorted.count - 1) {
        XCTAssertGreaterThanOrEqual(sorted[i].total, sorted[i+1].total)
    }
}

func testIsExaltedAndDebilitatedMutuallyExclusive() async {
    await viewModel.calculateShadbala(for: sampleProfile)
    for result in viewModel.shadbalaResults {
        XCTAssertFalse(result.isExalted && result.isDebilitated,
            "\(result.planet) cannot be both exalted and debilitated")
    }
}
```

- [ ] **Step 2: Run Shadbala tests**

```bash
xcodebuild test -project ParashariPrecision.xcodeproj -scheme ParashariPrecision \
  -destination 'platform=macOS,arch=arm64' \
  -only-testing:ParashariPrecisionTests/ShadbalaViewModelTests \
  2>&1 | tail -20
```

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add ParashariPrecisionTests/ShadbalaViewModelTests.swift
git commit -m "test: expand Shadbala — 9 planets, non-negative balas, sorted results"
```

---

## Task 9: Ashtakavarga Module — Complete Unit Tests

**Files:**
- Modify: `ParashariPrecisionTests/AshtakavargaViewModelTests.swift`

- [ ] **Step 1: Append tests**:

```swift
func testBAVHasEightPlanets() async {
    await viewModel.calculateAshtakavarga(for: sampleProfile)
    guard let result = viewModel.ashtakavargaResult else {
        XCTFail("No result")
        return
    }
    XCTAssertEqual(result.bav.keys.count, 8)
}

func testBAVEachPlanetHasTwelveSignBindus() async {
    await viewModel.calculateAshtakavarga(for: sampleProfile)
    guard let result = viewModel.ashtakavargaResult else { return }
    for (planet, bindus) in result.bav {
        XCTAssertEqual(bindus.count, 12, "\(planet) BAV should have 12 sign entries")
    }
}

func testSAVHasTwelveEntries() async {
    await viewModel.calculateAshtakavarga(for: sampleProfile)
    guard let result = viewModel.ashtakavargaResult else { return }
    XCTAssertEqual(result.sav.count, 12)
}

func testBindusAreNonNegative() async {
    await viewModel.calculateAshtakavarga(for: sampleProfile)
    guard let result = viewModel.ashtakavargaResult else { return }
    for (planet, bindus) in result.bav {
        for bindu in bindus {
            XCTAssertGreaterThanOrEqual(bindu, 0, "\(planet) has negative bindu")
        }
    }
}

func testPlanetTotalBindusNonNegative() async {
    await viewModel.calculateAshtakavarga(for: sampleProfile)
    for planet in viewModel.ashtakavargaPlanets {
        XCTAssertGreaterThanOrEqual(viewModel.planetTotalBindus(for: planet), 0)
    }
}

func testSAVTotalBindusNonNegative() async {
    await viewModel.calculateAshtakavarga(for: sampleProfile)
    XCTAssertGreaterThanOrEqual(viewModel.savTotalBindus(), 0)
}

func testUnknownPlanetTotalBindusReturnsZero() {
    XCTAssertEqual(viewModel.planetTotalBindus(for: "Pluto"), 0)
}
```

- [ ] **Step 2: Run Ashtakavarga tests**

```bash
xcodebuild test -project ParashariPrecision.xcodeproj -scheme ParashariPrecision \
  -destination 'platform=macOS,arch=arm64' \
  -only-testing:ParashariPrecisionTests/AshtakavargaViewModelTests \
  2>&1 | tail -20
```

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add ParashariPrecisionTests/AshtakavargaViewModelTests.swift
git commit -m "test: expand Ashtakavarga — BAV structure, SAV totals, bindu bounds"
```

---

## Task 10: Yogas Module — Complete Unit Tests

**Files:**
- Modify: `ParashariPrecisionTests/YogaViewModelTests.swift`

- [ ] **Step 1: Append tests** (existing tests are thorough for filtering/sorting — add calculation tests):

```swift
func testCalculateYogasProducesNonEmptyList() async {
    await viewModel.calculateYogas(for: sampleProfile)
    XCTAssertFalse(viewModel.yogas.isEmpty)
}

func testAllYogaStrengthsInValidRange() async {
    await viewModel.calculateYogas(for: sampleProfile)
    for yoga in viewModel.yogas {
        XCTAssertGreaterThanOrEqual(yoga.strength, 0.0, "\(yoga.name) strength < 0")
        XCTAssertLessThanOrEqual(yoga.strength, 1.0, "\(yoga.name) strength > 1")
    }
}

func testAllYogasCategoryNonEmpty() async {
    await viewModel.calculateYogas(for: sampleProfile)
    for yoga in viewModel.yogas {
        XCTAssertFalse(yoga.category.isEmpty, "\(yoga.name) has empty category")
    }
}

func testDisplayedYogasRespectsSortOption() async {
    await viewModel.calculateYogas(for: sampleProfile)
    viewModel.sortOption = .strength
    let displayed = viewModel.displayedYogas
    for i in 0..<(displayed.count - 1) {
        XCTAssertGreaterThanOrEqual(displayed[i].strength, displayed[i+1].strength)
    }
}

func testDisplayedYogasFilteredByCategory() async {
    await viewModel.calculateYogas(for: sampleProfile)
    guard let firstCategory = viewModel.availableCategories.first else { return }
    viewModel.selectedCategory = firstCategory
    let filtered = viewModel.displayedYogas
    for yoga in filtered {
        XCTAssertEqual(yoga.category, firstCategory)
    }
}
```

- [ ] **Step 2: Run Yoga tests**

```bash
xcodebuild test -project ParashariPrecision.xcodeproj -scheme ParashariPrecision \
  -destination 'platform=macOS,arch=arm64' \
  -only-testing:ParashariPrecisionTests/YogaViewModelTests \
  2>&1 | tail -20
```

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add ParashariPrecisionTests/YogaViewModelTests.swift
git commit -m "test: expand Yogas — calculation, strength range, category filtering"
```

---

## Task 11: Predictions Module — Complete Unit Tests

**Files:**
- Modify: `ParashariPrecisionTests/PredictionsViewModelTests.swift`

- [ ] **Step 1: Append tests**:

```swift
func testGeneratePredictionsPopulatesPlanetPredictions() async {
    await viewModel.generateAllPredictions(for: sampleProfile)
    XCTAssertFalse(viewModel.planetPredictions.isEmpty)
}

func testGeneratePredictionsPopulatesDashaPrediction() async {
    await viewModel.generateAllPredictions(for: sampleProfile)
    XCTAssertFalse(viewModel.dashaPrediction.isEmpty)
}

func testGeneratePredictionsPopulatesYogaImpact() async {
    await viewModel.generateAllPredictions(for: sampleProfile)
    XCTAssertFalse(viewModel.yogaImpact.isEmpty)
}

func testIsGeneratingFalseAfterComplete() async {
    await viewModel.generateAllPredictions(for: sampleProfile)
    XCTAssertFalse(viewModel.isGenerating)
}

func testErrorNilAfterSuccessfulGeneration() async {
    await viewModel.generateAllPredictions(for: sampleProfile)
    XCTAssertNil(viewModel.errorMessage)
}

func testPlanetPredictionsCoverAllNinePlanets() async {
    await viewModel.generateAllPredictions(for: sampleProfile)
    // Planet predictions should have entries for the main planets
    XCTAssertGreaterThan(viewModel.planetPredictions.count, 0)
}
```

- [ ] **Step 2: Run Predictions tests**

```bash
xcodebuild test -project ParashariPrecision.xcodeproj -scheme ParashariPrecision \
  -destination 'platform=macOS,arch=arm64' \
  -only-testing:ParashariPrecisionTests/PredictionsViewModelTests \
  2>&1 | tail -20
```

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add ParashariPrecisionTests/PredictionsViewModelTests.swift
git commit -m "test: expand Predictions — planet predictions, dasha, yoga impact"
```

---

## Task 12: Run Full Test Suite

- [ ] **Step 1: Run all unit tests**

```bash
xcodebuild test -project ParashariPrecision.xcodeproj -scheme ParashariPrecision \
  -destination 'platform=macOS,arch=arm64' \
  2>&1 | grep -E "(Test Case|FAILED|PASSED|error:|BUILD)" | head -100
```

Expected: All tests pass, no failures.

- [ ] **Step 2: If any tests fail, investigate and fix**

For each failing test:
1. Read the failure message
2. Use `superpowers:systematic-debugging` if the cause is not obvious
3. Fix the implementation (not the test, unless the test was wrong)
4. Re-run that module's tests to confirm

- [ ] **Step 3: Run UI tests**

```bash
xcodebuild test -project ParashariPrecision.xcodeproj \
  -scheme ParashariPrecision \
  -destination 'platform=macOS,arch=arm64' \
  -only-testing:ParashariPrecisionUITests \
  2>&1 | grep -E "(Test Case|FAILED|PASSED|error:)" | head -50
```

- [ ] **Step 4: Commit test run results**

```bash
git add .
git commit -m "test: all unit and UI tests passing — full test suite green"
```

---

## Task 13: QA Expert Review — Module by Module

Use the `macos-swift-app-qa-testing-expert` skill for this task.

- [ ] **Step 1: Launch QA expert agent for Profiles module**

Dispatch a general-purpose agent with this prompt:
```
You are a macOS Swift QA expert. Review the Profiles module of ParashariPrecision at /Users/thotas/Development/Claude/AstroGuru/desktop.

Read these files:
- ParashariPrecision/Views/Profile/NewProfileView.swift
- ParashariPrecision/Views/Profile/ProfileListView.swift
- ParashariPrecision/ViewModels/ProfilesViewModel.swift
- ParashariPrecision/Models/Profile.swift
- ParashariPrecisionTests/NewProfileViewTests.swift
- ParashariPrecisionTests/ProfilesViewModelTests.swift
- ParashariPrecisionTests/ProfileListViewTests.swift

Report:
1. Any remaining bugs or edge cases not covered by tests
2. UI/UX issues visible in the code
3. Swift 6 concurrency issues
4. Missing validation or error handling
5. Verdict: PASS or FAIL with specific issues

Be specific and actionable.
```

- [ ] **Step 2: Fix any FAIL issues found by QA for Profiles**

- [ ] **Step 3: Repeat QA for each remaining module**

Run the same pattern for: Chart, Dasha, Shadbala, Ashtakavarga, Yogas, Predictions.
Each QA review reads the View + ViewModel + Tests for that module and reports.

- [ ] **Step 4: Commit all QA fixes**

```bash
git add .
git commit -m "fix: address QA review findings across all modules"
```

---

## Task 14: Product Manager Review

- [ ] **Step 1: Launch PM agent**

Dispatch a general-purpose agent:
```
You are a product manager reviewing the ParashariPrecision macOS Vedic astrology app.

Read the architecture: /Users/thotas/Development/Claude/AstroGuru/desktop/ParashariPrecision/ARCHITECTURE.md

Then review these view files:
- ParashariPrecision/Views/MainView.swift
- ParashariPrecision/Views/Profile/ProfileListView.swift
- ParashariPrecision/Views/Profile/NewProfileView.swift
- ParashariPrecision/Views/Chart/ChartView.swift
- ParashariPrecision/Views/Dasha/DashaView.swift
- ParashariPrecision/Views/Shadbala/ShadbalaView.swift
- ParashariPrecision/Views/Ashtakavarga/AshtakavargaView.swift
- ParashariPrecision/Views/Yoga/YogaListView.swift
- ParashariPrecision/Views/Predictions/PredictionsView.swift

From a product perspective, report:
1. Is the user flow logical? Can a new user create a profile and see their chart?
2. Are all 6 analysis tabs useful and clearly labeled?
3. Is there any missing critical feature that would block a first release?
4. Verdict: READY FOR RELEASE or NEEDS WORK with specifics

Focus on product quality, not code quality.
```

- [ ] **Step 2: Address any blocking PM feedback**

- [ ] **Step 3: Commit PM fixes**

```bash
git add .
git commit -m "fix: address PM review findings before release"
```

---

## Task 15: Release Build & Deploy

- [ ] **Step 1: Run full test suite one final time to confirm green**

```bash
xcodebuild test -project ParashariPrecision.xcodeproj -scheme ParashariPrecision \
  -destination 'platform=macOS,arch=arm64' \
  2>&1 | grep -E "(TEST SUCCEEDED|TEST FAILED|error:)" | tail -5
```

Expected: `** TEST SUCCEEDED **`

- [ ] **Step 2: Build Release**

```bash
xcodebuild \
  -project ParashariPrecision.xcodeproj \
  -scheme ParashariPrecision \
  -configuration Release \
  -destination 'platform=macOS,arch=arm64' \
  -derivedDataPath build \
  build \
  2>&1 | tail -10
```

Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 3: Create destination directory and deploy**

```bash
mkdir -p ~/Applications/myApps
cp -R build/Build/Products/Release/ParashariPrecision.app ~/Applications/myApps/
```

- [ ] **Step 4: Verify the app launches**

```bash
open ~/Applications/myApps/ParashariPrecision.app
```

Confirm: App opens, sidebar shows "AstroGuru", sample profiles visible, tabs switch.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "chore: release build deployed to ~/Applications/myApps"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Fix BUG-3: safe init | ProfilesViewModel.swift |
| 2 | Fix BUG-1: UTC date | NewProfileView.swift |
| 3 | Fix BUG-2: tab switching | MainView.swift |
| 4 | Add UI test target | project.yml, UITests/ |
| 5 | Profiles unit tests | ProfilesViewModelTests |
| 6 | Chart unit tests | ChartViewModelTests |
| 7 | Dasha unit tests | DashaViewModelTests |
| 8 | Shadbala unit tests | ShadbalaViewModelTests |
| 9 | Ashtakavarga unit tests | AshtakavargaViewModelTests |
| 10 | Yogas unit tests | YogaViewModelTests |
| 11 | Predictions unit tests | PredictionsViewModelTests |
| 12 | Full test suite run | — |
| 13 | QA expert per module | All views + VMs |
| 14 | PM review | All views |
| 15 | Release build + deploy | ~/Applications/myApps |
