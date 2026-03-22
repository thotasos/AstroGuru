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

// MARK: - Ashtakavarga Reference Tables (BPHS Parashari System)
//
// ashtakavargaRef[planetIndex][sourceSign] = [targetSign1, targetSign2, targetSign3, targetSign4]
// Planet indices: 0=Sun, 1=Moon, 2=Mars, 3=Mercury, 4=Jupiter, 5=Venus, 6=Saturn, 7=Lagna
// Sign indices: 0=Aries ... 11=Pisces

/// Ashtakavarga reference tables — [planetIndex][sourceSign] -> [4 target signs]
let ashtakavargaRef: [[[Int]]] = [
    // 0: Sun — from BPHS standard Parashari table
    [
        /* Aries 0  */ [1, 4, 7, 10],   // Taurus, Leo, Libra, Capricorn
        /* Taurus 1 */ [2, 5, 8, 11],   // Gemini, Virgo, Sagittarius, Pisces
        /* Gemini 2 */ [3, 6, 9, 0],    // Cancer, Virgo, Capricorn, Aries
        /* Cancer 3 */ [4, 7, 10, 1],   // Leo, Libra, Capricorn, Taurus
        /* Leo    4 */ [5, 8, 11, 2],   // Virgo, Sagittarius, Pisces, Gemini
        /* Virgo  5 */ [6, 9, 0, 3],    // Libra, Capricorn, Aries, Cancer
        /* Libra  6 */ [7, 10, 1, 4],   // Scorpio, Capricorn, Taurus, Leo
        /* Scorpio7 */ [8, 11, 2, 5],   // Sagittarius, Pisces, Gemini, Virgo
        /* Sagitt.8 */ [9, 0, 3, 6],    // Capricorn, Aries, Cancer, Libra
        /* Capric.9 */ [10, 1, 4, 7],   // Aquarius, Taurus, Leo, Scorpio
        /* Aquar.10 */ [11, 2, 5, 8],   // Pisces, Gemini, Virgo, Sagittarius
        /* Pisces11 */ [0, 3, 6, 9]     // Aries, Cancer, Libra, Capricorn
    ],
    // 1: Moon — from BPHS standard table
    [
        /* Aries 0  */ [1, 5, 8, 11],
        /* Taurus 1 */ [2, 6, 9, 0],
        /* Gemini 2 */ [3, 7, 10, 1],
        /* Cancer 3 */ [4, 8, 11, 2],
        /* Leo    4 */ [5, 9, 0, 3],
        /* Virgo  5 */ [6, 10, 1, 4],
        /* Libra  6 */ [7, 11, 2, 5],
        /* Scorpio7 */ [8, 0, 3, 6],
        /* Sagitt.8 */ [9, 1, 4, 7],
        /* Capric.9 */ [10, 2, 5, 8],
        /* Aquar.10 */ [11, 3, 6, 9],
        /* Pisces11 */ [0, 4, 7, 10]
    ],
    // 2: Mars — from BPHS standard table
    [
        /* Aries 0  */ [1, 4, 7, 10],
        /* Taurus 1 */ [2, 5, 8, 11],
        /* Gemini 2 */ [3, 6, 9, 0],
        /* Cancer 3 */ [4, 7, 10, 1],
        /* Leo    4 */ [5, 8, 11, 2],
        /* Virgo  5 */ [6, 9, 0, 3],
        /* Libra  6 */ [7, 10, 1, 4],
        /* Scorpio7 */ [8, 11, 2, 5],
        /* Sagitt.8 */ [9, 0, 3, 6],
        /* Capric.9 */ [10, 1, 4, 7],
        /* Aquar.10 */ [11, 2, 5, 8],
        /* Pisces11 */ [0, 3, 6, 9]
    ],
    // 3: Mercury — from BPHS standard table
    [
        /* Aries 0  */ [1, 4, 7, 10],
        /* Taurus 1 */ [2, 5, 8, 11],
        /* Gemini 2 */ [3, 6, 9, 0],
        /* Cancer 3 */ [4, 7, 10, 1],
        /* Leo    4 */ [5, 8, 11, 2],
        /* Virgo  5 */ [6, 9, 0, 3],
        /* Libra  6 */ [7, 10, 1, 4],
        /* Scorpio7 */ [8, 11, 2, 5],
        /* Sagitt.8 */ [9, 0, 3, 6],
        /* Capric.9 */ [10, 1, 4, 7],
        /* Aquar.10 */ [11, 2, 5, 8],
        /* Pisces11 */ [0, 3, 6, 9]
    ],
    // 4: Jupiter — from BPHS standard table
    [
        /* Aries 0  */ [2, 5, 9, 11],
        /* Taurus 1 */ [3, 6, 10, 0],
        /* Gemini 2 */ [4, 7, 11, 1],
        /* Cancer 3 */ [5, 8, 0, 2],
        /* Leo    4 */ [6, 9, 1, 3],
        /* Virgo  5 */ [7, 10, 2, 4],
        /* Libra  6 */ [8, 11, 3, 5],
        /* Scorpio7 */ [9, 0, 4, 6],
        /* Sagitt.8 */ [10, 1, 5, 7],
        /* Capric.9 */ [11, 2, 6, 8],
        /* Aquar.10 */ [0, 3, 7, 9],
        /* Pisces11 */ [1, 4, 8, 10]
    ],
    // 5: Venus — from BPHS standard table
    [
        /* Aries 0  */ [1, 5, 8, 11],
        /* Taurus 1 */ [2, 6, 9, 0],
        /* Gemini 2 */ [3, 7, 10, 1],
        /* Cancer 3 */ [4, 8, 11, 2],
        /* Leo    4 */ [5, 9, 0, 3],
        /* Virgo  5 */ [6, 10, 1, 4],
        /* Libra  6 */ [7, 11, 2, 5],
        /* Scorpio7 */ [8, 0, 3, 6],
        /* Sagitt.8 */ [9, 1, 4, 7],
        /* Capric.9 */ [10, 2, 5, 8],
        /* Aquar.10 */ [11, 3, 6, 9],
        /* Pisces11 */ [0, 4, 7, 10]
    ],
    // 6: Saturn — from BPHS standard table
    [
        /* Aries 0  */ [3, 6, 10, 11],
        /* Taurus 1 */ [4, 7, 11, 0],
        /* Gemini 2 */ [5, 8, 0, 1],
        /* Cancer 3 */ [6, 9, 1, 2],
        /* Leo    4 */ [7, 10, 2, 3],
        /* Virgo  5 */ [8, 11, 3, 4],
        /* Libra  6 */ [9, 0, 4, 5],
        /* Scorpio7 */ [10, 1, 5, 6],
        /* Sagitt.8 */ [11, 2, 6, 7],
        /* Capric.9 */ [0, 3, 7, 8],
        /* Aquar.10 */ [1, 4, 8, 9],
        /* Pisces11 */ [2, 5, 9, 10]
    ],
    // 7: Lagna — from BPHS standard table
    [
        /* Aries 0  */ [1, 4, 7, 10],
        /* Taurus 1 */ [2, 5, 8, 11],
        /* Gemini 2 */ [3, 6, 9, 0],
        /* Cancer 3 */ [4, 7, 10, 1],
        /* Leo    4 */ [5, 8, 11, 2],
        /* Virgo  5 */ [6, 9, 0, 3],
        /* Libra  6 */ [7, 10, 1, 4],
        /* Scorpio7 */ [8, 11, 2, 5],
        /* Sagitt.8 */ [9, 0, 3, 6],
        /* Capric.9 */ [10, 1, 4, 7],
        /* Aquar.10 */ [11, 2, 5, 8],
        /* Pisces11 */ [0, 3, 6, 9]
    ]
]

/// Ashtakavarga contributing planet names in order matching the reference table indices.
let ashtakavargaContributors = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Lagna"]
