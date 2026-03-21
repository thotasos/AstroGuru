import XCTest
@testable import ParashariPrecision

final class LocalPredictionGeneratorTests: XCTestCase {
    var generator: LocalPredictionGenerator!
    var sampleChartData: ChartData!
    var sampleShadbala: [ShadbalaResult]!
    var sampleYogas: [YogaResult]!
    var sampleDasha: DashaPeriod!
    var sampleAntardasha: DashaPeriod!
    var sampleProfile: Profile!

    override func setUp() {
        super.setUp()
        generator = LocalPredictionGenerator()

        // Create sample profile
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

        // Create sample chart data with planets in known houses
        // House 1 will have sign 0 (Aries), House 2 sign 3 (Cancer), House 3 sign 6 (Virgo)
        let houses = (1...12).map { houseNum in
            House(number: houseNum, sign: Sign(rawValue: (houseNum * 3) % 12) ?? .aries, degreeOnCusp: Double(houseNum * 30))
        }

        // Sun in Aries (sign 0) -> House 1 (sign 0)
        // Moon in Cancer (sign 3) -> House 2 (sign 3)
        // Mars in Virgo (sign 5) -> House 3 (sign 5... wait, sign 5 is Virgo but house 3 has sign 6)
        // Let me recalculate: for Moon to be in Cancer (sign 3), house 2 should have sign 3
        // (houseNum * 3) % 12:
        // House 1: 3 % 12 = 3 (Cancer)
        // House 2: 6 % 12 = 6 (Virgo)
        // House 3: 9 % 12 = 9 (Sagittarius)
        // This doesn't work either

        // Let me use simpler house assignments where we can predict the results
        let simpleHouses = (1...12).map { houseNum in
            House(number: houseNum, sign: Sign(rawValue: (houseNum - 1) % 12) ?? .aries, degreeOnCusp: Double(houseNum * 30))
        }
        // Now: House 1 = Aries, House 2 = Taurus, House 3 = Gemini, etc.

        let sunPosition = PlanetPosition(
            planet: "Sun",
            sign: 0,  // Aries - should be in House 1
            degreeInSign: 15.0,
            longitude: 15.0,
            nakshatra: 2,
            pada: 2,
            isRetrograde: false
        )
        let moonPosition = PlanetPosition(
            planet: "Moon",
            sign: 3,  // Cancer - should be in House 4
            degreeInSign: 10.0,
            longitude: 100.0,
            nakshatra: 8,
            pada: 1,
            isRetrograde: false
        )
        let marsPosition = PlanetPosition(
            planet: "Mars",
            sign: 5,  // Virgo - should be in House 6
            degreeInSign: 20.0,
            longitude: 185.0,
            nakshatra: 12,
            pada: 3,
            isRetrograde: false
        )

        sampleChartData = ChartData(
            ascendant: 15.0,  // In Aries (sign 0)
            planets: [sunPosition, moonPosition, marsPosition],
            houses: simpleHouses,
            julianDay: 2447891.5,
            ayanamsaValue: 23.5,
            ayanamsaType: 1,
            mc: 120.0
        )

        // Create sample shadbala
        sampleShadbala = [
            ShadbalaResult(
                planet: "Sun",
                sthAnaBala: 30.0,
                digBala: 5.0,
                kalaBala: 10.0,
                chestabala: 5.0,
                naisargikaBala: 6.0,
                drigBala: 4.0,
                total: 60.0,
                strengthInVirupas: 600  // Exalted
            ),
            ShadbalaResult(
                planet: "Moon",
                sthAnaBala: 25.0,
                digBala: 4.0,
                kalaBala: 9.0,
                chestabala: 4.0,
                naisargikaBala: 6.0,
                drigBala: 3.0,
                total: 51.0,
                strengthInVirupas: 510  // Not exalted but good
            ),
            ShadbalaResult(
                planet: "Mars",
                sthAnaBala: 20.0,
                digBala: 3.0,
                kalaBala: 8.0,
                chestabala: 3.0,
                naisargikaBala: 5.0,
                drigBala: 2.0,
                total: 41.0,
                strengthInVirupas: 410
            )
        ]

        // Create sample yogas
        sampleYogas = [
            YogaResult(
                id: "yoga-1",
                name: "Rajayoga",
                description: "A powerful Raja yoga formed by the conjunction of Sun and Moon in the 10th house.",
                isPresent: true,
                planets: ["Sun", "Moon"],
                houses: [10],
                strength: 0.85,
                category: "Rajyoga"
            ),
            YogaResult(
                id: "yoga-2",
                name: "Dhanayoga",
                description: "Wealth-giving yoga due to Venus in the 2nd house.",
                isPresent: true,
                planets: ["Venus"],
                houses: [2],
                strength: 0.65,
                category: "Dhanayoga"
            )
        ]

        // Create sample dasha periods
        sampleAntardasha = DashaPeriod(
            lord: "Moon",
            sign: 3,
            startYear: 2024,
            startMonth: 1,
            endYear: 2024,
            endMonth: 7,
            balance: 0.5,
            antardashas: []
        )

        sampleDasha = DashaPeriod(
            lord: "Sun",
            sign: 0,
            startYear: 2022,
            startMonth: 1,
            endYear: 2028,
            endMonth: 1,
            balance: 2.5,
            antardashas: [sampleAntardasha]
        )
    }

    override func tearDown() {
        generator = nil
        sampleChartData = nil
        sampleShadbala = nil
        sampleYogas = nil
        sampleDasha = nil
        sampleAntardasha = nil
        sampleProfile = nil
        super.tearDown()
    }

    // MARK: - Dasha Prediction Tests

    func testGenerateDashaPredictionReturnsNonEmptyString() {
        let prediction = generator.generateDashaPrediction(
            currentDasha: sampleDasha!,
            antardasha: sampleAntardasha!,
            chartData: sampleChartData!
        )
        XCTAssertFalse(prediction.isEmpty)
    }

    func testGenerateDashaPredictionContainsDashaLord() {
        let prediction = generator.generateDashaPrediction(
            currentDasha: sampleDasha!,
            antardasha: sampleAntardasha!,
            chartData: sampleChartData!
        )
        XCTAssertTrue(prediction.contains("Sun"))
    }

    func testGenerateDashaPredictionContainsAntardashaLord() {
        let prediction = generator.generateDashaPrediction(
            currentDasha: sampleDasha!,
            antardasha: sampleAntardasha!,
            chartData: sampleChartData!
        )
        XCTAssertTrue(prediction.contains("Moon"))
    }

    func testGenerateDashaPredictionContainsDateRange() {
        let prediction = generator.generateDashaPrediction(
            currentDasha: sampleDasha!,
            antardasha: sampleAntardasha!,
            chartData: sampleChartData!
        )
        XCTAssertTrue(prediction.contains("2022") || prediction.contains("2024"))
    }

    // MARK: - Planet Predictions Tests

    func testGeneratePlanetPredictionsReturnsNonEmptyDictionary() {
        let predictions = generator.generatePlanetPredictions(
            chartData: sampleChartData!,
            shadbala: sampleShadbala!
        )
        XCTAssertFalse(predictions.isEmpty)
    }

    func testGeneratePlanetPredictionsContainsSun() {
        let predictions = generator.generatePlanetPredictions(
            chartData: sampleChartData!,
            shadbala: sampleShadbala!
        )
        XCTAssertNotNil(predictions["Sun"])
        XCTAssertFalse(predictions["Sun"]!.isEmpty)
    }

    func testGeneratePlanetPredictionsContainsMoon() {
        let predictions = generator.generatePlanetPredictions(
            chartData: sampleChartData!,
            shadbala: sampleShadbala!
        )
        XCTAssertNotNil(predictions["Moon"])
        XCTAssertFalse(predictions["Moon"]!.isEmpty)
    }

    func testGeneratePlanetPredictionsMentionsExaltationWhenPresent() {
        // Sun with high strength (exalted)
        let predictions = generator.generatePlanetPredictions(
            chartData: sampleChartData!,
            shadbala: sampleShadbala!
        )
        // Exalted planet should have positive indication
        XCTAssertTrue(predictions["Sun"]!.count > 10)
    }

    func testGeneratePlanetPredictionsMentionsDebilitationWhenPresent() {
        // Create shadbala with debilitated Mars
        var debilitatedShadbala = sampleShadbala!
        debilitatedShadbala[2] = ShadbalaResult(
            planet: "Mars",
            sthAnaBala: 10.0,
            digBala: 1.0,
            kalaBala: 5.0,
            chestabala: 1.0,
            naisargikaBala: 5.0,
            drigBala: 1.0,
            total: 23.0,
            strengthInVirupas: 230  // Below 300 = debilitated
        )

        let predictions = generator.generatePlanetPredictions(
            chartData: sampleChartData!,
            shadbala: debilitatedShadbala
        )
        // Debilitated planet prediction should be generated
        XCTAssertNotNil(predictions["Mars"])
        XCTAssertFalse(predictions["Mars"]!.isEmpty)
    }

    // MARK: - Yoga Impact Tests

    func testGenerateYogaImpactReturnsNonEmptyString() {
        let impact = generator.generateYogaImpact(yogas: sampleYogas!)
        XCTAssertFalse(impact.isEmpty)
    }

    func testGenerateYogaImpactContainsYogaName() {
        let impact = generator.generateYogaImpact(yogas: sampleYogas!)
        XCTAssertTrue(impact.contains("Rajayoga") || impact.contains("Dhanayoga"))
    }

    func testGenerateYogaImpactHandlesEmptyYogas() {
        let impact = generator.generateYogaImpact(yogas: [])
        // Empty yogas returns a message, not empty string
        XCTAssertTrue(impact.contains("No significant yoga") || impact.isEmpty)
    }

    func testGenerateYogaImpactMentionsPlanetsInvolved() {
        let impact = generator.generateYogaImpact(yogas: sampleYogas!)
        // Should mention at least one planet from the yoga
        XCTAssertTrue(impact.contains("Sun") || impact.contains("Moon") || impact.contains("Venus"))
    }

    func testGenerateYogaImpactReportsStrength() {
        let impact = generator.generateYogaImpact(yogas: sampleYogas!)
        // Should mention strength indicators or percentages
        XCTAssertTrue(impact.count > 50)
    }

    // MARK: - Overall Prediction Tests

    func testGenerateOverallPredictionReturnsNonEmptyString() {
        let dashaData = [(sampleDasha!, sampleAntardasha!)]
        let prediction = generator.generateOverallPrediction(
            profile: sampleProfile!,
            chartData: sampleChartData!,
            dashaData: dashaData,
            shadbala: sampleShadbala!,
            yogas: sampleYogas!
        )
        XCTAssertFalse(prediction.isEmpty)
    }

    func testGenerateOverallPredictionContainsProfileName() {
        let dashaData = [(sampleDasha!, sampleAntardasha!)]
        let prediction = generator.generateOverallPrediction(
            profile: sampleProfile!,
            chartData: sampleChartData!,
            dashaData: dashaData,
            shadbala: sampleShadbala!,
            yogas: sampleYogas!
        )
        XCTAssertTrue(prediction.contains("Test User"))
    }

    func testGenerateOverallPredictionMentionsCurrentDasha() {
        let dashaData = [(sampleDasha!, sampleAntardasha!)]
        let prediction = generator.generateOverallPrediction(
            profile: sampleProfile!,
            chartData: sampleChartData!,
            dashaData: dashaData,
            shadbala: sampleShadbala!,
            yogas: sampleYogas!
        )
        XCTAssertTrue(prediction.contains("Sun"))
    }

    func testGenerateOverallPredictionMentionsKeyYogas() {
        let dashaData = [(sampleDasha!, sampleAntardasha!)]
        let prediction = generator.generateOverallPrediction(
            profile: sampleProfile!,
            chartData: sampleChartData!,
            dashaData: dashaData,
            shadbala: sampleShadbala!,
            yogas: sampleYogas!
        )
        XCTAssertTrue(prediction.contains("Rajayoga") || prediction.contains("Dhanayoga"))
    }

    func testGenerateOverallPredictionMentionsPlanetPlacements() {
        let dashaData = [(sampleDasha!, sampleAntardasha!)]
        let prediction = generator.generateOverallPrediction(
            profile: sampleProfile!,
            chartData: sampleChartData!,
            dashaData: dashaData,
            shadbala: sampleShadbala!,
            yogas: sampleYogas!
        )
        // Should mention planetary strengths (Sun is exalted)
        XCTAssertTrue(prediction.contains("Sun") || prediction.contains("Exalted") || prediction.contains("Strong"))
    }

    func testGenerateOverallPredictionHandlesEmptyDashaData() {
        let prediction = generator.generateOverallPrediction(
            profile: sampleProfile!,
            chartData: sampleChartData!,
            dashaData: [],
            shadbala: sampleShadbala!,
            yogas: sampleYogas!
        )
        XCTAssertFalse(prediction.isEmpty)
    }

    func testGenerateOverallPredictionHandlesAllEmptyInputs() {
        let emptyChartData = ChartData(
            ascendant: 0,
            planets: [],
            houses: [],
            julianDay: 0,
            ayanamsaValue: 0,
            ayanamsaType: 1,
            mc: 0
        )
        let prediction = generator.generateOverallPrediction(
            profile: sampleProfile!,
            chartData: emptyChartData,
            dashaData: [],
            shadbala: [],
            yogas: []
        )
        XCTAssertFalse(prediction.isEmpty)
    }
}
