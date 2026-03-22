import Foundation
import Combine

@MainActor
final class AshtakavargaViewModel: ObservableObject {
    @Published var ashtakavargaResult: AshtakavargaResult?
    @Published var isCalculating = false
    @Published var errorMessage: String?

    private let engine = CalculationEngine()

    let ashtakavargaPlanets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu"]
    let zodiacSigns = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
                      "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]

    func calculateAshtakavarga(for profile: Profile) async {
        isCalculating = true
        errorMessage = nil

        let (year, month, day, hour, minute) = parseDateComponents(from: profile)

        let chartData = engine.calculateChart(
            year: year, month: month, day: day,
            hour: hour, minute: minute,
            lat: profile.latitude, lon: profile.longitude,
            tzOffset: profile.utcOffset, ayanamsaId: profile.ayanamsaId
        )

        let result = calculateAshtakavargaFromChart(chartData: chartData)
        self.ashtakavargaResult = result
        self.isCalculating = false
    }

    private func parseDateComponents(from profile: Profile) -> (Int, Int, Int, Int, Int) {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date: Date?
        if let d = formatter.date(from: profile.dobUTC) {
            date = d
        } else {
            let fallbackFormatter = ISO8601DateFormatter()
            fallbackFormatter.formatOptions = [.withInternetDateTime]
            date = fallbackFormatter.date(from: profile.dobUTC)
        }
        let components = Calendar.current.dateComponents(
            in: TimeZone(identifier: profile.timezone) ?? .current,
            from: date ?? Date()
        )
        return (
            components.year ?? 2000,
            components.month ?? 1,
            components.day ?? 1,
            components.hour ?? 12,
            components.minute ?? 0
        )
    }

    private func calculateAshtakavargaFromChart(chartData: ChartData) -> AshtakavargaResult {
        var bav: [String: [Int]] = [:]
        for planet in ashtakavargaPlanets {
            bav[planet] = Array(repeating: 0, count: 12)
        }

        // Build a map of planet name -> sign index from chart
        var planetSignMap: [String: Int] = [:]
        for position in chartData.planets {
            planetSignMap[position.planet] = position.sign
        }

        // Also include Lagna (Ascendant) in the reference calculation
        let lagnaSign = Int(chartData.ascendant / 30) % 12

        // For each of the 8 Ashtakavarga contributors (Sun through Saturn + Lagna),
        // look up their sign and cast bindus per the BPHS reference tables.
        for (contributorIndex, contributor) in ashtakavargaContributors.enumerated() {
            let sign: Int
            if contributor == "Lagna" {
                sign = lagnaSign
            } else {
                guard let s = planetSignMap[contributor] else { continue }
                sign = s
            }

            // Cast 1 bindu into each target sign per the reference table
            // ashtakavargaRef[planetIndex][sourceSign] = [4 target signs]
            for targetSign in ashtakavargaRef[contributorIndex][sign] {
                // BAV: this contributor adds a bindu to the target sign
                bav[contributor]?[targetSign] += 1
            }
        }

        // Rahu and Ketu are not Ashtakavarga contributors (shadow planets),
        // but they appear in the planet list. Their BAV entries remain all-zero
        // since they don't cast bindus. We still include them in the result.

        var sav = Array(repeating: 0, count: 12)
        for planet in ashtakavargaPlanets {
            if let planetBindus = bav[planet] {
                for signIndex in 0..<12 {
                    sav[signIndex] += planetBindus[signIndex]
                }
            }
        }

        let planetBav = applyShodhana(bav: bav)
        return AshtakavargaResult(bav: bav, sav: sav, planetBav: planetBav)
    }

    /// Own signs (Moolatrikona) for each planet — used in Shodhana.
    /// Mars owns Aries (0) & Scorpio (7); Mercury owns Gemini (2) & Virgo (5);
    /// Jupiter owns Sagittarius (8) & Pisces (11); Venus owns Taurus (1) & Libra (6);
    /// Saturn owns Capricorn (9) & Aquarius (10).
    private let ownSigns: [String: Set<Int>] = [
        "Sun":     [4],   // Leo
        "Moon":    [3],   // Cancer
        "Mars":    [0, 7], // Aries, Scorpio
        "Mercury": [2, 5], // Gemini, Virgo
        "Jupiter": [8, 11], // Sagittarius, Pisces
        "Venus":   [1, 6],  // Taurus, Libra
        "Saturn":  [9, 10], // Capricorn, Aquarius
        "Rahu":    [],    // No moolatrikona signs
        "Ketu":    []     // No moolatrikona signs
    ]

    private func applyShodhana(bav: [String: [Int]]) -> [String: [Int]] {
        var planetBav = bav
        for (planet, bindus) in bav {
            var shodhana = bindus
            if let signs = ownSigns[planet] {
                for ownSign in signs {
                    if shodhana[ownSign] > 0 {
                        shodhana[ownSign] -= 1
                    }
                }
            }
            planetBav[planet] = shodhana
        }
        return planetBav
    }

    func binduColorIntensity(for binduCount: Int) -> Double {
        switch binduCount {
        case 0: return 0.1
        case 1: return 0.2
        case 2: return 0.3
        case 3: return 0.4
        case 4: return 0.5
        case 5: return 0.6
        case 6: return 0.7
        case 7: return 0.8
        default:
            return binduCount >= 8 ? 1.0 : 0.1
        }
    }

    func planetTotalBindus(for planet: String) -> Int {
        guard let result = ashtakavargaResult,
              let bindus = result.bav[planet] else { return 0 }
        return bindus.reduce(0, +)
    }

    func savTotalBindus() -> Int {
        guard let result = ashtakavargaResult else { return 0 }
        return result.sav.reduce(0, +)
    }
}
