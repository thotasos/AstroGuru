import XCTest
@testable import ParashariPrecision

final class DatabaseServiceTests: XCTestCase {
    var db: DatabaseService!

    override func setUp() {
        do {
            db = try DatabaseService(inMemory: true)
            try db.initialize()
        } catch {
            XCTFail("Failed to initialize database: \(error)")
        }
    }

    func testCreateAndFetchProfile() throws {
        let profile = Profile(
            name: "Test User",
            dobUTC: "2000-01-01T12:00:00Z",
            latitude: 28.6139,
            longitude: 77.2090,
            timezone: "Asia/Kolkata",
            utcOffset: 5.5,
            placeName: "New Delhi"
        )
        try db.saveProfile(profile)
        let fetched = try db.fetchProfile(id: profile.id)
        XCTAssertEqual(fetched?.name, "Test User")
        XCTAssertEqual(fetched?.latitude, 28.6139)
    }

    func testFetchAllProfiles() throws {
        let p1 = Profile(name: "A", dobUTC: "2000-01-01T00:00:00Z", latitude: 0, longitude: 0, timezone: "UTC", utcOffset: 0)
        let p2 = Profile(name: "B", dobUTC: "2000-01-02T00:00:00Z", latitude: 0, longitude: 0, timezone: "UTC", utcOffset: 0)
        try db.saveProfile(p1)
        try db.saveProfile(p2)
        let all = try db.fetchAllProfiles()
        XCTAssertEqual(all.count, 2)
    }

    func testDeleteProfile() throws {
        let profile = Profile(name: "Delete Me", dobUTC: "2000-01-01T00:00:00Z", latitude: 0, longitude: 0, timezone: "UTC", utcOffset: 0)
        try db.saveProfile(profile)
        try db.deleteProfile(id: profile.id)
        let fetched = try db.fetchProfile(id: profile.id)
        XCTAssertNil(fetched)
    }

    func testSaveProfileWithOptionalFieldsPersistsCorrectly() throws {
        let db = try DatabaseService(inMemory: true)
        try db.initialize()

        let profile = Profile(
            name: "Full Test",
            dobUTC: "1990-01-01T00:00:00+00:00",
            latitude: 51.5, longitude: -0.1,
            timezone: "Europe/London", utcOffset: 0,
            placeName: "London, UK",
            ayanamsaId: 2,
            notes: "Important notes"
        )
        try db.saveProfile(profile)

        let fetched = try db.fetchProfile(id: profile.id)
        XCTAssertNotNil(fetched)
        XCTAssertEqual(fetched?.placeName, "London, UK")
        XCTAssertEqual(fetched?.notes, "Important notes")
        XCTAssertEqual(fetched?.ayanamsaId, 2)
    }
}
