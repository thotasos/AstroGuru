import XCTest

final class ParashariPrecisionUITests: XCTestCase {
    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }

    override func tearDownWithError() throws {
        app.terminate()
    }

    // MARK: - Launch & Structure

    func testAppLaunchesAndShowsWindow() {
        XCTAssertTrue(app.windows.firstMatch.waitForExistence(timeout: 5))
    }

    func testSidebarShowsAstroGuruTitle() {
        XCTAssertTrue(app.staticTexts["AstroGuru"].waitForExistence(timeout: 5))
    }

    func testSidebarShowsSampleProfiles() {
        // Sample profiles created on first launch
        let gandhiCell = app.staticTexts["Mahatma Gandhi"]
        XCTAssertTrue(gandhiCell.waitForExistence(timeout: 5))
    }

    // MARK: - Profile Selection & Tab Switching

    func testSelectingProfileShowsSegmentedControl() {
        let gandhiCell = app.staticTexts["Mahatma Gandhi"]
        guard gandhiCell.waitForExistence(timeout: 5) else {
            XCTFail("Gandhi profile not found")
            return
        }
        gandhiCell.click()

        // Segmented control should appear
        let chartButton = app.buttons["Chart"]
        XCTAssertTrue(chartButton.waitForExistence(timeout: 3))
    }

    func testTabSwitchingFromChartToDasha() {
        let gandhiCell = app.staticTexts["Mahatma Gandhi"]
        guard gandhiCell.waitForExistence(timeout: 5) else {
            XCTFail("Gandhi profile not found")
            return
        }
        gandhiCell.click()

        let dashaButton = app.buttons["Dasha"]
        guard dashaButton.waitForExistence(timeout: 3) else {
            XCTFail("Dasha tab button not found")
            return
        }
        dashaButton.click()
        XCTAssertTrue(app.windows.firstMatch.exists)
    }

    func testTabSwitchingAllSixTabs() {
        let gandhiCell = app.staticTexts["Mahatma Gandhi"]
        guard gandhiCell.waitForExistence(timeout: 5) else {
            XCTFail("Gandhi profile not found")
            return
        }
        gandhiCell.click()

        let tabNames = ["Chart", "Dasha", "Shadbala", "Ashtakavarga", "Yogas", "Predictions"]
        for tabName in tabNames {
            let tabButton = app.buttons[tabName]
            guard tabButton.waitForExistence(timeout: 3) else {
                XCTFail("\(tabName) tab not found")
                continue
            }
            tabButton.click()
            XCTAssertTrue(app.windows.firstMatch.exists, "\(tabName) tab caused crash")
        }
    }

    // MARK: - New Profile Sheet

    func testNewProfileButtonOpensSheet() {
        let addButton = app.toolbars.buttons["New Profile"]
        guard addButton.waitForExistence(timeout: 5) else {
            XCTFail("New Profile button not found in toolbar")
            return
        }
        addButton.click()

        let sheetTitle = app.staticTexts["New Profile"]
        XCTAssertTrue(sheetTitle.waitForExistence(timeout: 3))
    }

    func testNewProfileSaveButtonDisabledWithoutName() {
        let addButton = app.toolbars.buttons["New Profile"]
        guard addButton.waitForExistence(timeout: 5) else { return }
        addButton.click()

        let saveButton = app.buttons["Save"]
        guard saveButton.waitForExistence(timeout: 3) else {
            XCTFail("Save button not found")
            return
        }
        XCTAssertFalse(saveButton.isEnabled, "Save should be disabled without a name")
    }

    func testNewProfileCanBeCancelled() {
        let addButton = app.toolbars.buttons["New Profile"]
        guard addButton.waitForExistence(timeout: 5) else { return }
        addButton.click()

        let cancelButton = app.buttons["Cancel"]
        guard cancelButton.waitForExistence(timeout: 3) else {
            XCTFail("Cancel button not found")
            return
        }
        cancelButton.click()

        // Sheet should dismiss — window should still exist
        XCTAssertTrue(app.windows.firstMatch.exists)
    }

    // MARK: - Empty State

    func testNoProfileSelectedShowsWindow() {
        // App should not crash on initial state
        XCTAssertTrue(app.windows.firstMatch.exists)
    }
}
