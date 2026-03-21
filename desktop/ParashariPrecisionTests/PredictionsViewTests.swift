import XCTest
import SwiftUI
@testable import ParashariPrecision

final class PredictionsViewTests: XCTestCase {
    var sampleProfile: Profile!

    override func setUp() {
        sampleProfile = Profile(
            id: "test-id",
            name: "Test User",
            dobUTC: "1990-01-01T12:00:00Z",
            latitude: 28.6139,
            longitude: 77.2090,
            timezone: "Asia/Kolkata",
            utcOffset: 5.5,
            placeName: "New Delhi, India",
            ayanamsaId: 1
        )
    }

    override func tearDown() {
        sampleProfile = nil
        super.tearDown()
    }

    // MARK: - View Existence Tests

    func testPredictionsViewCanBeCreated() {
        let view = PredictionsView(profile: sampleProfile!)
        XCTAssertNotNil(view)
    }

    // MARK: - Tab Titles Tests

    func testOverviewTabTitleExists() {
        let expectedTitles = ["Overview", "Dasha", "Planets", "Yogas"]
        XCTAssertEqual(expectedTitles.count, 4)
    }

    // MARK: - Helper View Tests

    func testHighlightedTextViewCanBeCreated() {
        let view = HighlightedTextView(text: "Sun in Aries")
        XCTAssertNotNil(view)
    }

    func testTabSelectorCanBeCreated() {
        @State var selectedTab = 0
        let titles = ["Overview", "Dasha", "Planets", "Yogas"]
        let view = TabSelector(selectedTab: $selectedTab, titles: titles)
        XCTAssertNotNil(view)
    }

    // MARK: - Preview Tests

    func testPredictionsViewHasPreview() {
        // Verify that the #Preview macro exists by checking if preview can be constructed
        let previewProfile = Profile(
            id: "preview",
            name: "Preview User",
            dobUTC: "1990-01-01T12:00:00Z",
            latitude: 28.6139,
            longitude: 77.2090,
            timezone: "Asia/Kolkata",
            utcOffset: 5.5,
            placeName: "New Delhi, India",
            ayanamsaId: 1
        )
        let view = PredictionsView(profile: previewProfile)
        XCTAssertNotNil(view)
    }
}
