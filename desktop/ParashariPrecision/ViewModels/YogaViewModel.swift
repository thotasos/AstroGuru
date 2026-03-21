import Foundation
import Combine

// MARK: - Sort Option
enum YogaSortOption: String, CaseIterable {
    case strength = "Strength"
    case name = "Name"
    case category = "Category"
}

@MainActor
final class YogaViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var yogas: [YogaResult] = []
    @Published var isCalculating = false
    @Published var errorMessage: String?
    @Published var selectedCategory: String?
    @Published var sortOption: YogaSortOption = .strength

    // MARK: - Private Properties
    private var astrologyCore: AstrologyCore?

    // MARK: - Initialization
    init() {
        do {
            astrologyCore = try AstrologyCore()
        } catch {
            errorMessage = "Failed to initialize astrology engine: \(error.localizedDescription)"
        }
    }

    // MARK: - Computed Properties
    var yogaCountByImportance: [String: Int] {
        Dictionary(grouping: yogas, by: { $0.category })
            .mapValues { $0.count }
    }

    var availableCategories: [String] {
        Array(Set(yogas.map { $0.category })).sorted()
    }

    // MARK: - Filtered and Sorted Yogas
    func filteredYogas(by category: String?) -> [YogaResult] {
        guard let category = category else {
            return yogas
        }
        return yogas.filter { $0.category == category }
    }

    func sortedYogas(by option: YogaSortOption) -> [YogaResult] {
        switch option {
        case .strength:
            return yogas.sorted { $0.strength > $1.strength }
        case .name:
            return yogas.sorted { $0.name < $1.name }
        case .category:
            return yogas.sorted { $0.category < $1.category }
        }
    }

    var displayedYogas: [YogaResult] {
        let filtered = filteredYogas(by: selectedCategory)
        return filtered.sorted { yoga1, yoga2 in
            switch sortOption {
            case .strength:
                return yoga1.strength > yoga2.strength
            case .name:
                return yoga1.name < yoga2.name
            case .category:
                if yoga1.category == yoga2.category {
                    return yoga1.strength > yoga2.strength
                }
                return yoga1.category < yoga2.category
            }
        }
    }

    // MARK: - Calculation
    func calculateYogas(for profile: Profile) async {
        isCalculating = true
        errorMessage = nil

        do {
            let birthData = buildBirthData(from: profile)
            guard let core = astrologyCore else {
                throw AstrologyCoreError.calculationFailed
            }
            let result = try core.calculateYogas(birthData: birthData)
            self.yogas = result.filter { $0.isPresent }
            self.isCalculating = false
        } catch {
            self.errorMessage = error.localizedDescription
            self.isCalculating = false
        }
    }

    // MARK: - Helper
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
