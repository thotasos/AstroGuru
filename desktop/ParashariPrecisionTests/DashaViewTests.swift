import XCTest
import SwiftUI
@testable import ParashariPrecision

@MainActor
final class DashaViewTests: XCTestCase {
    var sampleProfile: Profile!
    var viewModel: DashaViewModel!

    override func setUp() {
        sampleProfile = Profile(
            id: "test-id", name: "Test User",
            dobUTC: "1990-01-01T12:00:00+00:00",
            latitude: 28.6139, longitude: 77.2090,
            timezone: "Asia/Kolkata", utcOffset: 5.5,
            placeName: "New Delhi, India", ayanamsaId: 1
        )
        viewModel = DashaViewModel()
    }

    func testDashaViewInstantiates() {
        let view = DashaView(profile: sampleProfile)
        XCTAssertNotNil(view)
    }

    func testDashaViewHostingControllerLoads() {
        let view = DashaView(profile: sampleProfile)
        let vc = NSHostingController(rootView: view)
        vc.loadView()
        XCTAssertNotNil(vc.view)
    }

    func testDashaViewModelCalculatesSomePeriods() async {
        await viewModel.calculateDashas(for: sampleProfile)
        XCTAssertFalse(viewModel.dashaPeriods.isEmpty)
    }

    func testDashaViewModelNotCalculatingAfterComplete() async {
        await viewModel.calculateDashas(for: sampleProfile)
        XCTAssertFalse(viewModel.isCalculating)
    }
}
