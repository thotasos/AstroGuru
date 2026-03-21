import Foundation
import Combine

@MainActor
final class DashaViewModel: ObservableObject {
    @Published var dashaPeriods: [DashaPeriod] = []
    @Published var selectedDasha: DashaPeriod?
    @Published var isCalculating = false
    @Published var errorMessage: String?

    private let engine = CalculationEngine()

    var currentDasha: DashaPeriod? {
        let now = Date()
        let calendar = Calendar.current
        let currentYear = calendar.component(.year, from: now)
        let currentMonth = calendar.component(.month, from: now)

        return dashaPeriods.first { dasha in
            let startDate = dasha.startYear * 12 + dasha.startMonth
            let endDate = dasha.endYear * 12 + dasha.endMonth
            let currentDate = currentYear * 12 + currentMonth
            return currentDate >= startDate && currentDate <= endDate
        }
    }

    func calculateDashas(for profile: Profile) async {
        isCalculating = true
        errorMessage = nil

        let (year, month, day, hour, minute) = parseDateComponents(from: profile)

        let dashas = engine.calculateDashas(
            year: year, month: month, day: day,
            hour: hour, minute: minute,
            lat: profile.latitude, lon: profile.longitude
        )

        self.dashaPeriods = dashas
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
}
