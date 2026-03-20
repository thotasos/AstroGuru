// ============================================================
// Yoga Detection Engine — Parashari Precision
// ============================================================
// Implements key classical Parashari yogas.
// Uses whole-sign house system.
// ============================================================

import Foundation

// ------------------------------------
// House constants
// ------------------------------------

let KENDRA_HOUSES = [1, 4, 7, 10]
let TRIKONA_HOUSES = [1, 5, 9]
let DUSTHANA_HOUSES = [6, 8, 12]
let UPACHAYA_HOUSES = [3, 6, 10, 11]

// ------------------------------------
// Helper functions
// ------------------------------------

/// Get the house number (1-12) in which a planet is placed.
/// Uses whole-sign house system.
func getHouseOfPlanet(chart: ChartData, planet: Planet) -> Int {
    guard let planetPos = chart.planets.first(where: { $0.planet == planet }) else {
        return 1
    }
    let lagnaSign = Int(chart.ascendant / 30)
    let planetSign = planetPos.sign.rawValue
    return ((planetSign - lagnaSign + 12) % 12) + 1
}

/// Get the sign index of a planet
func getPlanetSign(chart: ChartData, planet: Planet) -> Int {
    guard let pos = chart.planets.first(where: { $0.planet == planet }) else {
        return 0
    }
    return pos.sign.rawValue
}

/// Get all planets placed in a specific house
func getPlanetsInHouse(chart: ChartData, house: Int) -> [Planet] {
    return chart.planets
        .filter { getHouseOfPlanet(chart: chart, planet: $0.planet) == house }
        .map { $0.planet }
}

/// Get all planets placed in a specific sign
func getPlanetsInSign(chart: ChartData, sign: Int) -> [Planet] {
    return chart.planets
        .filter { $0.sign.rawValue == sign }
        .map { $0.planet }
}

/// Check if two planets are in conjunction (same sign)
func areInConjunction(chart: ChartData, p1: Planet, p2: Planet) -> Bool {
    return getPlanetSign(chart: chart, planet: p1) == getPlanetSign(chart: chart, planet: p2)
}

/// Get the sign that is a specified number of houses away from the given sign
func signAtHouseFrom(baseSign: Int, houseOffset: Int) -> Int {
    return ((baseSign + houseOffset - 1) % 12 + 12) % 12
}

/// Check if planet p1 aspects planet p2 (whole-sign aspects)
func doesPlanetAspect(chart: ChartData, fromPlanet: Planet, toPlanet: Planet) -> Bool {
    let fromSign = getPlanetSign(chart: chart, planet: fromPlanet)
    let toSign = getPlanetSign(chart: chart, planet: toPlanet)
    let signDiff = ((toSign - fromSign) % 12 + 12) % 12

    // All planets aspect 7th (signDiff = 6)
    if signDiff == 6 { return true }

    // Mars special aspects: 4th (3) and 8th (7)
    if fromPlanet == .mars && (signDiff == 3 || signDiff == 7) { return true }

    // Jupiter special aspects: 5th (4) and 9th (8)
    if fromPlanet == .jupiter && (signDiff == 4 || signDiff == 8) { return true }

    // Saturn special aspects: 3rd (2) and 10th (9)
    if fromPlanet == .saturn && (signDiff == 2 || signDiff == 9) { return true }

    return false
}

/// Check if two planets are in mutual aspect
func areInMutualAspect(chart: ChartData, p1: Planet, p2: Planet) -> Bool {
    return doesPlanetAspect(chart: chart, fromPlanet: p1, toPlanet: p2) ||
           doesPlanetAspect(chart: chart, fromPlanet: p2, toPlanet: p1)
}

/// Get the sign of the lagna (ascendant)
func getLagnaSign(chart: ChartData) -> Int {
    return Int(chart.ascendant / 30)
}

/// Get the house lord (sign ruler) for a given house number
func getHouseLordPlanet(chart: ChartData, house: Int) -> Planet {
    let lagnaSign = getLagnaSign(chart: chart)
    let houseSign = (lagnaSign + house - 1) % 12
    return getSignLord(Sign(rawValue: houseSign)!)
}

// ------------------------------------
// Planet status checks
// ------------------------------------

func isInKendra(chart: ChartData, planet: Planet) -> Bool {
    return KENDRA_HOUSES.contains(getHouseOfPlanet(chart: chart, planet: planet))
}

func isInTrikona(chart: ChartData, planet: Planet) -> Bool {
    return TRIKONA_HOUSES.contains(getHouseOfPlanet(chart: chart, planet: planet))
}

func isInOwnSign(chart: ChartData, planet: Planet) -> Bool {
    let sign = getPlanetSign(chart: chart, planet: planet)
    let lord = getSignLord(Sign(rawValue: sign)!)
    return lord == planet
}

func isExalted(chart: ChartData, planet: Planet) -> Bool {
    let sign = getPlanetSign(chart: chart, planet: planet)
    let exaltSigns: [Planet: Int] = [
        .sun: 0, .moon: 1, .mars: 9, .mercury: 5,
        .jupiter: 3, .venus: 11, .saturn: 6
    ]
    return exaltSigns[planet] == sign
}

func isDebilitated(chart: ChartData, planet: Planet) -> Bool {
    let sign = getPlanetSign(chart: chart, planet: planet)
    let debilSigns: [Planet: Int] = [
        .sun: 6, .moon: 7, .mars: 3, .mercury: 11,
        .jupiter: 9, .venus: 5, .saturn: 0
    ]
    return debilSigns[planet] == sign
}

func isNaturalBenefic(_ planet: Planet) -> Bool {
    return [.jupiter, .venus, .mercury, .moon].contains(planet)
}

// ------------------------------------
// Yoga strength
// ------------------------------------

func computeYogaStrength(chart: ChartData, planets: [Planet]) -> Double {
    guard !planets.isEmpty else { return 0 }

    var total: Double = 0
    for p in planets {
        var score: Double = 0.5 // base
        if isExalted(chart: chart, planet: p) {
            score = 1.0
        } else if isInOwnSign(chart: chart, planet: p) {
            score = 0.8
        } else if isInKendra(chart: chart, planet: p) {
            score += 0.1
        } else if isInTrikona(chart: chart, planet: p) {
            score += 0.15
        }
        total += score
    }
    return min(1.0, total / Double(planets.count))
}

// ------------------------------------
// Yoga builder
// ------------------------------------

func makeYoga(
    name: String,
    description: String,
    isPresent: Bool,
    planets: [Planet],
    houses: [Int],
    strength: Double,
    category: String
) -> YogaResult {
    return YogaResult(
        name: name,
        description: description,
        isPresent: isPresent,
        planets: planets,
        houses: houses,
        strength: strength,
        category: category
    )
}

// ------------------------------------
// Exchange check
// ------------------------------------

func areInExchange(chart: ChartData, p1: Planet, p2: Planet) -> Bool {
    let p1Sign = getPlanetSign(chart: chart, planet: p1)
    let p2Sign = getPlanetSign(chart: chart, planet: p2)
    return getSignLord(Sign(rawValue: p1Sign)!) == p2 &&
           getSignLord(Sign(rawValue: p2Sign)!) == p1
}

// ===========================================================================
// YOGA DETECTION METHODS
// ===========================================================================

// ------------------------------------
// PANCHA MAHAPURUSHA YOGAS
// ------------------------------------

func detectPanchaMahapurushayogas(chart: ChartData) -> [YogaResult] {
    var yogas: [YogaResult] = []

    // Ruchaka Yoga — Mars in Aries, Scorpio, or Capricorn in kendra
    let p = Planet.mars
    let validSigns = [0, 7, 9]  // Aries, Scorpio, Capricorn
    let sign = getPlanetSign(chart: chart, planet: p)
    let house = getHouseOfPlanet(chart: chart, planet: p)
    let isPresent = validSigns.contains(sign) && KENDRA_HOUSES.contains(house)
    yogas.append(makeYoga(
        "Ruchaka Yoga",
        "Mars in own sign (Aries/Scorpio) or exaltation (Capricorn) in a kendra. Gives courage, leadership, military success.",
        isPresent, [p], [house],
        isPresent ? computeYogaStrength(chart: chart, planets: [p]) : 0,
        "Pancha Mahapurusha"
    ))

    // Hamsa Yoga — Jupiter in Cancer, Sagittarius, or Pisces in kendra
    let jup = Planet.jupiter
    let jupSigns = [3, 8, 11]  // Cancer, Sagittarius, Pisces
    let jupSign = getPlanetSign(chart: chart, planet: jup)
    let jupHouse = getHouseOfPlanet(chart: chart, planet: jup)
    let jupPresent = jupSigns.contains(jupSign) && KENDRA_HOUSES.contains(jupHouse)
    yogas.append(makeYoga(
        "Hamsa Yoga",
        "Jupiter in own sign (Sagittarius/Pisces) or exaltation (Cancer) in a kendra. Gives wisdom, spirituality, good fortune.",
        jupPresent, [jup], [jupHouse],
        jupPresent ? computeYogaStrength(chart: chart, planets: [jup]) : 0,
        "Pancha Mahapurusha"
    ))

    // Malavya Yoga — Venus in Taurus, Libra, or Pisces in kendra
    let ven = Planet.venus
    let venSigns = [1, 6, 11]  // Taurus, Libra, Pisces
    let venSign = getPlanetSign(chart: chart, planet: ven)
    let venHouse = getHouseOfPlanet(chart: chart, planet: ven)
    let venPresent = venSigns.contains(venSign) && KENDRA_HOUSES.contains(venHouse)
    yogas.append(makeYoga(
        "Malavya Yoga",
        "Venus in own sign (Taurus/Libra) or exaltation (Pisces) in a kendra. Gives beauty, luxury, artistic talent.",
        venPresent, [ven], [venHouse],
        venPresent ? computeYogaStrength(chart: chart, planets: [ven]) : 0,
        "Pancha Mahapurusha"
    ))

    // Shasha Yoga — Saturn in Capricorn, Aquarius, or Libra in kendra
    let sat = Planet.saturn
    let satSigns = [9, 10, 6]  // Capricorn, Aquarius, Libra
    let satSign = getPlanetSign(chart: chart, planet: sat)
    let satHouse = getHouseOfPlanet(chart: chart, planet: sat)
    let satPresent = satSigns.contains(satSign) && KENDRA_HOUSES.contains(satHouse)
    yogas.append(makeYoga(
        "Shasha Yoga",
        "Saturn in own sign (Capricorn/Aquarius) or exaltation (Libra) in a kendra. Gives discipline, authority, longevity.",
        satPresent, [sat], [satHouse],
        satPresent ? computeYogaStrength(chart: chart, planets: [sat]) : 0,
        "Pancha Mahapurusha"
    ))

    return yogas
}

// ------------------------------------
// RAJA YOGAS
// ------------------------------------

func detectRajaYogas(chart: ChartData) -> [YogaResult] {
    var yogas: [YogaResult] = []

    // Kendra + Trikona lords in association
    let kendraLords = KENDRA_HOUSES.map { getHouseLordPlanet(chart: chart, house: $0) }
    let trikonaLords = TRIKONA_HOUSES.map { getHouseLordPlanet(chart: chart, house: $0) }

    for kl in kendraLords {
        for tl in trikonaLords {
            if kl == tl { continue }

            let inConj = areInConjunction(chart: chart, p1: kl, p2: tl)
            let inMutual = areInMutualAspect(chart: chart, p1: kl, p2: tl)
            let inExch = areInExchange(chart: chart, p1: kl, p2: tl)

            if inConj || inMutual || inExch {
                let planets = [kl, tl]
                let houses = planets.map { getHouseOfPlanet(chart: chart, planet: $0) }
                let relType = inExch ? "exchange" : inConj ? "conjunction" : "mutual aspect"
                yogas.append(makeYoga(
                    "Raja Yoga (\(kl)-\(tl))",
                    "Kendra lord \(kl) and trikona lord \(tl) are in \(relType). Gives power, success, authority.",
                    true, planets, houses,
                    computeYogaStrength(chart: chart, planets: planets),
                    "Raja Yoga"
                ))
            }
        }
    }

    // Yogakaraka: planet rules both kendra and trikona
    for planet in [Planet.sun, .moon, .mars, .mercury, .jupiter, .venus, .saturn] {
        let isKendraLord = kendraLords.contains(planet)
        let isTrikonaLord = trikonaLords.contains(planet)
        if isKendraLord && isTrikonaLord {
            let house = getHouseOfPlanet(chart: chart, planet: planet)
            if !DUSTHANA_HOUSES.contains(house) {
                yogas.append(makeYoga(
                    "Yogakaraka (\(planet))",
                    "\(planet) rules both a kendra and a trikona house. Exceptionally auspicious.",
                    true, [planet], [house],
                    computeYogaStrength(chart: chart, planets: [planet]),
                    "Raja Yoga"
                ))
            }
        }
    }

    return yogas
}

// ------------------------------------
// DHANA YOGAS
// ------------------------------------

func detectDhanaYogas(chart: ChartData) -> [YogaResult] {
    var yogas: [YogaResult] = []

    // Dhana Yoga: Lords of 2nd and 11th in association
    let lord2 = getHouseLordPlanet(chart: chart, house: 2)
    let lord11 = getHouseLordPlanet(chart: chart, house: 11)

    let dhanaConj = areInConjunction(chart: chart, p1: lord2, p2: lord11)
    let dhanaMutual = areInMutualAspect(chart: chart, p1: lord2, p2: lord11)
    let dhanaExch = areInExchange(chart: chart, p1: lord2, p2: lord11)

    if dhanaConj || dhanaMutual || dhanaExch {
        let planets = [lord2, lord11]
        let houses = planets.map { getHouseOfPlanet(chart: chart, planet: $0) }
        yogas.append(makeYoga(
            "Dhana Yoga",
            "Lords of 2nd and 11th house in association. Indicates wealth accumulation and financial prosperity.",
            true, planets, houses,
            computeYogaStrength(chart: chart, planets: planets),
            "Dhana Yoga"
        ))
    }

    // Chandra Mangal Yoga
    let isChandraMangal = areInConjunction(chart: chart, p1: .moon, p2: .mars)
    let moonHouse = getHouseOfPlanet(chart: chart, planet: .moon)
    yogas.append(makeYoga(
        "Chandra Mangal Yoga",
        "Moon and Mars in conjunction. Gives commercial ability, maternal wealth.",
        isChandraMangal, [.moon, .mars],
        isChandraMangal ? [moonHouse] : [],
        isChandraMangal ? computeYogaStrength(chart: chart, planets: [.moon, .mars]) : 0,
        "Dhana Yoga"
    ))

    return yogas
}

// ------------------------------------
// SPECIAL YOGAS
// ------------------------------------

func detectSpecialYogas(chart: ChartData) -> [YogaResult] {
    var yogas: [YogaResult] = []

    // Gajakesari Yoga: Jupiter in kendra from Moon
    let moonSign = getPlanetSign(chart: chart, planet: .moon)
    let jupSign = getPlanetSign(chart: chart, planet: .jupiter)
    let diff = ((jupSign - moonSign) % 12 + 12) % 12
    let isGajakesari = [0, 3, 6, 9].contains(diff)
    let jupHouse = getHouseOfPlanet(chart: chart, planet: .jupiter)
    yogas.append(makeYoga(
        "Gajakesari Yoga",
        "Jupiter in kendra from Moon (1st, 4th, 7th, or 10th from Moon). Gives wisdom, reputation, and prosperity.",
        isGajakesari, [.jupiter, .moon],
        [jupHouse],
        isGajakesari ? computeYogaStrength(chart: chart, planets: [.jupiter]) : 0,
        "Special Yoga"
    ))

    // Budha Aditya Yoga: Sun and Mercury in same sign
    let isBudhaAditya = areInConjunction(chart: chart, p1: .sun, p2: .mercury)
    let sunHouse = getHouseOfPlanet(chart: chart, planet: .sun)
    yogas.append(makeYoga(
        "Budha Aditya Yoga",
        "Sun and Mercury in conjunction. Gives intelligence, communication skills.",
        isBudhaAditya, [.sun, .mercury],
        isBudhaAditya ? [sunHouse] : [],
        isBudhaAditya ? computeYogaStrength(chart: chart, planets: [.sun, .mercury]) : 0,
        "Special Yoga"
    ))

    // Kuja Dosha (Mangal Dosha)
    let marsHouse = getHouseOfPlanet(chart: chart, planet: .mars)
    let mangalDosha = [1, 2, 4, 7, 8, 12].contains(marsHouse)
    let marsCancelled = isInOwnSign(chart: chart, planet: .mars) || isExalted(chart: chart, planet: .mars)
    let jupIn1Or7 = [1, 7].contains(getHouseOfPlanet(chart: chart, planet: .jupiter))
    let isKujaDosha = mangalDosha && !marsCancelled && !jupIn1Or7
    yogas.append(makeYoga(
        "Kuja Dosha (Mangal Dosha)",
        "Mars in 1st, 2nd, 4th, 7th, 8th, or 12th house. Can cause challenges in marital life unless cancelled.",
        isKujaDosha, [.mars], [marsHouse],
        isKujaDosha ? 0.6 : 0,
        "Dosha"
    ))

    return yogas
}

// ------------------------------------
// Main detection function
// ------------------------------------

/// Detect all yogas for a chart
public func detectAllYogas(chart: ChartData) -> [YogaResult] {
    var yogas: [YogaResult] = []

    yogas.append(contentsOf: detectPanchaMahapurushayogas(chart: chart))
    yogas.append(contentsOf: detectRajaYogas(chart: chart))
    yogas.append(contentsOf: detectDhanaYogas(chart: chart))
    yogas.append(contentsOf: detectSpecialYogas(chart: chart))

    return yogas
}
