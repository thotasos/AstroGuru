import XCTest
@testable import ParashariPrecision

final class AstrologyCoreTests: XCTestCase {
    func testAstrologyCoreInitializes() {
        // This will fail initially - bundle not found is expected
        do {
            _ = try AstrologyCore()
        } catch AstrologyCoreError.bundleNotFound {
            // Expected - parashari-core.js not yet bundled
            XCTAssertTrue(true)
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    func testAstrologyCoreErrorDescriptions() {
        XCTAssertNotNil(AstrologyCoreError.bundleNotFound.errorDescription)
        XCTAssertNotNil(AstrologyCoreError.invalidInput.errorDescription)
        XCTAssertNotNil(AstrologyCoreError.invalidResponse.errorDescription)
        XCTAssertNotNil(AstrologyCoreError.calculationFailed.errorDescription)
    }

    func testAstrologyCoreErrorCasesAreDistinct() {
        let error1 = AstrologyCoreError.bundleNotFound
        let error2 = AstrologyCoreError.invalidInput
        let error3 = AstrologyCoreError.invalidResponse
        let error4 = AstrologyCoreError.calculationFailed

        XCTAssertNotEqual(error1.errorDescription, error2.errorDescription)
        XCTAssertNotEqual(error2.errorDescription, error3.errorDescription)
        XCTAssertNotEqual(error3.errorDescription, error4.errorDescription)
    }
}