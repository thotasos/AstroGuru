import Foundation

struct Profile: Codable, Identifiable, Equatable {
    let id: String
    var name: String
    var dobUTC: String          // ISO 8601 UTC datetime string
    var latitude: Double
    var longitude: Double
    var timezone: String         // IANA timezone string
    var utcOffset: Double       // hours offset from UTC
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
        self.placeName = placeName
        self.ayanamsaId = ayanamsaId
        self.notes = notes
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    var dobDate: Date? {
        ISO8601DateFormatter().date(from: dobUTC)
    }
}