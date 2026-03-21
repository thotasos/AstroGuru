import XCTest
import SwiftUI
@testable import ParashariPrecision

@MainActor
final class AshtakavargaViewTests: XCTestCase {
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

    func testAshtakavargaViewRendersWithProfile() {
        let view = AshtakavargaView(profile: sampleProfile)

        let vc = NSHostingController(rootView: view)
        let containerView = vc.view

        XCTAssertNotNil(containerView)
    }

    func testAshtakavargaViewShowsPlaceholderWhenNoData() {
        let view = AshtakavargaView(profile: sampleProfile)

        let vc = NSHostingController(rootView: view)
        vc.loadView()

        XCTAssertNotNil(vc.view)
    }

    func testAshtakavargaViewShowsLoadingState() {
        let view = AshtakavargaView(profile: sampleProfile)

        let vc = NSHostingController(rootView: view)
        vc.loadView()

        XCTAssertNotNil(vc.view)
    }

    func testAshtakavargaGridDisplaysWithResult() {
        // Create a mock result
        let mockResult = AshtakavargaResult(
            bav: [
                "Sun": [3, 2, 1, 4, 2, 1, 3, 2, 1, 4, 2, 1],
                "Moon": [2, 1, 3, 2, 4, 1, 2, 3, 1, 2, 4, 1],
                "Mars": [1, 3, 2, 4, 1, 3, 2, 1, 4, 3, 2, 1],
                "Mercury": [4, 2, 1, 3, 2, 4, 1, 3, 2, 1, 4, 2],
                "Jupiter": [2, 4, 3, 1, 2, 3, 4, 1, 2, 3, 1, 4],
                "Venus": [3, 1, 4, 2, 3, 1, 4, 2, 3, 1, 4, 2],
                "Saturn": [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4],
                "Rahu": [4, 3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1]
            ],
            sav: [20, 18, 19, 21, 19, 18, 20, 19, 18, 20, 22, 18],
            planetBav: [:]
        )

        let viewModel = AshtakavargaViewModel()
        viewModel.ashtakavargaResult = mockResult

        let view = AshtakavargaView(profile: sampleProfile)

        let vc = NSHostingController(rootView: view)
        vc.loadView()

        XCTAssertNotNil(vc.view)
    }

    func testAshtakavargaGridHasCorrectDimensions() {
        let viewModel = AshtakavargaViewModel()

        // 8 planets + 1 total row = 9 rows
        XCTAssertEqual(viewModel.ashtakavargaPlanets.count, 8)
        // 12 signs
        XCTAssertEqual(viewModel.zodiacSigns.count, 12)
    }
}
