import Foundation
import Combine

@MainActor
final class DashaViewModel: ObservableObject {
    @Published var dashaPeriods: [DashaPeriod] = []
    @Published var selectedDasha: DashaPeriod?
    @Published var isCalculating = false
    @Published var errorMessage: String?

    private var astrologyCore: AstrologyCore?

    init() {
        do {
            astrologyCore = try AstrologyCore()
        } catch {
            errorMessage = "Failed to initialize astrology engine: \(error.localizedDescription)"
        }
    }

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

        do {
            let birthData = buildBirthData(from: profile)
            guard let core = astrologyCore else {
                throw AstrologyCoreError.calculationFailed
            }
            let result = try core.calculateDashas(birthData: birthData)
            self.dashaPeriods = result
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
}
