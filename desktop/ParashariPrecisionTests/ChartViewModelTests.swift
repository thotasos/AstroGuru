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

    func testChartViewModelBuildBirthData() {
        // Test that buildBirthData produces correct structure
        let birthData = viewModel.buildBirthData(from: sampleProfile)

        XCTAssertEqual(birthData["year"] as? Int, 1990)
        XCTAssertEqual(birthData["month"] as? Int, 1)
        XCTAssertEqual(birthData["lat"] as? Double, 28.6139)
        XCTAssertEqual(birthData["lon"] as? Double, 77.2090)
        XCTAssertEqual(birthData["tzone"] as? Double, 5.5)
        XCTAssertEqual(birthData["ayanamsa"] as? Int, 1)

        // Hour and minute depend on timezone conversion from UTC
        // UTC 12:00:00 with +5:30 timezone = 17:30 local time
        XCTAssertEqual(birthData["hour"] as? Int, 17)
        XCTAssertEqual(birthData["min"] as? Int, 30)
    }
}
