import XCTest
@testable import ParashariPrecision

final class ProfileTests: XCTestCase {
    func testProfileCodable() {
        let profile = Profile(
            id: "test-id",
            name: "Mahatma Gandhi",
            dobUTC: "1869-10-02T04:50:00Z",
            latitude: 21.1702,
            longitude: 70.0577,
            timezone: "Asia/Kolkata",
            utcOffset: 5.5,
            placeName: "Porbandar, India",
            ayanamsaId: 1,
            notes: "Test profile"
        )
        let data = try! JSONEncoder().encode(profile)
        let decoded = try! JSONDecoder().decode(Profile.self, from: data)
        XCTAssertEqual(decoded.name, "Mahatma Gandhi")
        XCTAssertEqual(decoded.latitude, 21.1702)
        XCTAssertEqual(decoded.longitude, 70.0577)
        XCTAssertEqual(decoded.ayanamsaId, 1)
    }

    func testProfileInit() {
        let profile = Profile(
            name: "Test",
            dobUTC: "2000-01-01T12:00:00Z",
            latitude: 28.6,
            longitude: 77.2,
            timezone: "Asia/Kolkata",
            utcOffset: 5.5
        )
        XCTAssertFalse(profile.id.isEmpty)
        XCTAssertEqual(profile.ayanamsaId, 1)
    }

    func testDobDateParsing() {
        let profile = Profile(
            name: "Test",
            dobUTC: "2000-01-01T12:00:00Z",
            latitude: 0, longitude: 0,
            timezone: "UTC", utcOffset: 0
        )
        XCTAssertNotNil(profile.dobDate)
    }
}