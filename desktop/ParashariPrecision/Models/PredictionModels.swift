import Foundation

struct HourPrediction: Identifiable {
    let id = UUID()
    let hour: Int           // 0–23 civil time
    let horaLord: String    // planetary hora ruler
    let career: Double      // 0.0–1.0
    let finance: Double
    let health: Double
    let relationships: Double
    let spirituality: Double

    var overallScore: Double {
        (career + finance + health + relationships + spirituality) / 5.0
    }

    var formattedHour: String {
        let h = hour % 12 == 0 ? 12 : hour % 12
        return "\(h):00 \(hour < 12 ? "AM" : "PM")"
    }

    var hourRange: String {
        let next = (hour + 1) % 24
        let h1 = hour % 12 == 0 ? 12 : hour % 12
        let h2 = next % 12 == 0 ? 12 : next % 12
        return "\(h1)\(hour < 12 ? "am" : "pm")–\(h2)\(next < 12 ? "am" : "pm")"
    }
}

struct DayPrediction: Identifiable {
    let id = UUID()
    let date: Date
    let dayLord: String
    let dashaLord: String
    let antardashaLord: String
    let hours: [HourPrediction]
    let summary: String

    var bestHour: HourPrediction? { hours.max(by: { $0.overallScore < $1.overallScore }) }
    var challengingHour: HourPrediction? { hours.min(by: { $0.overallScore < $1.overallScore }) }
}

struct DailyTrend: Identifiable {
    let id = UUID()
    let date: Date
    let dayOfMonth: Int
    let dayLord: String
    let career: Double
    let finance: Double
    let health: Double
    let relationships: Double
    let spirituality: Double

    var overallScore: Double {
        (career + finance + health + relationships + spirituality) / 5.0
    }

    var label: String { String(format: "%d", dayOfMonth) }
}

struct MonthPrediction: Identifiable {
    let id = UUID()
    let year: Int
    let month: Int
    let dashaLord: String
    let antardashaLord: String
    let days: [DailyTrend]
    let summary: String

    var monthName: String {
        let df = DateFormatter()
        df.dateFormat = "MMMM yyyy"
        var comps = DateComponents()
        comps.year = year; comps.month = month; comps.day = 1
        let d = Calendar.current.date(from: comps) ?? Date()
        return df.string(from: d)
    }
}
