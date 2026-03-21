import XCTest
@testable import ParashariPrecision

final class AshtakavargaResultTests: XCTestCase {
    func testAshtakavargaBindu() {
        let result = AshtakavargaResult(
            bav: ["Sun": [3, 2, 1, 4, 2, 1, 3, 2, 1, 4, 2, 1]],
            sav: [25, 22, 18, 30, 20, 15, 25, 22, 18, 30, 20, 15],
            planetBav: [:]
        )
        XCTAssertEqual(result.bindu(for: "Sun", sign: 0), 3)
        XCTAssertEqual(result.savTotal(for: 3), 30)
    }
}