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

    func testLoadProfilesUpdatesIsLoading() {
        viewModel.loadProfiles()
        XCTAssertFalse(viewModel.isLoading, "isLoading should be false after load completes")
    }

    func testSaveProfileWithAllFields() {
        let profile = Profile(
            name: "Full Profile",
            dobUTC: "1990-06-15T08:30:00+00:00",
            latitude: 51.5074,
            longitude: -0.1278,
            timezone: "Europe/London",
            utcOffset: 0.0,
            placeName: "London, UK",
            ayanamsaId: 2,
            notes: "Test notes"
        )
        viewModel.saveProfile(profile)
        XCTAssertEqual(viewModel.profiles.count, 1)
        let saved = viewModel.profiles[0]
        XCTAssertEqual(saved.name, "Full Profile")
        XCTAssertEqual(saved.ayanamsaId, 2)
        XCTAssertEqual(saved.latitude, 51.5074, accuracy: 0.0001)
        XCTAssertEqual(saved.longitude, -0.1278, accuracy: 0.0001)
        XCTAssertEqual(saved.utcOffset, 0.0, accuracy: 0.001)
    }

    func testDeleteNonexistentProfileDoesNotCrash() {
        let profile = Profile(
            name: "Ghost",
            dobUTC: "2000-01-01T00:00:00+00:00",
            latitude: 0, longitude: 0,
            timezone: "UTC", utcOffset: 0
        )
        viewModel.deleteProfile(profile)
        XCTAssertEqual(viewModel.profiles.count, 0)
    }

    func testMultipleProfilesSavedAndRetrieved() {
        for i in 1...5 {
            let profile = Profile(
                name: "User \(i)",
                dobUTC: "2000-01-0\(i)T12:00:00+00:00",
                latitude: Double(i),
                longitude: Double(i),
                timezone: "UTC",
                utcOffset: 0
            )
            viewModel.saveProfile(profile)
        }
        XCTAssertEqual(viewModel.profiles.count, 5)
    }

    func testErrorMessageClearedOnSuccessfulLoad() {
        viewModel.errorMessage = "Previous error"
        viewModel.loadProfiles()
        XCTAssertNil(viewModel.errorMessage)
    }

    func testProfileDOBDateIsNotNilAfterSave() {
        let profile = Profile(
            name: "Date Test",
            dobUTC: "1990-06-15T08:30:00+00:00",
            latitude: 0, longitude: 0,
            timezone: "UTC", utcOffset: 0
        )
        viewModel.saveProfile(profile)
        XCTAssertNotNil(viewModel.profiles[0].dobDate,
                        "dobDate should parse from stored dobUTC")
    }
}
