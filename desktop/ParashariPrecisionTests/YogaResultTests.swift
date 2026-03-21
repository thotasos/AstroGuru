import XCTest
@testable import ParashariPrecision

final class YogaResultTests: XCTestCase {
    func testYogaResultCodable() {
        let yoga = YogaResult(
            name: "Rajayoga",
            description: "Major yoga",
            isPresent: true,
            planets: ["Sun", "Moon"],
            houses: [1, 10],
            strength: 0.85,
            category: "Rajyoga"
        )
        let data = try! JSONEncoder().encode(yoga)
        let decoded = try! JSONDecoder().decode(YogaResult.self, from: data)
        XCTAssertEqual(decoded.name, "Rajayoga")
        XCTAssertEqual(decoded.strength, 0.85, accuracy: 0.001)
    }
}