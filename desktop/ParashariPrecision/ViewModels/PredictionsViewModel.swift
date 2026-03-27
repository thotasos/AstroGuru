import Foundation
import Combine

@MainActor
final class PredictionsViewModel: ObservableObject {
    @Published var prediction: String = ""
    @Published var planetPredictions: [String: String] = [:]
    @Published var dashaPrediction: String = ""
    @Published var yogaImpact: String = ""
    @Published var dashas: [DashaPeriod] = []
    @Published var dayPrediction: DayPrediction?
    @Published var monthPrediction: MonthPrediction?
    @Published var selectedDay: Date = Date()
    @Published var selectedMonthYear: DateComponents = {
        var c = Calendar.current.dateComponents([.year, .month], from: Date())
        return c
    }()
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

        self.dashas = dashas

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

    func generateDayPrediction(for profile: Profile) async {
        // Re-use dasha data already computed; re-compute if needed
        if dashas.isEmpty {
            let (year, month, day, hour, minute) = parseDateComponents(from: profile)
            self.dashas = engine.calculateDashas(
                year: year, month: month, day: day,
                hour: hour, minute: minute,
                lat: profile.latitude, lon: profile.longitude
            )
        }
        let (dashaLord, antarLord) = activeDashaLords(on: selectedDay, using: profile.predictionTimezone)
        dayPrediction = predictionGenerator.generateDayPrediction(
            date: selectedDay,
            dashaLord: dashaLord,
            antardashaLord: antarLord
        )
    }

    func generateMonthPrediction(for profile: Profile) async {
        if dashas.isEmpty {
            let (year, month, day, hour, minute) = parseDateComponents(from: profile)
            self.dashas = engine.calculateDashas(
                year: year, month: month, day: day,
                hour: hour, minute: minute,
                lat: profile.latitude, lon: profile.longitude
            )
        }

        let tz = TimeZone(identifier: profile.effectivePredictionTimezone) ?? .current
        var calendar = Calendar.current
        calendar.timeZone = tz

        let yr  = selectedMonthYear.year  ?? calendar.component(.year,  from: Date())
        let mon = selectedMonthYear.month ?? calendar.component(.month, from: Date())
        var midComps = DateComponents(); midComps.year = yr; midComps.month = mon; midComps.day = 15
        let midDate = calendar.date(from: midComps) ?? Date()
        let (dashaLord, antarLord) = activeDashaLords(on: midDate, using: profile.predictionTimezone)
        monthPrediction = predictionGenerator.generateMonthPrediction(
            year: yr, month: mon,
            dashaLord: dashaLord, antardashaLord: antarLord
        )
    }

    /// Find active mahadasha and antardasha lords for a given date
    /// Uses the predictionTimezone from profile if available, otherwise system timezone
    private func activeDashaLords(on date: Date, using predictionTimezone: String?) -> (String, String) {
        let tz = TimeZone(identifier: predictionTimezone ?? "") ?? .current
        var calendar = Calendar.current
        calendar.timeZone = tz
        let y = calendar.component(.year, from: date)
        let m = calendar.component(.month, from: date)
        for dasha in dashas {
            let dStart = dasha.startYear * 12 + dasha.startMonth
            let dEnd   = dasha.endYear   * 12 + dasha.endMonth
            let cur    = y * 12 + m
            if cur >= dStart && cur <= dEnd {
                for antar in dasha.antardashas {
                    let aStart = antar.startYear * 12 + antar.startMonth
                    let aEnd   = antar.endYear   * 12 + antar.endMonth
                    if cur >= aStart && cur <= aEnd {
                        return (dasha.lord, antar.lord)
                    }
                }
                return (dasha.lord, dasha.antardashas.first?.lord ?? dasha.lord)
            }
        }
        return (dashas.first?.lord ?? "Jupiter", dashas.first?.antardashas.first?.lord ?? "Jupiter")
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
