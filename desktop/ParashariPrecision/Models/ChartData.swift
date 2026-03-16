import SwiftUI

// MARK: - Planet Enum

enum Planet: Int, CaseIterable, Codable, Identifiable {
    case sun = 0
    case moon = 1
    case mars = 2
    case mercury = 3
    case jupiter = 4
    case venus = 5
    case saturn = 6
    case rahu = 7
    case ketu = 8

    var id: Int { rawValue }

    var name: String {
        switch self {
        case .sun: return "Sun"
        case .moon: return "Moon"
        case .mars: return "Mars"
        case .mercury: return "Mercury"
        case .jupiter: return "Jupiter"
        case .venus: return "Venus"
        case .saturn: return "Saturn"
        case .rahu: return "Rahu"
        case .ketu: return "Ketu"
        }
    }

    var symbol: String {
        switch self {
        case .sun: return "☉"
        case .moon: return "☽"
        case .mars: return "♂"
        case .mercury: return "☿"
        case .jupiter: return "♃"
        case .venus: return "♀"
        case .saturn: return "♄"
        case .rahu: return "☊"
        case .ketu: return "☋"
        }
    }

    var abbreviation: String {
        switch self {
        case .sun: return "Su"
        case .moon: return "Mo"
        case .mars: return "Ma"
        case .mercury: return "Me"
        case .jupiter: return "Ju"
        case .venus: return "Ve"
        case .saturn: return "Sa"
        case .rahu: return "Ra"
        case .ketu: return "Ke"
        }
    }

    var color: Color {
        switch self {
        case .sun: return .yellow
        case .moon: return .white.opacity(0.9)
        case .mars: return .red
        case .mercury: return Color(red: 0.2, green: 0.8, blue: 0.2)
        case .jupiter: return .yellow.opacity(0.8)
        case .venus: return Color(red: 1.0, green: 0.7, blue: 0.8)
        case .saturn: return .blue.opacity(0.7)
        case .rahu: return .purple
        case .ketu: return Color(red: 0.6, green: 0.4, blue: 0.2)
        }
    }
}

// MARK: - Sign Enum

enum Sign: Int, CaseIterable, Codable, Identifiable {
    case aries = 0
    case taurus = 1
    case gemini = 2
    case cancer = 3
    case leo = 4
    case virgo = 5
    case libra = 6
    case scorpio = 7
    case sagittarius = 8
    case capricorn = 9
    case aquarius = 10
    case pisces = 11

    var id: Int { rawValue }

    var name: String {
        switch self {
        case .aries: return "Aries"
        case .taurus: return "Taurus"
        case .gemini: return "Gemini"
        case .cancer: return "Cancer"
        case .leo: return "Leo"
        case .virgo: return "Virgo"
        case .libra: return "Libra"
        case .scorpio: return "Scorpio"
        case .sagittarius: return "Sagittarius"
        case .capricorn: return "Capricorn"
        case .aquarius: return "Aquarius"
        case .pisces: return "Pisces"
        }
    }

    var shortName: String {
        switch self {
        case .aries: return "Ar"
        case .taurus: return "Ta"
        case .gemini: return "Ge"
        case .cancer: return "Ca"
        case .leo: return "Le"
        case .virgo: return "Vi"
        case .libra: return "Li"
        case .scorpio: return "Sc"
        case .sagittarius: return "Sg"
        case .capricorn: return "Cp"
        case .aquarius: return "Aq"
        case .pisces: return "Pi"
        }
    }

    var symbol: String {
        switch self {
        case .aries: return "♈"
        case .taurus: return "♉"
        case .gemini: return "♊"
        case .cancer: return "♋"
        case .leo: return "♌"
        case .virgo: return "♍"
        case .libra: return "♎"
        case .scorpio: return "♏"
        case .sagittarius: return "♐"
        case .capricorn: return "♑"
        case .aquarius: return "♒"
        case .pisces: return "♓"
        }
    }

    var number: Int { rawValue + 1 }

    var lord: Planet {
        switch self {
        case .aries: return .mars
        case .taurus: return .venus
        case .gemini: return .mercury
        case .cancer: return .moon
        case .leo: return .sun
        case .virgo: return .mercury
        case .libra: return .venus
        case .scorpio: return .mars
        case .sagittarius: return .jupiter
        case .capricorn: return .saturn
        case .aquarius: return .saturn
        case .pisces: return .jupiter
        }
    }
}

// MARK: - Planet Position

struct PlanetPosition: Codable, Identifiable {
    let id: String
    let planet: String
    let longitude: Double
    let latitude: Double
    let speed: Double
    let sign: Int
    let signLongitude: Double
    let nakshatra: String
    let nakshatraPada: Int
    let isRetrograde: Bool
    let house: Int

    enum CodingKeys: String, CodingKey {
        case id
        case planet
        case longitude
        case latitude
        case speed
        case sign
        case signLongitude = "sign_longitude"
        case nakshatra
        case nakshatraPada = "nakshatra_pada"
        case isRetrograde = "is_retrograde"
        case house
    }

    var planetEnum: Planet? {
        Planet.allCases.first { $0.name.lowercased() == planet.lowercased() }
    }

    var signEnum: Sign? {
        Sign(rawValue: sign)
    }

    var degreeString: String {
        let deg = Int(signLongitude)
        let minFrac = (signLongitude - Double(deg)) * 60.0
        let min = Int(minFrac)
        return "\(deg)°\(min)'"
    }

    var retrogradeMarker: String {
        isRetrograde ? " ℞" : ""
    }
}

// MARK: - House Cusp

struct HouseCusp: Codable, Identifiable {
    let id: String
    let house: Int
    let sign: Int
    let longitude: Double
    let signLongitude: Double

    enum CodingKeys: String, CodingKey {
        case id
        case house
        case sign
        case longitude
        case signLongitude = "sign_longitude"
    }
}

// MARK: - Chart Data

struct ChartData: Codable {
    let profileId: String
    let varga: String
    let ayanamsa: String
    let ayanamsaDegree: Double
    let ascendantSign: Int
    let ascendantDegree: Double
    let planets: [PlanetPosition]
    let houses: [HouseCusp]
    let calculatedAt: Date?

    enum CodingKeys: String, CodingKey {
        case profileId = "profile_id"
        case varga
        case ayanamsa
        case ayanamsaDegree = "ayanamsa_degree"
        case ascendantSign = "ascendant_sign"
        case ascendantDegree = "ascendant_degree"
        case planets
        case houses
        case calculatedAt = "calculated_at"
    }

    var ascendantSignEnum: Sign? {
        Sign(rawValue: ascendantSign)
    }

    func planetsInSign(_ signIndex: Int) -> [PlanetPosition] {
        planets.filter { $0.sign == signIndex }
    }

    func planetsInHouse(_ house: Int) -> [PlanetPosition] {
        planets.filter { $0.house == house }
    }
}

// MARK: - South Indian Grid Cell

struct SouthIndianCell {
    let signIndex: Int
    let row: Int
    let col: Int
    var isCenter: Bool { false }
}

// The fixed South Indian chart layout:
// Row 0: Pi(11), Ar(0),  Ta(1),  Ge(2)
// Row 1: Aq(10), -center-, -center-, Ca(3)
// Row 2: Cp(9),  -center-, -center-, Le(4)
// Row 3: Sg(8),  Sc(7),   Li(6),   Vi(5)

struct SouthIndianLayout {
    static let signGrid: [[Int?]] = [
        [11, 0,  1,  2 ],
        [10, nil, nil, 3 ],
        [9,  nil, nil, 4 ],
        [8,  7,  6,  5 ]
    ]

    static func position(for signIndex: Int) -> (row: Int, col: Int)? {
        for row in 0..<4 {
            for col in 0..<4 {
                if signGrid[row][col] == signIndex {
                    return (row, col)
                }
            }
        }
        return nil
    }
}
