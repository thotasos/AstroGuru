import Foundation
import Combine

@MainActor
final class ChartViewModel: ObservableObject {
    @Published var chartData: ChartData?
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

    func calculateChart(for profile: Profile) async {
        isCalculating = true
        errorMessage = nil

        do {
            let birthData = buildBirthData(from: profile)
            guard let core = astrologyCore else {
                throw AstrologyCoreError.calculationFailed
            }
            let result = try core.calculateChart(birthData: birthData)
            self.chartData = result
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
            // Try without fractional seconds
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
