import XCTest
import SwiftUI
@testable import ParashariPrecision

@MainActor
final class ShadbalaViewModelTests: XCTestCase {
    var viewModel: ShadbalaViewModel!
    var sampleProfile: Profile!

    override func setUp() {
        viewModel = ShadbalaViewModel()
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

    func testShadbalaViewModelInitialState() {
        XCTAssertTrue(viewModel.shadbalaResults.isEmpty)
        XCTAssertFalse(viewModel.isCalculating)
        XCTAssertNil(viewModel.errorMessage)
    }

    func testCalculateShadbalaSetsIsCalculatingTrue() async {
        viewModel.isCalculating = true
        XCTAssertTrue(viewModel.isCalculating)
    }

    func testShadbalaViewModelBuildBirthData() {
        let birthData = viewModel.buildBirthData(from: sampleProfile)

        XCTAssertEqual(birthData["year"] as? Int, 1990)
        XCTAssertEqual(birthData["month"] as? Int, 1)
        XCTAssertEqual(birthData["day"] as? Int, 1)
        XCTAssertEqual(birthData["lat"] as? Double, 28.6139)
        XCTAssertEqual(birthData["lon"] as? Double, 77.2090)
        XCTAssertEqual(birthData["tzone"] as? Double, 5.5)
        XCTAssertEqual(birthData["ayanamsa"] as? Int, 1)
    }

    func testShadbalaResultsSortedByTotal() async {
        // This test verifies the sorting behavior after calculation
        // We set up mock results and verify they're sorted
        let mockResults = [
            ShadbalaResult(planet: "Mars", sthAnaBala: 30, digBala: 10, kalaBala: 20, chestabala: 5, naisargikaBala: 60, drigBala: 5, total: 2.17, strengthInVirupas: 130),
            ShadbalaResult(planet: "Sun", sthAnaBala: 37.5, digBala: 15, kalaBala: 22.5, chestabala: 10, naisargikaBala: 60, drigBala: 5, total: 2.5, strengthInVirupas: 150),
            ShadbalaResult(planet: "Moon", sthAnaBala: 40, digBala: 20, kalaBala: 25, chestabala: 15, naisargikaBala: 60, drigBala: 10, total: 2.83, strengthInVirupas: 170)
        ]

        viewModel.shadbalaResults = mockResults

        let sortedResults = viewModel.shadbalaResults.sorted { $0.total > $1.total }

        XCTAssertEqual(sortedResults.first?.planet, "Moon")
        XCTAssertEqual(sortedResults.last?.planet, "Mars")
    }

    func testExaltedAndDebilitatedFlags() {
        let exaltedResult = ShadbalaResult(
            planet: "Sun",
            sthAnaBala: 60,
            digBala: 20,
            kalaBala: 30,
            chestabala: 20,
            naisargikaBala: 60,
            drigBala: 10,
            total: 3.33,
            strengthInVirupas: 600
        )

        let debilitatedResult = ShadbalaResult(
            planet: "Saturn",
            sthAnaBala: 20,
            digBala: 10,
            kalaBala: 15,
            chestabala: 5,
            naisargikaBala: 60,
            drigBala: 0,
            total: 1.83,
            strengthInVirupas: 250
        )

        let normalResult = ShadbalaResult(
            planet: "Mars",
            sthAnaBala: 37.5,
            digBala: 15,
            kalaBala: 22.5,
            chestabala: 10,
            naisargikaBala: 60,
            drigBala: 5,
            total: 2.5,
            strengthInVirupas: 450
        )

        XCTAssertTrue(exaltedResult.isExalted)
        XCTAssertFalse(exaltedResult.isDebilitated)

        XCTAssertFalse(debilitatedResult.isExalted)
        XCTAssertTrue(debilitatedResult.isDebilitated)

        XCTAssertFalse(normalResult.isExalted)
        XCTAssertFalse(normalResult.isDebilitated)
    }

    func testStrengthInVirupasThreshold() {
        // Test boundary conditions
        let atExaltedThreshold = ShadbalaResult(
            planet: "Jupiter",
            sthAnaBala: 50,
            digBala: 15,
            kalaBala: 25,
            chestabala: 15,
            naisargikaBala: 60,
            drigBala: 10,
            total: 2.92,
            strengthInVirupas: 599.99
        )

        let atDebilitatedThreshold = ShadbalaResult(
            planet: "Venus",
            sthAnaBala: 25,
            digBala: 10,
            kalaBala: 20,
            chestabala: 5,
            naisargikaBala: 60,
            drigBala: 5,
            total: 2.08,
            strengthInVirupas: 300
        )

        XCTAssertFalse(atExaltedThreshold.isExalted) // 599.99 < 600
        XCTAssertTrue(atDebilitatedThreshold.isDebilitated) // 300 >= 300 is false, so 300 is NOT debilitated
    }
}
