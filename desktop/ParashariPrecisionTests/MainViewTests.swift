import XCTest
import SwiftUI
@testable import ParashariPrecision

@MainActor
final class MainViewTests: XCTestCase {

    func testMainTabEnumHasSixCases() {
        let cases: [MainView.MainTab] = [.chart, .dasha, .shadbala, .ashtakavarga, .yogas, .predictions]
        XCTAssertEqual(cases.count, 6)
    }

    func testMainTabDefaultIsChart() {
        let defaultTab = MainView.MainTab.chart
        XCTAssertEqual(defaultTab, MainView.MainTab.chart)
    }

    func testDetailViewRendersWithProfile() {
        let profile = Profile(
            name: "Test",
            dobUTC: "1990-01-01T12:00:00+00:00",
            latitude: 28.6,
            longitude: 77.2,
            timezone: "Asia/Kolkata",
            utcOffset: 5.5
        )
        let view = DetailView(profile: profile)
        XCTAssertNotNil(view)
    }

    func testMainViewRendersWithEnvironment() throws {
        let db = try DatabaseService(inMemory: true)
        try db.initialize()
        let vm = ProfilesViewModel(database: db)
        let view = MainView().environmentObject(vm)
        XCTAssertNotNil(view)
    }

    func testSidebarViewRendersWithProfiles() throws {
        let db = try DatabaseService(inMemory: true)
        try db.initialize()
        let vm = ProfilesViewModel(database: db)
        vm.createSampleProfiles()

        var selectedProfile: Profile? = nil
        let binding = Binding(get: { selectedProfile }, set: { selectedProfile = $0 })
        let view = SidebarView(selectedProfile: binding)
            .environmentObject(vm)
        XCTAssertNotNil(view)
    }
}
