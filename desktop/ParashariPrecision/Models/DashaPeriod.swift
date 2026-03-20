import Foundation
import SwiftUI

// MARK: - Dasha Period

struct DashaPeriod: Codable, Identifiable, Sendable {
    let id: String
    let planet: String
    let startDate: Date
    let endDate: Date
    let level: Int
    let parentId: String?
    var subPeriods: [DashaPeriod]?

    enum CodingKeys: String, CodingKey {
        case id
        case planet
        case startDate = "startDate"
        case endDate = "endDate"
        case level
        case parentId = "parent_id"
        case subPeriods = "sub_periods"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        // API returns planet as Int, we need to decode it and convert to name
        let planetInt = try container.decode(Int.self, forKey: .planet)
        let planetName = Planet(rawValue: planetInt)?.name ?? "Unknown"
        self.planet = planetName

        self.id = UUID().uuidString
        self.startDate = try container.decode(Date.self, forKey: .startDate)
        self.endDate = try container.decode(Date.self, forKey: .endDate)
        self.level = try container.decode(Int.self, forKey: .level)
        self.parentId = try container.decodeIfPresent(String.self, forKey: .parentId)
        self.subPeriods = nil
    }

    init(planet: String, startDate: Date, endDate: Date, level: Int, parentId: String? = nil, subPeriods: [DashaPeriod]? = nil) {
        self.id = UUID().uuidString
        self.planet = planet
        self.startDate = startDate
        self.endDate = endDate
        self.level = level
        self.parentId = parentId
        self.subPeriods = subPeriods
    }

    var planetEnum: Planet? {
        Planet.allCases.first { $0.name.lowercased() == planet.lowercased() }
    }

    var durationYears: Double {
        let seconds = endDate.timeIntervalSince(startDate)
        return seconds / (365.25 * 24 * 3600)
    }

    var durationString: String {
        let years = durationYears
        if years >= 1.0 {
            return String(format: "%.1f yrs", years)
        } else {
            let months = years * 12
            return String(format: "%.1f mo", months)
        }
    }

    var isCurrentPeriod: Bool {
        let now = Date()
        return now >= startDate && now <= endDate
    }

    var dateRangeString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM yyyy"
        return "\(formatter.string(from: startDate)) – \(formatter.string(from: endDate))"
    }

    var periodColor: Color {
        planetEnum?.color ?? .gray
    }

    // Vimshottari dasha years by planet
    static let vimshottariYears: [Planet: Double] = [
        .sun: 6,
        .moon: 10,
        .mars: 7,
        .rahu: 18,
        .jupiter: 16,
        .saturn: 19,
        .mercury: 17,
        .ketu: 7,
        .venus: 20
    ]
}

// MARK: - Dasha Tree Node (for UI)

class DashaNode: ObservableObject, Identifiable {
    let id: String
    let period: DashaPeriod
    @Published var isExpanded: Bool = false
    var children: [DashaNode]

    init(period: DashaPeriod) {
        self.id = period.id
        self.period = period
        self.children = (period.subPeriods ?? []).map { DashaNode(period: $0) }
        self.isExpanded = period.isCurrentPeriod
    }

    var hasChildren: Bool { !children.isEmpty }
}
