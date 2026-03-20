import Foundation

// MARK: - Julian Date Calculator
//
// Pure Swift implementation for converting civil date/time to Julian Day Number.
// Based on the standard astronomical algorithm used by Swiss Ephemeris.

public struct JulianDate {

    /// Calculate Julian Day Number from civil date/time
    ///
    /// - Parameters:
    ///   - year: Gregorian year (e.g., 2000)
    ///   - month: Month (1-12)
    ///   - day: Day (1-31)
    ///   - hour: Hour (0-23)
    ///   - minute: Minute (0-59)
    ///   - second: Second (0-59)
    ///   - utcOffset: UTC offset in hours (e.g., +5.5 for IST)
    /// - Returns: Julian Day Number (fractional)
    public static func getJulianDay(
        year: Int,
        month: Int,
        day: Int,
        hour: Int,
        minute: Int,
        second: Int,
        utcOffset: Double
    ) -> Double {
        // Convert local time to UT
        let localDecimalHour = Double(hour) + Double(minute) / 60.0 + Double(second) / 3600.0
        var utDecimalHour = localDecimalHour - utcOffset

        // Handle hour rollover
        var utHour = utDecimalHour
        var utDay = day
        var utMonth = month
        var utYear = year

        while utHour < 0 {
            utHour += 24
            utDay -= 1
        }
        while utHour >= 24 {
            utHour -= 24
            utDay += 1
        }

        // Days in each month (non-leap year)
        let daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

        func isLeap(_ y: Int) -> Bool {
            (y % 4 == 0 && y % 100 != 0) || y % 400 == 0
        }

        // Handle day underflow
        while utDay < 1 {
            utMonth -= 1
            if utMonth < 1 {
                utMonth = 12
                utYear -= 1
            }
            let dim = (utMonth == 2 && isLeap(utYear)) ? 29 : daysInMonth[utMonth]
            utDay += dim
        }

        // Handle day overflow
        let curMonthDays = (utMonth == 2 && isLeap(utYear)) ? 29 : daysInMonth[utMonth]
        while utDay > curMonthDays {
            utDay -= curMonthDays
            utMonth += 1
            if utMonth > 12 {
                utMonth = 1
                utYear += 1
            }
        }

        // Calculate Julian Day using the standard algorithm
        // This is equivalent to swe_julday with SE_GREG_CAL flag
        return calculateJulianDay(
            year: utYear,
            month: utMonth,
            day: utDay,
            hour: utHour
        )
    }

    /// Standard Julian Day calculation (Gregorian calendar)
    private static func calculateJulianDay(year: Int, month: Int, day: Int, hour: Double) -> Double {
        var y = year
        var m = month

        if m <= 2 {
            y -= 1
            m += 12
        }

        let a = y / 100
        let b = 2 - a + a / 4

        let jd = Double(Int(365.25 * Double(y + 4716)))
            + Double(Int(30.6001 * Double(m + 1)))
            + Double(day)
            + Double(b)
            - 1524.5
            + hour / 24.0

        return jd
    }

    /// Convenience method from Date and timezone
    public static func getJulianDay(date: Date, utcOffset: Double) -> Double {
        let calendar = Calendar(identifier: .gregorian)
        let components = calendar.dateComponents(in: TimeZone(identifier: "UTC")!, from: date)

        return getJulianDay(
            year: components.year ?? 2000,
            month: components.month ?? 1,
            day: components.day ?? 1,
            hour: components.hour ?? 0,
            minute: components.minute ?? 0,
            second: components.second ?? 0,
            utcOffset: utcOffset
        )
    }

    /// Convenience method from BirthProfile
    public static func getJulianDay(for profile: BirthProfile) -> Double {
        let calendar = Calendar(identifier: .gregorian)
        let components = calendar.dateComponents(in: TimeZone(identifier: "UTC")!, from: profile.dobUTC)

        // Parse timezone offset
        let tzOffset = parseTimezoneOffset(profile.timezone)

        return getJulianDay(
            year: components.year ?? 2000,
            month: components.month ?? 1,
            day: components.day ?? 1,
            hour: components.hour ?? 0,
            minute: components.minute ?? 0,
            second: components.second ?? 0,
            utcOffset: tzOffset
        )
    }

    /// Parse timezone string to offset hours
    private static func parseTimezoneOffset(_ timezone: String) -> Double {
        // Handle common timezone formats
        if timezone == "UTC" || timezone == "GMT" {
            return 0
        }

        // Try to parse numeric offset like "+5:30" or "-8"
        let pattern = #"([+-]?)(\d{1,2}):?(\d{2})?"#
        if let regex = try? NSRegularExpression(pattern: pattern),
           let match = regex.firstMatch(in: timezone, range: NSRange(timezone.startIndex..., in: timezone)) {

            let signRange = Range(match.range(at: 1), in: timezone)
            let hoursRange = Range(match.range(at: 2), in: timezone)

            let sign = signRange.map { String(timezone[$0]) } ?? "+"
            let hours = hoursRange.map { Double(String(timezone[$0])) ?? 0 } ?? 0

            var minutes: Double = 0
            if match.range(at: 3).location != NSNotFound,
               let minsRange = Range(match.range(at: 3), in: timezone) {
                minutes = Double(String(timezone[minsRange])) ?? 0
            }

            let total = hours + minutes / 60.0
            return sign == "-" ? -total : total
        }

        // Default to UTC if parsing fails
        return 0
    }
}
