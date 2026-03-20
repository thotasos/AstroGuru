// ============================================================
// Vimshottari Dasha Calculation — Parashari Precision
// ============================================================
// Implements the complete 5-level dasha system.
// Total Vimshottari cycle = 120 years.
// Reference unit: 365.25 Julian days per year.
// ============================================================

import Foundation

// ------------------------------------
// Constants
// ------------------------------------

let DAYS_PER_YEAR: Double = 365.25
let NAKSHATRA_SPAN_DEG: Double = 360.0 / 27.0          // 13°20' = 13.3333...°
let PADA_SPAN_DEG: Double = NAKSHATRA_SPAN_DEG / 4.0   // 3°20'  = 3.3333...°
let VIMSHOTTARI_TOTAL_YEARS: Int = 120

/** Dasha sequence starting from Ketu. Each entry: [planet, duration_years] */
let DASHA_SEQUENCE: [(Planet, Int)] = [
    (.ketu,    7),
    (.venus,  20),
    (.sun,     6),
    (.moon,   10),
    (.mars,    7),
    (.rahu,   18),
    (.jupiter,16),
    (.saturn, 19),
    (.mercury,17),
]

/**
 * Nakshatra to dasha lord mapping (index 0=Ashwini to 26=Revati).
 * The cycle repeats: Ashwini=Ketu, Bharani=Venus, …, Revati=Mercury.
 */
let NAKSHATRA_LORD: [Planet] = [
    .ketu,     // 0  Ashwini
    .venus,    // 1  Bharani
    .sun,      // 2  Krittika
    .moon,     // 3  Rohini
    .mars,     // 4  Mrigashira
    .rahu,     // 5  Ardra
    .jupiter,  // 6  Punarvasu
    .saturn,   // 7  Pushya
    .mercury,  // 8  Ashlesha
    .ketu,     // 9  Magha
    .venus,    // 10 Purva Phalguni
    .sun,      // 11 Uttara Phalguni
    .moon,     // 12 Hasta
    .mars,     // 13 Chitra
    .rahu,     // 14 Swati
    .jupiter,  // 15 Vishakha
    .saturn,   // 16 Anuradha
    .mercury,  // 17 Jyeshtha
    .ketu,     // 18 Mula
    .venus,    // 19 Purva Ashadha
    .sun,      // 20 Uttara Ashadha
    .moon,     // 21 Shravana
    .mars,     // 22 Dhanishta
    .rahu,     // 23 Shatabhisha
    .jupiter,  // 24 Purva Bhadrapada
    .saturn,   // 25 Uttara Bhadrapada
    .mercury,  // 26 Revati
]

// ------------------------------------
// Nakshatra calculation
// ------------------------------------

/**
 * Determine the nakshatra, pada, lord, and position within nakshatra
 * from a sidereal longitude.
 *
 * - Parameter siderealLongitude: Sidereal longitude 0–360°
 * - Returns: NakshatraInfo
 */
func getNakshatra(siderealLongitude: Double) -> NakshatraInfo {
    let lon = normalizeDegreesD(siderealLongitude)
    let nakshatraIndex = Int(lon / NAKSHATRA_SPAN_DEG)
    let degreeInNakshatra = lon - Double(nakshatraIndex) * NAKSHATRA_SPAN_DEG
    let pada = Int(degreeInNakshatra / PADA_SPAN_DEG) + 1  // 1–4

    let nakshatra = Nakshatra(rawValue: nakshatraIndex) ?? .ashwini
    let lord = NAKSHATRA_LORD[nakshatraIndex] ?? .ketu

    return NakshatraInfo(
        nakshatra: nakshatra,
        pada: min(pada, 4),
        lord: lord,
        degreeInNakshatra: degreeInNakshatra
    )
}

private func normalizeDegreesD(_ longitude: Double) -> Double {
    return longitude.truncatingRemainder(dividingBy: 360.0)
}

// ------------------------------------
// Dasha sequence lookup
// ------------------------------------

/**
 * Find the index in DASHA_SEQUENCE for a given planet.
 */
private func dashaSequenceIndex(for planet: Planet) -> Int {
    for (index, (p, _)) in DASHA_SEQUENCE.enumerated() {
        if p == planet {
            return index
        }
    }
    return 0 // Default fallback
}

// ------------------------------------
// Five-Level Dasha Calculation
// ------------------------------------

/**
 * Calculate the full 5-level Vimshottari dasha tree starting from the birth date.
 *
 * - Parameters:
 *   - moonSiderealLongitude: Moon's sidereal longitude at birth (0–360°)
 *   - birthDate: Birth date (local or UTC; used as epoch)
 * - Returns: Array of fully nested DashaPeriod objects covering 120 years
 */
func calculateDasha(moonSiderealLongitude: Double, birthDate: Date) -> [DashaPeriod] {
    let nakshatraInfo = getNakshatra(siderealLongitude: moonSiderealLongitude)
    let birthNakshatraLord = nakshatraInfo.lord
    let degreeInNakshatra = nakshatraInfo.degreeInNakshatra

    // Balance of current mahadasha at birth = how much of the current nakshatra remains
    let fractionRemaining = 1.0 - degreeInNakshatra / NAKSHATRA_SPAN_DEG
    let startingDashaIndex = dashaSequenceIndex(for: birthNakshatraLord)
    let (_, startingDashaYears) = DASHA_SEQUENCE[startingDashaIndex]
    let balanceYears = fractionRemaining * Double(startingDashaYears)
    let balanceDays = balanceYears * DAYS_PER_YEAR

    // First mahadasha STARTS at birth, balance determines duration
    let mahaStart = birthDate

    var periods: [DashaPeriod] = []

    var mahaCurrentStart = mahaStart

    // Iterate through all 9 mahadashas (cycle once = 120 years)
    for mi in 0..<9 {
        let mahaIdx = (startingDashaIndex + mi) % 9
        let (mahaPlanet, mahaYears) = DASHA_SEQUENCE[mahaIdx]

        let mahaActualStartMs = mahaCurrentStart.timeIntervalSince1970 * 1000

        // First mahadasha uses balance period, subsequent use full period
        let mahaDurationDays: Double
        if mi == 0 {
            // First mahadasha: runs from birth for the balance period
            mahaDurationDays = balanceDays
        } else {
            // Subsequent mahadashas: full duration
            mahaDurationDays = Double(mahaYears) * DAYS_PER_YEAR
        }

        let mahaEnd = Date(timeIntervalSince1970: (mahaActualStartMs + mahaDurationDays * 86400000) / 1000)

        // Level 1
        let mahaLevel = DashaLevel(
            planet: mahaPlanet,
            startDate: Date(timeIntervalSince1970: mahaActualStartMs / 1000),
            endDate: mahaEnd,
            level: 1
        )

        // Iterate antardasha (bhukti)
        var antarCurrentStartMs = mahaActualStartMs

        for ai in 0..<9 {
            let antarIdx = (mahaIdx + ai) % 9
            let (antarPlanet, antarYears) = DASHA_SEQUENCE[antarIdx]
            let antarFraction = Double(antarYears) / Double(VIMSHOTTARI_TOTAL_YEARS)
            let antarDurationDays = antarFraction * mahaDurationDays
            let antarEndMs = antarCurrentStartMs + antarDurationDays * 86400000

            let antarLevel = DashaLevel(
                planet: antarPlanet,
                startDate: Date(timeIntervalSince1970: antarCurrentStartMs / 1000),
                endDate: Date(timeIntervalSince1970: antarEndMs / 1000),
                level: 2
            )

            // Iterate pratyantardasha
            var pratyCurrentStartMs = antarCurrentStartMs

            for pi in 0..<9 {
                let pratyIdx = (antarIdx + pi) % 9
                let (pratyPlanet, pratyYears) = DASHA_SEQUENCE[pratyIdx]
                let pratyFraction = Double(pratyYears) / Double(VIMSHOTTARI_TOTAL_YEARS)
                let pratyDurationDays = pratyFraction * antarDurationDays
                let pratyEndMs = pratyCurrentStartMs + pratyDurationDays * 86400000

                let pratyLevel = DashaLevel(
                    planet: pratyPlanet,
                    startDate: Date(timeIntervalSince1970: pratyCurrentStartMs / 1000),
                    endDate: Date(timeIntervalSince1970: pratyEndMs / 1000),
                    level: 3
                )

                // Iterate sookshma
                var sookshmaCurrentStartMs = pratyCurrentStartMs

                for si in 0..<9 {
                    let sookshmaIdx = (pratyIdx + si) % 9
                    let (sookshmaPlanet, sookshmaYears) = DASHA_SEQUENCE[sookshmaIdx]
                    let sookshmaFraction = Double(sookshmaYears) / Double(VIMSHOTTARI_TOTAL_YEARS)
                    let sookshmaDurationDays = sookshmaFraction * pratyDurationDays
                    let sookshmaEndMs = sookshmaCurrentStartMs + sookshmaDurationDays * 86400000

                    let sookshmaLevel = DashaLevel(
                        planet: sookshmaPlanet,
                        startDate: Date(timeIntervalSince1970: sookshmaCurrentStartMs / 1000),
                        endDate: Date(timeIntervalSince1970: sookshmaEndMs / 1000),
                        level: 4
                    )

                    // Iterate prana
                    var pranaCurrentStartMs = sookshmaCurrentStartMs

                    for xi in 0..<9 {
                        let pranaIdx = (sookshmaIdx + xi) % 9
                        let (pranaPlanet, pranaYears) = DASHA_SEQUENCE[pranaIdx]
                        let pranaFraction = Double(pranaYears) / Double(VIMSHOTTARI_TOTAL_YEARS)
                        let pranaDurationDays = pranaFraction * sookshmaDurationDays
                        let pranaEndMs = pranaCurrentStartMs + pranaDurationDays * 86400000

                        let pranaLevel = DashaLevel(
                            planet: pranaPlanet,
                            startDate: Date(timeIntervalSince1970: pranaCurrentStartMs / 1000),
                            endDate: Date(timeIntervalSince1970: pranaEndMs / 1000),
                            level: 5
                        )

                        periods.append(DashaPeriod(
                            mahadasha: mahaLevel,
                            antardasha: antarLevel,
                            pratyantardasha: pratyLevel,
                            sookshma: sookshmaLevel,
                            prana: pranaLevel
                        ))

                        pranaCurrentStartMs = pranaEndMs
                    }

                    sookshmaCurrentStartMs = sookshmaEndMs
                }

                pratyCurrentStartMs = pratyEndMs
            }

            antarCurrentStartMs = antarEndMs
        }

        mahaCurrentStart = mahaEnd
    }

    return periods
}

/**
 * Get the active dasha lord at a specific date.
 *
 * - Parameters:
 *   - dashas: Array of DashaPeriod as returned by calculateDasha()
 *   - date: Date to query
 * - Returns: The DashaPeriod active at that date, or nil if outside range
 */
func getDashaLordAtDate(dashas: [DashaPeriod], date: Date) -> DashaPeriod? {
    let ts = date.timeIntervalSince1970 * 1000
    return dashas.first { d in
        d.prana.startDate.timeIntervalSince1970 * 1000 <= ts &&
        ts < d.prana.endDate.timeIntervalSince1970 * 1000
    }
}

/**
 * Get a condensed view of dasha lords at a given date.
 */
func getDashaLordsAtDate(dashas: [DashaPeriod], date: Date) -> (mahadasha: Planet, antardasha: Planet, pratyantardasha: Planet, sookshma: Planet, prana: Planet)? {
    guard let period = getDashaLordAtDate(dashas: dashas, date: date) else { return nil }
    return (
        mahadasha: period.mahadasha.planet,
        antardasha: period.antardasha.planet,
        pratyantardasha: period.pratyantardasha.planet,
        sookshma: period.sookshma.planet,
        prana: period.prana.planet
    )
}

/**
 * Get the list of mahadasha periods (level 1 only) with their start/end dates.
 */
func getMahadashas(moonSiderealLongitude: Double, birthDate: Date) -> [DashaLevel] {
    let info = getNakshatra(siderealLongitude: moonSiderealLongitude)
    let lord = info.lord
    let degreeInNakshatra = info.degreeInNakshatra
    let fractionRemaining = 1.0 - degreeInNakshatra / NAKSHATRA_SPAN_DEG
    let startingIdx = dashaSequenceIndex(for: lord)
    let (_, startingYears) = DASHA_SEQUENCE[startingIdx]
    let balanceDays = fractionRemaining * Double(startingYears) * DAYS_PER_YEAR
    let birthMs = birthDate.timeIntervalSince1970 * 1000

    // First mahadasha starts at birth, balance determines its duration
    var currentStartMs = birthMs

    var mahadashas: [DashaLevel] = []
    for i in 0..<9 {
        let idx = (startingIdx + i) % 9
        let (planet, years) = DASHA_SEQUENCE[idx]

        // First mahadasha uses balance, rest use full duration
        let durationMs: Double
        if i == 0 {
            durationMs = balanceDays * 86400000
        } else {
            durationMs = Double(years) * DAYS_PER_YEAR * 86400000
        }

        let endMs = currentStartMs + durationMs
        mahadashas.append(DashaLevel(
            planet: planet,
            startDate: Date(timeIntervalSince1970: currentStartMs / 1000),
            endDate: Date(timeIntervalSince1970: endMs / 1000),
            level: 1
        ))
        currentStartMs = endMs
    }

    return mahadashas
}

/**
 * Get the specific dasha period (all 5 levels) for a given date/time.
 */
func getDashaAtDate(dashas: [DashaPeriod], date: Date) -> DashaPeriod? {
    let ts = date.timeIntervalSince1970 * 1000
    return dashas.first { d in
        d.prana.startDate.timeIntervalSince1970 * 1000 <= ts &&
        ts < d.prana.endDate.timeIntervalSince1970 * 1000
    }
}
