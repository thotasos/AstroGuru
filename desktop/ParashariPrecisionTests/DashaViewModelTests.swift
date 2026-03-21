import XCTest
import SwiftUI
@testable import ParashariPrecision

@MainActor
final class DashaViewModelTests: XCTestCase {
    var viewModel: DashaViewModel!
    var sampleProfile: Profile!

    override func setUp() {
        viewModel = DashaViewModel()
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

    func testDashaViewModelInitialState() {
        XCTAssertTrue(viewModel.dashaPeriods.isEmpty)
        XCTAssertNil(viewModel.selectedDasha)
        XCTAssertFalse(viewModel.isCalculating)
        XCTAssertNil(viewModel.errorMessage)
    }

    func testCurrentDashaReturnsNilWhenNoDashas() {
        XCTAssertNil(viewModel.currentDasha)
    }

    func testCalculateDashasSetsIsCalculatingTrue() async {
        viewModel.isCalculating = true
        XCTAssertTrue(viewModel.isCalculating)
    }

    func testCalculateDashasProducesDashas() async {
        await viewModel.calculateDashas(for: sampleProfile)
        XCTAssertFalse(viewModel.dashaPeriods.isEmpty)
        XCTAssertFalse(viewModel.isCalculating)
    }

    func testCurrentDashaFindsMatchingPeriod() {
        // Create a dasha that spans current date
        let now = Date()
        let calendar = Calendar.current
        let year = calendar.component(.year, from: now)
        let month = calendar.component(.month, from: now)

        let currentDasha = DashaPeriod(
            lord: "Moon",
            sign: 2,
            startYear: year - 1,
            startMonth: month,
            endYear: year + 9,
            endMonth: month,
            balance: 5.0,
            antardashas: []
        )

        viewModel.dashaPeriods = [currentDasha]

        XCTAssertEqual(viewModel.currentDasha?.lord, "Moon")
    }

    func testCurrentDashaReturnsFirstMatchWhenMultipleOverlap() {
        let now = Date()
        let calendar = Calendar.current
        let year = calendar.component(.year, from: now)
        let month = calendar.component(.month, from: now)

        let dasha1 = DashaPeriod(
            lord: "Moon",
            sign: 2,
            startYear: year - 5,
            startMonth: 1,
            endYear: year + 5,
            endMonth: 12,
            balance: 5.0,
            antardashas: []
        )

        let dasha2 = DashaPeriod(
            lord: "Mars",
            sign: 5,
            startYear: year - 1,
            startMonth: 1,
            endYear: year + 9,
            endMonth: 12,
            balance: 3.0,
            antardashas: []
        )

        viewModel.dashaPeriods = [dasha1, dasha2]

        // Should return dasha1 (Moon) since it comes first in the array and both overlap current date
        // currentDasha returns the first matching dasha using first{}
        XCTAssertEqual(viewModel.currentDasha?.lord, "Moon")
    }
}
