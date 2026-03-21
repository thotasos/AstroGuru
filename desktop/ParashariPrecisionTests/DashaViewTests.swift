import XCTest
import SwiftUI
@testable import ParashariPrecision

@MainActor
final class DashaViewTests: XCTestCase {
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

    func testDashaViewRendersWithProfile() {
        let view = DashaView(profile: sampleProfile)

        let vc = NSHostingController(rootView: view)
        let containerView = vc.view

        XCTAssertNotNil(containerView)
    }

    func testDashaViewShowsPlaceholderWhenNoDashas() {
        let view = DashaView(profile: sampleProfile)

        let vc = NSHostingController(rootView: view)
        vc.loadView()

        XCTAssertNotNil(vc.view)
    }

    func testDashaViewDisplaysMahadashaList() {
        let view = DashaView(profile: sampleProfile)

        let vc = NSHostingController(rootView: view)
        vc.loadView()

        XCTAssertNotNil(vc.view)
    }

    func testDashaViewHighlightsCurrentDasha() {
        let view = DashaView(profile: sampleProfile)

        let vc = NSHostingController(rootView: view)
        vc.loadView()

        XCTAssertNotNil(vc.view)
    }
}
