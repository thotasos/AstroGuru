import XCTest
@testable import ParashariPrecision

final class DashaPeriodTests: XCTestCase {
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
        XCTAssertEqual(decoded.balance, 2.5)
    }

    func testDashaPeriodWithAntardashas() {
        let antardasha = DashaPeriod(
            lord: "Sun",
            sign: 4,
            startYear: 2022,
            startMonth: 6,
            endYear: 2023,
            endMonth: 6,
            balance: 1.0,
            antardashas: []
        )
        let dasha = DashaPeriod(
            lord: "Moon",
            sign: 2,
            startYear: 2020,
            startMonth: 1,
            endYear: 2030,
            endMonth: 1,
            balance: 2.5,
            antardashas: [antardasha]
        )
        XCTAssertEqual(dasha.antardashas.count, 1)
        XCTAssertEqual(dasha.antardashas[0].lord, "Sun")
    }

    func testEndDate() {
        let dasha = DashaPeriod(
            lord: "Moon", sign: 2,
            startYear: 2020, startMonth: 3,
            endYear: 2030, endMonth: 11,
            balance: 0, antardashas: []
        )
        XCTAssertEqual(dasha.endDate, "2030-11-01")
    }
}