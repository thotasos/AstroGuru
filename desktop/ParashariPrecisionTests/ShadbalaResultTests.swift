import XCTest
@testable import ParashariPrecision

final class ShadbalaResultTests: XCTestCase {
    func testShadbalaResult() {
        let shadbala = ShadbalaResult(
            planet: "Sun",
            sthAnaBala: 37.5,
            digBala: 15.0,
            kalaBala: 22.5,
            chestabala: 10.0,
            naisargikaBala: 60.0,
            drigBala: 5.0,
            total: 2.5,
            strengthInVirupas: 150.0
        )
        XCTAssertEqual(shadbala.planet, "Sun")
        XCTAssertFalse(shadbala.isExalted)
        XCTAssertTrue(shadbala.isDebilitated)
    }
}