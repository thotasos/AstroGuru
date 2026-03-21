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
        let date = formatter.date(from: profile.dobUTC) ?? {
            formatter.formatOptions = [.withInternetDateTime]
            return formatter.date(from: profile.dobUTC)
        }()
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

        for position in chartData.planets {
            guard ashtakavargaPlanets.contains(position.planet) else { continue }
            let sign = position.sign
            bav[position.planet]?[sign] += 1
        }

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

    private func applyShodhana(bav: [String: [Int]]) -> [String: [Int]] {
        var planetBav = bav
        for (planet, bindus) in bav {
            guard let planetIndex = ashtakavargaPlanets.firstIndex(of: planet) else { continue }
            var shodhana = bindus
            let ownSign = planetIndex % 12
            if shodhana[ownSign] > 0 {
                shodhana[ownSign] -= 1
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
