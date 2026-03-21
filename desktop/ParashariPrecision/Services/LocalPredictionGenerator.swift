import Foundation

/// Local prediction generator that creates text predictions based on astrology data.
/// Uses template-based approach with rule engine for generating predictions.
final class LocalPredictionGenerator {

    // MARK: - Template Data

    private let signTraits: [Int: [String]] = [
        0: ["adventurous", "energetic", "courageous", "pioneering", "bold"],
        1: ["stable", "practical", "reliable", "patient", "determined"],
        2: ["versatile", "communicative", "intellectual", "curious", "adaptable"],
        3: ["emotional", "intuitive", "nurturing", "caring", "protective"],
        4: ["confident", "creative", "dramatic", "expressive", "generous"],
        5: ["analytical", "practical", " hardworking", "service-oriented", "humble"],
        6: ["balanced", "harmonious", "diplomatic", "fair", "peaceful"],
        7: ["intense", "passionate", "determination", "resourceful", "brave"],
        8: ["optimistic", "expansive", "philosophical", "adventurous", "wise"],
        9: ["disciplined", "responsible", "ambitious", "persistent", "practical"],
        10: ["original", "independent", "unconventional", "humanitarian", "progressive"],
        11: ["compassionate", "artistic", "spiritual", "idealistic", "sensitive"]
    ]

    private let planetTraits: [String: [String]] = [
        "Sun": ["vitality", "ego", "self-expression", "willpower", "leadership"],
        "Moon": ["emotions", "intuition", "nurturing", "subconscious", "creativity"],
        "Mars": ["energy", "action", "assertiveness", "passion", "drive"],
        "Mercury": ["communication", "intellect", "versatility", "reasoning", "logic"],
        "Jupiter": ["growth", "expansion", "wisdom", "optimism", "abundance"],
        "Venus": ["love", "harmony", "beauty", "pleasure", "relationships"],
        "Saturn": ["discipline", "responsibility", "patience", "hard work", "lessons"],
        "Rahu": ["ambition", "desire", "materialism", "worldliness", "detachment"],
        "Ketu": ["spirituality", "detachment", "inner work", "transformation", "liberation"]
    ]

    private let houseMeanings: [Int: String] = [
        1: "Self and Personality",
        2: "Wealth and Possessions",
        3: "Communication and Siblings",
        4: "Home and Family",
        5: "Creativity and Children",
        6: "Health and Service",
        7: "Partnerships and Marriage",
        8: "Transformation and Shared Resources",
        9: "Philosophy and Higher Education",
        10: "Career and Public Image",
        11: "Hopes, Wishes, and Friendships",
        12: "Spirituality and Hidden Matters"
    ]

    // MARK: - Public Methods

    /// Generates a prediction for the current Vimshottari Dasha/Antardasha period.
    func generateDashaPrediction(currentDasha: DashaPeriod, antardasha: DashaPeriod, chartData: ChartData) -> String {
        var prediction = ""

        // Dasha period introduction
        let dashaLord = currentDasha.lord
        let antardashaLord = antardasha.lord

        prediction += "**Current Dasha: \(dashaLord)**\n"
        prediction += "Period: \(currentDasha.startYear) - \(currentDasha.endYear)\n"
        prediction += "Balance at birth: \(String(format: "%.1f", currentDasha.balance)) years\n\n"

        prediction += "**Current Antardasha: \(antardashaLord)**\n"
        prediction += "Sub-period: \(antardasha.startYear)/\(antardasha.startMonth) - \(antardasha.endYear)/\(antardasha.endMonth)\n\n"

        // Generate dasha lord analysis
        if let planetPos = chartData.planets.first(where: { $0.planet == dashaLord }) {
            let signName = Sign(rawValue: planetPos.sign)?.name ?? "Unknown"
            let houseNum = findHouseForPlanet(planet: dashaLord, chartData: chartData)
            let houseName = houseMeanings[houseNum] ?? "Unknown"

            prediction += "The \(dashaLord) is placed in \(signName) "

            if planetPos.isRetrograde {
                prediction += "(Retrograde) "
            }

            prediction += "and influences the \(houseName).\n"

            // Get dignity analysis
            let dignity = analyzeDignity(planet: dashaLord, sign: planetPos.sign, chartData: chartData)
            prediction += dignity + "\n"
        }

        // Generate antardasha lord analysis
        if let antardashaPos = chartData.planets.first(where: { $0.planet == antardashaLord }) {
            let signName = Sign(rawValue: antardashaPos.sign)?.name ?? "Unknown"
            let houseNum = findHouseForPlanet(planet: antardashaLord, chartData: chartData)
            let houseName = houseMeanings[houseNum] ?? "Unknown"

            prediction += "\nDuring the \(antardashaLord) sub-period, "
            prediction += "the \(antardashaLord) in \(signName) "
            prediction += "affects the \(houseName).\n"

            let dignity = analyzeDignity(planet: antardashaLord, sign: antardashaPos.sign, chartData: chartData)
            prediction += dignity
        }

        // Generate timing prediction
        prediction += "\n**Timing:** "
        prediction += generateTimingPrediction(dashaLord: dashaLord, antardashaLord: antardashaLord, chartData: chartData)

        return prediction
    }

    /// Generates per-planet predictions based on chart data and shadbala.
    func generatePlanetPredictions(chartData: ChartData, shadbala: [ShadbalaResult]) -> [String: String] {
        var predictions: [String: String] = [:]

        for planet in Planet.allCases {
            let planetName = planet.name
            guard let planetPos = chartData.planets.first(where: { $0.planet == planetName }) else {
                continue
            }

            var prediction = ""

            // Sign placement
            let signName = Sign(rawValue: planetPos.sign)?.name ?? "Unknown"
            let signTraits = self.signTraits[planetPos.sign] ?? []
            // Deterministic trait selection using planet name hash
            let hash = stableHash(planetName)
            let trait = signTraits[hash % signTraits.count] ?? "unique"

            prediction += "In \(signName), you exhibit \(trait) qualities. "

            // House placement
            let houseNum = findHouseForPlanet(planet: planetName, chartData: chartData)
            let houseName = houseMeanings[houseNum] ?? "Unknown"
            prediction += "This placement influences \(houseName). "

            // Retrograde indication
            if planetPos.isRetrograde {
                prediction += "As a retrograde planet, \(planetName) directs its energy inward, "
                prediction += "prompting introspection and review of past matters. "
            }

            // Get shadbala for dignity analysis
            if let shadBala = shadbala.first(where: { $0.planet == planetName }) {
                if shadBala.isExalted {
                    prediction += "\n\nExalted \(planetName) indicates strong planetary energy "
                    prediction += "bringing blessings in its domain of influence."
                } else if shadBala.isDebilitated {
                    prediction += "\n\nDebilitated \(planetName) suggests challenges in its significations "
                    prediction += "that require conscious effort to overcome."
                } else {
                    let strengthPercent = Int((shadBala.strengthInVirupas / 600) * 100)
                    prediction += "\n\n\(planetName) operates at approximately \(strengthPercent)% strength, "
                    prediction += "indicating moderate influence in its significations."
                }
            }

            // Add aspects
            let aspects = calculateAspects(planet: planetName, chartData: chartData)
            if !aspects.isEmpty {
                prediction += "\n\nAspects: \(aspects.joined(separator: ", "))."
            }

            predictions[planetName] = prediction
        }

        return predictions
    }

    /// Generates a description of yoga impacts.
    func generateYogaImpact(yogas: [YogaResult]) -> String {
        guard !yogas.isEmpty else {
            return "No significant yoga formations detected in the chart."
        }

        var impact = "**Planetary Yoga Formations**\n\n"

        // Sort by strength
        let sortedYogas = yogas.sorted { $0.strength > $1.strength }

        for yoga in sortedYogas.prefix(10) {
            let strengthLabel: String
            if yoga.strength >= 0.75 {
                strengthLabel = "Strong"
            } else if yoga.strength >= 0.5 {
                strengthLabel = "Moderate"
            } else {
                strengthLabel = "Weak"
            }

            impact += "**\(yoga.name)** (\(yoga.category))\n"
            impact += "Strength: \(strengthLabel) (\(Int(yoga.strength * 100))%)\n"
            impact += "Planets involved: \(yoga.planets.joined(separator: ", "))\n"
            impact += "Houses affected: \(yoga.houses.map { houseMeanings[$0] ?? "House \($0)" }.joined(separator: ", "))\n"
            impact += "\(yoga.description)\n\n"
        }

        // Summary
        let strongYogas = sortedYogas.filter { $0.strength >= 0.75 }
        if !strongYogas.isEmpty {
            impact += "**Summary:** "
            impact += "Your chart shows \(strongYogas.count) strong yoga(s) "
            impact += "that provide significant blessings in life. "
        }

        let rajYogas = yogas.filter { $0.category == "Rajyoga" && $0.strength >= 0.5 }
        if !rajYogas.isEmpty {
            impact += "The presence of Rajayoga indicates potential for fame, success, and recognition. "
        }

        return impact
    }

    /// Generates an overall prediction combining all factors.
    func generateOverallPrediction(
        profile: Profile,
        chartData: ChartData,
        dashaData: [(DashaPeriod, DashaPeriod)],
        shadbala: [ShadbalaResult],
        yogas: [YogaResult]
    ) -> String {
        var prediction = ""

        // Introduction
        prediction += "**Personal Prediction for \(profile.name)**\n\n"
        prediction += "Based on your birth chart calculations, here is an overview of your astrological influences:\n\n"

        // Current dasha
        if let (currentDasha, antardasha) = dashaData.first {
            prediction += "## Current Dasha Period\n"
            prediction += "You are currently under the **\(currentDasha.lord) Mahadasha** "
            prediction += "(\(currentDasha.startYear) - \(currentDasha.endYear)) "
            prediction += "with the **\(antardasha.lord) Antardasha** active now.\n\n"
        }

        // Planet strengths overview
        prediction += "## Planetary Strengths\n"
        let strongPlanets = shadbala.filter { $0.isExalted }.map { $0.planet }
        if !strongPlanets.isEmpty {
            prediction += "Strong (Exalted): \(strongPlanets.joined(separator: ", "))\n"
        }

        let weakPlanets = shadbala.filter { $0.isDebilitated }.map { $0.planet }
        if !weakPlanets.isEmpty {
            prediction += "Needs attention: \(weakPlanets.joined(separator: ", "))\n"
        }
        prediction += "\n"

        // Key yogas
        if !yogas.isEmpty {
            prediction += "## Key Yogas\n"
            let topYogas = yogas.sorted { $0.strength > $1.strength }.prefix(3)
            for yoga in topYogas {
                prediction += "- **\(yoga.name)**: \(yoga.description)\n"
            }
            prediction += "\n"
        }

        // Ascendant analysis
        let ascendant = Int(chartData.ascendant / 30) % 12
        let ascendantSign = Sign(rawValue: ascendant)?.name ?? "Unknown"
        prediction += "## Ascendant Analysis\n"
        prediction += "Your ascendant is in **\(ascendantSign)**, "
        // Deterministic trait selection using profile name hash
        let ascendantHash = stableHash(profile.name)
        if let traits = signTraits[ascendant] {
            let selectedTrait = traits[ascendantHash % traits.count]
            prediction += "giving you \(selectedTrait) qualities.\n\n"
        } else {
            prediction += "giving you distinct qualities.\n\n"
        }

        // Life areas
        prediction += "## Key Life Areas\n"

        // Find planets in angular houses (1, 4, 7, 10)
        let angularHouses = [1, 4, 7, 10]
        for houseNum in angularHouses {
            if let house = chartData.houses.first(where: { $0.number == houseNum }) {
                let planetsInHouse = chartData.planets.filter { findHouseForPlanet(planet: $0.planet, chartData: chartData) == houseNum }
                if !planetsInHouse.isEmpty {
                    let planetNames = planetsInHouse.map { $0.planet }.joined(separator: ", ")
                    prediction += "- **\(houseMeanings[houseNum] ?? "House \(houseNum)")**: Influenced by \(planetNames)\n"
                }
            }
        }

        // Conclusion
        prediction += "\n## Guidance\n"
        prediction += "This prediction is based on the current planetary positions and dasha periods. "
        prediction += "For detailed timing of specific events, consult with a qualified astrologer. "
        prediction += "Remember that free will and conscious action can modify planetary influences."

        return prediction
    }

    // MARK: - Private Helper Methods

    private func findHouseForPlanet(planet: String, chartData: ChartData) -> Int {
        // Simplified house finding based on sign placement
        // In a real implementation, this would use cusps and actual house positions
        guard let planetPos = chartData.planets.first(where: { $0.planet == planet }) else {
            return 1
        }

        let planetSign = planetPos.sign

        // Find which house contains this sign
        for house in chartData.houses {
            if house.sign == Sign(rawValue: planetSign) {
                return house.number
            }
        }

        return 1
    }

    private func analyzeDignity(planet: String, sign: Int, chartData: ChartData) -> String {
        // Exalted signs for each planet
        let exaltedSigns: [String: Int] = [
            "Sun": 0,    // Aries
            "Moon": 1,   // Taurus
            "Mars": 9,   // Capricorn
            "Mercury": 5, // Virgo
            "Jupiter": 3, // Cancer
            "Venus": 11,  // Pisces
            "Saturn": 6,  // Libra
            "Rahu": 2,   // Taurus (varies)
            "Ketu": 7    // Scorpio (varies)
        ]

        // Debilitated signs (opposite to exalted)
        let debilitatedSigns: [String: Int] = [
            "Sun": 6,    // Libra
            "Moon": 7,   // Scorpio
            "Mars": 3,   // Cancer
            "Mercury": 11, // Pisces
            "Jupiter": 9,  // Capricorn
            "Venus": 5,     // Virgo
            "Saturn": 0,    // Aries
            "Rahu": 7,      // Scorpio
            "Ketu": 2       // Taurus
        ]

        if let exalted = exaltedSigns[planet], exalted == sign {
            return "This is an exalted placement, bringing strength and positivity to \(planet)'s significations."
        }

        if let debilitated = debilitatedSigns[planet], debilitated == sign {
            return "This is a debilitated placement, suggesting challenges that need to be overcome."
        }

        // Check for own sign (Moolatrikona)
        let ownSigns: [String: [Int]] = [
            "Sun": [4],      // Leo
            "Moon": [3],     // Cancer
            "Mars": [0, 7],  // Aries, Scorpio
            "Mercury": [2, 5], // Gemini, Virgo
            "Jupiter": [8, 11], // Sagittarius, Pisces
            "Venus": [1, 6], // Taurus, Libra
            "Saturn": [9, 10], // Capricorn, Aquarius
            "Rahu": [2, 10], // Taurus, Aquarius
            "Ketu": [7, 11]  // Scorpio, Pisces
        ]

        if let own = ownSigns[planet], own.contains(sign) {
            return "This is a favorable own-sign placement, strengthening \(planet)'s influence."
        }

        return "This placement has a neutral influence on \(planet)'s significations."
    }

    private func generateTimingPrediction(dashaLord: String, antardashaLord: String, chartData: ChartData) -> String {
        var timing = ""

        // Favorable timing based on planet relationships
        let favorablePlanets = ["Jupiter", "Venus", "Mercury", "Moon"]
        let challengingPlanets = ["Saturn", "Mars", "Rahu", "Ketu"]

        if favorablePlanets.contains(dashaLord) {
            timing += "This is a favorable dasha period for growth and new beginnings. "
        } else if challengingPlanets.contains(dashaLord) {
            timing += "This period may bring challenges that require patience and perseverance. "
        } else {
            timing += "This dasha period emphasizes learning and practical matters. "
        }

        if favorablePlanets.contains(antardashaLord) {
            timing += "The sub-period favors relationships and creative pursuits."
        } else if challengingPlanets.contains(antardashaLord) {
            timing += "The sub-period calls for careful handling of resources and emotions."
        } else {
            timing += "The sub-period is neutral, focus on steady progress."
        }

        return timing
    }

    private func calculateAspects(planet: String, chartData: ChartData) -> [String] {
        guard let planetPos = chartData.planets.first(where: { $0.planet == planet }) else {
            return []
        }

        var aspects: [String] = []

        // Calculate aspects (simplified - actual aspects vary by tradition)
        // Planets aspect certain signs/houses
        let aspectMap: [String: [Int]] = [
            "Sun": [7],       // 7th sign
            "Moon": [7],      // 7th sign
            "Mars": [4, 7, 8], // 4th, 7th, 8th
            "Mercury": [7],   // 7th
            "Jupiter": [5, 7, 9], // 5th, 7th, 9th
            "Venus": [4, 7, 8],  // 4th, 7th, 8th
            "Saturn": [3, 7, 10], // 3rd, 7th, 10th
            "Rahu": [5, 7, 9],
            "Ketu": [1, 5, 7, 9, 12]
        ]

        let planetSign = planetPos.sign
        guard let aspectSigns = aspectMap[planet] else {
            return []
        }

        for aspectSign in aspectSigns {
            let targetSign = (planetSign + aspectSign) % 12

            // Find planets in aspected sign
            let planetsInTargetSign = chartData.planets.filter { $0.sign == targetSign }
            for targetPlanet in planetsInTargetSign {
                aspects.append("\(planet) aspects \(targetPlanet.planet)")
            }
        }

        return aspects
    }

    // MARK: - Hora & Trend Engine

    /// Chaldean planetary hour sequence
    private let chaldeanOrder = ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"]

    /// Day lord by weekday (0 = Sunday)
    private let weekdayLords = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]

    /// Planet affinity for each life area (0.0–1.0)
    private let planetAffinity: [String: [String: Double]] = [
        "Sun":     ["career": 0.85, "finance": 0.55, "health": 0.70, "relationships": 0.40, "spirituality": 0.55],
        "Moon":    ["career": 0.50, "finance": 0.62, "health": 0.72, "relationships": 0.90, "spirituality": 0.70],
        "Mars":    ["career": 0.80, "finance": 0.50, "health": 0.55, "relationships": 0.40, "spirituality": 0.30],
        "Mercury": ["career": 0.82, "finance": 0.75, "health": 0.55, "relationships": 0.55, "spirituality": 0.40],
        "Jupiter": ["career": 0.80, "finance": 0.85, "health": 0.65, "relationships": 0.80, "spirituality": 0.90],
        "Venus":   ["career": 0.45, "finance": 0.80, "health": 0.70, "relationships": 0.95, "spirituality": 0.60],
        "Saturn":  ["career": 0.65, "finance": 0.55, "health": 0.42, "relationships": 0.35, "spirituality": 0.70],
        "Rahu":    ["career": 0.60, "finance": 0.60, "health": 0.32, "relationships": 0.45, "spirituality": 0.35],
        "Ketu":    ["career": 0.30, "finance": 0.30, "health": 0.50, "relationships": 0.30, "spirituality": 0.90],
    ]

    /// Stable string hash (does not use Swift's randomised hashValue)
    private func stableHash(_ s: String) -> Int {
        s.unicodeScalars.reduce(0) { ($0 &* 31) &+ Int($1.value) }
    }

    /// Planetary hora lord for a given date and civil hour (0–23)
    private func horaLord(date: Date, hour: Int) -> String {
        let weekday = Calendar.current.component(.weekday, from: date) - 1  // 0 = Sunday
        let dayLord = weekdayLords[weekday]
        let startIdx = chaldeanOrder.firstIndex(of: dayLord) ?? 0
        return chaldeanOrder[(startIdx + hour) % 7]
    }

    /// Day lord for a date
    private func dayLord(date: Date) -> String {
        let weekday = Calendar.current.component(.weekday, from: date) - 1
        return weekdayLords[weekday]
    }

    /// Compute trend scores for a hora lord + dasha context with a deterministic seed
    private func trendScores(
        horaLord: String,
        dashaLord: String,
        antardashaLord: String,
        seed: Int
    ) -> (career: Double, finance: Double, health: Double, relationships: Double, spirituality: Double) {
        let cats: [(String, KeyPath<(career: Double, finance: Double, health: Double, relationships: Double, spirituality: Double), Double>)] = []
        _ = cats  // silence unused
        func score(_ cat: String, offset: Int) -> Double {
            let hora  = planetAffinity[horaLord]?[cat] ?? 0.5
            let dasha = planetAffinity[dashaLord]?[cat] ?? 0.5
            let antar = planetAffinity[antardashaLord]?[cat] ?? 0.5
            let base  = hora * 0.50 + dasha * 0.30 + antar * 0.20
            // deterministic micro-variation (±7%)
            let h = abs((seed &+ stableHash(cat) &* 397) % 200)
            let variation = Double(h) / 200.0 * 0.14 - 0.07
            return min(0.97, max(0.08, base + variation))
        }
        return (
            career:        score("career",        offset: 1),
            finance:       score("finance",       offset: 2),
            health:        score("health",        offset: 3),
            relationships: score("relationships", offset: 4),
            spirituality:  score("spirituality",  offset: 5)
        )
    }

    /// One-line plain-language summary for a day
    private func daySummary(dayLord: String, dashaLord: String, antardashaLord: String, overall: Double) -> String {
        let quality = overall >= 0.70 ? "favourable" : overall >= 0.50 ? "moderate" : "challenging"
        return "\(dayLord)-ruled day brings a \(quality) influence under the \(dashaLord)–\(antardashaLord) dasha period. Focus where scores are highest."
    }

    // MARK: - Day Prediction

    func generateDayPrediction(
        date: Date,
        dashaLord: String,
        antardashaLord: String
    ) -> DayPrediction {
        let dl = dayLord(date: date)
        let calendar = Calendar.current
        let dayOfYear = calendar.ordinality(of: .day, in: .year, for: date) ?? 1
        let yearVal   = calendar.component(.year, from: date)

        var hours: [HourPrediction] = []
        for h in 0..<24 {
            let hora = horaLord(date: date, hour: h)
            let seed = abs(yearVal &* 1009 &+ dayOfYear &* 397 &+ h &* 31)
            let s = trendScores(horaLord: hora, dashaLord: dashaLord, antardashaLord: antardashaLord, seed: seed)
            hours.append(HourPrediction(
                hour: h,
                horaLord: hora,
                career: s.career,
                finance: s.finance,
                health: s.health,
                relationships: s.relationships,
                spirituality: s.spirituality
            ))
        }

        let overall = hours.map(\.overallScore).reduce(0, +) / Double(hours.count)
        let summary = daySummary(dayLord: dl, dashaLord: dashaLord, antardashaLord: antardashaLord, overall: overall)

        return DayPrediction(
            date: date,
            dayLord: dl,
            dashaLord: dashaLord,
            antardashaLord: antardashaLord,
            hours: hours,
            summary: summary
        )
    }

    // MARK: - Month Prediction

    func generateMonthPrediction(
        year: Int,
        month: Int,
        dashaLord: String,
        antardashaLord: String
    ) -> MonthPrediction {
        var comps = DateComponents()
        comps.year = year; comps.month = month; comps.day = 1
        let calendar = Calendar.current
        guard let firstDay = calendar.date(from: comps),
              let range   = calendar.range(of: .day, in: .month, for: firstDay) else {
            return MonthPrediction(year: year, month: month, dashaLord: dashaLord,
                                   antardashaLord: antardashaLord, days: [], summary: "")
        }

        var days: [DailyTrend] = []
        for day in range {
            comps.day = day
            guard let date = calendar.date(from: comps) else { continue }
            let dl   = dayLord(date: date)
            let seed = abs(year &* 1009 &+ month &* 31 &+ day &* 7)
            let s    = trendScores(horaLord: dl, dashaLord: dashaLord, antardashaLord: antardashaLord, seed: seed)
            days.append(DailyTrend(
                date: date,
                dayOfMonth: day,
                dayLord: dl,
                career: s.career,
                finance: s.finance,
                health: s.health,
                relationships: s.relationships,
                spirituality: s.spirituality
            ))
        }

        let overall = days.map(\.overallScore).reduce(0, +) / max(1, Double(days.count))
        let quality = overall >= 0.70 ? "generally auspicious" : overall >= 0.50 ? "mixed" : "requiring caution"
        let df = DateFormatter(); df.dateFormat = "MMMM yyyy"
        let title = df.string(from: firstDay)
        let summary = "\(title) is \(quality) under the \(dashaLord)–\(antardashaLord) dasha period. Best days highlighted in green; proceed with care on red-coded days."

        return MonthPrediction(
            year: year, month: month,
            dashaLord: dashaLord, antardashaLord: antardashaLord,
            days: days, summary: summary
        )
    }
}
