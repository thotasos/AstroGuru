import Foundation
import SwiftUI

// MARK: - Yoga Strength

enum YogaStrength: String, Codable, CaseIterable {
    case strong = "strong"
    case moderate = "moderate"
    case weak = "weak"
    case partial = "partial"
    case cancelled = "cancelled"

    var color: Color {
        switch self {
        case .strong: return Color(red: 0.792, green: 0.541, blue: 0.016)   // Gold
        case .moderate: return Color(red: 0.2, green: 0.7, blue: 0.4)       // Green
        case .weak: return Color(red: 0.5, green: 0.5, blue: 0.5)           // Gray
        case .partial: return Color(red: 0.3, green: 0.5, blue: 0.8)        // Blue
        case .cancelled: return Color(red: 0.7, green: 0.2, blue: 0.2)      // Red
        }
    }

    var displayName: String {
        switch self {
        case .strong: return "Strong"
        case .moderate: return "Moderate"
        case .weak: return "Weak"
        case .partial: return "Partial"
        case .cancelled: return "Cancelled"
        }
    }
}

// MARK: - Yoga Category

enum YogaCategory: String, Codable, CaseIterable {
    case raja = "raja"
    case dhana = "dhana"
    case nabhasa = "nabhasa"
    case chandra = "chandra"
    case parivraja = "parivraja"
    case arishta = "arishta"
    case special = "special"
    case unknown = "unknown"

    var displayName: String {
        switch self {
        case .raja: return "Raja Yoga"
        case .dhana: return "Dhana Yoga"
        case .nabhasa: return "Nabhasa Yoga"
        case .chandra: return "Chandra Yoga"
        case .parivraja: return "Parivraja Yoga"
        case .arishta: return "Arishta Yoga"
        case .special: return "Special Yoga"
        case .unknown: return "Other"
        }
    }

    var icon: String {
        switch self {
        case .raja: return "crown"
        case .dhana: return "dollarsign.circle"
        case .nabhasa: return "sparkles"
        case .chandra: return "moon.stars"
        case .parivraja: return "figure.walk"
        case .arishta: return "exclamationmark.triangle"
        case .special: return "star"
        case .unknown: return "circle"
        }
    }
}

// MARK: - Yoga Result

struct YogaResult: Codable, Identifiable {
    let id: String
    let name: String
    let sanskritName: String
    let category: YogaCategory
    let strength: YogaStrength
    let description: String
    let effects: String
    let planetsInvolved: [String]
    let housesInvolved: [Int]
    let isPresent: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case sanskritName = "sanskrit_name"
        case category
        case strength
        case description
        case effects
        case planetsInvolved = "planets_involved"
        case housesInvolved = "houses_involved"
        case isPresent = "is_present"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        self.id = try container.decodeIfPresent(String.self, forKey: .id) ?? UUID().uuidString
        self.name = try container.decode(String.self, forKey: .name)
        self.sanskritName = try container.decodeIfPresent(String.self, forKey: .sanskritName) ?? name
        self.description = try container.decode(String.self, forKey: .description)
        self.effects = try container.decodeIfPresent(String.self, forKey: .effects) ?? ""
        self.housesInvolved = try container.decode([Int].self, forKey: .housesInvolved)
        self.isPresent = try container.decode(Bool.self, forKey: .isPresent)

        // API returns category as String like "Raja Yoga", "Special Yoga"
        let categoryString = try container.decode(String.self, forKey: .category)
        self.category = YogaCategory.allCases.first { $0.displayName.lowercased() == categoryString.lowercased() } ?? .unknown

        // API returns strength as Double (0-1) or Int (1-3 scale)
        // Convert to YogaStrength enum
        if let strengthDouble = try? container.decode(Double.self, forKey: .strength) {
            if strengthDouble >= 0.75 {
                self.strength = .strong
            } else if strengthDouble >= 0.5 {
                self.strength = .moderate
            } else {
                self.strength = .weak
            }
        } else if let strengthInt = try? container.decode(Int.self, forKey: .strength) {
            switch strengthInt {
            case 3: self.strength = .strong
            case 2: self.strength = .moderate
            default: self.strength = .weak
            }
        } else {
            self.strength = .weak
        }

        // API returns planets as [Int], convert to planet names
        let planetInts = try container.decode([Int].self, forKey: .planetsInvolved)
        self.planetsInvolved = planetInts.compactMap { Planet(rawValue: $0)?.name }
    }

    var planetsDisplay: String {
        planetsInvolved.joined(separator: ", ")
    }

    var housesDisplay: String {
        housesInvolved.map { "H\($0)" }.joined(separator: ", ")
    }

    var strengthColor: Color {
        strength.color
    }
}

// MARK: - Grouped Yogas

extension Array where Element == YogaResult {
    func grouped() -> [(category: YogaCategory, yogas: [YogaResult])] {
        let grouped = Dictionary(grouping: self.filter { $0.isPresent }) { $0.category }
        return YogaCategory.allCases
            .filter { grouped[$0] != nil }
            .map { (category: $0, yogas: grouped[$0]!) }
    }
}
