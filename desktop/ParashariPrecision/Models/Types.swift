import Foundation

// MARK: - Planet Enum

enum Planet: String, CaseIterable, Codable {
    case sun = "Sun", moon = "Moon", mars = "Mars"
    case mercury = "Mercury", jupiter = "Jupiter", venus = "Venus"
    case saturn = "Saturn", rahu = "Rahu", ketu = "Ketu"

    var name: String { rawValue }

    var symbol: String {
        switch self {
        case .sun: return "Su"; case .moon: return "Mo"
        case .mars: return "Ma"; case .mercury: return "Me"
        case .jupiter: return "Ju"; case .venus: return "Ve"
        case .saturn: return "Sa"; case .rahu: return "Ra"; case .ketu: return "Ke"
        }
    }
}

// MARK: - Sign Enum

enum Sign: Int, CaseIterable, Codable {
    case aries = 0, taurus, gemini, cancer, leo, virgo
    case libra, scorpio, sagittarius, capricorn, aquarius, pisces

    var name: String {
        switch self {
        case .aries: return "Aries"; case .taurus: return "Taurus"
        case .gemini: return "Gemini"; case .cancer: return "Cancer"
        case .leo: return "Leo"; case .virgo: return "Virgo"
        case .libra: return "Libra"; case .scorpio: return "Scorpio"
        case .sagittarius: return "Sagittarius"; case .capricorn: return "Capricorn"
        case .aquarius: return "Aquarius"; case .pisces: return "Pisces"
        }
    }

    var symbol: String {
        switch self {
        case .aries: return "♈"; case .taurus: return "♉"; case .gemini: return "♊"
        case .cancer: return "♋"; case .leo: return "♌"; case .virgo: return "♍"
        case .libra: return "♎"; case .scorpio: return "♏"; case .sagittarius: return "♐"
        case .capricorn: return "♑"; case .aquarius: return "♒"; case .pisces: return "♓"
        }
    }
}

// MARK: - House Struct

struct House: Codable, Equatable {
    let number: Int      // 1-12
    let sign: Sign
    let degreeOnCusp: Double
}

// MARK: - Varga Enum (divisional charts)

enum Varga: String, CaseIterable, Codable {
    case d1 = "D1", d2 = "D2", d3 = "D3", d4 = "D4", d5 = "D5"
    case d6 = "D6", d7 = "D7", d8 = "D8", d9 = "D9", d10 = "D10"
    case d11 = "D11", d12 = "D12", d16 = "D16", d20 = "D20"
    case d24 = "D24", d27 = "D27", d30 = "D30", d40 = "D40", d45 = "D45"
    case d60 = "D60"

    var divisor: Int {
        switch self {
        case .d1: return 1; case .d2: return 2; case .d3: return 3; case .d4: return 4; case .d5: return 5
        case .d6: return 6; case .d7: return 7; case .d8: return 8; case .d9: return 9; case .d10: return 10
        case .d11: return 11; case .d12: return 12; case .d16: return 16; case .d20: return 20
        case .d24: return 24; case .d27: return 27; case .d30: return 30; case .d40: return 40; case .d45: return 45
        case .d60: return 60
        }
    }
}

// MARK: - Ayanamsa Enum

enum Ayanamsa: Int, Codable {
    case lahiri = 1, raman = 2, kp = 3
}
