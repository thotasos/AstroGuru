import XCTest
import SwiftUI
@testable import ParashariPrecision

@MainActor
final class ProfileListViewTests: XCTestCase {
    var viewModel: ProfilesViewModel!

    override func setUp() {
        do {
            let db = try DatabaseService(inMemory: true)
            try db.initialize()
            viewModel = ProfilesViewModel(database: db)
            viewModel.createSampleProfiles()
        } catch {
            XCTFail("Failed to initialize database: \(error)")
        }
    }

    func testViewModelHasThreeProfiles() {
        XCTAssertEqual(viewModel.profiles.count, 3)
        let profileNames = viewModel.profiles.map { $0.name }
        XCTAssertTrue(profileNames.contains("Mahatma Gandhi"))
        XCTAssertTrue(profileNames.contains("Steve Jobs"))
        XCTAssertTrue(profileNames.contains("Test User"))
    }

    func testViewModelProfileSelection() {
        let gandhi = viewModel.profiles.first { $0.name == "Mahatma Gandhi" }!
        XCTAssertEqual(gandhi.name, "Mahatma Gandhi")
    }

    func testProfileRowContent() {
        let gandhi = viewModel.profiles.first { $0.name == "Mahatma Gandhi" }!
        let rowView = ProfileRowView(profile: gandhi)
        XCTAssertNotNil(rowView)
    }

    func testProfileDetailContent() {
        let gandhi = viewModel.profiles.first { $0.name == "Mahatma Gandhi" }!
        let detailView = ProfileDetailView(profile: gandhi)
        XCTAssertNotNil(detailView)
    }
}
