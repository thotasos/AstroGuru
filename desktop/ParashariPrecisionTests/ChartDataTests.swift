import XCTest
@testable import ParashariPrecision

final class ChartDataTests: XCTestCase {
    func testPlanetPositionCodable() {
        let pos = PlanetPosition(
            planet: "Sun",
            sign: 4,
            degreeInSign: 14.5,
            longitude: 134.5,
            nakshatra: 12,
            pada: 3,
            isRetrograde: false
        )
        let data = try! JSONEncoder().encode(pos)
        let decoded = try! JSONDecoder().decode(PlanetPosition.self, from: data)
        XCTAssertEqual(decoded.planet, "Sun")
        XCTAssertEqual(decoded.sign, 4)
        XCTAssertEqual(decoded.signEnum, .leo)
    }

    func testChartDataCodable() {
        let chart = ChartData(
            ascendant: 120.5,
            planets: [
                PlanetPosition(planet: "Sun", sign: 4, degreeInSign: 14.5, longitude: 134.5, nakshatra: 12, pada: 3, isRetrograde: false)
            ],
            houses: [
                House(number: 1, sign: .scorpio, degreeOnCusp: 0),
                House(number: 2, sign: .sagittarius, degreeOnCusp: 30)
            ],
            julianDay: 2451545.0,
            ayanamsaValue: 23.85,
            ayanamsaType: 1,
            mc: 245.0
        )
        XCTAssertEqual(chart.planets.count, 1)
        XCTAssertEqual(chart.ascendant, 120.5, accuracy: 0.001)
    }

    func testNakshatraCount() {
        XCTAssertEqual(Nakshatra.allCases.count, 27)
    }

    func testNakshatraLord() {
        XCTAssertEqual(Nakshatra.ashwini.lord, .ketu)
        XCTAssertEqual(Nakshatra.pushya.lord, .saturn)
    }

    func testGridCell() {
        let cell = GridCell(row: 0, col: 0, sign: 11, isCenter: false, planets: ["Su", "Mo"], lagnaSign: 11)
        XCTAssertEqual(cell.planets.count, 2)
        XCTAssertEqual(cell.sign, 11)
    }
}