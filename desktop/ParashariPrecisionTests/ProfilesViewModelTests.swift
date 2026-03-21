import XCTest
@testable import ParashariPrecision

@MainActor
final class ProfilesViewModelTests: XCTestCase {
    var viewModel: ProfilesViewModel!

    override func setUp() {
        do {
            let db = try DatabaseService(inMemory: true)
            try db.initialize()
            viewModel = ProfilesViewModel(database: db)
        } catch {
            XCTFail("Failed to initialize database: \(error)")
        }
    }

    func testLoadEmptyProfiles() {
        viewModel.loadProfiles()
        XCTAssertEqual(viewModel.profiles.count, 0)
    }

    func testSaveAndLoadProfile() {
        let profile = Profile(
            name: "Test",
            dobUTC: "2000-01-01T12:00:00Z",
            latitude: 28.6,
            longitude: 77.2,
            timezone: "Asia/Kolkata",
            utcOffset: 5.5
        )
        viewModel.saveProfile(profile)
        XCTAssertEqual(viewModel.profiles.count, 1)
        XCTAssertEqual(viewModel.profiles[0].name, "Test")
    }

    func testDeleteProfile() {
        let profile = Profile(
            name: "Delete Me",
            dobUTC: "2000-01-01T12:00:00Z",
            latitude: 0,
            longitude: 0,
            timezone: "UTC",
            utcOffset: 0
        )
        viewModel.saveProfile(profile)
        XCTAssertEqual(viewModel.profiles.count, 1)
        viewModel.deleteProfile(profile)
        XCTAssertEqual(viewModel.profiles.count, 0)
    }

    func testCreateSampleProfiles() {
        viewModel.createSampleProfiles()
        XCTAssertEqual(viewModel.profiles.count, 3)
        let names = viewModel.profiles.map { $0.name }
        XCTAssertTrue(names.contains("Mahatma Gandhi"))
        XCTAssertTrue(names.contains("Steve Jobs"))
    }

    func testViewModelInitDoesNotCrashWithDefaultDatabase() {
        // Exercises the persistent-DB fallback path. Requires filesystem write access.
        // If the filesystem is unavailable, falls back to in-memory (try! DatabaseService(inMemory: true)),
        // which is guaranteed non-throwing — see DatabaseService.init documentation.
        let vm = ProfilesViewModel()
        XCTAssertNotNil(vm)
        // Verify the ViewModel is in a usable state (not just non-nil)
        vm.initialize()
        XCTAssertNil(vm.errorMessage, "ViewModel should initialize without error: \(vm.errorMessage ?? "")")
    }
}
