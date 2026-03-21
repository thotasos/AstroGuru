import Foundation

// MARK: - Nakshatra
enum Nakshatra: Int, CaseIterable, Codable {
    case ashwini = 0, bharani, krittika, rohini, mrigashirsha, ardhra
    case punarvasu, pushya, ashlesha, magha, purvaPhalguni, uttaraPhalguni
    case Hasta = 12, chitra, swati, visakha, anuradha, jyeshtha
    case mula, purvaShadha, uttaraShadha, shravana, dhanishta, shatabhisha
    case purvaBhadrapada, uttaraBhadrapada, revati

    var name: String {
        let names = [
            "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashirsha", "Ardhra",
            "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
            "Hasta", "Chitra", "Swati", "Visakha", "Anuradha", "Jyeshtha",
            "Mula", "Purva Shadha", "Uttara Shadha", "Shravana", "Dhanishta", "Shatabhisha",
            "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
        ]
        return names[self.rawValue]
    }

    var lord: Planet {
        let lords: [Planet] = [
            .ketu, .venus, .sun, .moon, .mars, .rahu,
            .jupiter, .saturn, .sun, .moon, .mars, .rahu,
            .jupiter, .mercury, .ketu, .venus, .sun, .moon,
            .mars, .rahu, .jupiter, .saturn, .mercury, .ketu,
            .venus, .sun, .moon
        ]
        return lords[self.rawValue]
    }
}

// MARK: - PlanetPosition
struct PlanetPosition: Codable, Equatable {
    let planet: String    // "Sun", "Moon", etc.
    let sign: Int         // 0-11
    let degreeInSign: Double
    let longitude: Double
    let nakshatra: Int   // 0-26
    let pada: Int         // 1-4
    let isRetrograde: Bool

    var planetEnum: Planet? {
        Planet(rawValue: planet)
    }

    var signEnum: Sign {
        Sign(rawValue: sign) ?? .aries
    }

    var nakshatraEnum: Nakshatra {
        Nakshatra(rawValue: nakshatra) ?? .ashwini
    }
}

// MARK: - ChartData
struct ChartData: Codable, Equatable {
    let ascendant: Double
    let planets: [PlanetPosition]
    let houses: [House]
    let julianDay: Double
    let ayanamsaValue: Double
    let ayanamsaType: Int
    let mc: Double
}

// MARK: - VargaChart
struct VargaChart: Codable {
    let varga: String
    let chart: ChartData
}

// MARK: - GridCell
struct GridCell: Codable {
    let row: Int
    let col: Int
    let sign: Int
    let isCenter: Bool
    let planets: [String]   // planet symbols
    let lagnaSign: Int?
}