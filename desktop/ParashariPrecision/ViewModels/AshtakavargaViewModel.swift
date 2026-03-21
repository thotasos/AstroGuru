import Foundation
import Combine

@MainActor
final class AshtakavargaViewModel: ObservableObject {
    @Published var ashtakavargaResult: AshtakavargaResult?
    @Published var isCalculating = false
    @Published var errorMessage: String?

    private var astrologyCore: AstrologyCore?

    let ashtakavargaPlanets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu"]
    let zodiacSigns = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
                      "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]

    init() {
        do {
            astrologyCore = try AstrologyCore()
        } catch {
            errorMessage = "Failed to initialize astrology engine: \(error.localizedDescription)"
        }
    }

    func calculateAshtakavarga(for profile: Profile) async {
        isCalculating = true
        errorMessage = nil

        do {
            let birthData = buildBirthData(from: profile)
            guard let core = astrologyCore else {
                throw AstrologyCoreError.calculationFailed
            }

            // First get the chart data
            let chartData = try core.calculateChart(birthData: birthData)

            // Calculate Ashtakavarga from chart data
            let result = try calculateAshtakavargaFromChart(chartData: chartData)
            self.ashtakavargaResult = result
            self.isCalculating = false
        } catch {
            self.errorMessage = error.localizedDescription
            self.isCalculating = false
        }
    }

    func buildBirthData(from profile: Profile) -> [String: Any] {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        let date = formatter.date(from: profile.dobUTC) ?? {
            formatter.formatOptions = [.withInternetDateTime]
            return formatter.date(from: profile.dobUTC)
        }()

        let components = Calendar.current.dateComponents(in: TimeZone(identifier: profile.timezone) ?? .current, from: date ?? Date())

        return [
            "year": components.year ?? 1990,
            "month": components.month ?? 1,
            "day": components.day ?? 1,
            "hour": components.hour ?? 12,
            "min": components.minute ?? 0,
            "lat": profile.latitude,
            "lon": profile.longitude,
            "tzone": profile.utcOffset,
            "ayanamsa": profile.ayanamsaId
        ]
    }

    private func calculateAshtakavargaFromChart(chartData: ChartData) throws -> AshtakavargaResult {
        // Initialize BAV (Bhinn Ashtakavarga) for each planet
        var bav: [String: [Int]] = [:]
        for planet in ashtakavargaPlanets {
            bav[planet] = Array(repeating: 0, count: 12)
        }

        // Get planet positions from chart
        for position in chartData.planets {
            guard ashtakavargaPlanets.contains(position.planet) else { continue }
            let sign = position.sign
            // Add bindu in the sign where planet is positioned
            bav[position.planet]?[sign] += 1
        }

        // Calculate SAV (Sarva Ashtakavarga) by summing bindus across all planets for each sign
        var sav = Array(repeating: 0, count: 12)
        for planet in ashtakavargaPlanets {
            if let planetBindus = bav[planet] {
                for signIndex in 0..<12 {
                    sav[signIndex] += planetBindus[signIndex]
                }
            }
        }

        // Apply Shodhana (Trikona and Ekadhipatya) - traditional filtering
        // This is a simplified version; full implementation would use specific rules
        let planetBav = applyShodhana(bav: bav)

        return AshtakavargaResult(bav: bav, sav: sav, planetBav: planetBav)
    }

    private func applyShodhana(bav: [String: [Int]]) -> [String: [Int]] {
        // Simplified Shodhana - in full implementation:
        // - Trikona shodhana: Remove bindus from 1st, 5th, 9th signs from planet's own sign
        // - Ekadhipatya shodhana: Remove bindus from signs where planet is lord of 11th

        var planetBav = bav

        // For each planet, apply basic shodhana based on sign lords
        let signRulers: [Int] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] // Aries=0, Taurus=1, etc.
        // Sign rulers: Sun, Venus, Mercury, Moon, Sun, Mercury, Venus, Mars, Jupiter, Saturn, Saturn, Jupiter

        for (planet, bindus) in bav {
            var shodhana = bindus

            // Find planet index
            guard let planetIndex = ashtakavargaPlanets.firstIndex(of: planet) else { continue }

            // Simplified: Remove 1 bindu from each planet's own sign (self-binding reduction)
            let ownSign = planetIndex % 12
            if shodhana[ownSign] > 0 {
                shodhana[ownSign] -= 1
            }

            planetBav[planet] = shodhana
        }

        return planetBav
    }

    func binduColorIntensity(for binduCount: Int) -> Double {
        // Return color intensity based on bindu count
        // 0 = lightest (0.1), 1-7 = increasing, 8+ = darkest (1.0)
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
