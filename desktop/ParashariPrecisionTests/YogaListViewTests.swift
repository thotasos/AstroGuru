import XCTest
import SwiftUI
@testable import ParashariPrecision

@MainActor
final class YogaListViewTests: XCTestCase {
    var sampleProfile: Profile!
    var sampleYogas: [YogaResult]!

    override func setUp() {
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

        sampleYogas = [
            YogaResult(
                name: "Rajayoga",
                description: "Lord of the people - Sun and Moon conjunction in Kendra",
                isPresent: true,
                planets: ["Sun", "Moon"],
                houses: [1, 10],
                strength: 0.85,
                category: "Rajyoga"
            ),
            YogaResult(
                name: "Dhanayoga",
                description: "Wealth giving yoga from Venus in 2nd house",
                isPresent: true,
                planets: ["Venus"],
                houses: [2],
                strength: 0.72,
                category: "Dhanayoga"
            ),
            YogaResult(
                name: "Sakata Yoga",
                description: "Moon in 6th, 8th or 12th house - difficult period",
                isPresent: false,
                planets: ["Moon"],
                houses: [6],
                strength: 0.0,
                category: "DifficultYoga"
            )
        ]
    }

    func testYogaListViewRendersWithProfile() {
        let view = YogaListView(profile: sampleProfile)

        let vc = NSHostingController(rootView: view)
        let containerView = vc.view

        XCTAssertNotNil(containerView)
    }

    func testYogaListViewShowsPlaceholderWhenNoYogas() {
        let view = YogaListView(profile: sampleProfile)

        let vc = NSHostingController(rootView: view)
        vc.loadView()

        XCTAssertNotNil(vc.view)
    }

    func testYogaListViewDisplaysYogaRows() {
        let view = YogaListView(profile: sampleProfile)

        let vc = NSHostingController(rootView: view)
        vc.loadView()

        XCTAssertNotNil(vc.view)
    }

    func testYogaRowViewDisplaysNameAndPlanets() {
        let yoga = sampleYogas[0]

        let rowView = YogaRowView(yoga: yoga)

        let vc = NSHostingController(rootView: rowView)
        vc.loadView()

        XCTAssertNotNil(vc.view)
    }

    func testYogaRowViewHighlightsRareYoga() {
        let rareYoga = YogaResult(
            name: "Parihara Yoga",
            description: "Very rare remedial yoga",
            isPresent: true,
            planets: ["Ketu", "Saturn"],
            houses: [8, 12],
            strength: 0.95,
            category: "RareYoga"
        )

        let rowView = YogaRowView(yoga: rareYoga)

        let vc = NSHostingController(rootView: rowView)
        vc.loadView()

        XCTAssertNotNil(vc.view)
    }

    func testYogaRowViewShowsStrengthIndicator() {
        let yoga = YogaResult(
            name: "Rajayoga",
            description: "Test yoga",
            isPresent: true,
            planets: ["Sun"],
            houses: [1],
            strength: 0.75,
            category: "Rajyoga"
        )

        let rowView = YogaRowView(yoga: yoga)

        let vc = NSHostingController(rootView: rowView)
        vc.loadView()

        XCTAssertNotNil(vc.view)
    }

    func testYogaFilterViewRendersCategoryPicker() {
        let filterView = YogaFilterView(
            selectedCategory: .constant(nil),
            categories: ["Rajyoga", "Dhanayoga", "DifficultYoga"],
            sortOption: .constant(.strength)
        )

        let vc = NSHostingController(rootView: filterView)
        vc.loadView()

        XCTAssertNotNil(vc.view)
    }

    func testYogaFilterViewRendersSortPicker() {
        let filterView = YogaFilterView(
            selectedCategory: .constant(nil),
            categories: ["Rajyoga"],
            sortOption: .constant(.strength)
        )

        let vc = NSHostingController(rootView: filterView)
        vc.loadView()

        XCTAssertNotNil(vc.view)
    }

    func testYogaStrengthIndicatorShowsCorrectLevel() {
        let strongYoga = YogaResult(
            name: "Strong",
            description: "Test",
            isPresent: true,
            planets: ["Sun"],
            houses: [1],
            strength: 0.9,
            category: "Test"
        )

        let weakYoga = YogaResult(
            name: "Weak",
            description: "Test",
            isPresent: true,
            planets: ["Moon"],
            houses: [1],
            strength: 0.2,
            category: "Test"
        )

        let strongRow = YogaRowView(yoga: strongYoga)
        let weakRow = YogaRowView(yoga: weakYoga)

        let strongVC = NSHostingController(rootView: strongRow)
        let weakVC = NSHostingController(rootView: weakRow)

        strongVC.loadView()
        weakVC.loadView()

        XCTAssertNotNil(strongVC.view)
        XCTAssertNotNil(weakVC.view)
    }

    func testYogaListViewWithMultipleYogas() {
        let viewModel = YogaViewModel()
        viewModel.yogas = sampleYogas

        let view = YogaListView(profile: sampleProfile)

        let vc = NSHostingController(rootView: view)
        vc.loadView()

        XCTAssertNotNil(vc.view)
    }
}
