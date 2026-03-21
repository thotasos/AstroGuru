import XCTest
import SwiftUI
@testable import ParashariPrecision

@MainActor
final class PredictionsViewModelTests: XCTestCase {
    var viewModel: PredictionsViewModel!
    var sampleProfile: Profile!

    override func setUp() {
        viewModel = PredictionsViewModel()
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
        viewModel = nil
        sampleProfile = nil
        super.tearDown()
    }

    // MARK: - Initial State Tests

    func testInitialPredictionIsEmpty() {
        XCTAssertTrue(viewModel.prediction.isEmpty)
    }

    func testInitialPlanetPredictionsIsEmpty() {
        XCTAssertTrue(viewModel.planetPredictions.isEmpty)
    }

    func testInitialDashaPredictionIsEmpty() {
        XCTAssertTrue(viewModel.dashaPrediction.isEmpty)
    }

    func testInitialIsGeneratingIsFalse() {
        XCTAssertFalse(viewModel.isGenerating)
    }

    func testInitialErrorMessageIsNil() {
        XCTAssertNil(viewModel.errorMessage)
    }

    // MARK: - Generation Tests

    func testGenerateAllPredictionsProducesOutput() async {
        await viewModel.generateAllPredictions(for: sampleProfile!)
        XCTAssertFalse(viewModel.prediction.isEmpty)
        XCTAssertFalse(viewModel.isGenerating)
    }

    // MARK: - Generation State Tests

    func testViewModelInitialErrorIsNil() {
        // ViewModel should initialize with nil error
        XCTAssertNil(viewModel.errorMessage)
    }

    // MARK: - ViewModel Properties Tests

    func testViewModelHasPredictionGenerator() {
        // Verify the viewModel has the necessary properties
        XCTAssertNotNil(viewModel)
        XCTAssertFalse(viewModel.isGenerating)
    }
}
