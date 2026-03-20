import Foundation

enum ProfileStatus: String, Codable {
    case new = "new"
    case processing = "processing"
    case ready = "ready"
    case error = "error"
}

struct BirthProfile: Identifiable, Codable, Hashable {
    let id: String
    var name: String
    var dobUTC: Date
    var lat: Double
    var lon: Double
    var timezone: String
    var placeName: String
    var notes: String
    var status: ProfileStatus

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case dobUTC = "dob_utc"
        case lat
        case lon
        case timezone
        case placeName = "place_name"
        case notes
        case status
    }

    var formattedDOB: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .long
        formatter.timeStyle = .short
        formatter.timeZone = TimeZone(identifier: timezone) ?? TimeZone.current
        return formatter.string(from: dobUTC)
    }

    var localBirthTime: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "dd MMM yyyy, HH:mm"
        formatter.timeZone = TimeZone(identifier: timezone) ?? TimeZone.current
        return formatter.string(from: dobUTC)
    }

    var shortDOB: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "dd/MM/yyyy"
        formatter.timeZone = TimeZone(identifier: timezone) ?? TimeZone.current
        return formatter.string(from: dobUTC)
    }
}

struct CreateProfileRequest: Codable {
    let name: String
    let dobUTC: Date
    let lat: Double
    let lon: Double
    let timezone: String
    let utcOffsetHours: Double
    let placeName: String
    let notes: String

    enum CodingKeys: String, CodingKey {
        case name
        case dobUTC = "dob_utc"
        case lat
        case lon
        case timezone
        case utcOffsetHours = "utc_offset_hours"
        case placeName = "place_name"
        case notes
    }
}

extension BirthProfile {
    static let preview = BirthProfile(
        id: "preview-001",
        name: "Adi Shankaracharya",
        dobUTC: ISO8601DateFormatter().date(from: "0788-05-01T00:00:00Z") ?? Date(),
        lat: 10.1632,
        lon: 76.5222,
        timezone: "Asia/Kolkata",
        placeName: "Kalady, Kerala, India",
        notes: "Vedic philosopher and theologian",
        status: .ready
    )
}
