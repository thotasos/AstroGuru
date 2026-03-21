import Foundation
import Combine

@MainActor
final class PredictionsViewModel: ObservableObject {

    // MARK: - Published Properties

    @Published var prediction: String = ""
    @Published var planetPredictions: [String: String] = [:]
    @Published var dashaPrediction: String = ""
    @Published var yogaImpact: String = ""
    @Published var isGenerating = false
    @Published var errorMessage: String?

    // MARK: - Private Properties

    private var astrologyCore: AstrologyCore?
    private let predictionGenerator = LocalPredictionGenerator()
    private var chartData: ChartData?
    private var currentDasha: DashaPeriod?
    private var currentAntardasha: DashaPeriod?
    private var shadbalaResults: [ShadbalaResult] = []
    private var yogaResults: [YogaResult] = []

    // MARK: - Initialization

    init() {
        do {
            astrologyCore = try AstrologyCore()
        } catch {
            errorMessage = "Failed to initialize astrology engine: \(error.localizedDescription)"
        }
    }

    // MARK: - Public Methods

    /// Generates all predictions for the given profile.
    func generateAllPredictions(for profile: Profile) async {
        isGenerating = true
        errorMessage = nil

        do {
            let birthData = buildBirthData(from: profile)

            // Fetch chart data first
            let chart = try await getChartData(birthData: birthData)
            self.chartData = chart

            // Then fetch other data
            let dashaData = try await getDashaData(birthData: birthData)
            let shadbala = try await getShadbala(birthData: birthData)
            let yogas = try await getYogas(birthData: birthData)

            self.shadbalaResults = shadbala
            self.yogaResults = yogas

            // Get current dasha and antardasha
            if let firstDasha = dashaData.first {
                self.currentDasha = firstDasha.0
                self.currentAntardasha = firstDasha.1
            }

            // Generate predictions using LocalPredictionGenerator
            self.planetPredictions = predictionGenerator.generatePlanetPredictions(
                chartData: chart,
                shadbala: shadbala
            )

            self.yogaImpact = predictionGenerator.generateYogaImpact(yogas: yogas)

            if let dasha = currentDasha, let antardasha = currentAntardasha {
                self.dashaPrediction = predictionGenerator.generateDashaPrediction(
                    currentDasha: dasha,
                    antardasha: antardasha,
                    chartData: chart
                )
            }

            self.prediction = predictionGenerator.generateOverallPrediction(
                profile: profile,
                chartData: chart,
                dashaData: dashaData,
                shadbala: shadbala,
                yogas: yogas
            )

            self.isGenerating = false

        } catch {
            self.errorMessage = error.localizedDescription
            self.isGenerating = false
        }
    }

    /// Builds birth data dictionary from profile for astrology calculations.
    func buildBirthData(from profile: Profile) -> [String: Any] {
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

    // MARK: - Data Retrieval Methods

    func getChartData(birthData: [String: Any]) async throws -> ChartData {
        guard let core = astrologyCore else {
            throw AstrologyCoreError.calculationFailed
        }
        return try core.calculateChart(birthData: birthData)
    }

    func getDashaData(birthData: [String: Any]) async throws -> [(DashaPeriod, DashaPeriod)] {
        guard let core = astrologyCore else {
            throw AstrologyCoreError.calculationFailed
        }

        let dashas = try core.calculateDashas(birthData: birthData)

        // Find current dasha based on date
        let now = Date()
        let calendar = Calendar.current
        let currentYear = calendar.component(.year, from: now)
        let currentMonth = calendar.component(.month, from: now)

        var result: [(DashaPeriod, DashaPeriod)] = []

        for dasha in dashas {
            if dasha.startYear <= currentYear && dasha.endYear >= currentYear {
                // Find current antardasha
                for antardasha in dasha.antardashas {
                    if antardasha.startYear <= currentYear && antardasha.endYear >= currentYear {
                        result.append((dasha, antardasha))
                        break
                    }
                }
                // If no antardasha found for current year, use first one
                if result.isEmpty, let firstAntardasha = dasha.antardashas.first {
                    result.append((dasha, firstAntardasha))
                }
            }
        }

        // If still empty, use first dasha with first antardasha
        if result.isEmpty, let firstDasha = dashas.first, let firstAntardasha = firstDasha.antardashas.first {
            result.append((firstDasha, firstAntardasha))
        }

        return result
    }

    func getShadbala(birthData: [String: Any]) async throws -> [ShadbalaResult] {
        guard let core = astrologyCore else {
            throw AstrologyCoreError.calculationFailed
        }
        return try core.calculateShadbala(birthData: birthData)
    }

    func getYogas(birthData: [String: Any]) async throws -> [YogaResult] {
        guard let core = astrologyCore else {
            throw AstrologyCoreError.calculationFailed
        }
        let yogas = try core.calculateYogas(birthData: birthData)
        return yogas.filter { $0.isPresent }
    }
}
