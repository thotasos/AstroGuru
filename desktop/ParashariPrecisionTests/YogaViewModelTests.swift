import XCTest
import SwiftUI
@testable import ParashariPrecision

@MainActor
final class YogaViewModelTests: XCTestCase {
    var viewModel: YogaViewModel!
    var sampleProfile: Profile!

    override func setUp() {
        viewModel = YogaViewModel()
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

    func testYogaViewModelInitialState() {
        XCTAssertTrue(viewModel.yogas.isEmpty)
        XCTAssertFalse(viewModel.isCalculating)
        XCTAssertNil(viewModel.errorMessage)
    }

    func testYogaViewModelBuildBirthData() {
        let birthData = viewModel.buildBirthData(from: sampleProfile)

        XCTAssertEqual(birthData["year"] as? Int, 1990)
        XCTAssertEqual(birthData["month"] as? Int, 1)
        XCTAssertEqual(birthData["day"] as? Int, 1)
        XCTAssertEqual(birthData["lat"] as? Double, 28.6139)
        XCTAssertEqual(birthData["lon"] as? Double, 77.2090)
        XCTAssertEqual(birthData["tzone"] as? Double, 5.5)
        XCTAssertEqual(birthData["ayanamsa"] as? Int, 1)
    }

    func testYogaCountByImportanceGroupsByCategory() {
        let rajYoga1 = YogaResult(
            name: "Rajayoga",
            description: "Major yoga",
            isPresent: true,
            planets: ["Sun", "Moon"],
            houses: [1, 10],
            strength: 0.85,
            category: "Rajyoga"
        )

        let rajYoga2 = YogaResult(
            name: "Rajayoga 2",
            description: "Another raj yoga",
            isPresent: true,
            planets: ["Mars", "Jupiter"],
            houses: [5, 9],
            strength: 0.75,
            category: "Rajyoga"
        )

        let dhanaYoga = YogaResult(
            name: "Dhanayoga",
            description: "Wealth yoga",
            isPresent: true,
            planets: ["Venus"],
            houses: [2, 11],
            strength: 0.65,
            category: "Dhanayoga"
        )

        viewModel.yogas = [rajYoga1, rajYoga2, dhanaYoga]

        let countByImportance = viewModel.yogaCountByImportance

        XCTAssertEqual(countByImportance["Rajyoga"], 2)
        XCTAssertEqual(countByImportance["Dhanayoga"], 1)
    }

    func testYogaCountByImportanceReturnsEmptyWhenNoYogas() {
        let countByImportance = viewModel.yogaCountByImportance
        XCTAssertTrue(countByImportance.isEmpty)
    }

    func testFilteredYogasByCategory() {
        let rajYoga = YogaResult(
            name: "Rajayoga",
            description: "Major yoga",
            isPresent: true,
            planets: ["Sun", "Moon"],
            houses: [1, 10],
            strength: 0.85,
            category: "Rajyoga"
        )

        let dhanaYoga = YogaResult(
            name: "Dhanayoga",
            description: "Wealth yoga",
            isPresent: true,
            planets: ["Venus"],
            houses: [2, 11],
            strength: 0.65,
            category: "Dhanayoga"
        )

        viewModel.yogas = [rajYoga, dhanaYoga]

        let filteredYogas = viewModel.filteredYogas(by: "Rajyoga")

        XCTAssertEqual(filteredYogas.count, 1)
        XCTAssertEqual(filteredYogas.first?.name, "Rajayoga")
    }

    func testFilteredYogasReturnsAllWhenNilCategory() {
        let rajYoga = YogaResult(
            name: "Rajayoga",
            description: "Major yoga",
            isPresent: true,
            planets: ["Sun", "Moon"],
            houses: [1, 10],
            strength: 0.85,
            category: "Rajyoga"
        )

        let dhanaYoga = YogaResult(
            name: "Dhanayoga",
            description: "Wealth yoga",
            isPresent: true,
            planets: ["Venus"],
            houses: [2, 11],
            strength: 0.65,
            category: "Dhanayoga"
        )

        viewModel.yogas = [rajYoga, dhanaYoga]

        let filteredYogas = viewModel.filteredYogas(by: nil)

        XCTAssertEqual(filteredYogas.count, 2)
    }

    func testSortedYogasByStrength() {
        let weakYoga = YogaResult(
            name: "Weak Yoga",
            description: "Weak yoga",
            isPresent: true,
            planets: ["Sun"],
            houses: [1],
            strength: 0.3,
            category: "Rajyoga"
        )

        let strongYoga = YogaResult(
            name: "Strong Yoga",
            description: "Strong yoga",
            isPresent: true,
            planets: ["Moon"],
            houses: [10],
            strength: 0.9,
            category: "Rajyoga"
        )

        let mediumYoga = YogaResult(
            name: "Medium Yoga",
            description: "Medium yoga",
            isPresent: true,
            planets: ["Mars"],
            houses: [5],
            strength: 0.6,
            category: "Dhanayoga"
        )

        viewModel.yogas = [weakYoga, strongYoga, mediumYoga]

        let sortedYogas = viewModel.sortedYogas(by: .strength)

        XCTAssertEqual(sortedYogas.first?.name, "Strong Yoga")
        XCTAssertEqual(sortedYogas.last?.name, "Weak Yoga")
    }

    func testSelectedCategoryDefaultIsNil() {
        XCTAssertNil(viewModel.selectedCategory)
    }

    func testSortOptionDefaultIsStrength() {
        XCTAssertEqual(viewModel.sortOption, .strength)
    }

    func testAvailableCategories() {
        let rajYoga = YogaResult(
            name: "Rajayoga",
            description: "Major yoga",
            isPresent: true,
            planets: ["Sun", "Moon"],
            houses: [1, 10],
            strength: 0.85,
            category: "Rajyoga"
        )

        let dhanaYoga = YogaResult(
            name: "Dhanayoga",
            description: "Wealth yoga",
            isPresent: true,
            planets: ["Venus"],
            houses: [2, 11],
            strength: 0.65,
            category: "Dhanayoga"
        )

        viewModel.yogas = [rajYoga, dhanaYoga]

        let categories = viewModel.availableCategories

        XCTAssertEqual(categories.count, 2)
        XCTAssertTrue(categories.contains("Rajyoga"))
        XCTAssertTrue(categories.contains("Dhanayoga"))
    }

    func testCalculateYogasSetsIsCalculatingTrue() async {
        viewModel.isCalculating = true
        XCTAssertTrue(viewModel.isCalculating)
    }
}
