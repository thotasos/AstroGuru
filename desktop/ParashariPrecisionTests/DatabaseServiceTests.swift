import XCTest
@testable import ParashariPrecision

final class DatabaseServiceTests: XCTestCase {
    var db: DatabaseService!

    override func setUp() async throws {
        db = try! DatabaseService(inMemory: true)
        try await db.initialize()
    }

    func testCreateAndFetchProfile() async throws {
        let profile = Profile(
            name: "Test User",
            dobUTC: "2000-01-01T12:00:00Z",
            latitude: 28.6139,
            longitude: 77.2090,
            timezone: "Asia/Kolkata",
            utcOffset: 5.5,
            placeName: "New Delhi"
        )
        try await db.saveProfile(profile)
        let fetched = try await db.fetchProfile(id: profile.id)
        XCTAssertEqual(fetched?.name, "Test User")
        XCTAssertEqual(fetched?.latitude, 28.6139)
    }

    func testFetchAllProfiles() async throws {
        let p1 = Profile(name: "A", dobUTC: "2000-01-01T00:00:00Z", latitude: 0, longitude: 0, timezone: "UTC", utcOffset: 0)
        let p2 = Profile(name: "B", dobUTC: "2000-01-02T00:00:00Z", latitude: 0, longitude: 0, timezone: "UTC", utcOffset: 0)
        try await db.saveProfile(p1)
        try await db.saveProfile(p2)
        let all = try await db.fetchAllProfiles()
        XCTAssertEqual(all.count, 2)
    }

    func testDeleteProfile() async throws {
        let profile = Profile(name: "Delete Me", dobUTC: "2000-01-01T00:00:00Z", latitude: 0, longitude: 0, timezone: "UTC", utcOffset: 0)
        try await db.saveProfile(profile)
        try await db.deleteProfile(id: profile.id)
        let fetched = try await db.fetchProfile(id: profile.id)
        XCTAssertNil(fetched)
    }
}