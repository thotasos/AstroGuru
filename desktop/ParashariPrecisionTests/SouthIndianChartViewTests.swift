import XCTest
import SwiftUI
@testable import ParashariPrecision

@MainActor
final class SouthIndianChartViewTests: XCTestCase {
    var sampleChartData: ChartData!

    override func setUp() {
        // Ascendant 120.5 degrees = Leo (sign index 4)
        // 120 / 30 = 4 (0-based sign index)
        sampleChartData = ChartData(
            ascendant: 120.5,
            planets: [
                PlanetPosition(planet: "Sun", sign: 4, degreeInSign: 14.5, longitude: 134.5, nakshatra: 12, pada: 3, isRetrograde: false),
                PlanetPosition(planet: "Moon", sign: 10, degreeInSign: 22.3, longitude: 292.3, nakshatra: 22, pada: 1, isRetrograde: false),
                PlanetPosition(planet: "Mars", sign: 1, degreeInSign: 5.0, longitude: 35.0, nakshatra: 1, pada: 2, isRetrograde: false)
            ],
            houses: [
                House(number: 1, sign: .leo, degreeOnCusp: 120),
                House(number: 2, sign: .virgo, degreeOnCusp: 150),
                House(number: 3, sign: .libra, degreeOnCusp: 180),
                House(number: 4, sign: .scorpio, degreeOnCusp: 210),
                House(number: 5, sign: .sagittarius, degreeOnCusp: 240),
                House(number: 6, sign: .capricorn, degreeOnCusp: 270),
                House(number: 7, sign: .aquarius, degreeOnCusp: 300),
                House(number: 8, sign: .pisces, degreeOnCusp: 330),
                House(number: 9, sign: .aries, degreeOnCusp: 0),
                House(number: 10, sign: .taurus, degreeOnCusp: 30),
                House(number: 11, sign: .gemini, degreeOnCusp: 60),
                House(number: 12, sign: .cancer, degreeOnCusp: 90)
            ],
            julianDay: 2451545.0,
            ayanamsaValue: 23.85,
            ayanamsaType: 1,
            mc: 245.0
        )
    }

    func testSouthIndianChartViewCreation() {
        let view = SouthIndianChartView(chartData: sampleChartData)
        XCTAssertNotNil(view)
    }

    func testSouthIndianChartHas12SignCells() {
        // Verify the view has 12 cells for 12 signs
        XCTAssertEqual(sampleChartData.houses.count, 12)
    }

    func testGridCellLayoutForSouthIndianChart() {
        // South Indian chart: 4 rows x 4 columns (0-based signs)
        // Row 0: Sag(8), Cap(9), Aqu(10), Pis(11)
        // Row 1: Sco(7), center, center, Ari(0)
        // Row 2: Lib(6), center, center, Tau(1)
        // Row 3: Vir(5), Leo(4), Can(3), Gem(2)

        let gridCells = SouthIndianChartView.createGridCells(from: sampleChartData)

        // Should have 16 cells (12 sign cells + 4 center cells)
        XCTAssertEqual(gridCells.count, 16)

        // Check that center cell exists at (1,1)
        let centerCell = gridCells.first { $0.isCenter }
        XCTAssertNotNil(centerCell)
        XCTAssertEqual(centerCell?.row, 1)
        XCTAssertEqual(centerCell?.col, 1)

        // Check specific positions (0-based sign indices)
        // Aries (sign 0) is at row 1, col 3
        let ariesCell = gridCells.first { $0.sign == 0 }
        XCTAssertNotNil(ariesCell)
        XCTAssertEqual(ariesCell?.row, 1)
        XCTAssertEqual(ariesCell?.col, 3)

        // Cancer (sign 3) is at row 3, col 2
        let cancerCell = gridCells.first { $0.sign == 3 }
        XCTAssertNotNil(cancerCell)
        XCTAssertEqual(cancerCell?.row, 3)
        XCTAssertEqual(cancerCell?.col, 2)

        // Leo (sign 4) is at row 3, col 1
        let leoCell = gridCells.first { $0.sign == 4 }
        XCTAssertNotNil(leoCell)
        XCTAssertEqual(leoCell?.row, 3)
        XCTAssertEqual(leoCell?.col, 1)

        // Virgo (sign 5) is at row 3, col 0
        let virgoCell = gridCells.first { $0.sign == 5 }
        XCTAssertNotNil(virgoCell)
        XCTAssertEqual(virgoCell?.row, 3)
        XCTAssertEqual(virgoCell?.col, 0)
    }

    func testPlanetsMappedToCorrectSigns() {
        let gridCells = SouthIndianChartView.createGridCells(from: sampleChartData)

        // Sun is in sign 4 (Leo)
        let leoCell = gridCells.first { $0.sign == 4 }
        XCTAssertNotNil(leoCell?.planets)
        XCTAssertTrue(leoCell!.planets.contains("Su"))

        // Moon is in sign 10 (Capricorn)
        let capricornCell = gridCells.first { $0.sign == 10 }
        XCTAssertNotNil(capricornCell?.planets)
        XCTAssertTrue(capricornCell!.planets.contains("Mo"))

        // Mars is in sign 1 (Aries)
        let ariesCell = gridCells.first { $0.sign == 1 }
        XCTAssertNotNil(ariesCell?.planets)
        XCTAssertTrue(ariesCell!.planets.contains("Ma"))
    }

    func testCenterCellExists() {
        let gridCells = SouthIndianChartView.createGridCells(from: sampleChartData)
        let centerCell = gridCells.first { $0.isCenter }
        XCTAssertNotNil(centerCell)
        XCTAssertEqual(centerCell?.row, 1)
        XCTAssertEqual(centerCell?.col, 1)
    }

    func testLagnaSignMarked() {
        let gridCells = SouthIndianChartView.createGridCells(from: sampleChartData)

        // Ascendant is 120.5° = Leo (0-based sign index 4: 120/30 = 4)
        let leoCell = gridCells.first { $0.sign == 4 }
        XCTAssertNotNil(leoCell?.lagnaSign)
        XCTAssertEqual(leoCell?.lagnaSign, 4)
    }
}
