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

    func testAyanamsaValues() {
        XCTAssertEqual(Ayanamsa.lahiri.rawValue, 1)
        XCTAssertEqual(Ayanamsa.kp.rawValue, 3)
    }

    func testPlanetSymbols() {
        XCTAssertEqual(Planet.sun.symbol, "Su")
        XCTAssertEqual(Planet.moon.symbol, "Mo")
        XCTAssertEqual(Planet.rahu.symbol, "Ra")
        XCTAssertEqual(Planet.ketu.symbol, "Ke")
    }
}
