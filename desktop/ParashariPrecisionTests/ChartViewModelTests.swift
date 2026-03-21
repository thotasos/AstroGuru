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

    func testCalculateChartHasTwelveHouses() async {
        await viewModel.calculateChart(for: sampleProfile)
        XCTAssertEqual(viewModel.chartData?.houses.count, 12)
    }

    func testCalculateChartAscendantInValidRange() async {
        await viewModel.calculateChart(for: sampleProfile)
        let ascendant = viewModel.chartData?.ascendant ?? -1
        XCTAssertGreaterThanOrEqual(ascendant, 0)
        XCTAssertLessThan(ascendant, 360)
    }

    func testAllPlanetsHaveValidSignIndex() async {
        await viewModel.calculateChart(for: sampleProfile)
        guard let planets = viewModel.chartData?.planets else {
            XCTFail("No planets"); return
        }
        for planet in planets {
            XCTAssertGreaterThanOrEqual(planet.sign, 0, "\(planet.planet) sign < 0")
            XCTAssertLessThan(planet.sign, 12, "\(planet.planet) sign >= 12")
        }
    }

    func testAllPlanetsHaveValidDegree() async {
        await viewModel.calculateChart(for: sampleProfile)
        guard let planets = viewModel.chartData?.planets else {
            XCTFail("No planets"); return
        }
        for planet in planets {
            XCTAssertGreaterThanOrEqual(planet.degreeInSign, 0, "\(planet.planet) degree < 0")
            XCTAssertLessThan(planet.degreeInSign, 30, "\(planet.planet) degree >= 30")
        }
    }

    func testExpectedPlanetNamesPresent() async {
        await viewModel.calculateChart(for: sampleProfile)
        let names = viewModel.chartData?.planets.map { $0.planet } ?? []
        let expected = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]
        for name in expected {
            XCTAssertTrue(names.contains(name), "Missing planet: \(name)")
        }
    }

    func testErrorMessageNilAfterSuccessfulCalculation() async {
        await viewModel.calculateChart(for: sampleProfile)
        XCTAssertNil(viewModel.errorMessage)
    }

    func testIsCalculatingFalseAfterCompletion() async {
        await viewModel.calculateChart(for: sampleProfile)
        XCTAssertFalse(viewModel.isCalculating)
    }
}
