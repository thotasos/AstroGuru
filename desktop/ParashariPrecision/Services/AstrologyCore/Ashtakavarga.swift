// ============================================================
// Ashtakavarga — Parashari Precision
// ============================================================
// Calculates the Bindu (benefic points) in each of the 12 signs
// contributed by each of the 8 contributors (7 planets + Ascendant).
// Reference: BPHS Ch.66-69, Saravali Ch.44.
// ============================================================

import Foundation

// ------------------------------------
// Contributor type
// ------------------------------------

enum Contributor: String, CaseIterable {
    case sun, moon, mars, mercury, jupiter, venus, saturn
    case ascendant = "Ascendant"

    var planet: Planet? {
        switch self {
        case .sun: return .sun
        case .moon: return .moon
        case .mars: return .mars
        case .mercury: return .mercury
        case .jupiter: return .jupiter
        case .venus: return .venus
        case .saturn: return .saturn
        case .ascendant: return nil
        }
    }
}

// ------------------------------------
// Benefic position tables
// ------------------------------------
// For each planet's BAV, benefic points are contributed FROM each contributor
// based on the contributor's position. The table gives which houses FROM the
// contributor's sign the planet receives benefic points.

// Format: BENEFIC_POSITIONS[planet][contributor] = house numbers (1-indexed)
// that are benefic for `planet` from `contributor`'s position.

let BENEFIC_POSITIONS: [Planet: [Contributor: [Int]]] = [
    .sun: [
        .sun:       [1, 2, 4, 7, 8, 9, 10, 11],
        .moon:      [3, 6, 10, 11],
        .mars:      [1, 2, 4, 7, 8, 9, 10, 11],
        .mercury:   [3, 5, 6, 9, 10, 11, 12],
        .jupiter:   [5, 6, 9, 11],
        .venus:     [6, 7, 12],
        .saturn:    [1, 2, 4, 7, 8, 9, 10, 11],
        .ascendant: [3, 4, 6, 10, 11, 12],
    ],
    .moon: [
        .sun:       [3, 6, 7, 8, 10, 11],
        .moon:      [1, 3, 6, 7, 10, 11],
        .mars:      [2, 3, 5, 6, 9, 10, 11],
        .mercury:   [1, 3, 4, 5, 7, 8, 10, 11],
        .jupiter:   [1, 4, 7, 8, 10, 11, 12],
        .venus:     [3, 4, 5, 7, 9, 10, 11],
        .saturn:    [3, 5, 6, 11],
        .ascendant: [3, 6, 10, 11],
    ],
    .mars: [
        .sun:       [3, 5, 6, 10, 11],
        .moon:      [3, 6, 11],
        .mars:      [1, 2, 4, 7, 8, 10, 11],
        .mercury:   [3, 5, 6, 11],
        .jupiter:   [6, 10, 11, 12],
        .venus:     [6, 8, 11, 12],
        .saturn:    [1, 4, 7, 8, 9, 10, 11],
        .ascendant: [1, 3, 6, 10, 11],
    ],
    .mercury: [
        .sun:       [5, 6, 9, 11, 12],
        .moon:      [2, 4, 6, 8, 10, 11],
        .mars:      [1, 2, 4, 7, 8, 9, 10, 11],
        .mercury:   [1, 3, 5, 6, 9, 10, 11, 12],
        .jupiter:   [6, 8, 11, 12],
        .venus:     [1, 2, 3, 4, 5, 8, 9, 11],
        .saturn:    [1, 2, 4, 7, 8, 9, 10, 11],
        .ascendant: [1, 2, 4, 6, 8, 10, 11],
    ],
    .jupiter: [
        .sun:       [1, 2, 3, 4, 7, 8, 9, 10, 11],
        .moon:      [2, 5, 7, 9, 11],
        .mars:      [1, 2, 4, 7, 8, 10, 11],
        .mercury:   [1, 2, 4, 5, 6, 9, 10, 11],
        .jupiter:   [1, 2, 3, 4, 7, 8, 10, 11],
        .venus:     [2, 5, 6, 9, 10, 11],
        .saturn:    [3, 5, 6, 12],
        .ascendant: [1, 2, 4, 5, 6, 7, 9, 10, 11],
    ],
    .venus: [
        .sun:       [8, 11, 12],
        .moon:      [1, 2, 3, 4, 5, 8, 9, 11, 12],
        .mars:      [3, 4, 6, 9, 11, 12],
        .mercury:   [3, 5, 6, 9, 11],
        .jupiter:   [5, 8, 9, 10, 11],
        .venus:     [1, 2, 3, 4, 5, 8, 9, 10, 11],
        .saturn:    [3, 4, 5, 8, 9, 10, 11],
        .ascendant: [1, 2, 3, 4, 5, 8, 9, 11],
    ],
    .saturn: [
        .sun:       [1, 2, 4, 7, 8, 10, 11],
        .moon:      [3, 6, 11],
        .mars:      [3, 5, 6, 10, 11, 12],
        .mercury:   [6, 8, 9, 10, 11, 12],
        .jupiter:   [5, 6, 11, 12],
        .venus:     [6, 11, 12],
        .saturn:    [3, 5, 6, 11],
        .ascendant: [1, 3, 4, 6, 10, 11],
    ],
    // Nodes — included for completeness
    .rahu: [
        .sun:       [3, 6, 9, 12],
        .moon:      [3, 6, 9, 12],
        .mars:      [3, 6, 9, 12],
        .mercury:   [3, 6, 9, 12],
        .jupiter:   [3, 6, 9, 12],
        .venus:     [3, 6, 9, 12],
        .saturn:    [3, 6, 9, 12],
        .ascendant: [3, 6, 9, 12],
    ],
    .ketu: [
        .sun:       [3, 6, 9, 12],
        .moon:      [3, 6, 9, 12],
        .mars:      [3, 6, 9, 12],
        .mercury:   [3, 6, 9, 12],
        .jupiter:   [3, 6, 9, 12],
        .venus:     [3, 6, 9, 12],
        .saturn:    [3, 6, 9, 12],
        .ascendant: [3, 6, 9, 12],
    ],
]

// ------------------------------------
// Helper: get sign index of a planet
// ------------------------------------

func getPlanetSignIndex(chart: ChartData, planet: Planet) -> Int {
    guard let pos = chart.planets.first(where: { $0.planet == planet }) else {
        return 0
    }
    return pos.sign.rawValue
}

// ------------------------------------
// BAV (Benefic Ashta-Varga) for one planet
// ------------------------------------

/// Calculate the Benefic Ashta-varga (BAV) for a single planet.
public func calculatePlanetBAV(chart: ChartData, planet: Planet) -> [Int] {
    var bav = Array(repeating: 0, count: 12)

    guard let beneficPositionsForPlanet = BENEFIC_POSITIONS[planet] else {
        return bav
    }

    // Iterate through each contributor
    for contributor in Contributor.allCases {
        guard let houses = beneficPositionsForPlanet[contributor] else { continue }

        var contributorSign: Int

        // Get contributor's sign
        if contributor == .ascendant {
            contributorSign = Int(chart.ascendant / 30)
        } else if let contributorPlanet = contributor.planet {
            contributorSign = getPlanetSignIndex(chart: chart, planet: contributorPlanet)
        } else {
            continue
        }

        // For each benefic house, add a point to that sign
        for house in houses {
            // house is 1-indexed; convert to sign offset from contributor's sign
            let signOffset = (house - 1) // 0-11 offset
            let targetSign = (contributorSign + signOffset) % 12
            bav[targetSign] += 1
        }
    }

    return bav
}

// ------------------------------------
// SAV (Sarvashtakavarga)
// ------------------------------------

/// Calculate Sarvashtakavarga - sum of all BAVs for each sign
public func calculateSAV(chart: ChartData) -> [Int] {
    var sav = Array(repeating: 0, count: 12)

    let planets: [Planet] = [.sun, .moon, .mars, .mercury, .jupiter, .venus, .saturn]

    for planet in planets {
        let bav = calculatePlanetBAV(chart: chart, planet: planet)
        for i in 0..<12 {
            sav[i] += bav[i]
        }
    }

    return sav
}

// ------------------------------------
// Full Ashtakavarga calculation
// ------------------------------------

/// Calculate the complete Ashtakavarga for a chart
public func calculateAshtakavarga(chart: ChartData) -> AshtakavargaResult {
    // Calculate BAV for each planet
    var planetBav: [Planet: [Int]] = [:]
    let planets: [Planet] = [.sun, .moon, .mars, .mercury, .jupiter, .venus, .saturn]

    for planet in planets {
        planetBav[planet] = calculatePlanetBAV(chart: chart, planet: planet)
    }

    // Calculate SAV
    let sav = calculateSAV(chart: chart)

    // Build BAV dictionary for result (keyed by planet name)
    var bavDict: [String: [Int]] = [:]
    for (planet, bav) in planetBav {
        bavDict[planet.rawValue] = bav
    }

    return AshtakavargaResult(
        profileId: "",  // Will be set by caller
        bav: bavDict,
        sav: sav,
        planetBav: planetBav
    )
}
