import Foundation

// ============================================================
// Local Prediction Generator — Parashari Precision
// ============================================================
// Generates hourly and monthly predictions locally without API server.
// Uses cached chart data, dasha periods, and moon transit calculations.
// ============================================================

class LocalPredictionGenerator {
    static let shared = LocalPredictionGenerator()

    // MARK: - Planet Nature (benefic/malefic)

    private let beneficPlanets: Set<Int> = [1, 4, 5]   // moon, jupiter, venus
    private let maleficPlanets: Set<Int> = [0, 2, 6]   // sun, mars, saturn

    // MARK: - Sign Element mapping (fire=0, earth=1, air=2, water=3)

    private func signElement(_ sign: Int) -> Int {
        switch sign % 4 {
        case 0: return 0  // fire (aries, leo, sagittarius)
        case 1: return 1  // earth (taurus, virgo, capricorn)
        case 2: return 2  // air (gemini, libra, aquarius)
        case 3: return 3  // water (cancer, scorpio, pisces)
        default: return 0
        }
    }

    private func signLord(_ sign: Int) -> Int {
        let lords = [2, 5, 3, 1, 0, 3, 5, 2, 4, 6, 6, 4] // mars, venus, mercury, moon, sun, mercury, venus, mars, jupiter, saturn, saturn, jupiter
        return lords[sign % 12]
    }

    private func signName(_ sign: Int) -> String {
        let names = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
        return sign < 12 ? names[sign] : "Unknown"
    }

    private func nakshatraName(_ nakshatra: Int) -> String {
        let names = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha",
                     "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula",
                     "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"]
        return nakshatra >= 0 && nakshatra < 27 ? names[nakshatra] : "Unknown"
    }

    private func planetName(_ planet: Int) -> String {
        let names = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]
        return planet < 9 ? names[planet] : "Unknown"
    }

    private func houseArea(_ house: Int) -> String {
        let areas = ["self and personality", "wealth and family", "siblings and communication", "home and mother",
                     "children and creativity", "health and service", "marriage and partnership", "shared resources and transformation",
                     "wisdom and fortune", "career and status", "friendships and aspirations", "spiritual liberation"]
        return house >= 1 && house <= 12 ? areas[house - 1] : "various areas"
    }

    // MARK: - Moon Position Calculation

    /// Approximate moon sign at a given date based on birth chart moon position and time progression.
    /// Moon moves approximately 13.18 degrees per day through the zodiac.
    private func approximateMoonSign(chartMoonSign: Int, birthDate: Date, targetDate: Date) -> (sign: Int, nakshatra: Int, degree: Double) {
        let daysDiff = targetDate.timeIntervalSince(birthDate) / 86400.0
        let moonMotionPerDay = 13.18  // average degrees per day
        let totalMoonMotion = daysDiff * moonMotionPerDay
        let currentMoonLongitude = Double(chartMoonSign * 30) + totalMoonMotion.truncatingRemainder(dividingBy: 360)
        let normalizedLongitude = currentMoonLongitude.truncatingRemainder(dividingBy: 360)
        let sign = Int(normalizedLongitude / 30) % 12
        let degreeInSign = normalizedLongitude.truncatingRemainder(dividingBy: 30)
        let nakshatra = Int(normalizedLongitude / 13.333) % 27  // 27 nakshatras, each ~13.33 degrees
        return (sign, nakshatra, degreeInSign)
    }

    // MARK: - Score Calculation

    private func calculateHourlyScore(moonSign: Int, dashaPlanet: Int?, shadbala: Double) -> Int {
        var score = 50  // base score

        // Moon sign influence
        if beneficPlanets.contains(moonSign % 12) || [3, 4, 5].contains(moonSign % 12) {
            score += 15
        } else if maleficPlanets.contains(moonSign % 12) {
            score -= 10
        }

        // Exalted/own sign bonus
        let moonExaltations: Set<Int> = [1, 0, 3, 2, 10, 11]  // taurus, aries, cancer, gemini, libra, pisces
        if moonExaltations.contains(moonSign % 12) {
            score += 10
        }

        // Dasha planet influence
        if let dasha = dashaPlanet {
            if beneficPlanets.contains(dasha) {
                score += 15
            } else if maleficPlanets.contains(dasha) {
                score -= 10
            }
        }

        // Shadbala contribution (normalized to +/- 10)
        score += Int(shadbala / 10)

        // Clamp to 0-100
        return max(0, min(100, score))
    }

    // MARK: - Prediction Text Generation

    private func generatePredictionText(moonSign: Int, moonNakshatra: Int, dashaPlanet: Int?, score: Int) -> String {
        let sign = signName(moonSign)
        let nakshatra = nakshatraName(moonNakshatra)

        var elements: [String] = []
        let elem = signElement(moonSign)
        switch elem {
        case 0: elements = ["passionate", "energetic", "bold"]
        case 1: elements = ["practical", "stable", "grounded"]
        case 2: elements = ["intellectual", "social", "communicative"]
        case 3: elements = ["emotional", "intuitive", "transformative"]
        default: elements = ["balanced"]
        }

        var text = "The Moon transits through \(nakshatra) nakshatra in \(sign), bringing a \(elements.randomElement()!) energy."

        if let dasha = dashaPlanet {
            let planet = planetName(dasha)
            if beneficPlanets.contains(dasha) {
                text += " Your dasha period emphasizes \(planet)'s beneficial influence on relationships and emotional well-being."
            } else if maleficPlanets.contains(dasha) {
                text += " The \(planet) dasha period calls for discipline and focused effort."
            } else {
                text += " Mercury's influence this period favors communication and intellectual pursuits."
            }
        }

        if score >= 70 {
            text += " This is a favorable period for new ventures and creative pursuits."
        } else if score < 40 {
            text += " Exercise patience and avoid important decisions during this challenging period."
        } else {
            text += " A balanced period for routine activities and gradual progress."
        }

        return text
    }

    // MARK: - Generate Hourly Predictions

    func generateHourlyPredictions(for profile: BirthProfile, chart: ChartData, date: Date) -> [HourlyPrediction] {
        let calendar = Calendar.current
        var predictions: [HourlyPrediction] = []

        // Find moon position in birth chart
        let chartMoon = chart.planets.first { $0.planet.lowercased() == "moon" }
        let chartMoonSign = chartMoon?.sign ?? 3  // default to cancer if not found
        let chartMoonNakshatra = Int(chartMoon?.nakshatra ?? "3") ?? 3

        // Find active dasha planet from chart if available (using highest speed planet as proxy for current period)
        let fastestPlanet = chart.planets.max { abs($0.speed) < abs($1.speed) }
        let activePlanetId = fastestPlanet.flatMap { Planet(rawValue: Planet.allCases.first { $0.name.lowercased() == $0.planet.lowercased() }?.rawValue ?? 0) }.map { $0.rawValue } ?? 4

        // Get birth date
        let birthDate = profile.dobUTC

        for hour in 0..<24 {
            var components = calendar.dateComponents([.year, .month, .day], from: date)
            components.hour = hour
            components.minute = 0
            components.second = 0
            components.timeZone = TimeZone(identifier: profile.timezone) ?? TimeZone.current

            guard let hourDate = calendar.date(from: components) ?? calendar.date(bySettingHour: hour, minute: 0, second: 0, of: date) else { continue }

            // Calculate moon position for this hour
            let moonPos = approximateMoonSign(chartMoonSign: chartMoonSign, birthDate: birthDate, targetDate: hourDate)
            let transitLagna = chart.ascendantSign + Int(Double(hour) * 2.0)  // lagna moves ~2 degrees per hour
            let transitLagnaSign = transitLagna % 12

            // Score for this hour
            let score = calculateHourlyScore(moonSign: moonPos.sign, dashaPlanet: activePlanetId, shadbala: 50)

            // Generate prediction text
            let predictionText = generatePredictionText(moonSign: moonPos.sign, moonNakshatra: moonPos.nakshatra, dashaPlanet: activePlanetId, score: score)

            // Date strings
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            let dateStr = dateFormatter.string(from: hourDate)

            // Dasha start/end (approximate for this hour)
            let dashaStart = dateFormatter.string(from: hourDate)
            dateFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
            let dashaEndStr = dateFormatter.string(from: calendar.date(byAdding: .hour, value: 1, to: hourDate) ?? hourDate)

            let prediction = HourlyPrediction(
                id: "\(profile.id)-\(dateStr)-\(String(format: "%02d", hour))",
                profileId: profile.id,
                date: dateStr,
                hour: hour,
                timezone: profile.timezone,
                sookshmaDashaPlanet: activePlanetId + 1 < 9 ? activePlanetId + 1 : 0,
                sookshmaDashaStart: dashaStart,
                sookshmaDashaEnd: dashaEndStr,
                pranaDashaPlanet: activePlanetId,
                pranaDashaStart: dashaStart,
                pranaDashaEnd: dashaEndStr,
                moonNakshatra: moonPos.nakshatra,
                moonSign: moonPos.sign,
                moonDegree: moonPos.degree,
                transitLagna: Double(transitLagna),
                transitLagnaSign: transitLagnaSign,
                hourlyScore: score,
                predictionText: predictionText
            )
            predictions.append(prediction)
        }

        return predictions
    }

    // MARK: - Generate Monthly Predictions

    func generateMonthlyPredictions(for profile: BirthProfile, chart: ChartData, year: Int, month: Int) -> MonthlyPrediction {
        let calendar = Calendar.current
        var dailyPredictions: [DailyPrediction] = []

        // Find moon position
        let chartMoon = chart.planets.first { $0.planet.lowercased() == "moon" }
        let chartMoonSign = chartMoon?.sign ?? 3
        let birthDate = profile.dobUTC

        // Get number of days in month
        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = 1
        guard let firstOfMonth = calendar.date(from: components) else { return MonthlyPrediction(year: year, month: month, profileId: profile.id, dailyPredictions: []) }
        let daysInMonth = calendar.range(of: .day, in .month, for: firstOfMonth)?.count ?? 30

        for day in 1...daysInMonth {
            var dayComponents = DateComponents()
            dayComponents.year = year
            dayComponents.month = month
            dayComponents.day = day
            guard let dayDate = calendar.date(from: dayComponents) else { continue }

            // Calculate average moon position for this day
            let moonPos = approximateMoonSign(chartMoonSign: chartMoonSign, birthDate: birthDate, targetDate: dayDate)

            // Daily score based on moon sign
            var dailyScore = 50
            if beneficPlanets.contains(moonPos.sign % 12) {
                dailyScore += 15
            } else if maleficPlanets.contains(moonPos.sign % 12) {
                dailyScore -= 10
            }

            // Moon sign categories
            var categories: [String] = []
            switch moonPos.sign % 12 {
            case 0, 4, 8: categories = ["career", "creativity"]  // fire signs
            case 1, 5, 9: categories = ["finance", "health"]     // earth signs
            case 2, 6, 10: categories = ["communication", "relationships"]  // air signs
            case 3, 7, 11: categories = ["emotions", "home"]       // water signs
            default: categories = ["general"]
            }

            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            let dateStr = dateFormatter.string(from: dayDate)

            let daily = DailyPrediction(
                date: dateStr,
                score: max(0, min(100, dailyScore)),
                categories: categories,
                hourlyCount: 24
            )
            dailyPredictions.append(daily)
        }

        return MonthlyPrediction(
            year: year,
            month: month,
            profileId: profile.id,
            dailyPredictions: dailyPredictions
        )
    }
}

// MARK: - MonthlyPrediction Extension for memberwise init

extension MonthlyPrediction {
    init(year: Int, month: Int, profileId: String, dailyPredictions: [DailyPrediction]) {
        self.year = year
        self.month = month
        self.profileId = profileId
        self.dailyPredictions = dailyPredictions
    }
}
