// ============================================================
// Shadbala — Six-fold Planetary Strength — Parashari Precision
// ============================================================
// All strength values are in Virupas (1 Rupa = 60 Virupas).
// Reference: BPHS Ch.27-28 and Saravali.
// ============================================================

import Foundation

// ------------------------------------
// Exaltation / Debilitation data
// ------------------------------------

struct ExaltDebilData {
    let exaltSign: Int      // 0-11
    let exaltDeg: Double   // degree within sign of deep exaltation
    let debilSign: Int     // 0-11
    let debilDeg: Double   // degree within sign of deep debilitation
}

let EXALT_DEBIL: [Planet: ExaltDebilData] = [
    .sun:     ExaltDebilData(exaltSign: 0,  exaltDeg: 10, debilSign: 6,  debilDeg: 10),  // Aries, Libra
    .moon:    ExaltDebilData(exaltSign: 1,  exaltDeg: 3,  debilSign: 7,  debilDeg: 3),   // Taurus, Scorpio
    .mars:    ExaltDebilData(exaltSign: 9,  exaltDeg: 28, debilSign: 3,  debilDeg: 28),  // Capricorn, Cancer
    .mercury: ExaltDebilData(exaltSign: 5,  exaltDeg: 15, debilSign: 11, debilDeg: 15),  // Virgo, Pisces
    .jupiter: ExaltDebilData(exaltSign: 3,  exaltDeg: 5,  debilSign: 9,  debilDeg: 5),   // Cancer, Capricorn
    .venus:   ExaltDebilData(exaltSign: 11, exaltDeg: 27, debilSign: 5,  debilDeg: 27),  // Pisces, Virgo
    .saturn:  ExaltDebilData(exaltSign: 6,  exaltDeg: 20, debilSign: 0,  debilDeg: 20),  // Libra, Aries
    .rahu:    ExaltDebilData(exaltSign: 1,  exaltDeg: 20, debilSign: 7,  debilDeg: 20),  // Taurus, Scorpio
    .ketu:    ExaltDebilData(exaltSign: 7,  exaltDeg: 20, debilSign: 1,  debilDeg: 20),  // Scorpio, Taurus
]

// ------------------------------------
// Natural (Naisargika) Strength values in Virupas
// ------------------------------------

let NAISARGIKA_BALA: [Planet: Double] = [
    .sun:     60.0,
    .moon:    51.43,
    .venus:   42.86,
    .jupiter: 34.29,
    .mercury: 25.71,
    .mars:    17.14,
    .saturn:   8.57,
    .rahu:     0.0,  // Nodes traditionally excluded
    .ketu:     0.0,
]

// ------------------------------------
// Own/Moolatrikona signs
// ------------------------------------

struct SignRulershipData {
    let moolatrikona: Int      // sign index
    let ownSigns: [Int]        // sign indices
}

let SIGN_RULERSHIP: [Planet: SignRulershipData] = [
    .sun:     SignRulershipData(moolatrikona: 4,  ownSigns: [4]),           // Leo
    .moon:    SignRulershipData(moolatrikona: 1,  ownSigns: [3]),           // Taurus, Cancer
    .mars:    SignRulershipData(moolatrikona: 0,  ownSigns: [0, 7]),       // Aries, Scorpio
    .mercury: SignRulershipData(moolatrikona: 5,  ownSigns: [2, 5]),        // Gemini, Virgo
    .jupiter: SignRulershipData(moolatrikona: 8,  ownSigns: [8, 11]),       // Sagittarius, Pisces
    .venus:   SignRulershipData(moolatrikona: 6,  ownSigns: [1, 6]),        // Taurus, Libra
    .saturn:  SignRulershipData(moolatrikona: 10, ownSigns: [9, 10]),      // Capricorn, Aquarius
    .rahu:    SignRulershipData(moolatrikona: 2,  ownSigns: [10]),          // Gemini, Aquarius
    .ketu:    SignRulershipData(moolatrikona: 8,  ownSigns: [7]),           // Sagittarius, Scorpio
]

// ------------------------------------
// Digbala (Directional Strength)
// ------------------------------------

let DIGBALA_BEST_HOUSE: [Planet: Int] = [
    .sun:     10,  // 10th house
    .mars:    10,  // 10th house
    .moon:    4,   // 4th house
    .venus:   4,   // 4th house
    .mercury: 1,   // 1st house (Lagna)
    .jupiter: 1,   // 1st house (Lagna)
    .saturn:  7,   // 7th house
]

// MARK: - Helper Functions

func getHouseType(_ house: Int) -> String {
    let kendradi = [1, 4, 7, 10]
    let panapara = [2, 5, 8, 11]
    if kendradi.contains(house) { return "kendra" }
    if panapara.contains(house) { return "panapara" }
    return "apoklima"
}

func getPlanetHouseNumber(chart: ChartData, planet: Planet) -> Int {
    guard let planetPos = chart.planets.first(where: { $0.planet == planet }) else {
        return 1
    }
    let lagnaSign = Int(chart.ascendant / 30)
    let planetSign = planetPos.sign.rawValue
    return ((planetSign - lagnaSign + 12) % 12) + 1
}

func normalizeDegrees(_ longitude: Double) -> Double {
    var result = longitude.truncatingRemainder(dividingBy: 360)
    if result < 0 { result += 360 }
    return result
}

// ------------------------------------
// Uccha Bala — Exaltation Strength (0-60 Virupas)
// ------------------------------------

func calculateUcchaBala(planet: Planet, siderealLongitude: Double) -> Double {
    guard let ed = EXALT_DEBIL[planet] else { return 0 }

    let exaltLon = Double(ed.exaltSign) * 30 + ed.exaltDeg
    let debilLon = Double(ed.debilSign) * 30 + ed.debilDeg

    var diff = abs(normalizeDegrees(siderealLongitude) - exaltLon)
    if diff > 180 { diff = 360 - diff }

    // Linear interpolation: uccha = (180 - diff) / 180 * 60
    return ((180 - diff) / 180) * 60
}

// ------------------------------------
// Sapta Vargaja Bala
// ------------------------------------

func getSaptaVargajaBala(planet: Planet, sign: Sign) -> Double {
    guard let ed = EXALT_DEBIL[planet] else { return 0 }

    let signIndex = sign.rawValue

    if signIndex == ed.exaltSign { return 20 }

    if let rulership = SIGN_RULERSHIP[planet] {
        if signIndex == rulership.moolatrikona { return 15 }
        if rulership.ownSigns.contains(signIndex) { return 10 }
    }

    let signLord = getSignLord(sign)
    let naturalFriends = getNaturalFriends(planet)
    let naturalEnemies = getNaturalEnemies(planet)

    if signIndex == ed.debilSign { return 0 }
    if naturalFriends.contains(signLord) { return 5 }
    if naturalEnemies.contains(signLord) { return 2 }
    return 3 // Neutral
}

// ------------------------------------
// Ojhayugma Bala
// ------------------------------------

func getOjhayugmaBala(planet: Planet, sign: Sign) -> Double {
    let masculinePlanets: [Planet] = [.sun, .mars, .jupiter, .saturn]
    let femininePlanets: [Planet] = [.moon, .venus]
    let signIndex = sign.rawValue
    let isOddSign = signIndex % 2 == 0 // Aries(0)=odd

    if masculinePlanets.contains(planet) && isOddSign { return 15 }
    if femininePlanets.contains(planet) && !isOddSign { return 15 }
    if planet == .mercury { return 15 } // Mercury gains in both
    return 0
}

// ------------------------------------
// Kendradi Bala
// ------------------------------------

func getKendradiBala(house: Int) -> Double {
    let type = getHouseType(house)
    if type == "kendra" { return 60 }
    if type == "panapara" { return 30 }
    return 15 // apoklima
}

// ------------------------------------
// Drekkana Bala
// ------------------------------------

func getDrekkanaBala(planet: Planet, siderealLongitude: Double) -> Double {
    let degInSign = normalizeDegrees(siderealLongitude).truncatingRemainder(dividingBy: 30)
    let drekkana = Int(degInSign / 10) + 1 // 1, 2, or 3

    let malePlanets: [Planet] = [.sun, .mars, .jupiter, .saturn, .rahu]
    let neutralPlanets: [Planet] = [.mercury, .ketu]
    let femalePlanets: [Planet] = [.moon, .venus]

    if malePlanets.contains(planet) && drekkana == 1 { return 15 }
    if neutralPlanets.contains(planet) && drekkana == 2 { return 15 }
    if femalePlanets.contains(planet) && drekkana == 3 { return 15 }
    return 0
}

// ------------------------------------
// Sthanabala (Total Positional Strength)
// ------------------------------------

func calculateSthanabala(planet: Planet, chart: ChartData) -> Double {
    guard let planetPos = chart.planets.first(where: { $0.planet == planet }) else {
        return 0
    }

    let uccha = calculateUcchaBala(planet, planetPos.siderealLongitude)
    let saptaVargaja = getSaptaVargajaBala(planet, planetPos.sign)
    let ojhayugma = getOjhayugmaBala(planet, planetPos.sign)
    let house = getPlanetHouseNumber(chart: chart, planet: planet)
    let kendradi = getKendradiBala(house)
    let drekkana = getDrekkanaBala(planet, planetPos.siderealLongitude)

    return uccha + saptaVargaja + ojhayugma + kendradi + drekkana
}

// ------------------------------------
// Digbala (Directional Strength)
// ------------------------------------

func calculateDigbala(planet: Planet, chart: ChartData) -> Double {
    guard let bestHouse = DIGBALA_BEST_HOUSE[planet] else { return 0 }

    let house = getPlanetHouseNumber(chart: chart, planet: planet)
    let bestDeg = (bestHouse - 1) * 30
    let actualDeg = (house - 1) * 30
    let actualWorst = bestHouse <= 6 ? bestHouse + 6 : bestHouse - 6
    let worstDeg = (actualWorst - 1) * 30

    var diff = abs(actualDeg - bestDeg)
    if diff > 180 { diff = 360 - diff }

    return ((180 - diff) / 180) * 60
}

// ------------------------------------
// Kalabala (Temporal Strength)
// ------------------------------------

func calculateKalabala(planet: Planet, chart: ChartData) -> Double {
    var kalabala: Double = 0

    // Nathonnatha bala (diurnal/nocturnal strength)
    let jd = chart.julianDay
    let fractionalDay = jd - floor(jd)
    let isDaytime = fractionalDay > 0.25 && fractionalDay < 0.75

    let dayPlanets: [Planet] = [.sun, .jupiter, .venus]
    let nightPlanets: [Planet] = [.moon, .mars, .saturn]

    if dayPlanets.contains(planet) {
        kalabala += isDaytime ? 60 : 0
    } else if nightPlanets.contains(planet) {
        kalabala += !isDaytime ? 60 : 0
    } else {
        kalabala += 30 // Mercury is always 30
    }

    // Paksha bala (lunar phase strength)
    if let moonPos = chart.planets.first(where: { $0.planet == .moon }),
       let sunPos = chart.planets.first(where: { $0.planet == .sun }) {
        let elongation = normalizeDegrees(moonPos.siderealLongitude - sunPos.siderealLongitude)
        let isShukla = elongation < 180 // waxing = bright half

        let beneficPlanets: [Planet] = [.moon, .mercury, .jupiter, .venus]
        let maleficPlanets: [Planet] = [.sun, .mars, .saturn]

        if beneficPlanets.contains(planet) && isShukla {
            kalabala += 60
        } else if maleficPlanets.contains(planet) && !isShukla {
            kalabala += 60
        }
    }

    // Hora bala
    let horaLord = getHoraLord(jd: jd)
    if horaLord == planet { kalabala += 60 }

    // Weekday lord
    let weekdayLord = getWeekdayLord(jd: jd)
    if weekdayLord == planet { kalabala += 45 }

    return min(kalabala, 240)
}

// ------------------------------------
// Chestabala (Motional Strength)
// ------------------------------------

func calculateChestabala(planet: Planet, chart: ChartData) -> Double {
    guard let planetPos = chart.planets.first(where: { $0.planet == planet }) else {
        return 0
    }

    // Nodes are always 30
    if planet == .rahu || planet == .ketu { return 30 }

    let speed = planetPos.speed

    let meanSpeeds: [Planet: Double] = [
        .sun: 0.9856,
        .moon: 13.1764,
        .mars: 0.5240,
        .mercury: 1.3833,
        .jupiter: 0.0831,
        .venus: 1.2028,
        .saturn: 0.0335,
    ]

    guard let meanSpeed = meanSpeeds[planet] else { return 30 }

    if planetPos.isRetrograde {
        return 60 // Retrograde — vakra: high strength
    }

    let ratio = speed / meanSpeed
    if ratio >= 2.0 { return 60 }      // Very fast
    if ratio >= 1.5 { return 45 }      // Fast
    if ratio >= 0.75 { return 30 }     // Mean
    if ratio >= 0.25 { return 15 }     // Slow
    return 7.5                         // Very slow
}

// ------------------------------------
// Drigbala (Aspectual Strength)
// ------------------------------------

func getAspectStrength(aspectingPlanet planet: Planet, fromSign: Int, toSign: Int) -> Double {
    let signDiff = ((toSign - fromSign) + 12) % 12

    // All planets aspect 7th
    if signDiff == 6 { return 60 }

    // Special aspects
    if planet == .mars && [3, 7].contains(signDiff) { return 60 }
    if planet == .jupiter && [4, 8].contains(signDiff) { return 60 }
    if planet == .saturn && [2, 9].contains(signDiff) { return 60 }

    return 0
}

func calculateDrigbala(planet: Planet, chart: ChartData) -> Double {
    guard let planetPos = chart.planets.first(where: { $0.planet == planet }) else {
        return 0
    }

    let targetSign = planetPos.sign.rawValue
    var totalStrength: Double = 0

    for otherPlanet in chart.planets {
        if otherPlanet.planet == planet { continue }
        if otherPlanet.planet == .rahu || otherPlanet.planet == .ketu { continue }

        let aspectStrength = getAspectStrength(
            planet: otherPlanet.planet,
            fromSign: otherPlanet.sign.rawValue,
            toSign: targetSign
        )
        if aspectStrength == 0 { continue }

        let isBenefic = isNaturalBenefic(otherPlanet.planet)
        totalStrength += isBenefic ? aspectStrength : -aspectStrength
    }

    return totalStrength
}

func isNaturalBenefic(_ planet: Planet) -> Bool {
    return [.jupiter, .venus, .mercury, .moon].contains(planet)
}

// ------------------------------------
// Natural friendship / enmity
// ------------------------------------

func getNaturalFriends(_ planet: Planet) -> [Planet] {
    let friendMap: [Planet: [Planet]] = [
        .sun: [.moon, .mars, .jupiter],
        .moon: [.sun, .mercury],
        .mars: [.sun, .moon, .jupiter],
        .mercury: [.sun, .venus],
        .jupiter: [.sun, .moon, .mars],
        .venus: [.mercury, .saturn],
        .saturn: [.mercury, .venus],
        .rahu: [.venus, .saturn],
        .ketu: [.venus, .saturn],
    ]
    return friendMap[planet] ?? []
}

func getNaturalEnemies(_ planet: Planet) -> [Planet] {
    let enemyMap: [Planet: [Planet]] = [
        .sun: [.venus, .saturn],
        .moon: [.rahu, .ketu],
        .mars: [.mercury],
        .mercury: [.moon],
        .jupiter: [.mercury, .venus],
        .venus: [.sun, .moon],
        .saturn: [.sun, .moon, .mars],
        .rahu: [.sun, .moon],
        .ketu: [.sun, .moon],
    ]
    return enemyMap[planet] ?? []
}

// ------------------------------------
// Sign lordship
// ------------------------------------

func getSignLord(_ sign: Sign) -> Planet {
    let lords: [Int: Planet] = [
        0: .mars,      // Aries
        1: .venus,     // Taurus
        2: .mercury,   // Gemini
        3: .moon,      // Cancer
        4: .sun,       // Leo
        5: .mercury,   // Virgo
        6: .venus,     // Libra
        7: .mars,      // Scorpio
        8: .jupiter,   // Sagittarius
        9: .saturn,    // Capricorn
        10: .saturn,   // Aquarius
        11: .jupiter,  // Pisces
    ]
    return lords[sign.rawValue] ?? .sun
}

// ------------------------------------
// Hora and Weekday lords
// ------------------------------------

func getWeekdayLord(jd: Double) -> Planet {
    let weekday = Int(floor(jd + 1.5)) % 7
    let weekdayLords: [Planet] = [
        .sun,     // 0 = Sunday
        .moon,    // 1 = Monday
        .mars,    // 2 = Tuesday
        .mercury, // 3 = Wednesday
        .jupiter, // 4 = Thursday
        .venus,   // 5 = Friday
        .saturn,  // 6 = Saturday
    ]
    return weekdayLords[weekday]
}

func getHoraLord(jd: Double) -> Planet {
    let horaSequence: [Planet] = [
        .sun, .venus, .mercury, .moon, .saturn, .jupiter, .mars
    ]

    let weekday = Int(floor(jd + 1.5)) % 7
    let dayLordHoraIndex = [0, 3, 6, 2, 5, 1, 4][weekday]

    let fracDay = (jd + 0.5).truncatingRemainder(dividingBy: 1)
    let horaNumber = Int(floor(fracDay * 24)) % 24

    let horaIndex = (dayLordHoraIndex + horaNumber) % 7
    return horaSequence[horaIndex]
}

// ------------------------------------
// Main Shadbala calculation
// ------------------------------------

/// Calculate the complete Shadbala for all 7 major planets in a chart.
public func calculateShadbala(chart: ChartData) -> [ShadbalaResult] {
    var results: [ShadbalaResult] = []

    let planets: [Planet] = [.sun, .moon, .mars, .mercury, .jupiter, .venus, .saturn]

    for planet in planets {
        let sthanabala = calculateSthanabala(planet: planet, chart: chart)
        let digbala = calculateDigbala(planet: planet, chart: chart)
        let kalabala = calculateKalabala(planet: planet, chart: chart)
        let chestabala = calculateChestabala(planet: planet, chart: chart)
        let naisargikabala = NAISARGIKA_BALA[planet] ?? 0
        let drigbala = calculateDrigbala(planet: planet, chart: chart)

        let total = sthanabala + digbala + kalabala + chestabala + naisargikabala + max(0, drigbala)
        let totalRupas = total / 60

        // Ishta phala = sqrt(uccha_bala × chestabala)
        let planetPos = chart.planets.first { $0.planet == planet }
        let siderealLon = planetPos?.siderealLongitude ?? 0
        let ucchaBala = calculateUcchaBala(planet: planet, siderealLongitude: siderealLon)
        let ishtaPhala = sqrt(ucchaBala * chestabala)
        let kashtaPhala = sqrt((60 - ucchaBala) * (60 - min(chestabala, 60)))

        let result = ShadbalaResult(
            planet: planet,
            sthanabala: sthanabala,
            digbala: digbala,
            kalabala: kalabala,
            chestabala: chestabala,
            naisargikabala: naisargikabala,
            drigbala: drigbala,
            total: total,
            totalRupas: totalRupas,
            ishtaPhala: ishtaPhala,
            kashtaPhala: kashtaPhala
        )
        results.append(result)
    }

    return results
}
