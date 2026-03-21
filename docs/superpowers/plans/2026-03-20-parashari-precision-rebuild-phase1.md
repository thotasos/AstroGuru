# Parashari Precision - Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 1 foundation: Models, DatabaseService, and AstrologyCore JavaScriptCore bridge.

**Architecture:** Pure Swift/SwiftUI macOS app with no HTTP runtime dependency. Calculations via JavaScriptCore embedding of `@parashari/core`. SQLite for local persistence.

**Tech Stack:** Swift 5.9+, SwiftUI, SQLite3 (C API), JavaScriptCore, XCTest

---

## File Structure

```
desktop/
├── ParashariPrecision/
│   ├── App/
│   │   └── ParashariPrecisionApp.swift       # @main entry
│   ├── Models/
│   │   ├── Profile.swift                    # Birth profile model
│   │   ├── ChartData.swift                   # PlanetPosition, HousePosition, ChartData
│   │   ├── DashaPeriod.swift                 # DashaPeriod nested model
│   │   ├── YogaResult.swift                  # Yoga detection result
│   │   ├── ShadbalaResult.swift              # Shadbala calculation result
│   │   ├── AshtakavargaResult.swift          # Ashtakavarga result
│   │   └── Types.swift                       # Enums: Planet, Sign, House, Varga, Ayanamsa
│   ├── Services/
│   │   ├── DatabaseService.swift              # SQLite CRUD, actor isolation
│   │   ├── AstrologyCore.swift               # JavaScriptCore bridge to @parashari/core
│   │   └── CalculationService.swift          # High-level calculation facade
│   ├── ViewModels/
│   │   └── ProfilesViewModel.swift            # Profile list + CRUD
│   └── Views/
│       └── MainView.swift                    # Placeholder main view
└── ParashariPrecisionTests/
    ├── ModelsTests.swift
    ├── DatabaseServiceTests.swift
    └── AstrologyCoreTests.swift
```

**Delete after confirmation:** `desktop/ParashariPrecision/` (all old Swift files except we keep the directory structure)

---

## Task 1: Delete Old Desktop App

**Files:**
- Delete: `desktop/ParashariPrecision/` (all .swift files, recreate fresh)

- [ ] **Step 1: Delete old Swift files**

```bash
find desktop/ParashariPrecision -name "*.swift" -delete
find desktop/ParashariPrecision -name "*.xcdatamodel" -delete
```

- [ ] **Step 2: Verify directory structure exists**

```bash
ls -la desktop/ParashariPrecision/
```

Expected: Empty directory or directories only (no .swift files)

---

## Task 2: Create Types and Enums

**Files:**
- Create: `desktop/ParashariPrecision/Models/Types.swift`

- [ ] **Step 1: Write the failing test**

```swift
// desktop/ParashariPrecisionTests/TypesTests.swift
import XCTest
@testable import ParashariPrecision

final class TypesTests: XCTestCase {
    func testPlanetCount() {
        XCTAssertEqual(Planet.allCases.count, 9)
    }

    func testSignNames() {
        XCTAssertEqual(Sign.aries.name, "Aries")
        XCTAssertEqual(Sign.pisces.name, "Pisces")
    }

    func testVargaDivisor() {
        XCTAssertEqual(Varga.d1.divisor, 1)
        XCTAssertEqual(Varga.d9.divisor, 9)
        XCTAssertEqual(Varga.d60.divisor, 60)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd desktop && xcodebuild test -scheme ParashariPrecision -name testPlanetCount 2>&1 | grep -E "(error|FAILED)"
```
Expected: FAIL — Types.swift does not exist

- [ ] **Step 3: Write Types.swift**

```swift
import Foundation

// MARK: - Planet
enum Planet: String, CaseIterable, Codable {
    case sun = "Sun", moon = "Moon", mars = "Mars"
    case mercury = "Mercury", jupiter = "Jupiter", venus = "Venus"
    case saturn = "Saturn", rahu = "Rahu", ketu = "Ketu"

    var name: String { rawValue }

    var symbol: String {
        switch self {
        case .sun: return "Su"; case .moon: return "Mo"
        case .mars: return "Ma"; case .mercury: return "Me"
        case .jupiter: return "Ju"; case .venus: return "Ve"
        case .saturn: return "Sa"; case .rahu: return "Ra"; case .ketu: return "Ke"
        }
    }
}

// MARK: - Sign
enum Sign: Int, CaseIterable, Codable {
    case aries = 0, taurus, gemini, cancer, leo, virgo
    case libra, scorpio, sagittarius, capricorn, aquarius, pisces

    var name: String {
        switch self {
        case .aries: return "Aries"; case .taurus: return "Taurus"
        case .gemini: return "Gemini"; case .cancer: return "Cancer"
        case .leo: return "Leo"; case .virgo: return "Virgo"
        case .libra: return "Libra"; case .scorpio: return "Scorpio"
        case .sagittarius: return "Sagittarius"; case .capricorn: return "Capricorn"
        case .aquarius: return "Aquarius"; case .pisces: return "Pisces"
        }
    }

    var symbol: String {
        switch self {
        case .aries: return "♈"; case .taurus: return "♉"; case .gemini: return "♊"
        case .cancer: return "♋"; case .leo: return "♌"; case .virgo: return "♍"
        case .libra: return "♎"; case .scorpio: return "♏"; case .sagittarius: return "♐"
        case .capricorn: return "♑"; case .aquarius: return "♒"; case .pisces: return "♓"
        }
    }
}

// MARK: - House
struct House: Codable, Equatable {
    let number: Int      // 1-12
    let sign: Sign
    let degreeOnCusp: Double
}

// MARK: - Varga (Divisional Charts)
enum Varga: String, CaseIterable, Codable {
    case d1 = "D1", d2 = "D2", d3 = "D3", d4 = "D4", d5 = "D5"
    case d6 = "D6", d7 = "D7", d8 = "D8", d9 = "D9", d10 = "D10"
    case d11 = "D11", d12 = "D12", d16 = "D16", d20 = "D20"
    case d24 = "D24", d27 = "D27", d30 = "D30", d40 = "D40", d45 = "D45"
    case d60 = "D60"

    var divisor: Int {
        switch self {
        case .d1: return 1; case .d2: return 2; case .d3: return 3; case .d4: return 4; case .d5: return 5
        case .d6: return 6; case .d7: return 7; case .d8: return 8; case .d9: return 9; case .d10: return 10
        case .d11: return 11; case .d12: return 12; case .d16: return 16; case .d20: return 20
        case .d24: return 24; case .d27: return 27; case .d30: return 30; case .d40: return 40; case .d45: return 45
        case .d60: return 60
        }
    }
}

// MARK: - Ayanamsa
enum Ayanamsa: Int, Codable {
    case lahiri = 1, raman = 2, kp = 3
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd desktop && xcodebuild test -scheme ParashariPrecision -name TypesTests 2>&1 | grep -E "(PASSED|FAILED|error:)"
```
Expected: PASS

---

## Task 3: Create Profile Model

**Files:**
- Create: `desktop/ParashariPrecision/Models/Profile.swift`
- Modify: `desktop/ParashariPrecisionTests/ModelsTests.swift`

- [ ] **Step 1: Write the failing test**

```swift
// Add to desktop/ParashariPrecisionTests/ModelsTests.swift
func testProfileCodable() {
    let profile = Profile(
        id: "test-id",
        name: "Test User",
        dobUTC: "2000-01-01T12:00:00Z",
        latitude: 28.6139,
        longitude: 77.2090,
        timezone: "Asia/Kolkata",
        utcOffset: 5.5,
        placeName: "New Delhi",
        ayanamsaId: 1,
        notes: "Test"
    )
    let data = try! JSONEncoder().encode(profile)
    let decoded = try! JSONDecoder().decode(Profile.self, from: data)
    XCTAssertEqual(decoded.name, "Test User")
    XCTAssertEqual(decoded.latitude, 28.6139)
}
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL — Profile.swift does not exist

- [ ] **Step 3: Write Profile.swift**

```swift
import Foundation

struct Profile: Codable, Identifiable, Equatable {
    let id: String
    var name: String
    var dobUTC: String          // ISO 8601 UTC
    var latitude: Double
    var longitude: Double
    var timezone: String         // IANA timezone
    var utcOffset: Double       // hours
    var placeName: String?
    var ayanamsaId: Int
    var notes: String?
    var createdAt: String?
    var updatedAt: String?

    init(
        id: String = UUID().uuidString,
        name: String,
        dobUTC: String,
        latitude: Double,
        longitude: Double,
        timezone: String,
        utcOffset: Double,
        placeName: String? = nil,
        ayanamsaId: Int = 1,
        notes: String? = nil,
        createdAt: String? = nil,
        updatedAt: String? = nil
    ) {
        self.id = id
        self.name = name
        self.dobUTC = dobUTC
        self.latitude = latitude
        self.longitude = longitude
        self.timezone = timezone
        self.utcOffset = utcOffset
        self.placeName = placeName
        self.ayanamsaId = ayanamsaId
        self.notes = notes
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    var dobDate: Date? {
        ISO8601DateFormatter().date(from: dobUTC)
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

---

## Task 4: Create ChartData Models

**Files:**
- Create: `desktop/ParashariPrecision/Models/ChartData.swift`

- [ ] **Step 1: Write failing tests**

```swift
// Add to ModelsTests.swift
func testPlanetPositionCodable() {
    let pos = PlanetPosition(
        planet: .sun, sign: .leo, degreeInSign: 14.5,
        longitude: 134.5, nakshatra: .hasta, pada: 3,
        isRetrograde: false
    )
    let data = try! JSONEncoder().encode(pos)
    let decoded = try! JSONDecoder().decode(PlanetPosition.self, from: data)
    XCTAssertEqual(decoded.planet, .sun)
    XCTAssertEqual(decoded.sign, .leo)
}

func testChartData() {
    let chart = ChartData(
        ascendant: 120.5,
        planets: [
            PlanetPosition(planet: .sun, sign: .leo, degreeInSign: 14.5, longitude: 134.5, nakshatra: .hasta, pada: 3, isRetrograde: false)
        ],
        houses: [
            House(number: 1, sign: .scorpio, degreeOnCusp: 0),
            House(number: 2, sign: .sagittarius, degreeOnCusp: 30)
        ],
        julianDay: 2451545.0,
        ayanamsaValue: 23.85,
        ayanamsaType: .lahiri,
        mc: 245.0
    )
    XCTAssertEqual(chart.planets.count, 1)
    XCTAssertEqual(chart.ascendant, 120.5, accuracy: 0.001)
}
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Write ChartData.swift**

```swift
import Foundation

// MARK: - Nakshatra
enum Nakshatra: Int, CaseIterable, Codable {
    case ashwini = 0, bharani, krittika, rohini, mrigashirsha, ardhra
    case punarvasu, pushya, ashlesha, magha, purvaPhalguni, uttaraPhalguni
    caseHasta, chitra, swati, visakha, anuradha, jyeshtha
    case mula, purvaShadha, uttaraShadha, shravana, dhanishta, shatabhisha
    case purvaBhadrapada, uttaraBhadrapada, revati

    var name: String {
        switch self {
        case .ashwini: return "Ashwini"; case .bharani: return "Bharani"
        case .krittika: return "Krittika"; case .rohini: return "Rohini"
        case .mrigashirsha: return "Mrigashirsha"; case .ardhra: return "Ardhra"
        case .punarvasu: return "Punarvasu"; case .pushya: return "Pushya"
        case .ashlesha: return "Ashlesha"; case .magha: return "Magha"
        case .purvaPhalguni: return "Purva Phalguni"; case .uttaraPhalguni: return "Uttara Phalguni"
        case .hasta: return "Hasta"; case .chitra: return "Chitra"
        case .swati: return "Swati"; case .visakha: return "Visakha"
        case .anuradha: return "Anuradha"; case .jyeshtha: return "Jyeshtha"
        case .mula: return "Mula"; case .purvaShadha: return "Purva Shadha"
        case .uttaraShadha: return "Uttara Shadha"; case .shravana: return "Shravana"
        case .dhanishta: return "Dhanishta"; case .shatabhisha: return "Shatabhisha"
        case .purvaBhadrapada: return "Purva Bhadrapada"; case .uttaraBhadrapada: return "Uttara Bhadrapada"
        case .revati: return "Revati"
        }
    }

    var lord: Planet {
        let lords: [Planet] = [.ketu, .venus, .sun, .moon, .mars, .rahu, .jupiter, .saturn, .mercury, .ketu, .venus, .sun,
                              .moon, .mars, .rahu, .jupiter, .saturn, .moon, .mercury, .ketu, .venus, .sun, .moon, .mars,
                              .rahu, .jupiter, .saturn, .mercury]
        return lords[self.rawValue]
    }
}

// Use typealias for lowercase enum names to match existing code
typealias NakshatraAlias = Nakshatra
extension Nakshatra { static var hasta: Nakshatra { .hasta } }

struct PlanetPosition: Codable, Equatable {
    let planet: String  // "Sun", "Moon", etc.
    let sign: Int       // 0-11
    let degreeInSign: Double
    let longitude: Double
    let nakshatra: Int
    let pada: Int
    let isRetrograde: Bool

    var planetEnum: Planet? {
        Planet(rawValue: planet)
    }

    var signEnum: Sign {
        Sign(rawValue: sign) ?? .aries
    }

    var nakshatraEnum: Nakshatra {
        Nakshatra(rawValue: nakshatra) ?? .ashwini
    }
}

struct ChartData: Codable, Equatable {
    let ascendant: Double
    let planets: [PlanetPosition]
    let houses: [House]
    let julianDay: Double
    let ayanamsaValue: Double
    let ayanamsaType: Int
    let mc: Double

    init(
        ascendant: Double,
        planets: [PlanetPosition],
        houses: [House],
        julianDay: Double,
        ayanamsaValue: Double,
        ayanamsaType: Int,
        mc: Double
    ) {
        self.ascendant = ascendant
        self.planets = planets
        self.houses = houses
        self.julianDay = julianDay
        self.ayanamsaValue = ayanamsaValue
        self.ayanamsaType = ayanamsaType
        self.mc = mc
    }
}

struct VargaChart: Codable {
    let varga: String
    let chart: ChartData
}

struct GridCell: Codable {
    let row: Int
    let col: Int
    let sign: Int
    let isCenter: Bool
    let planets: [String]   // planet symbols
    let lagnaSign: Int?
}
```

- [ ] **Step 4: Run tests to verify they pass**

---

## Task 5: Create DashaPeriod Model

**Files:**
- Create: `desktop/ParashariPrecision/Models/DashaPeriod.swift`

- [ ] **Write test, implement, verify**

```swift
// Test
func testDashaPeriodCodable() {
    let dasha = DashaPeriod(
        lord: "Moon",
        sign: 2,
        startYear: 2020,
        startMonth: 1,
        endYear: 2030,
        endMonth: 1,
        balance: 2.5,
        antardashas: []
    )
    let data = try! JSONEncoder().encode(dasha)
    let decoded = try! JSONDecoder().decode(DashaPeriod.self, from: data)
    XCTAssertEqual(decoded.lord, "Moon")
}

// Implementation
struct DashaPeriod: Codable {
    let lord: String
    let sign: Int
    let startYear: Int
    let startMonth: Int
    let endYear: Int
    let endMonth: Int
    let balance: Double
    let antardashas: [DashaPeriod]

    var endDate: String {
        "\(endYear)-\(String(format: "%02d", endMonth))-01"
    }
}
```

---

## Task 6: Create YogaResult, ShadbalaResult, AshtakavargaResult Models

**Files:**
- Create: `desktop/ParashariPrecision/Models/YogaResult.swift`
- Create: `desktop/ParashariPrecision/Models/ShadbalaResult.swift`
- Create: `desktop/ParashariPrecision/Models/AshtakavargaResult.swift`

**Write tests and implementations for each. Keep it minimal - Codable conformance and basic properties only.**

---

## Task 7: Create DatabaseService

**Files:**
- Create: `desktop/ParashariPrecision/Services/DatabaseService.swift`
- Create: `desktop/ParashariPrecisionTests/DatabaseServiceTests.swift`

**Test approach:**
1. Create in-memory SQLite database for tests
2. Test profile CRUD operations
3. Test calculation cache read/write

```swift
// DatabaseServiceTests.swift skeleton
import XCTest

final class DatabaseServiceTests: XCTestCase {
    var db: DatabaseService!

    override func setUp() async throws {
        db = try await DatabaseService(inMemory: true)
        try await db.initialize()
    }

    func testCreateAndFetchProfile() async throws {
        let profile = Profile(name: "Test", dobUTC: "2000-01-01T12:00:00Z",
                             latitude: 28.6, longitude: 77.2, timezone: "Asia/Kolkata", utcOffset: 5.5)
        try await db.saveProfile(profile)
        let fetched = try await db.fetchProfile(id: profile.id)
        XCTAssertEqual(fetched?.name, "Test")
    }

    func testFetchAllProfiles() async throws {
        // insert two profiles, fetch all
        let all = try await db.fetchAllProfiles()
        XCTAssertGreaterThanOrEqual(all.count, 0)
    }
}
```

```swift
// DatabaseService.swift skeleton
import Foundation
import SQLite3

actor DatabaseService {
    private var db: OpaquePointer?
    private let dbPath: String

    init(inMemory: Bool = false) throws {
        if inMemory {
            self.dbPath = ":memory:"
        } else {
            let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
            let dir = appSupport.appendingPathComponent("ParashariPrecision")
            try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            self.dbPath = dir.appendingPathComponent("astrology.sqlite").path
        }
    }

    func initialize() throws {
        // Open database, set WAL mode, create tables
    }

    func saveProfile(_ profile: Profile) throws {
        // INSERT OR REPLACE into profiles table
    }

    func fetchProfile(id: String) throws -> Profile? {
        // SELECT from profiles WHERE id = ?
    }

    func fetchAllProfiles() throws -> [Profile] {
        // SELECT * from profiles ORDER BY created_at DESC
    }

    func deleteProfile(id: String) throws {
        // DELETE from profiles WHERE id = ?
    }
}
```

---

## Task 8: Create AstrologyCore (JavaScriptCore Bridge)

**Files:**
- Create: `desktop/ParashariPrecision/Services/AstrologyCore.swift`
- Create: `desktop/ParashariPrecisionTests/AstrologyCoreTests.swift`

**This is the most complex component. Steps:**

1. Bundle `@parashari/core` in the app bundle (copy from `node_modules/@parashari/core/dist/`)
2. Create JSContext, load the module
3. Expose Swift call interface

```swift
// desktop/ParashariPrecision/Services/AstrologyCore.swift
import Foundation
import JavaScriptCore

final class AstrologyCore {
    private let context: JSContext
    private let engine: JSValue

    init() throws {
        context = JSContext()!
        context.exceptionHandler = { ctx, ex in
            print("JS Error: \(ex?.toString() ?? "unknown")")
        }

        // Load @parashari/core bundle
        guard let bundlePath = Bundle.main.path(forResource: "parashari-core", ofType: "js"),
              let jsCode = try? String(contentsOfFile: bundlePath, encoding: .utf8) else {
            throw AstrologyCoreError.bundleNotFound
        }

        context.evaluateScript(jsCode)
        engine = context.evaluateScript("new AstrologyEngine()")!
    }

    func calculateChart(birthData: [String: Any]) throws -> ChartData {
        let jsResult = engine.callMethod("calculateChart", withArguments: [birthData])
        let jsonString = jsResult?.toString() ?? "{}"
        guard let data = jsonString.data(using: .utf8) else {
            throw AstrologyCoreError.invalidResponse
        }
        return try JSONDecoder().decode(ChartData.self, from: data)
    }
}

enum AstrologyCoreError: Error {
    case bundleNotFound
    case invalidResponse
    case calculationFailed(String)
}
```

**Fallback if JavaScriptCore ESM fails:**

```swift
// Use Process spawning instead
final class AstrologyCore {
    private let nodePath = "/usr/local/bin/node"  // or find via which

    func calculateChart(birthData: BirthData) throws -> ChartData {
        let input = JSONEncoder().encode(birthData)
        let process = Process()
        process.executableURL = URL(fileURLWithPath: nodePath)
        process.arguments = ["-e", """
            const engine = require('@parashari/core');
            const result = engine.calculateChart(JSON.parse(require('fs').readFileSync(0, 'utf8')));
            console.log(JSON.stringify(result));
            """]
        // spawn, write input, read output, parse
    }
}
```

**Tests:**
```swift
func testCalculateChart() throws {
    let core = try AstrologyCore()
    let birthData: [String: Any] = [
        "name": "Test",
        "dateOfBirth": "2000-01-01T12:00:00Z",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "timezone": 5.5
    ]
    let chart = try core.calculateChart(birthData: birthData)
    XCTAssertEqual(chart.planets.count, 9)
}
```

---

## Task 9: Create App Entry Point

**Files:**
- Create: `desktop/ParashariPrecision/App/ParashariPrecisionApp.swift`
- Create: `desktop/ParashariPrecision/Views/MainView.swift`

```swift
// desktop/ParashariPrecision/App/ParashariPrecisionApp.swift
import SwiftUI

@main
struct ParashariPrecisionApp: App {
    @State private var profilesViewModel = ProfilesViewModel()

    var body: some Scene {
        WindowGroup {
            MainView()
                .environmentObject(profilesViewModel)
        }
    }
}
```

```swift
// desktop/ParashariPrecision/Views/MainView.swift
import SwiftUI

struct MainView: View {
    @EnvironmentObject var profilesViewModel: ProfilesViewModel

    var body: some View {
        NavigationSplitView {
            ProfileListView()
        } detail: {
            Text("Select a profile")
        }
    }
}
```

---

## Task 10: Create ProfilesViewModel

**Files:**
- Create: `desktop/ParashariPrecision/ViewModels/ProfilesViewModel.swift`

```swift
import Foundation
import Combine

@MainActor
final class ProfilesViewModel: ObservableObject {
    @Published var profiles: [Profile] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let database: DatabaseService

    init(database: DatabaseService = try! DatabaseService()) {
        self.database = database
    }

    func loadProfiles() async {
        isLoading = true
        do {
            profiles = try await database.fetchAllProfiles()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func saveProfile(_ profile: Profile) async throws {
        try await database.saveProfile(profile)
        await loadProfiles()
    }

    func deleteProfile(_ profile: Profile) async throws {
        try await database.deleteProfile(id: profile.id)
        await loadProfiles()
    }
}
```

---

## Verification Commands

After each task, run:
```bash
cd desktop && xcodebuild test -scheme ParashariPrecision -only-testing:ParashariPrecisionTests/TypesTests 2>&1 | grep -E "(PASSED|FAILED|error:)"
```

After all Phase 1 tasks:
```bash
cd desktop && xcodebuild build -scheme ParashariPrecision 2>&1 | grep -E "(BUILD SUCCEEDED|BUILD FAILED|error:)"
```

---

## Next Phase Preview

Phase 2 (Profile UI + Chart View) will add:
- ProfileListView with sample profile creation
- NewProfileView with birth data form
- SouthIndianChartView rendering
- ChartViewModel connecting chart calculation to view
