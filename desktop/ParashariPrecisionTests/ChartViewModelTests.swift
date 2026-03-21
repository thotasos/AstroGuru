import XCTest
import SwiftUI
@testable import ParashariPrecision

@MainActor
final class ChartViewModelTests: XCTestCase {
    var viewModel: ChartViewModel!
    var sampleProfile: Profile!

    override func setUp() {
        viewModel = ChartViewModel()
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

    func testChartViewModelInitialState() {
        XCTAssertNil(viewModel.chartData)
        XCTAssertFalse(viewModel.isCalculating)
        XCTAssertNil(viewModel.errorMessage)
    }

    func testCalculateChartSetsIsCalculatingTrue() async {
        let expectation = XCTestExpectation(description: "isCalculating should be true during calculation")
        viewModel.isCalculating = true
        expectation.fulfill()
        XCTAssertTrue(viewModel.isCalculating)
    }

    func testCalculateChartProducesResult() async {
        await viewModel.calculateChart(for: sampleProfile)
        XCTAssertNotNil(viewModel.chartData)
        XCTAssertEqual(viewModel.chartData?.planets.count, 9)
        XCTAssertFalse(viewModel.isCalculating)
    }
}
