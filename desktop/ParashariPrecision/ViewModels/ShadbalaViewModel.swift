import Foundation
import Combine

@MainActor
final class ShadbalaViewModel: ObservableObject {
    @Published var shadbalaResults: [ShadbalaResult] = []
    @Published var isCalculating = false
    @Published var errorMessage: String?

    private let engine = CalculationEngine()

    var sortedResults: [ShadbalaResult] {
        shadbalaResults.sorted { $0.total > $1.total }
    }

    func calculateShadbala(for profile: Profile, chartData: ChartData) async {
        isCalculating = true
        errorMessage = nil

        let results = engine.calculateShadbala(chartData: chartData)
        self.shadbalaResults = results
        self.isCalculating = false
    }

    func calculateShadbala(for profile: Profile) async {
        let (year, month, day, hour, minute) = parseDateComponents(from: profile)
        let chart = engine.calculateChart(
            year: year, month: month, day: day,
            hour: hour, minute: minute,
            lat: profile.latitude, lon: profile.longitude,
            tzOffset: profile.utcOffset, ayanamsaId: profile.ayanamsaId
        )
        await calculateShadbala(for: profile, chartData: chart)
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
}
