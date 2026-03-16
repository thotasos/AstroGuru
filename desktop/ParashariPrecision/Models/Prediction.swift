import Foundation

// MARK: - Hourly Prediction

struct HourlyPrediction: Identifiable, Codable, Hashable {
    let id: String
    let profileId: String
    let date: String
    let hour: Int
    let timezone: String

    // Sookshma Dasha
    let sookshmaDashaPlanet: Int?
    let sookshmaDashaStart: String?
    let sookshmaDashaEnd: String?

    // Prana Dasha
    let pranaDashaPlanet: Int?
    let pranaDashaStart: String?
    let pranaDashaEnd: String?

    // Transit positions
    let moonNakshatra: Int?
    let moonSign: Int?
    let moonDegree: Double?
    let transitLagna: Double?
    let transitLagnaSign: Int?

    // Prediction
    let hourlyScore: Int?
    let predictionText: String?

    enum CodingKeys: String, CodingKey {
        case id
        case profileId = "profile_id"
        case date
        case hour
        case timezone
        case sookshmaDashaPlanet = "sookshma_dasha_planet"
        case sookshmaDashaStart = "sookshma_dasha_start"
        case sookshmaDashaEnd = "sookshma_dasha_end"
        case pranaDashaPlanet = "prana_dasha_planet"
        case pranaDashaStart = "prana_dasha_start"
        case pranaDashaEnd = "prana_dasha_end"
        case moonNakshatra = "moon_nakshatra"
        case moonSign = "moon_sign"
        case moonDegree = "moon_degree"
        case transitLagna = "transit_lagna"
        case transitLagnaSign = "transit_lagna_sign"
        case hourlyScore = "hourly_score"
        case predictionText = "prediction_text"
    }

    var formattedHour: String {
        String(format: "%02d:00", hour)
    }

    var sookshmaPlanetName: String? {
        guard let planet = sookshmaDashaPlanet else { return nil }
        return PlanetName.from(id: planet)
    }

    var pranaPlanetName: String? {
        guard let planet = pranaDashaPlanet else { return nil }
        return PlanetName.from(id: planet)
    }
}

// MARK: - Planet Names

enum PlanetName: String {
    case sun = "Sun"
    case moon = "Moon"
    case mars = "Mars"
    case mercury = "Mercury"
    case jupiter = "Jupiter"
    case venus = "Venus"
    case saturn = "Saturn"
    case rahu = "Rahu"
    case ketu = "Ketu"

    static func from(id: Int) -> String {
        switch id {
        case 0: return "Sun"
        case 1: return "Moon"
        case 2: return "Mars"
        case 3: return "Mercury"
        case 4: return "Jupiter"
        case 5: return "Venus"
        case 6: return "Saturn"
        case 7: return "Rahu"
        case 8: return "Ketu"
        default: return "Unknown"
        }
    }
}

// MARK: - Monthly Prediction

struct MonthlyPrediction: Identifiable, Codable, Hashable {
    var id: String { "\(year)-\(month)-\(profileId)" }
    let year: Int
    let month: Int
    let profileId: String
    let dailyPredictions: [DailyPrediction]

    var monthName: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        var components = DateComponents()
        components.month = month
        components.year = year
        if let date = Calendar.current.date(from: components) {
            return formatter.string(from: date)
        }
        return "\(month)/\(year)"
    }
}

struct DailyPrediction: Identifiable, Codable, Hashable {
    var id: String { date }
    let date: String
    let score: Int
    let categories: [String]
    let hourlyCount: Int

    var dayOfMonth: Int {
        let parts = date.split(separator: "-")
        guard parts.count >= 3 else { return 0 }
        return Int(parts[2]) ?? 0
    }

    var dayOfWeek: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        if let d = ISO8601DateFormatter().date(from: date + "T12:00:00Z") {
            return formatter.string(from: d)
        }
        return ""
    }
}

// MARK: - Prediction Cache Response

struct PredictionCacheResponse: Codable {
    let deleted: Int
    let profileId: String
}
