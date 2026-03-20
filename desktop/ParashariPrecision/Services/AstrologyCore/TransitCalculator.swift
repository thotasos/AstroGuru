// ============================================================
// Transit Calculator — Parashari Precision
// ============================================================
// Pure Swift transit analysis functions (without ephemeris).
// Transit position calculation requires external ephemeris data.
// ============================================================

import Foundation

// ------------------------------------
// Transit Protocol (for cached/ephemeris data)
// ------------------------------------

/** Protocol for transit calculation - can use cached data or ephemeris */
protocol TransitCalculatorProtocol {
    func calculateTransit(date: Date, latitude: Double, longitude: Double, utcOffset: Double) -> TransitPosition?
}

/** Factory for creating transit calculators */
enum TransitCalculator {
    /** Create a calculator that uses cached database data */
    static func fromCache() -> TransitCalculatorProtocol {
        return CachedTransitCalculator()
    }

    /** Create a placeholder for ephemeris-based calculations */
    static func fromEphemeris() -> TransitCalculatorProtocol {
        return EphemerisTransitCalculator()
    }
}

// ------------------------------------
// Transit Calculator Implementations
// ------------------------------------

/** Cached transit calculator - reads from database */
private class CachedTransitCalculator: TransitCalculatorProtocol {
    func calculateTransit(date: Date, latitude: Double, longitude: Double, utcOffset: Double) -> TransitPosition? {
        // This would read from cached calculations in production
        // For now, return nil to indicate cached data not available
        return nil
    }
}

/** Ephemeris-based calculator placeholder */
private class EphemerisTransitCalculator: TransitCalculatorProtocol {
    func calculateTransit(date: Date, latitude: Double, longitude: Double, utcOffset: Double) -> TransitPosition? {
        // This would use Swiss Ephemeris in production
        // Cannot be used in Swift standalone build
        return nil
    }
}

// ------------------------------------
// Constants
// ------------------------------------

/** Own signs for each planet */
let PLANET_OWN_SIGNS: [Planet: [Sign]] = [
    .sun: [.leo],
    .moon: [.cancer],
    .mars: [.aries, .scorpio],
    .mercury: [.virgo, .gemini],
    .jupiter: [.sagittarius, .pisces],
    .venus: [.taurus, .libra],
    .saturn: [.capricorn, .aquarius],
    .rahu: [.aquarius],
    .ketu: [.scorpio],
]

let PLANET_EXALTED_SIGNS: [Planet: Sign] = [
    .sun: .aries,
    .moon: .taurus,
    .mars: .capricorn,
    .mercury: .virgo,
    .jupiter: .cancer,
    .venus: .pisces,
    .saturn: .libra,
    .rahu: .taurus,
    .ketu: .scorpio,
]

let PLANET_DEBILITATED_SIGNS: [Planet: Sign] = [
    .sun: .libra,
    .moon: .scorpio,
    .mars: .cancer,
    .mercury: .pisces,
    .jupiter: .capricorn,
    .venus: .virgo,
    .saturn: .aries,
    .rahu: .scorpio,
    .ketu: .taurus,
]

/**
 * Functional benefics and malefics based on Lagna (Ascendant sign)
 * Key: Lagna sign, Value: (benefics: planets, malefics: planets, yogakaraka: planet?)
 */
let FUNCTIONAL_NATURES: [Sign: (benefics: [Planet], malefics: [Planet], yogakaraka: Planet?)] = [
    .aries: (
        benefics: [.sun, .moon, .jupiter, .mars],
        malefics: [.saturn, .venus, .rahu, .ketu],
        yogakaraka: nil
    ),
    .taurus: (
        benefics: [.moon, .mars, .saturn, .venus],
        malefics: [.mercury, .rahu, .ketu],
        yogakaraka: .saturn
    ),
    .gemini: (
        benefics: [.mercury, .venus, .saturn],
        malefics: [.moon, .rahu, .ketu],
        yogakaraka: nil
    ),
    .cancer: (
        benefics: [.moon, .jupiter, .mars],
        malefics: [.saturn, .venus, .rahu, .ketu],
        yogakaraka: .jupiter
    ),
    .leo: (
        benefics: [.sun, .mercury, .jupiter],
        malefics: [.saturn, .moon, .rahu, .ketu],
        yogakaraka: nil
    ),
    .virgo: (
        benefics: [.mercury, .venus, .saturn],
        malefics: [.moon, .rahu, .ketu, .jupiter],
        yogakaraka: nil
    ),
    .libra: (
        benefics: [.venus, .mercury, .saturn],
        malefics: [.sun, .moon, .mars, .rahu, .ketu],
        yogakaraka: .saturn
    ),
    .scorpio: (
        benefics: [.mars, .jupiter, .saturn],
        malefics: [.venus, .mercury, .rahu, .ketu],
        yogakaraka: .mars
    ),
    .sagittarius: (
        benefics: [.jupiter, .sun, .moon],
        malefics: [.venus, .mercury, .rahu, .ketu],
        yogakaraka: nil
    ),
    .capricorn: (
        benefics: [.saturn, .mercury, .venus],
        malefics: [.moon, .jupiter, .rahu, .ketu],
        yogakaraka: .mars
    ),
    .aquarius: (
        benefics: [.saturn, .rahu, .venus],
        malefics: [.sun, .moon, .jupiter, .mars, .ketu],
        yogakaraka: nil
    ),
    .pisces: (
        benefics: [.jupiter, .venus, .moon],
        malefics: [.mercury, .saturn, .rahu, .ketu],
        yogakaraka: .venus
    ),
]

// ------------------------------------
// Transit Analysis Functions
// ------------------------------------

/**
 * Check if planet is in own sign or exalted
 */
func isPlanetInOwnOrExalted(planet: Planet, sign: Sign) -> Bool {
    let ownSigns = PLANET_OWN_SIGNS[planet] ?? []
    if ownSigns.contains(sign) { return true }
    if PLANET_EXALTED_SIGNS[planet] == sign { return true }
    return false
}

/**
 * Check if planet is in debilitated sign
 */
func isPlanetInDebilitated(planet: Planet, sign: Sign) -> Bool {
    return PLANET_DEBILITATED_SIGNS[planet] == sign
}

/**
 * Check if a planet is a functional benefic for the given Lagna
 */
func isFunctionalBenefic(planet: Planet, lagnaSign: Sign) -> Bool {
    let nature = FUNCTIONAL_NATURES[lagnaSign]
    return nature?.benefics.contains(planet) ?? false
}

/**
 * Get house number from Lagna (0-based index where Lagna=0 is 1st house)
 */
private func getHouseFromLagna(planetSign: Sign, lagnaSign: Sign) -> Int {
    return (planetSign.rawValue - lagnaSign.rawValue + 12) % 12
}

/**
 * Check if planet is in Kendra (1st, 4th, 7th, 10th) from Lagna
 */
func isInKendra(planetSign: Sign, lagnaSign: Sign) -> Bool {
    let house = getHouseFromLagna(planetSign: planetSign, lagnaSign: lagnaSign)
    return house == 0 || house == 3 || house == 6 || house == 9
}

/**
 * Friendly nakshatras from birth star (returns true if nakshatra is friendly)
 * Based on Tara Bala (birth star friendship)
 */
func isFriendlyNakshatra(birthNakshatra: Int, targetNakshatra: Int) -> Bool {
    // Friend: +1, +7, +9, +13, +19, +21, +25 from birth nakshatra
    // Neutral: +2, +4, +8, +12, +14, +16, +18, +22, +24, +26
    // Enemy: +3, +5, +6, +10, +11, +15, +17, +20, +23
    let friendlyOffsets = [1, 7, 9, 13, 19, 21, 25]
    let offset = (targetNakshatra - birthNakshatra + 27) % 27
    return friendlyOffsets.contains(offset)
}

/**
 * Calculate hourly score (0-100) based on transit and natal chart.
 *
 * Scoring factors (max 100 points):
 * - Prana Dasha lord is functional benefic? (+20)
 * - Transit Lagna in Kendra from natal Lagna? (+20)
 * - Moon in friendly Nakshatra from birth star? (+20)
 * - Moon in own sign or exalted? (+20)
 * - Moon is NOT in debilitated sign? (+20)
 */
func calculateHourlyScore(
    transit: TransitPosition,
    dashaPlanet: Planet?,
    chart: ChartData
) -> Int {
    var score = 50 // Base score

    // Get natal Lagna sign from chart
    let natalLagnaSign = Sign(rawValue: Int(chart.ascendant / 30)) ?? .aries
    let natalMoon = chart.planets.first { $0.planet == .moon }
    let natalMoonNakshatra = natalMoon?.nakshatra.rawValue ?? 0

    // Factor 1: Prana Dasha lord is functional benefic? (+20)
    if let dashaPlanet = dashaPlanet {
        if isFunctionalBenefic(planet: dashaPlanet, lagnaSign: natalLagnaSign) {
            score += 20
        }
    }

    // Factor 2: Transit Lagna in Kendra from natal Lagna? (+20)
    let transitLagnaSign = Sign(rawValue: transit.lagnaSign) ?? .aries
    if isInKendra(planetSign: transitLagnaSign, lagnaSign: natalLagnaSign) {
        score += 20
    }

    // Factor 3: Moon in friendly Nakshatra from birth star? (+20)
    if isFriendlyNakshatra(birthNakshatra: natalMoonNakshatra, targetNakshatra: transit.moonNakshatra) {
        score += 20
    }

    // Factor 4: Moon in own sign or exalted? (+20)
    let moonSign = Sign(rawValue: transit.moonSign) ?? .aries
    if isPlanetInOwnOrExalted(planet: .moon, sign: moonSign) {
        score += 20
    }

    // Factor 5: Moon is NOT in debilitated sign (+20) or is (-20)
    if isPlanetInDebilitated(planet: .moon, sign: moonSign) {
        score -= 20
    } else {
        score += 20
    }

    return min(100, max(0, score))
}

/**
 * Generate category-based hourly predictions.
 */
func calculateHourlyCategories(
    transit: TransitPosition,
    dashaPlanet: Planet?,
    chart: ChartData
) -> HourlyCategories {
    let natalLagnaSign = Sign(rawValue: Int(chart.ascendant / 30)) ?? .aries
    let natalMoon = chart.planets.first { $0.planet == .moon }
    let natalMoonNakshatra = natalMoon?.nakshatra.rawValue ?? 0

    // Determine if dasha planet is functional benefic
    let isDashaFavorable: Bool
    if let dashaPlanet = dashaPlanet {
        isDashaFavorable = isFunctionalBenefic(planet: dashaPlanet, lagnaSign: natalLagnaSign)
    } else {
        isDashaFavorable = true
    }

    // Check if Moon is in friendly nakshatra
    let isMoonFriendly = isFriendlyNakshatra(birthNakshatra: natalMoonNakshatra, targetNakshatra: transit.moonNakshatra)

    // Check Lagna position
    let transitLagnaSign = Sign(rawValue: transit.lagnaSign) ?? .aries
    let isLagnaKendra = isInKendra(planetSign: transitLagnaSign, lagnaSign: natalLagnaSign)

    // Check Moon sign strength
    let moonSign = Sign(rawValue: transit.moonSign) ?? .aries
    let isMoonStrong = isPlanetInOwnOrExalted(planet: .moon, sign: moonSign)
    let isMoonWeak = isPlanetInDebilitated(planet: .moon, sign: moonSign)

    var categories = HourlyCategories(
        career: "",
        finance: "",
        health: "",
        relationships: "",
        education: "",
        overall: ""
    )

    // Career (based on Saturn/dasha planet and Lagna)
    if dashaPlanet == .saturn {
        categories = HourlyCategories(
            career: isDashaFavorable ? "Strong career influence. Good for workplace decisions." : "Career challenges may arise. Be cautious.",
            finance: categories.finance,
            health: categories.health,
            relationships: categories.relationships,
            education: categories.education,
            overall: categories.overall
        )
    } else if isLagnaKendra {
        categories = HourlyCategories(
            career: "Transit Lagna in Kendra supports professional activities.",
            finance: categories.finance,
            health: categories.health,
            relationships: categories.relationships,
            education: categories.education,
            overall: categories.overall
        )
    } else {
        categories = HourlyCategories(
            career: "Neutral for career. Not ideal for major moves.",
            finance: categories.finance,
            health: categories.health,
            relationships: categories.relationships,
            education: categories.education,
            overall: categories.overall
        )
    }

    // Finance (based on Jupiter/Venus, 2nd/11th house, transit influences)
    var financeScore = 0
    if dashaPlanet == .jupiter || dashaPlanet == .venus { financeScore += 2 }
    if isDashaFavorable { financeScore += 1 }
    if isMoonStrong { financeScore += 1 }

    if let venusSign = transit.venusSign, let venusSignEnum = Sign(rawValue: venusSign) {
        if isPlanetInOwnOrExalted(planet: .venus, sign: venusSignEnum) { financeScore += 2 }
        if isPlanetInDebilitated(planet: .venus, sign: venusSignEnum) { financeScore -= 1 }
    }

    if let jupiterSign = transit.jupiterSign, let jupiterSignEnum = Sign(rawValue: jupiterSign) {
        if isPlanetInOwnOrExalted(planet: .jupiter, sign: jupiterSignEnum) { financeScore += 1 }
    }

    if isMoonWeak { financeScore -= 1 }

    let financeText: String
    if financeScore >= 4 {
        financeText = isDashaFavorable ? "Excellent for finances. Highly favorable for investments and wealth accumulation." : "Good for finances. Beneficial period for monetary gains."
    } else if financeScore >= 2 {
        financeText = isMoonStrong ? "Moon in strong position supports financial planning and wealth growth." : "Favorable financial period. Good for investments."
    } else if financeScore >= 1 {
        financeText = "Moderate financial prospects. Proceed with balanced approach."
    } else if financeScore <= -1 {
        financeText = isMoonWeak ? "Weak Moon position suggests financial caution. Avoid major investments." : "Financial challenges. Exercise caution with money matters."
    } else {
        financeText = "Neutral for finances. Maintain steady approach."
    }

    // Health (based on Mars/Rahu)
    let healthText: String
    if dashaPlanet == .mars || dashaPlanet == .rahu {
        healthText = "Potential health issues. Take precautions."
    } else if isMoonWeak {
        healthText = "Mental peace may be affected."
    } else {
        healthText = "Good for health."
    }

    // Relationships (based on Venus)
    let relationshipsText: String
    if dashaPlanet == .venus {
        relationshipsText = isDashaFavorable ? "Excellent for relationships and partnerships." : "Relationship tensions possible."
    } else {
        relationshipsText = isMoonFriendly ? "Moon in friendly nakshatra supports connections." : "Relationships neutral today."
    }
    // Education (based on Jupiter, Mercury, 4th/5th house lords)
    let eduScore: Int
    if dashaPlanet == .jupiter {
        eduScore = 3
    } else {
        eduScore = 0
    }

    let educationText: String
    if eduScore >= 3 {
        educationText = "Excellent for education and learning. Highly favorable for studies."
    } else if eduScore >= 2 {
        educationText = "Good for education and intellectual activities."
    } else if eduScore >= 1 {
        educationText = "Moderate for education. Normal learning activities."
    } else {
        educationText = "Normal for education. Focus on routine studies."
    }

    // Overall
    var positiveCount = 0
    if isDashaFavorable { positiveCount += 1 }
    if isLagnaKendra { positiveCount += 1 }
    if isMoonFriendly { positiveCount += 1 }
    if isMoonStrong { positiveCount += 1 }

    let overallText: String
    if positiveCount >= 3 { overallText = "Overall: Very good day." }
    else if positiveCount >= 2 { overallText = "Overall: Good day." }
    else if positiveCount >= 1 { overallText = "Overall: Moderate day." }
    else { overallText = "Overall: Challenging day." }

    return HourlyCategories(
        career: categories.career,
        finance: financeText,
        health: healthText,
        relationships: relationshipsText,
        education: educationText,
        overall: overallText
    )
}

/**
 * Parse category text to get trend assessment.
 */
func parseCategoryTrend(_ categoryText: String) -> CategoryTrend {
    let lower = categoryText.lowercased()

    // Positive indicators
    let positiveKeywords = [
        "very good", "excellent", "favorable", "favourable",
        "good for", "strong for", "strong career", "supports",
        "enhances", "beneficial", "optimal", "positive",
        "great", "outstanding", "superb", "exceptional"
    ]

    // Negative indicators
    let negativeKeywords = [
        "challenging", "caution", "difficult", "challenges",
        "issues", "tensions", "problems", "weak",
        "avoid", "not ideal", "poor", "negative",
        "difficulties", "obstacles", "hindrance"
    ]

    for kw in positiveKeywords {
        if lower.contains(kw) { return .positive }
    }

    for kw in negativeKeywords {
        if lower.contains(kw) { return .negative }
    }

    return .neutral
}
