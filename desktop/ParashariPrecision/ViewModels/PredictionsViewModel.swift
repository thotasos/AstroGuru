import Foundation
import Combine

@MainActor
final class PredictionsViewModel: ObservableObject {
    @Published var prediction: String = ""
    @Published var planetPredictions: [String: String] = [:]
    @Published var dashaPrediction: String = ""
    @Published var yogaImpact: String = ""
    @Published var isGenerating = false
    @Published var errorMessage: String?

    private let engine = CalculationEngine()
    private let predictionGenerator = LocalPredictionGenerator()

    func generateAllPredictions(for profile: Profile) async {
        isGenerating = true
        errorMessage = nil

        let (year, month, day, hour, minute) = parseDateComponents(from: profile)

        let chartData = engine.calculateChart(
            year: year, month: month, day: day,
            hour: hour, minute: minute,
            lat: profile.latitude, lon: profile.longitude,
            tzOffset: profile.utcOffset, ayanamsaId: profile.ayanamsaId
        )

        let dashas = engine.calculateDashas(
            year: year, month: month, day: day,
            hour: hour, minute: minute,
            lat: profile.latitude, lon: profile.longitude
        )

        let shadbala = engine.calculateShadbala(chartData: chartData)
        let yogas = engine.detectYogas(chartData: chartData, shadbala: shadbala)

        // Find current dasha/antardasha
        let now = Date()
        let calendar = Calendar.current
        let currentYear = calendar.component(.year, from: now)

        var currentDasha: DashaPeriod?
        var currentAntardasha: DashaPeriod?

        for dasha in dashas {
            if dasha.startYear <= currentYear && dasha.endYear >= currentYear {
                currentDasha = dasha
                for antardasha in dasha.antardashas {
                    if antardasha.startYear <= currentYear && antardasha.endYear >= currentYear {
                        currentAntardasha = antardasha
                        break
                    }
                }
                if currentAntardasha == nil { currentAntardasha = dasha.antardashas.first }
                break
            }
        }

        if currentDasha == nil, let first = dashas.first {
            currentDasha = first
            currentAntardasha = first.antardashas.first
        }

        // Generate predictions
        self.planetPredictions = predictionGenerator.generatePlanetPredictions(
            chartData: chartData,
            shadbala: shadbala
        )

        self.yogaImpact = predictionGenerator.generateYogaImpact(yogas: yogas)

        var dashaPairs: [(DashaPeriod, DashaPeriod)] = []
        if let dasha = currentDasha, let antardasha = currentAntardasha {
            self.dashaPrediction = predictionGenerator.generateDashaPrediction(
                currentDasha: dasha,
                antardasha: antardasha,
                chartData: chartData
            )
            dashaPairs = [(dasha, antardasha)]
        }

        self.prediction = predictionGenerator.generateOverallPrediction(
            profile: profile,
            chartData: chartData,
            dashaData: dashaPairs,
            shadbala: shadbala,
            yogas: yogas
        )

        self.isGenerating = false
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
