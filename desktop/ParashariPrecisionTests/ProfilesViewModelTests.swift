import XCTest
@testable import ParashariPrecision

final class ProfilesViewModelTests: XCTestCase {
    var viewModel: ProfilesViewModel!

    override func setUp() async throws {
        let db = try! DatabaseService(inMemory: true)
        try await db.initialize()
        viewModel = ProfilesViewModel(database: db)
    }

    func testLoadEmptyProfiles() async {
        await viewModel.loadProfiles()
        XCTAssertEqual(viewModel.profiles.count, 0)
    }

    func testSaveAndLoadProfile() async {
        let profile = Profile(
            name: "Test",
            dobUTC: "2000-01-01T12:00:00Z",
            latitude: 28.6,
            longitude: 77.2,
            timezone: "Asia/Kolkata",
            utcOffset: 5.5
        )
        await viewModel.saveProfile(profile)
        XCTAssertEqual(viewModel.profiles.count, 1)
        XCTAssertEqual(viewModel.profiles[0].name, "Test")
    }

    func testDeleteProfile() async {
        let profile = Profile(
            name: "Delete Me",
            dobUTC: "2000-01-01T12:00:00Z",
            latitude: 0,
            longitude: 0,
            timezone: "UTC",
            utcOffset: 0
        )
        await viewModel.saveProfile(profile)
        XCTAssertEqual(viewModel.profiles.count, 1)
        await viewModel.deleteProfile(profile)
        XCTAssertEqual(viewModel.profiles.count, 0)
    }

    func testCreateSampleProfiles() async {
        await viewModel.createSampleProfiles()
        XCTAssertEqual(viewModel.profiles.count, 3)
        let names = viewModel.profiles.map { $0.name }
        XCTAssertTrue(names.contains("Mahatma Gandhi"))
        XCTAssertTrue(names.contains("Steve Jobs"))
    }
}