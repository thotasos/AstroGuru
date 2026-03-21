import Foundation
import Combine

enum YogaSortOption: String, CaseIterable {
    case strength = "Strength"
    case name = "Name"
    case category = "Category"
}

@MainActor
final class YogaViewModel: ObservableObject {
    @Published var yogas: [YogaResult] = []
    @Published var isCalculating = false
    @Published var errorMessage: String?
    @Published var selectedCategory: String?
    @Published var sortOption: YogaSortOption = .strength

    private let engine = CalculationEngine()

    var yogaCountByImportance: [String: Int] {
        Dictionary(grouping: yogas, by: { $0.category })
            .mapValues { $0.count }
    }

    var availableCategories: [String] {
        Array(Set(yogas.map { $0.category })).sorted()
    }

    func filteredYogas(by category: String?) -> [YogaResult] {
        guard let category = category else { return yogas }
        return yogas.filter { $0.category == category }
    }

    func sortedYogas(by option: YogaSortOption) -> [YogaResult] {
        switch option {
        case .strength: return yogas.sorted { $0.strength > $1.strength }
        case .name: return yogas.sorted { $0.name < $1.name }
        case .category: return yogas.sorted { $0.category < $1.category }
        }
    }

    var displayedYogas: [YogaResult] {
        let filtered = filteredYogas(by: selectedCategory)
        return filtered.sorted { yoga1, yoga2 in
            switch sortOption {
            case .strength: return yoga1.strength > yoga2.strength
            case .name: return yoga1.name < yoga2.name
            case .category:
                if yoga1.category == yoga2.category { return yoga1.strength > yoga2.strength }
                return yoga1.category < yoga2.category
            }
        }
    }

    func calculateYogas(for profile: Profile) async {
        isCalculating = true
        errorMessage = nil

        let (year, month, day, hour, minute) = parseDateComponents(from: profile)

        let chartData = engine.calculateChart(
            year: year, month: month, day: day,
            hour: hour, minute: minute,
            lat: profile.latitude, lon: profile.longitude,
            tzOffset: profile.utcOffset, ayanamsaId: profile.ayanamsaId
        )

        let shadbala = engine.calculateShadbala(chartData: chartData)
        let detectedYogas = engine.detectYogas(chartData: chartData, shadbala: shadbala)
        self.yogas = detectedYogas
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
