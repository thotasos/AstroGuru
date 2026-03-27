import Foundation

struct Profile: Codable, Identifiable, Equatable, Hashable {
    let id: String
    var name: String
    var dobUTC: String          // ISO 8601 UTC datetime string
    var latitude: Double
    var longitude: Double
    var timezone: String         // IANA timezone string (birth timezone)
    var utcOffset: Double       // hours offset from UTC
    var predictionTimezone: String?  // Optional: timezone for day/month predictions (defaults to birth timezone if nil)
    var placeName: String?
    var ayanamsaId: Int
    var notes: String?
    var createdAt: String?
    var updatedAt: String?

    init(
        id: String = UUID().uuidString,
        name: String,
        dobUTC: String,
        latitude: Double,
        longitude: Double,
        timezone: String,
        utcOffset: Double,
        predictionTimezone: String? = nil,
        placeName: String? = nil,
        ayanamsaId: Int = 1,
        notes: String? = nil,
        createdAt: String? = nil,
        updatedAt: String? = nil
    ) {
        self.id = id
        self.name = name
        self.dobUTC = dobUTC
        self.latitude = latitude
        self.longitude = longitude
        self.timezone = timezone
        self.utcOffset = utcOffset
        self.predictionTimezone = predictionTimezone
        self.placeName = placeName
        self.ayanamsaId = ayanamsaId
        self.notes = notes
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    /// Returns the timezone to use for predictions
    /// Falls back to birth timezone if predictionTimezone is not set
    var effectivePredictionTimezone: String {
        predictionTimezone ?? timezone
    }

    var dobDate: Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        formatter.timeZone = TimeZone(secondsFromGMT: 0)  // Explicitly use UTC
        return formatter.date(from: dobUTC)
    }
}