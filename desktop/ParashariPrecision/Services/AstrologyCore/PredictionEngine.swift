// ============================================================
// Prediction Engine — Plain English Astrological Predictions
// ============================================================
// Generates predictions based on Vimshottari Dasha, chart data,
// yogas, shadbala, transits, and ashtakavarga.
// ============================================================

import Foundation

// ------------------------------------
// Planet Significations (Natural)
// ------------------------------------

let PLANET_SIGNIFICATIONS: [Planet: (keywords: [String], nature: String, domains: [String])] = [
    .sun: (keywords: ["soul", "vitality", "authority", "father", "government", "power", "self", "creativity", "bones", "heart", "eyes"], nature: "Malefic but considered auspicious for Leo/Aries", domains: ["career", "status", "government", "father", "health"]),
    .moon: (keywords: ["mind", "emotions", "mother", "home", "travel", "fluids", "imagination", "happiness", "stomach", "breasts"], nature: "Benefic, changes quickly", domains: ["emotions", "home", "mother", "travel", "mind"]),
    .mars: (keywords: ["energy", "courage", "brother", "property", "conflict", "surgery", "blood", "muscles", "fire", "sports"], nature: "Malefic, aggressive", domains: ["energy", "property", "siblings", "conflict", "sports"]),
    .mercury: (keywords: ["intellect", "communication", "business", "friends", "skills", "speech", "nervous system", "hands"], nature: "Neutral, changes based on association", domains: ["communication", "business", "intellect", "skills"]),
    .jupiter: (keywords: ["wisdom", "wealth", "children", "teachers", "knowledge", "luck", "religion", "philosophy", "fat", "liver"], nature: "Great benefic", domains: ["wealth", "children", "wisdom", "religion", "travel"]),
    .venus: (keywords: ["love", "beauty", "marriage", "pleasure", "arts", "vehicle", "kidneys", "reproduction", "romance"], nature: "Benefic", domains: ["love", "marriage", "arts", "wealth", "pleasure"]),
    .saturn: (keywords: ["discipline", "delay", "poverty", "death", "misery", "hard work", "bones", "skin", "teeth", "old age"], nature: "Malefic, slowest", domains: ["discipline", "career", "death", "old age", "misery"]),
    .rahu: (keywords: ["obsession", "materialism", "foreign", "sudden", "electronics", "snakes", "poison", "infections"], nature: "Shadow planet, materialistic", domains: ["material success", "foreign", "obsessions", "electronics"]),
    .ketu: (keywords: ["spirituality", "liberation", "detachment", "moksha", "past lives", "burns", "accidents", "secret"], nature: "Shadow planet, spiritual", domains: ["spirituality", "liberation", "past lives", "accidents"]),
]

// ------------------------------------
// Sign Qualities
// ------------------------------------

let SIGN_QUALITIES: [Sign: (element: String, quality: String, deity: String)] = [
    .aries: (element: "Fire", quality: "Cardinal", deity: "Agni"),
    .taurus: (element: "Earth", quality: "Fixed", deity: "Indra"),
    .gemini: (element: "Air", quality: "Mutable", deity: "Vishnu"),
    .cancer: (element: "Water", quality: "Cardinal", deity: "Varuna"),
    .leo: (element: "Fire", quality: "Fixed", deity: "Rudra"),
    .virgo: (element: "Earth", quality: "Mutable", deity: "Brahma"),
    .libra: (element: "Air", quality: "Cardinal", deity: "Indra"),
    .scorpio: (element: "Water", quality: "Fixed", deity: "Kartikeya"),
    .sagittarius: (element: "Fire", quality: "Mutable", deity: "Vishnu"),
    .capricorn: (element: "Earth", quality: "Cardinal", deity: "Ganesha"),
    .aquarius: (element: "Air", quality: "Fixed", deity: "Vishnu"),
    .pisces: (element: "Water", quality: "Mutable", deity: "Matsya"),
]

// ------------------------------------
// House Meanings
// ------------------------------------

let HOUSE_MEANINGS: [House: (keywords: [String], areas: [String])] = [
    .first: (keywords: ["self", "body", "appearance", "personality"], areas: ["physical body", "personality", "life force"]),
    .second: (keywords: ["wealth", "family", "speech", "face", "eyes", "food"], areas: ["wealth", "family", "speech", "eating habits"]),
    .third: (keywords: ["siblings", "courage", "efforts", "short travel", "skills"], areas: ["siblings", "courage", "communication", "short journeys"]),
    .fourth: (keywords: ["home", "mother", "happiness", "property", "vehicle"], areas: ["home", "mother", "property", "comforts"]),
    .fifth: (keywords: ["children", "creativity", "intelligence", "romance", "speculation"], areas: ["children", "creativity", "love affairs", "gambling"]),
    .sixth: (keywords: ["enemies", "debts", "disease", "service", "work"], areas: ["enemies", "illness", "daily work", "debts"]),
    .seventh: (keywords: ["marriage", "partner", "business", "travel", "death"], areas: ["marriage", "business partner", "foreign travel"]),
    .eighth: (keywords: ["death", "longevity", "spouse property", "secret", "transform"], areas: ["death", "inheritance", "hidden things", "transformations"]),
    .ninth: (keywords: ["fortune", "father", "teacher", "religion", "long travel"], areas: ["fortune", "father", "preceptor", "long journeys"]),
    .tenth: (keywords: ["career", "fame", "status", "power", "government"], areas: ["career", "reputation", "authority", "government"]),
    .eleventh: (keywords: ["gains", "friends", "aspirations", "elder sibling"], areas: ["gains", "friends", "hopes", "elder siblings"]),
    .twelfth: (keywords: ["loss", "expense", "prison", "hospital", "liberation"], areas: ["losses", "expenses", "hospital", "spiritual liberation"]),
]

// ------------------------------------
// Helper Functions
// ------------------------------------

private func getPlanetName(_ planet: Planet) -> String {
    let names: [Planet: String] = [
        .sun: "Sun",
        .moon: "Moon",
        .mars: "Mars",
        .mercury: "Mercury",
        .jupiter: "Jupiter",
        .venus: "Venus",
        .saturn: "Saturn",
        .rahu: "Rahu (North Node)",
        .ketu: "Ketu (South Node)",
    ]
    return names[planet] ?? "Unknown"
}

private func getSignName(_ sign: Sign) -> String {
    let names: [Sign: String] = [
        .aries: "Aries",
        .taurus: "Taurus",
        .gemini: "Gemini",
        .cancer: "Cancer",
        .leo: "Leo",
        .virgo: "Virgo",
        .libra: "Libra",
        .scorpio: "Scorpio",
        .sagittarius: "Sagittarius",
        .capricorn: "Capricorn",
        .aquarius: "Aquarius",
        .pisces: "Pisces",
    ]
    return names[sign] ?? "Unknown"
}

private func getHouseName(_ house: House) -> String {
    let suffix = getOrdinalSuffix(house.rawValue)
    return "\(house.rawValue)\(suffix) House"
}

private func getOrdinalSuffix(_ n: Int) -> String {
    let v = n % 100
    if v >= 11 && v <= 13 { return "th" }
    let idx = v % 10
    if idx == 1 { return "st" }
    if idx == 2 { return "nd" }
    if idx == 3 { return "rd" }
    return "th"
}

private func getNakshatraName(_ nakshatra: Nakshatra) -> String {
    let names: [Nakshatra: String] = [
        .ashwini: "Ashwini",
        .bharani: "Bharani",
        .krittika: "Krittika",
        .rohini: "Rohini",
        .mrigashira: "Mrigashira",
        .ardra: "Ardra",
        .punarvasu: "Punarvasu",
        .pushya: "Pushya",
        .ashlesha: "Ashlesha",
        .magha: "Magha",
        .purvaPhalguni: "Purva Phalguni",
        .uttaraPhalguni: "Uttara Phalguni",
        .hasta: "Hasta",
        .chitra: "Chitra",
        .swati: "Swati",
        .vishakha: "Vishakha",
        .anuradha: "Anuradha",
        .jyeshtha: "Jyeshtha",
        .mula: "Mula",
        .purvaAshadha: "Purva Ashadha",
        .uttaraAshadha: "Uttara Ashadha",
        .shravana: "Shravana",
        .dhanishta: "Dhanishta",
        .shatabhisha: "Shatabhisha",
        .purvaBhadrapada: "Purva Bhadrapada",
        .uttaraBhadrapada: "Uttara Bhadrapada",
        .revati: "Revati",
    ]
    return names[nakshatra] ?? "Unknown"
}

private func getDashaLevelName(_ level: Int) -> String {
    let names: [Int: String] = [
        1: "Mahadasha",
        2: "Antardasha",
        3: "Pratyantardasha",
        4: "Sookshma",
        5: "Prana",
    ]
    return names[level] ?? "Unknown"
}

private func formatDateRange(start: Date, end: Date) -> String {
    let formatter = DateFormatter()
    formatter.dateStyle = .medium
    return "\(formatter.string(from: start)) - \(formatter.string(from: end))"
}

private func getPlanetPosition(chart: ChartData, planet: Planet) -> PlanetPosition? {
    return chart.planets.first { $0.planet == planet }
}

private func getPlanetSign(chart: ChartData, planet: Planet) -> Sign? {
    return getPlanetPosition(chart: chart, planet: planet)?.sign
}

private func getPlanetHouse(chart: ChartData, planet: Planet) -> House? {
    guard let pos = getPlanetPosition(chart: chart, planet: planet) else { return nil }

    let ascendantSign = Int(chart.ascendant / 30)
    let planetSign = pos.sign.rawValue
    let houseNumber = ((planetSign - ascendantSign + 12) % 12) + 1
    return House(rawValue: houseNumber)
}

private func isPlanetExalted(planet: Planet, sign: Sign) -> Bool {
    let exaltations: [Planet: Sign] = [
        .sun: .aries,
        .moon: .taurus,
        .mars: .capricorn,
        .mercury: .virgo,
        .jupiter: .cancer,
        .venus: .pisces,
        .saturn: .libra,
        .rahu: .taurus,
        .ketu: .scorpio,
    ]
    return exaltations[planet] == sign
}

private func isPlanetDebilitated(planet: Planet, sign: Sign) -> Bool {
    let debilitations: [Planet: Sign] = [
        .sun: .libra,
        .moon: .scorpio,
        .mars: .cancer,
        .mercury: .pisces,
        .jupiter: .capricorn,
        .venus: .virgo,
        .saturn: .aries,
        .rahu: .scorpio,
        .ketu: .taurus,
    ]
    return debilitations[planet] == sign
}

private func getPlanetStrength(_ shadbala: [ShadbalaResult], planet: Planet) -> ShadbalaResult? {
    return shadbala.first { $0.planet == planet }
}

private func isPlanetStrong(_ shadbalaResult: ShadbalaResult?) -> Bool {
    guard let shadbalaResult = shadbalaResult else { return false }
    return shadbalaResult.totalRupas > 5
}

private func getActiveYogasForPeriod(_ yogas: [YogaResult], activePlanets: [Planet]) -> [YogaResult] {
    return yogas.filter { yoga in
        yoga.isPresent && yoga.planets.contains { activePlanets.contains($0) }
    }
}

// ------------------------------------
// Core Prediction Generation
// ------------------------------------

private func generatePlanetSignification(planet: Planet, sign: Sign, house: House, strength: String) -> String {
    guard let planetInfo = PLANET_SIGNIFICATIONS[planet] else { return "" }
    guard let signInfo = SIGN_QUALITIES[sign] else { return "" }
    guard let houseInfo = HOUSE_MEANINGS[house] else { return "" }

    let strengthModifier: String
    if strength == "strong" { strengthModifier = "powerfully" }
    else if strength == "weak" { strengthModifier = "weakly" }
    else { strengthModifier = "moderately" }

    let aspects = "The \(getPlanetName(planet)) represents \(planetInfo.keywords.prefix(3).joined(separator: ", ")). In this period, it operates \(strengthModifier) as it moves through \(getSignName(sign)) (\(signInfo.element) \(signInfo.quality)), affecting the \(houseInfo.keywords[0]) area of life."

    return aspects
}

private func generateDashaPrediction(
    dashaPlanet: Planet,
    level: Int,
    chart: ChartData,
    shadbala: [ShadbalaResult],
    yogas: [YogaResult],
    subPlanet: Planet? = nil
) -> (summary: String, influences: [String], house: House, sign: Sign, strength: String) {
    let planetSign = getPlanetSign(chart: chart, planet: dashaPlanet) ?? .aries
    let planetHouse = getPlanetHouse(chart: chart, planet: dashaPlanet) ?? .first
    let planetStrength = getPlanetStrength(shadbala, planet: dashaPlanet)

    let sign = planetSign
    let house = planetHouse
    let isStrong = isPlanetStrong(planetStrength)
    let isExalted = isPlanetExalted(planet: dashaPlanet, sign: sign)
    let isDebilitated = isPlanetDebilitated(planet: dashaPlanet, sign: sign)

    // Determine strength
    var strength: String = "moderate"
    if isStrong || isExalted { strength = "strong" }
    else if isDebilitated || (planetStrength != nil && planetStrength!.totalRupas < 3) { strength = "weak" }

    guard let planetInfo = PLANET_SIGNIFICATIONS[dashaPlanet] else {
        return ("", [], house, sign, strength)
    }
    let levelName = getDashaLevelName(level)

    // Build summary
    var summary = "During this \(levelName) of \(getPlanetName(dashaPlanet))"

    if let subPlanet = subPlanet, level == 2 {
        summary += " (within the \(getPlanetName(subPlanet)) Mahadasha)"
    }

    summary += ", "

    if isExalted {
        summary += "the planet is exalted in \(getSignName(sign)), amplifying its positive effects."
    } else if isDebilitated {
        summary += "the planet is debilitated in \(getSignName(sign)), which may create challenges."
    } else {
        summary += "the planet is in \(getSignName(sign))."
    }

    // Add key influences
    var influences: [String] = []

    // House influence
    if let houseInfo = HOUSE_MEANINGS[house] {
        influences.append("Primary life area affected: \(houseInfo.areas[0])")
    }

    // Sign influence
    if let signInfo = SIGN_QUALITIES[sign] {
        influences.append("Sign quality: \(signInfo.element) and \(signInfo.quality)")
    }

    // Planet nature
    influences.append("Planet nature: \(planetInfo.nature)")

    // Add planet domains
    if !planetInfo.domains.isEmpty {
        influences.append("Key domains: \(planetInfo.domains.prefix(2).joined(separator: ", "))")
    }

    // Check for yogas
    let relevantYogas = yogas.filter { $0.isPresent && $0.planets.contains(dashaPlanet) }
    if !relevantYogas.isEmpty {
        let yogaNames = relevantYogas.map { $0.name }.joined(separator: ", ")
        influences.append("Active yoga\(relevantYogas.count > 1 ? "s" : ""): \(yogaNames)")
    }

    // Strength indicator
    if strength == "strong" {
        influences.append("Planet is in strong position with good shadbala")
    } else if strength == "weak" {
        influences.append("Planet may be weakened - challenges possible")
    }

    return (summary, influences, house, sign, strength)
}

private func generatePeriodSummary(
    activePlanet: Planet,
    level: Int,
    chart: ChartData,
    shadbala: [ShadbalaResult],
    yogas: [YogaResult],
    subPlanet: Planet? = nil
) -> String {
    let (summary, _, house, sign, strength) = generateDashaPrediction(
        dashaPlanet: activePlanet,
        level: level,
        chart: chart,
        shadbala: shadbala,
        yogas: yogas,
        subPlanet: subPlanet
    )

    let planetSign = getPlanetSign(chart: chart, planet: activePlanet) ?? .aries

    // Create a more detailed summary
    var fullSummary = summary + "\n\n"

    // Add the detailed signification
    fullSummary += generatePlanetSignification(planet: activePlanet, sign: planetSign, house: house, strength: strength) + "\n\n"

    // Add house interpretation
    if let houseInfo = HOUSE_MEANINGS[house] {
        fullSummary += "This period primarily influences the \(houseInfo.keywords[0]) area: \(houseInfo.areas.joined(separator: ", "))."
    }

    return fullSummary
}

// ------------------------------------
// Main Prediction Function
// ------------------------------------

/**
 * Generate predictions based on dasha periods, chart data, and other factors.
 */
func generatePredictions(request: PredictionRequest) -> PredictionResponse {
    let chart = request.chart
    let dashas = request.dashas
    let yogas = request.yogas
    let shadbala = request.shadbala

    // Default to full 120-year range if no dates specified
    let start: Date
    let end: Date

    if let requestStart = request.startDate {
        start = requestStart
    } else if let firstDasha = dashas.first {
        start = firstDasha.mahadasha.startDate
    } else {
        start = Date(timeIntervalSinceNow: -60 * 365 * 24 * 60 * 60)
    }

    if let requestEnd = request.endDate {
        end = requestEnd
    } else if let lastDasha = dashas.last {
        end = lastDasha.mahadasha.endDate
    } else {
        end = Date(timeIntervalSinceNow: 60 * 365 * 24 * 60 * 60)
    }

    var periods: [PredictionPeriod] = []

    // Determine which dasha level to process
    let maxLevel = request.level ?? 1

    // Build lookup maps for each level to ensure uniqueness
    var mahaMap: [String: DashaPeriod] = [:]
    var antiMap: [String: DashaPeriod] = [:]
    var pratyMap: [String: DashaPeriod] = [:]

    for dasha in dashas {
        let mahaKey = dasha.mahadasha.startDate.description
        let antiKey = "\(mahaKey)-\(dasha.antardasha.startDate.description)"
        let pratyKey = "\(antiKey)-\(dasha.pratyantardasha.startDate.description)"

        if mahaMap[mahaKey] == nil { mahaMap[mahaKey] = dasha }
        if antiMap[antiKey] == nil { antiMap[antiKey] = dasha }
        if pratyMap[pratyKey] == nil { pratyMap[pratyKey] = dasha }
    }

    // Process based on level
    let dashasToProcess: [DashaPeriod]
    if maxLevel == 1 {
        dashasToProcess = Array(mahaMap.values)
    } else if maxLevel == 2 {
        dashasToProcess = Array(antiMap.values)
    } else {
        dashasToProcess = Array(pratyMap.values)
    }

    for dasha in dashasToProcess {
        // Filter by date range - check the mahadasha level dates
        let mahaStart = dasha.mahadasha.startDate
        let mahaEnd = dasha.mahadasha.endDate

        // Skip if completely outside range
        if mahaEnd < start || mahaStart > end { continue }

        let antardasha = dasha.antardasha

        // Process Mahadasha (level 1)
        if maxLevel == 1 {
            let activePlanet = dasha.mahadasha.planet
            let summary = generatePeriodSummary(activePlanet: activePlanet, level: 1, chart: chart, shadbala: shadbala, yogas: yogas)
            let (_, influences, house, sign, strength) = generateDashaPrediction(dashaPlanet: activePlanet, level: 1, chart: chart, shadbala: shadbala, yogas: yogas)
            let activeYogas = getActiveYogasForPeriod(yogas, activePlanets: [activePlanet]).map { $0.name }

            periods.append(PredictionPeriod(
                id: "m-\(activePlanet.rawValue)-\(Int(mahaStart.timeIntervalSince1970))",
                level: 1,
                activePlanet: activePlanet,
                subPlanet: nil,
                startDate: mahaStart,
                endDate: mahaEnd,
                summary: summary,
                keyInfluences: influences,
                activeYogas: activeYogas,
                planetStrength: strength,
                houseAffected: house,
                signPosition: sign,
                aspects: nil
            ))
        }

        // Process Antardasha (level 2) if requested
        if maxLevel == 2 {
            let antiStart = antardasha.startDate
            let antiEnd = antardasha.endDate

            if !(antiEnd < start || antiStart > end) {
                let summary = generatePeriodSummary(activePlanet: antardasha.planet, level: 2, chart: chart, shadbala: shadbala, yogas: yogas, subPlanet: dasha.mahadasha.planet)
                let (_, influences, house, sign, strength) = generateDashaPrediction(dashaPlanet: antardasha.planet, level: 2, chart: chart, shadbala: shadbala, yogas: yogas, subPlanet: dasha.mahadasha.planet)
                let activeYogas = getActiveYogasForPeriod(yogas, activePlanets: [dasha.mahadasha.planet, antardasha.planet]).map { $0.name }

                periods.append(PredictionPeriod(
                    id: "a-\(antardasha.planet.rawValue)-\(Int(antiStart.timeIntervalSince1970))",
                    level: 2,
                    activePlanet: antardasha.planet,
                    subPlanet: dasha.mahadasha.planet,
                    startDate: antiStart,
                    endDate: antiEnd,
                    summary: summary,
                    keyInfluences: influences,
                    activeYogas: activeYogas,
                    planetStrength: strength,
                    houseAffected: house,
                    signPosition: sign,
                    aspects: nil
                ))
            }
        }

        // Process Pratyantardasha (level 3) if requested
        if maxLevel == 3 {
            let praty = dasha.pratyantardasha
            let pratyStart = praty.startDate
            let pratyEnd = praty.endDate

            if !(pratyEnd < start || pratyStart > end) {
                let summary = generatePeriodSummary(activePlanet: praty.planet, level: 3, chart: chart, shadbala: shadbala, yogas: yogas, subPlanet: antardasha.planet)
                let (_, influences, house, sign, strength) = generateDashaPrediction(dashaPlanet: praty.planet, level: 3, chart: chart, shadbala: shadbala, yogas: yogas)
                let activeYogas = getActiveYogasForPeriod(yogas, activePlanets: [dasha.mahadasha.planet, antardasha.planet, praty.planet]).map { $0.name }

                periods.append(PredictionPeriod(
                    id: "p-\(praty.planet.rawValue)-\(Int(pratyStart.timeIntervalSince1970))",
                    level: 3,
                    activePlanet: praty.planet,
                    subPlanet: antardasha.planet,
                    startDate: pratyStart,
                    endDate: pratyEnd,
                    summary: summary,
                    keyInfluences: influences,
                    activeYogas: activeYogas,
                    planetStrength: strength,
                    houseAffected: house,
                    signPosition: sign,
                    aspects: nil
                ))
            }
        }
    }

    // Sort by start date
    periods.sort { $0.startDate < $1.startDate }

    return PredictionPeriodsResponse(periods: periods, chart: chart)
}

private struct PredictionPeriodsResponse {
    let periods: [PredictionPeriod]
    let chart: ChartData
}

// This is a workaround for the return type issue
func generatePredictionsResponse(request: PredictionRequest) -> (periods: [PredictionPeriod], chart: ChartData) {
    let chart = request.chart
    let dashas = request.dashas
    let yogas = request.yogas
    let shadbala = request.shadbala

    // Default to full 120-year range if no dates specified
    let start: Date
    let end: Date

    if let requestStart = request.startDate {
        start = requestStart
    } else if let firstDasha = dashas.first {
        start = firstDasha.mahadasha.startDate
    } else {
        start = Date(timeIntervalSinceNow: -60 * 365 * 24 * 60 * 60)
    }

    if let requestEnd = request.endDate {
        end = requestEnd
    } else if let lastDasha = dashas.last {
        end = lastDasha.mahadasha.endDate
    } else {
        end = Date(timeIntervalSinceNow: 60 * 365 * 24 * 60 * 60)
    }

    var periods: [PredictionPeriod] = []

    // Determine which dasha level to process
    let maxLevel = request.level ?? 1

    // Build lookup maps for each level to ensure uniqueness
    var mahaMap: [String: DashaPeriod] = [:]
    var antiMap: [String: DashaPeriod] = [:]
    var pratyMap: [String: DashaPeriod] = [:]

    for dasha in dashas {
        let mahaKey = dasha.mahadasha.startDate.description
        let antiKey = "\(mahaKey)-\(dasha.antardasha.startDate.description)"
        let pratyKey = "\(antiKey)-\(dasha.pratyantardasha.startDate.description)"

        if mahaMap[mahaKey] == nil { mahaMap[mahaKey] = dasha }
        if antiMap[antiKey] == nil { antiMap[antiKey] = dasha }
        if pratyMap[pratyKey] == nil { pratyMap[pratyKey] = dasha }
    }

    // Process based on level
    let dashasToProcess: [DashaPeriod]
    if maxLevel == 1 {
        dashasToProcess = Array(mahaMap.values)
    } else if maxLevel == 2 {
        dashasToProcess = Array(antiMap.values)
    } else {
        dashasToProcess = Array(pratyMap.values)
    }

    for dasha in dashasToProcess {
        // Filter by date range - check the mahadasha level dates
        let mahaStart = dasha.mahadasha.startDate
        let mahaEnd = dasha.mahadasha.endDate

        // Skip if completely outside range
        if mahaEnd < start || mahaStart > end { continue }

        let antardasha = dasha.antardasha

        // Process Mahadasha (level 1)
        if maxLevel == 1 {
            let activePlanet = dasha.mahadasha.planet
            let summary = generatePeriodSummary(activePlanet: activePlanet, level: 1, chart: chart, shadbala: shadbala, yogas: yogas)
            let (_, influences, house, sign, strength) = generateDashaPrediction(dashaPlanet: activePlanet, level: 1, chart: chart, shadbala: shadbala, yogas: yogas)
            let activeYogas = getActiveYogasForPeriod(yogas, activePlanets: [activePlanet]).map { $0.name }

            periods.append(PredictionPeriod(
                id: "m-\(activePlanet.rawValue)-\(Int(mahaStart.timeIntervalSince1970))",
                level: 1,
                activePlanet: activePlanet,
                subPlanet: nil,
                startDate: mahaStart,
                endDate: mahaEnd,
                summary: summary,
                keyInfluences: influences,
                activeYogas: activeYogas,
                planetStrength: strength,
                houseAffected: house,
                signPosition: sign,
                aspects: nil
            ))
        }

        // Process Antardasha (level 2) if requested
        if maxLevel == 2 {
            let antiStart = antardasha.startDate
            let antiEnd = antardasha.endDate

            if !(antiEnd < start || antiStart > end) {
                let summary = generatePeriodSummary(activePlanet: antardasha.planet, level: 2, chart: chart, shadbala: shadbala, yogas: yogas, subPlanet: dasha.mahadasha.planet)
                let (_, influences, house, sign, strength) = generateDashaPrediction(dashaPlanet: antardasha.planet, level: 2, chart: chart, shadbala: shadbala, yogas: yogas, subPlanet: dasha.mahadasha.planet)
                let activeYogas = getActiveYogasForPeriod(yogas, activePlanets: [dasha.mahadasha.planet, antardasha.planet]).map { $0.name }

                periods.append(PredictionPeriod(
                    id: "a-\(antardasha.planet.rawValue)-\(Int(antiStart.timeIntervalSince1970))",
                    level: 2,
                    activePlanet: antardasha.planet,
                    subPlanet: dasha.mahadasha.planet,
                    startDate: antiStart,
                    endDate: antiEnd,
                    summary: summary,
                    keyInfluences: influences,
                    activeYogas: activeYogas,
                    planetStrength: strength,
                    houseAffected: house,
                    signPosition: sign,
                    aspects: nil
                ))
            }
        }

        // Process Pratyantardasha (level 3) if requested
        if maxLevel == 3 {
            let praty = dasha.pratyantardasha
            let pratyStart = praty.startDate
            let pratyEnd = praty.endDate

            if !(pratyEnd < start || pratyStart > end) {
                let summary = generatePeriodSummary(activePlanet: praty.planet, level: 3, chart: chart, shadbala: shadbala, yogas: yogas, subPlanet: antardasha.planet)
                let (_, influences, house, sign, strength) = generateDashaPrediction(dashaPlanet: praty.planet, level: 3, chart: chart, shadbala: shadbala, yogas: yogas)
                let activeYogas = getActiveYogasForPeriod(yogas, activePlanets: [dasha.mahadasha.planet, antardasha.planet, praty.planet]).map { $0.name }

                periods.append(PredictionPeriod(
                    id: "p-\(praty.planet.rawValue)-\(Int(pratyStart.timeIntervalSince1970))",
                    level: 3,
                    activePlanet: praty.planet,
                    subPlanet: antardasha.planet,
                    startDate: pratyStart,
                    endDate: pratyEnd,
                    summary: summary,
                    keyInfluences: influences,
                    activeYogas: activeYogas,
                    planetStrength: strength,
                    houseAffected: house,
                    signPosition: sign,
                    aspects: nil
                ))
            }
        }
    }

    // Sort by start date
    periods.sort { $0.startDate < $1.startDate }

    return (periods, chart)
}

// ------------------------------------
// Current Period Prediction
// ------------------------------------

/**
 * Get the current period prediction based on dasha, chart, yogas, and shadbala.
 */
func getCurrentPeriodPrediction(
    chart: ChartData,
    dashas: [DashaPeriod],
    yogas: [YogaResult],
    shadbala: [ShadbalaResult]
) -> PredictionPeriod? {
    let now = Date()

    // Find the current dasha period
    guard let current = dashas.first(where: { d in
        let start = d.mahadasha.startDate.timeIntervalSince1970
        let end = d.mahadasha.endDate.timeIntervalSince1970
        let nowMs = now.timeIntervalSince1970
        return nowMs >= start && nowMs <= end
    }) else { return nil }

    let mahaPlanet = current.mahadasha.planet
    let antiPlanet = current.antardasha.planet
    let summary = generatePeriodSummary(activePlanet: mahaPlanet, level: 1, chart: chart, shadbala: shadbala, yogas: yogas)
    let (_, influences, house, sign, strength) = generateDashaPrediction(dashaPlanet: mahaPlanet, level: 1, chart: chart, shadbala: shadbala, yogas: yogas)
    let activeYogas = getActiveYogasForPeriod(yogas, activePlanets: [mahaPlanet, antiPlanet]).map { $0.name }

    return PredictionPeriod(
        id: "current",
        level: 1,
        activePlanet: mahaPlanet,
        subPlanet: antiPlanet,
        startDate: current.mahadasha.startDate,
        endDate: current.mahadasha.endDate,
        summary: summary,
        keyInfluences: influences,
        activeYogas: activeYogas,
        planetStrength: strength,
        houseAffected: house,
        signPosition: sign,
        aspects: nil
    )
}
