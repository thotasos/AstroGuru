import XCTest
import SwiftUI
@testable import ParashariPrecision

@MainActor
final class AshtakavargaViewModelTests: XCTestCase {
    var viewModel: AshtakavargaViewModel!
    var sampleProfile: Profile!

    override func setUp() {
        viewModel = AshtakavargaViewModel()
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

    func testAshtakavargaViewModelInitialState() {
        XCTAssertNil(viewModel.ashtakavargaResult)
        XCTAssertFalse(viewModel.isCalculating)
        XCTAssertNil(viewModel.errorMessage)
    }

    func testAshtakavargaViewModelBuildBirthData() {
        let birthData = viewModel.buildBirthData(from: sampleProfile)

        XCTAssertEqual(birthData["year"] as? Int, 1990)
        XCTAssertEqual(birthData["month"] as? Int, 1)
        XCTAssertEqual(birthData["day"] as? Int, 1)
        XCTAssertEqual(birthData["lat"] as? Double, 28.6139)
        XCTAssertEqual(birthData["lon"] as? Double, 77.2090)
        XCTAssertEqual(birthData["tzone"] as? Double, 5.5)
        XCTAssertEqual(birthData["ayanamsa"] as? Int, 1)
    }

    func testAshtakavargaPlanetsList() {
        let expectedPlanets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu"]
        XCTAssertEqual(viewModel.ashtakavargaPlanets, expectedPlanets)
    }

    func testZodiacSignsList() {
        let expectedSigns = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
                            "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
        XCTAssertEqual(viewModel.zodiacSigns, expectedSigns)
    }

    func testBinduColorIntensity() {
        // Test color intensity based on bindu count
        // 0 bindus = lightest, 8+ bindus = darkest
        XCTAssertEqual(viewModel.binduColorIntensity(for: 0), 0.1)
        XCTAssertEqual(viewModel.binduColorIntensity(for: 1), 0.2)
        XCTAssertEqual(viewModel.binduColorIntensity(for: 2), 0.3)
        XCTAssertEqual(viewModel.binduColorIntensity(for: 3), 0.4)
        XCTAssertEqual(viewModel.binduColorIntensity(for: 4), 0.5)
        XCTAssertEqual(viewModel.binduColorIntensity(for: 5), 0.6)
        XCTAssertEqual(viewModel.binduColorIntensity(for: 6), 0.7)
        XCTAssertEqual(viewModel.binduColorIntensity(for: 7), 0.8)
        XCTAssertEqual(viewModel.binduColorIntensity(for: 8), 1.0)
        XCTAssertEqual(viewModel.binduColorIntensity(for: 10), 1.0)
    }
}
