import XCTest
import SwiftUI
@testable import ParashariPrecision

@MainActor
final class NewProfileViewTests: XCTestCase {
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

    func testNewProfileViewRenders() {
        let view = NewProfileView(onDismiss: {})
        XCTAssertNotNil(view)
    }

    func testFormStateValidation() {
        var formState = NewProfileView.FormState()

        // Initially invalid - name is empty (timezone defaults to "UTC" which is valid)
        XCTAssertFalse(formState.isValid)

        formState.name = "Test User"
        // With name set and timezone defaulting to "UTC", form should be valid
        XCTAssertTrue(formState.isValid)

        // Test that latitude boundary validation works
        formState.latitude = 91
        XCTAssertFalse(formState.isValid)

        formState.latitude = -91
        XCTAssertFalse(formState.isValid)

        // Valid latitude should make form valid again
        formState.latitude = 28.6139
        XCTAssertTrue(formState.isValid)
    }

    func testFormStateWithValidData() {
        var formState = NewProfileView.FormState()
        formState.name = "Test User"
        formState.latitude = 28.6139
        formState.longitude = 77.2090
        formState.timezone = "Asia/Kolkata"
        XCTAssertTrue(formState.isValid)
    }

    func testFormStateNotesAndPlaceName() {
        var formState = NewProfileView.FormState()
        formState.placeName = "New Delhi, India"
        formState.notes = "Test notes"
        XCTAssertEqual(formState.placeName, "New Delhi, India")
        XCTAssertEqual(formState.notes, "Test notes")
    }

    func testFormStateDefaultAyanamsa() {
        let formState = NewProfileView.FormState()
        XCTAssertEqual(formState.ayanamsaId, 1)
    }

    func testFormStateBoundaryLatitude() {
        var formState = NewProfileView.FormState()
        formState.name = "Test"

        formState.latitude = -90
        XCTAssertTrue(formState.isValid)

        formState.latitude = 90
        XCTAssertTrue(formState.isValid)

        formState.latitude = 91
        XCTAssertFalse(formState.isValid)
    }

    func testFormStateBoundaryLongitude() {
        var formState = NewProfileView.FormState()
        formState.name = "Test"

        formState.longitude = -180
        XCTAssertTrue(formState.isValid)

        formState.longitude = 180
        XCTAssertTrue(formState.isValid)

        formState.longitude = 181
        XCTAssertFalse(formState.isValid)
    }
}
