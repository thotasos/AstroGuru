import Foundation
import Combine

@MainActor
final class ChartViewModel: ObservableObject {
    @Published var chartData: ChartData?
    @Published var isCalculating = false
    @Published var errorMessage: String?

    private let engine = CalculationEngine()

    func calculateChart(for profile: Profile) async {
        isCalculating = true
        errorMessage = nil

        let (year, month, day, hour, minute) = parseDateComponents(from: profile)

        let chart = engine.calculateChart(
            year: year, month: month, day: day,
            hour: hour, minute: minute,
            lat: profile.latitude, lon: profile.longitude,
            tzOffset: profile.utcOffset, ayanamsaId: profile.ayanamsaId
        )

        self.chartData = chart
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
}
