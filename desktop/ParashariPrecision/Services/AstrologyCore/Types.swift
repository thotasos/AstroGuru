// ============================================================
// Parashari Precision — Swift Types (Calculation Layer)
// ============================================================
//
// These types are for the astrology calculation engine.
// IMPORTANT: Types with the same names (ChartData, DashaPeriod, YogaResult,
// ShadbalaResult, AshtakavargaResult, MonthlyPrediction) exist in Models/
// with DIFFERENT structures. To avoid ambiguity, these types use Calc-prefixed
// names. They are marked public so they can be used across the module.
// ============================================================

import Foundation

// ------------------------------------
// Enums (calculation layer only - no conflict with Models)
// ------------------------------------

/** Nakshatras 0=Ashwini … 26=Revati */
public enum Nakshatra: Int, CaseIterable, Codable, Sendable {
    case ashwini = 0
    case bharani = 1
    case krittika = 2
    case rohini = 3
    case mrigashira = 4
    case ardra = 5
    case punarvasu = 6
    case pushya = 7
    case ashlesha = 8
    case magha = 9
    case purvaPhalguni = 10
    case uttaraPhalguni = 11
    case hasta = 12
    case chitra = 13
    case swati = 14
    case vishakha = 15
    case anuradha = 16
    case jyeshtha = 17
    case mula = 18
    case purvaAshadha = 19
    case uttaraAshadha = 20
    case shravana = 21
    case dhanishta = 22
    case shatabhisha = 23
    case purvaBhadrapada = 24
    case uttaraBhadrapada = 25
    case revati = 26
}

/** Ayanamsa systems */
public enum Ayanamsa: String, Codable, Sendable {
    case lahiri = "Lahiri"
    case raman = "Raman"
    case kp = "KP"
}

/** Divisional (Varga) charts */
public enum Varga: String, CaseIterable, Codable, Sendable {
    case d1 = "D1"
    case d2 = "D2"
    case d3 = "D3"
    case d4 = "D4"
    case d7 = "D7"
    case d9 = "D9"
    case d10 = "D10"
    case d12 = "D12"
    case d16 = "D16"
    case d20 = "D20"
    case d24 = "D24"
    case d27 = "D27"
    case d30 = "D30"
    case d40 = "D40"
    case d45 = "D45"
    case d60 = "D60"
}

/** House 1-12 */
public enum House: Int, CaseIterable, Codable, Sendable {
    case first = 1, second = 2, third = 3, fourth = 4, fifth = 5, sixth = 6
    case seventh = 7, eighth = 8, ninth = 9, tenth = 10, eleventh = 11, twelfth = 12
}

// ------------------------------------
// Position structs (calc layer - Int-based planets)
// ------------------------------------

/** Planet position for calculation layer */
public struct CalcPlanetPosition: Codable, Identifiable, Sendable {
    public var id: String { "\(planet)-\(siderealLongitude)" }
    public let planet: Int
    public let tropicalLongitude: Double
    public let siderealLongitude: Double
    public let sign: Int
    public let degreeInSign: Double
    public let nakshatra: Int
    public let nakshatraPada: Int
    public let isRetrograde: Bool
    public let speed: Double
    public let latitude: Double

    public init(planet: Int, tropicalLongitude: Double, siderealLongitude: Double, sign: Int,
                degreeInSign: Double, nakshatra: Int, nakshatraPada: Int,
                isRetrograde: Bool, speed: Double, latitude: Double) {
        self.planet = planet
        self.tropicalLongitude = tropicalLongitude
        self.siderealLongitude = siderealLongitude
        self.sign = sign
        self.degreeInSign = degreeInSign
        self.nakshatra = nakshatra
        self.nakshatraPada = nakshatraPada
        self.isRetrograde = isRetrograde
        self.speed = speed
        self.latitude = latitude
    }
}

/** House cusp position for calculation layer */
public struct CalcHousePosition: Codable, Identifiable, Sendable {
    public var id: String { "\(house)" }
    public let house: Int
    public let sign: Int
    public let degreeOnCusp: Double

    public init(house: Int, sign: Int, degreeOnCusp: Double) {
        self.house = house
        self.sign = sign
        self.degreeOnCusp = degreeOnCusp
    }
}

// ------------------------------------
// Chart Data (CALC-LAYER - different from Models/ChartData.swift)
// ------------------------------------

public struct CalcChartData: Codable, Sendable {
    public let ascendant: Double
    public let planets: [CalcPlanetPosition]
    public let houses: [CalcHousePosition]
    public let julianDay: Double
    public let ayanamsa: Double
    public let ayanamsaType: Ayanamsa
    public let mc: Double

    public init(ascendant: Double, planets: [CalcPlanetPosition], houses: [CalcHousePosition],
                julianDay: Double, ayanamsa: Double, ayanamsaType: Ayanamsa, mc: Double) {
        self.ascendant = ascendant
        self.planets = planets
        self.houses = houses
        self.julianDay = julianDay
        self.ayanamsa = ayanamsa
        self.ayanamsaType = ayanamsaType
        self.mc = mc
    }

    public func planetPosition(for planetIndex: Int) -> CalcPlanetPosition? {
        planets.first { $0.planet == planetIndex }
    }
}

public struct CalcVargaChart: Codable, Sendable {
    public let chart: CalcChartData
    public let varga: Varga
    public let vargaSigns: [Int: Int]
}

// ------------------------------------
// Dasha (CALC-LAYER - different from Models/DashaPeriod.swift)
// ------------------------------------

public struct CalcDashaLevel: Codable, Identifiable, Sendable {
    public var id: String { "\(planet)-\(startDate.timeIntervalSince1970)" }
    public let planet: Int
    public let startDate: Date
    public let endDate: Date
    public let level: Int

    public init(planet: Int, startDate: Date, endDate: Date, level: Int) {
        self.planet = planet
        self.startDate = startDate
        self.endDate = endDate
        self.level = level
    }
}

public struct CalcDashaPeriod: Codable, Identifiable, Sendable {
    public var id: String { "\(mahadasha.planet)-\(mahadasha.startDate.timeIntervalSince1970)" }
    public let mahadasha: CalcDashaLevel
    public let antardasha: CalcDashaLevel
    public let pratyantardasha: CalcDashaLevel
    public let sookshma: CalcDashaLevel
    public let prana: CalcDashaLevel

    public init(mahadasha: CalcDashaLevel, antardasha: CalcDashaLevel,
                pratyantardasha: CalcDashaLevel, sookshma: CalcDashaLevel, prana: CalcDashaLevel) {
        self.mahadasha = mahadasha
        self.antardasha = antardasha
        self.pratyantardasha = pratyantardasha
        self.sookshma = sookshma
        self.prana = prana
    }
}

// ------------------------------------
// Yoga (CALC-LAYER - different from Models/YogaResult.swift)
// ------------------------------------

public struct CalcYogaResult: Codable, Identifiable, Sendable {
    public var id: String { name }
    public let name: String
    public let description: String
    public let isPresent: Bool
    public let planets: [Int]
    public let houses: [Int]
    public let strength: Double
    public let category: String

    public init(name: String, description: String, isPresent: Bool, planets: [Int],
                houses: [Int], strength: Double, category: String) {
        self.name = name
        self.description = description
        self.isPresent = isPresent
        self.planets = planets
        self.houses = houses
        self.strength = strength
        self.category = category
    }
}

// ------------------------------------
// Shadbala (CALC-LAYER - different from Models/ShadbalaResult.swift)
// ------------------------------------

public struct CalcShadbalaResult: Codable, Identifiable, Sendable {
    public var id: String { "\(planet)" }
    public let planet: Int
    public let sthanabala: Double
    public let digbala: Double
    public let kalabala: Double
    public let chestabala: Double
    public let naisargikabala: Double
    public let drigbala: Double
    public let total: Double
    public let totalRupas: Double
    public let ishtaPhala: Double
    public let kashtaPhala: Double

    public init(planet: Int, sthanabala: Double, digbala: Double, kalabala: Double,
                chestabala: Double, naisargikabala: Double, drigbala: Double,
                total: Double, totalRupas: Double, ishtaPhala: Double, kashtaPhala: Double) {
        self.planet = planet
        self.sthanabala = sthanabala
        self.digbala = digbala
        self.kalabala = kalabala
        self.chestabala = chestabala
        self.naisargikabala = naisargikabala
        self.drigbala = drigbala
        self.total = total
        self.totalRupas = totalRupas
        self.ishtaPhala = ishtaPhala
        self.kashtaPhala = kashtaPhala
    }
}

// ------------------------------------
// Ashtakavarga (CALC-LAYER - different from Models/AshtakavargaResult.swift)
// ------------------------------------

public struct CalcAshtakavargaResult: Codable, Sendable {
    public let bav: [String: [Int]]
    public let sav: [Int]
    public let planetBav: [Int: [Int]]

    public init(bav: [String: [Int]], sav: [Int], planetBav: [Int: [Int]]) {
        self.bav = bav
        self.sav = sav
        self.planetBav = planetBav
    }
}

// ------------------------------------
// Birth Data
// ------------------------------------

public struct BirthData: Codable, Sendable {
    public let name: String
    public let dateOfBirth: String
    public let latitude: Double
    public let longitude: Double
    public let timezone: Double
    public let ayanamsaId: Ayanamsa?

    public init(name: String, dateOfBirth: String, latitude: Double,
                longitude: Double, timezone: Double, ayanamsaId: Ayanamsa?) {
        self.name = name
        self.dateOfBirth = dateOfBirth
        self.latitude = latitude
        self.longitude = longitude
        self.timezone = timezone
        self.ayanamsaId = ayanamsaId
    }
}

// ------------------------------------
// South Indian Chart
// ------------------------------------

public struct GridCell: Codable, Sendable {
    public let row: Int
    public let col: Int
    public let sign: Int
    public let planets: [Int]
    public let isLagna: Bool
    public let isMetadata: Bool

    public init(row: Int, col: Int, sign: Int, planets: [Int], isLagna: Bool, isMetadata: Bool) {
        self.row = row
        self.col = col
        self.sign = sign
        self.planets = planets
        self.isLagna = isLagna
        self.isMetadata = isMetadata
    }
}

// ------------------------------------
// Nakshatra Info
// ------------------------------------

public struct NakshatraInfo: Codable, Sendable {
    public let nakshatra: Nakshatra
    public let pada: Int
    public let lord: Int
    public let degreeInNakshatra: Double

    public init(nakshatra: Nakshatra, pada: Int, lord: Int, degreeInNakshatra: Double) {
        self.nakshatra = nakshatra
        self.pada = pada
        self.lord = lord
        self.degreeInNakshatra = degreeInNakshatra
    }
}

// ------------------------------------
// Transit Types
// ------------------------------------

public struct TransitPosition: Codable, Sendable {
    public let moonLongitude: Double
    public let moonNakshatra: Int
    public let moonSign: Int
    public let moonDegree: Double
    public let lagna: Double
    public let lagnaSign: Int
    public let venusSign: Int?
    public let jupiterSign: Int?

    public init(moonLongitude: Double, moonNakshatra: Int, moonSign: Int,
                moonDegree: Double, lagna: Double, lagnaSign: Int,
                venusSign: Int?, jupiterSign: Int?) {
        self.moonLongitude = moonLongitude
        self.moonNakshatra = moonNakshatra
        self.moonSign = moonSign
        self.moonDegree = moonDegree
        self.lagna = lagna
        self.lagnaSign = lagnaSign
        self.venusSign = venusSign
        self.jupiterSign = jupiterSign
    }
}

// ------------------------------------
// Prediction Types
// ------------------------------------

public struct CalcPredictionPeriod: Codable, Identifiable, Sendable {
    public var id: String
    public let level: Int
    public let activePlanet: Int
    public let subPlanet: Int?
    public let startDate: Date
    public let endDate: Date
    public let summary: String
    public let keyInfluences: [String]
    public let activeYogas: [String]
    public let planetStrength: String
    public let houseAffected: Int
    public let signPosition: Int
    public let aspects: String?

    public init(id: String, level: Int, activePlanet: Int, subPlanet: Int?,
                startDate: Date, endDate: Date, summary: String, keyInfluences: [String],
                activeYogas: [String], planetStrength: String, houseAffected: Int,
                signPosition: Int, aspects: String?) {
        self.id = id
        self.level = level
        self.activePlanet = activePlanet
        self.subPlanet = subPlanet
        self.startDate = startDate
        self.endDate = endDate
        self.summary = summary
        self.keyInfluences = keyInfluences
        self.activeYogas = activeYogas
        self.planetStrength = planetStrength
        self.houseAffected = houseAffected
        self.signPosition = signPosition
        self.aspects = aspects
    }
}

public struct CalcPredictionResponse: Codable {
    public let periods: [CalcPredictionPeriod]
}

public struct ImmediatePrediction: Codable {
    public let period: String
    public let startDate: Date
    public let endDate: Date
    public let title: String
    public let summary: String
    public let keyFactors: [String]
    public let transitInfluences: [String]
    public let activeYogas: [String]
    public let lifeAreas: [String]
    public let overallAssessment: String

    public init(period: String, startDate: Date, endDate: Date, title: String,
                summary: String, keyFactors: [String], transitInfluences: [String],
                activeYogas: [String], lifeAreas: [String], overallAssessment: String) {
        self.period = period
        self.startDate = startDate
        self.endDate = endDate
        self.title = title
        self.summary = summary
        self.keyFactors = keyFactors
        self.transitInfluences = transitInfluences
        self.activeYogas = activeYogas
        self.lifeAreas = lifeAreas
        self.overallAssessment = overallAssessment
    }
}

// ------------------------------------
// Hourly Prediction Types
// ------------------------------------

public struct HourlyCategories: Codable, Sendable {
    public let career: String
    public let finance: String
    public let health: String
    public let relationships: String
    public let education: String
    public let overall: String

    public init(career: String, finance: String, health: String,
                relationships: String, education: String, overall: String) {
        self.career = career
        self.finance = finance
        self.health = health
        self.relationships = relationships
        self.education = education
        self.overall = overall
    }
}

public enum CategoryTrend: String, Codable, Sendable {
    case positive
    case negative
    case neutral
}

public struct DailyAggregation: Codable, Sendable {
    public let date: String
    public let avgScore: Int
    public let bestHour: Int
    public let bestScore: Int
    public let worstHour: Int
    public let worstScore: Int
    public let categories: CategoryTrends
    public let significantEvents: [String]

    public init(date: String, avgScore: Int, bestHour: Int, bestScore: Int,
                worstHour: Int, worstScore: Int, categories: CategoryTrends,
                significantEvents: [String]) {
        self.date = date
        self.avgScore = avgScore
        self.bestHour = bestHour
        self.bestScore = bestScore
        self.worstHour = worstHour
        self.worstScore = worstScore
        self.categories = categories
        self.significantEvents = significantEvents
    }
}

public struct CategoryTrends: Codable, Sendable {
    public let career: CategoryTrend
    public let finance: CategoryTrend
    public let health: CategoryTrend
    public let relationships: CategoryTrend
    public let education: CategoryTrend

    public init(career: CategoryTrend, finance: CategoryTrend, health: CategoryTrend,
                relationships: CategoryTrend, education: CategoryTrend) {
        self.career = career
        self.finance = finance
        self.health = health
        self.relationships = relationships
        self.education = education
    }
}

public struct WeeklyAggregation: Codable, Sendable {
    public let week: Int
    public let startDate: String
    public let endDate: String
    public let avgScore: Int
    public let highlight: String
    public let bestDay: String
    public let worstDay: String

    public init(week: Int, startDate: String, endDate: String, avgScore: Int,
                highlight: String, bestDay: String, worstDay: String) {
        self.week = week
        self.startDate = startDate
        self.endDate = endDate
        self.avgScore = avgScore
        self.highlight = highlight
        self.bestDay = bestDay
        self.worstDay = worstDay
    }
}

public struct CalcMonthlyPrediction: Codable, Sendable {
    public let month: Int
    public let year: Int
    public let daysInMonth: Int
    public let daily: [DailyAggregation]
    public let weekly: [WeeklyAggregation]
    public let monthly: MonthlySummary

    public init(month: Int, year: Int, daysInMonth: Int,
                daily: [DailyAggregation], weekly: [WeeklyAggregation],
                monthly: MonthlySummary) {
        self.month = month
        self.year = year
        self.daysInMonth = daysInMonth
        self.daily = daily
        self.weekly = weekly
        self.monthly = monthly
    }
}

public struct MonthlySummary: Codable, Sendable {
    public let avgScore: Int
    public let bestDays: [String]
    public let worstDays: [String]
    public let categoryHighlights: CategoryHighlights

    public init(avgScore: Int, bestDays: [String], worstDays: [String],
                categoryHighlights: CategoryHighlights) {
        self.avgScore = avgScore
        self.bestDays = bestDays
        self.worstDays = worstDays
        self.categoryHighlights = categoryHighlights
    }
}

public struct CategoryHighlights: Codable, Sendable {
    public let career: CategoryHighlightDays
    public let finance: CategoryHighlightDays
    public let health: CategoryHighlightDays
    public let relationships: CategoryHighlightDays
    public let education: CategoryHighlightDays

    public init(career: CategoryHighlightDays, finance: CategoryHighlightDays,
                health: CategoryHighlightDays, relationships: CategoryHighlightDays,
                education: CategoryHighlightDays) {
        self.career = career
        self.finance = finance
        self.health = health
        self.relationships = relationships
        self.education = education
    }
}

public struct CategoryHighlightDays: Codable, Sendable {
    public let positive: [String]
    public let negative: [String]

    public init(positive: [String], negative: [String]) {
        self.positive = positive
        self.negative = negative
    }
}
