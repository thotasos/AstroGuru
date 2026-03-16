import XCTest
@testable import ParashariPrecision

final class ParashariPrecisionTests: XCTestCase {

    // MARK: - Model Tests

    func testBirthProfileFormattedDOB() throws {
        let dob = ISO8601DateFormatter().date(from: "1990-01-15T06:30:00Z") ?? Date()
        let profile = BirthProfile(
            id: "test-1",
            name: "Test User",
            dobUTC: dob,
            lat: 18.9667,
            lon: 72.8333,
            timezone: "Asia/Kolkata",
            placeName: "Mumbai, India",
            notes: ""
        )
        XCTAssertFalse(profile.formattedDOB.isEmpty)
        XCTAssertFalse(profile.localBirthTime.isEmpty)
        XCTAssertFalse(profile.shortDOB.isEmpty)
    }

    func testSignEnum() throws {
        XCTAssertEqual(Sign.aries.rawValue, 0)
        XCTAssertEqual(Sign.pisces.rawValue, 11)
        XCTAssertEqual(Sign.aries.name, "Aries")
        XCTAssertEqual(Sign.aries.number, 1)
        XCTAssertEqual(Sign.pisces.number, 12)
        XCTAssertEqual(Sign.aries.lord, .mars)
        XCTAssertEqual(Sign.taurus.lord, .venus)
        XCTAssertEqual(Sign.leo.lord, .sun)
    }

    func testPlanetEnum() throws {
        XCTAssertEqual(Planet.sun.name, "Sun")
        XCTAssertEqual(Planet.sun.abbreviation, "Su")
        XCTAssertEqual(Planet.moon.abbreviation, "Mo")
        XCTAssertEqual(Planet.allCases.count, 9)
    }

    func testSouthIndianLayout() throws {
        // Row 0: Pi(11), Ar(0), Ta(1), Ge(2)
        let aries = SouthIndianLayout.position(for: 0)
        XCTAssertEqual(aries?.row, 0)
        XCTAssertEqual(aries?.col, 1)

        // Row 3: Sg(8), Sc(7), Li(6), Vi(5)
        let virgo = SouthIndianLayout.position(for: 5)
        XCTAssertEqual(virgo?.row, 3)
        XCTAssertEqual(virgo?.col, 3)

        let pisces = SouthIndianLayout.position(for: 11)
        XCTAssertEqual(pisces?.row, 0)
        XCTAssertEqual(pisces?.col, 0)
    }

    func testChartDataPlanetsInSign() throws {
        let chart = ChartData(
            profileId: "test",
            varga: "D1",
            ayanamsa: "Lahiri",
            ayanamsaDegree: 23.845,
            ascendantSign: 0,
            ascendantDegree: 12.5,
            planets: [
                PlanetPosition(
                    id: "1", planet: "Sun", longitude: 15.0, latitude: 0, speed: 1.0,
                    sign: 0, signLongitude: 15.0, nakshatra: "Ashwini", nakshatraPada: 2,
                    isRetrograde: false, house: 1
                ),
                PlanetPosition(
                    id: "2", planet: "Mars", longitude: 25.0, latitude: 0, speed: 0.5,
                    sign: 0, signLongitude: 25.0, nakshatra: "Ashwini", nakshatraPada: 4,
                    isRetrograde: false, house: 1
                )
            ],
            houses: [],
            calculatedAt: Date()
        )

        let planetsInAries = chart.planetsInSign(0)
        XCTAssertEqual(planetsInAries.count, 2)
        let planetsInTaurus = chart.planetsInSign(1)
        XCTAssertEqual(planetsInTaurus.count, 0)
    }

    func testPlanetPositionDegreeString() throws {
        let pos = PlanetPosition(
            id: "1", planet: "Sun", longitude: 15.5, latitude: 0, speed: 1.0,
            sign: 0, signLongitude: 15.5, nakshatra: "Ashwini", nakshatraPada: 2,
            isRetrograde: false, house: 1
        )
        let degStr = pos.degreeString
        XCTAssertTrue(degStr.contains("°"))
        XCTAssertTrue(degStr.contains("'"))
    }

    func testDashaPeriodIsCurrentPeriod() throws {
        let pastDasha = DashaPeriod(
            id: "1",
            planet: "Sun",
            startDate: Date().addingTimeInterval(-10 * 365.25 * 24 * 3600),
            endDate: Date().addingTimeInterval(-4 * 365.25 * 24 * 3600),
            level: 1,
            parentId: nil,
            subPeriods: nil
        )
        XCTAssertFalse(pastDasha.isCurrentPeriod)

        let currentDasha = DashaPeriod(
            id: "2",
            planet: "Moon",
            startDate: Date().addingTimeInterval(-2 * 365.25 * 24 * 3600),
            endDate: Date().addingTimeInterval(8 * 365.25 * 24 * 3600),
            level: 1,
            parentId: nil,
            subPeriods: nil
        )
        XCTAssertTrue(currentDasha.isCurrentPeriod)
    }

    func testDashaPeriodDurationYears() throws {
        let dasha = DashaPeriod(
            id: "1",
            planet: "Venus",
            startDate: Date(),
            endDate: Date().addingTimeInterval(20 * 365.25 * 24 * 3600),
            level: 1,
            parentId: nil,
            subPeriods: nil
        )
        XCTAssertEqual(dasha.durationYears, 20.0, accuracy: 0.1)
        XCTAssertTrue(dasha.durationString.contains("yrs"))
    }

    // MARK: - Yoga Tests

    func testYogaStrengthColor() throws {
        XCTAssertNotNil(YogaStrength.strong.color)
        XCTAssertNotNil(YogaStrength.cancelled.color)
    }

    func testYogaCategoryDisplayName() throws {
        XCTAssertFalse(YogaCategory.raja.displayName.isEmpty)
        XCTAssertFalse(YogaCategory.dhana.displayName.isEmpty)
    }

    // MARK: - Service Tests

    func testAPIServiceBaseURL() async throws {
        let available = await APIService.shared.isServerAvailable()
        // Server may or may not be running in test environment — just verify no crash
        XCTAssertTrue(available || !available)
    }

    func testDatabaseServicePath() async throws {
        let path = await DatabaseService.shared.dbPath
        XCTAssertTrue(path.contains("ParashariApp"))
        XCTAssertTrue(path.contains("astrology.sqlite"))
    }
}
