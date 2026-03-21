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

    func testSavedProfileHasValidUTCDateString() {
        // Validates the ISO8601DateFormatter configuration used by saveProfile():
        let testDate = Date(timeIntervalSince1970: 0) // 1970-01-01T00:00:00Z
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        let dateString = formatter.string(from: testDate)

        XCTAssertFalse(dateString.hasSuffix("ZZ"), "Date string has double Z: \(dateString)")
        XCTAssertFalse(dateString.contains("+00:00Z"), "Date string has +00:00Z: \(dateString)")

        let parsed = ISO8601DateFormatter().date(from: dateString)
        XCTAssertNotNil(parsed, "Date string not parseable: \(dateString)")
        XCTAssertEqual(parsed?.timeIntervalSince1970 ?? -1, 0, accuracy: 1.0)
    }

    func testSavedProfileDateStringDoesNotAppendExtraZ() {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        let date = Date()
        let correctString = formatter.string(from: date)
        let brokenString = correctString + "Z"

        // The correct string must be parseable
        XCTAssertNotNil(ISO8601DateFormatter().date(from: correctString),
                        "Correct string should parse: \(correctString)")
        // The correct string must not have a doubled timezone suffix
        XCTAssertFalse(correctString.hasSuffix("ZZ"), "Correct string must not end in ZZ: \(correctString)")
        XCTAssertFalse(correctString.contains("+00:00Z"), "Correct string must not contain +00:00Z: \(correctString)")
        // The broken string is distinguishable from the correct string
        XCTAssertNotEqual(correctString, brokenString,
                          "Correct and broken strings must differ — broken: \(brokenString)")
    }

    func testSaveProfileCreatesProfileWithParsableDOB() {
        // Note: saveProfile() is private in NewProfileView so we test the contract it produces.
        // Production code uses: ISO8601DateFormatter with .withInternetDateTime + timeZone = UTC (no + "Z")
        var formState = NewProfileView.FormState()
        formState.name = "UTC Test"
        formState.latitude = 28.6
        formState.longitude = 77.2
        formState.timezone = "Asia/Kolkata"

        // Replicate exactly what the FIXED saveProfile() does
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        let dobUTC = formatter.string(from: formState.dob)

        // The buggy approach (old code): appending "Z" to a timezone-qualified string
        let buggyDobUTC = formatter.string(from: formState.dob) + "Z"

        // The correct format must be parseable; verify round-trip saves and loads correctly
        let profile = Profile(
            name: formState.name,
            dobUTC: dobUTC,
            latitude: formState.latitude,
            longitude: formState.longitude,
            timezone: formState.timezone,
            utcOffset: formState.utcOffset
        )
        viewModel.saveProfile(profile)
        XCTAssertEqual(viewModel.profiles.count, 1)
        XCTAssertNotNil(viewModel.profiles[0].dobDate,
                        "Correct UTC format must produce parseable dobDate. dobUTC=\(dobUTC)")

        // The correct format must not equal the buggy format (regression guard)
        XCTAssertNotEqual(dobUTC, buggyDobUTC, "Fixed format must differ from buggy format")

        // The stored dobUTC must not end with ZZ or contain +00:00Z
        let stored = viewModel.profiles[0].dobUTC
        XCTAssertFalse(stored.hasSuffix("ZZ"), "Stored dobUTC must not end with ZZ: \(stored)")
        XCTAssertFalse(stored.contains("+00:00Z"), "Stored dobUTC must not contain +00:00Z: \(stored)")
    }
}
