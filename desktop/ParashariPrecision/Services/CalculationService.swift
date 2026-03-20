import Foundation

// MARK: - Calculation Service Errors

enum CalculationError: LocalizedError {
    case notYetImplemented
    case calculationModuleNotReady
    case profileNotFound(String)
    case cacheNotFound
    case computationFailed(String)

    var errorDescription: String? {
        switch self {
        case .notYetImplemented:
            return "Not yet implemented - waiting for calculation modules"
        case .calculationModuleNotReady:
            return "Calculation modules are not yet available"
        case .profileNotFound(let id):
            return "Profile not found: \(id)"
        case .cacheNotFound:
            return "No cached calculation found"
        case .computationFailed(let reason):
            return "Calculation failed: \(reason)"
        }
    }
}

// MARK: - Full Calculation Result

struct FullCalculationResult: Sendable {
    let chart: ChartData
    let vargas: [String: ChartData]
    let dashas: [DashaPeriod]
    let yogas: [YogaResult]
    let shadbala: [ShadbalaResult]
    let ashtakavarga: AshtakavargaResult
    let computedAt: Date
    let wasCached: Bool
}

// MARK: - Calculation Service
//
// This service provides local astrological calculations as an alternative to APIService.
// It follows a cache-first strategy:
// 1. Try to read cached calculations from SQLite
// 2. If cache miss, compute locally using the calculation modules
// 3. Cache results for future use
//
// Currently this is a stub - full implementation will come after
// Senior Dev 1 ports the calculation modules to Swift.

actor CalculationService {
    static let shared = CalculationService()

    private let database = DatabaseService.shared

    private init() {}

    // MARK: - Chart Calculations

    /// Calculate birth chart for a profile
    /// - Parameter profile: The birth profile
    /// - Returns: ChartData with planet positions and house cusps
    func calculateChart(for profile: BirthProfile) async throws -> ChartData {
        throw CalculationError.notYetImplemented
    }

    /// Calculate chart for a specific varga (divisional chart)
    /// - Parameters:
    ///   - profile: The birth profile
    ///   - varga: The divisional chart name (e.g., "D1", "D2", "D9")
    /// - Returns: ChartData for the requested varga
    func calculateChart(for profile: BirthProfile, varga: String) async throws -> ChartData {
        throw CalculationError.notYetImplemented
    }

    /// Calculate all divisional charts
    /// - Parameter profile: The birth profile
    /// - Returns: Dictionary of varga name to ChartData
    func calculateAllVargas(for profile: BirthProfile) async throws -> [String: ChartData] {
        throw CalculationError.notYetImplemented
    }

    // MARK: - Dasha Calculations

    /// Calculate Vimshottari Dasha periods
    /// - Parameter profile: The birth profile
    /// - Returns: Array of Mahadasha periods (each containing sub-periods)
    func calculateDashas(for profile: BirthProfile) async throws -> [DashaPeriod] {
        throw CalculationError.notYetImplemented
    }

    // MARK: - Yoga Detection

    /// Detect yogas (planetary combinations) in the chart
    /// - Parameter profile: The birth profile
    /// - Returns: Array of detected yogas with descriptions
    func detectYogas(for profile: BirthProfile) async throws -> [YogaResult] {
        throw CalculationError.notYetImplemented
    }

    // MARK: - Shadbala (Six-fold Strength)

    /// Calculate six-fold strength for all planets
    /// - Parameter profile: The birth profile
    /// - Returns: Array of Shadbala results for each planet
    func calculateShadbala(for profile: BirthProfile) async throws -> [ShadbalaResult] {
        throw CalculationError.notYetImplemented
    }

    // MARK: - Ashtakavarga

    /// Calculate Ashtakavarga (eight-fold strength system)
    /// - Parameter profile: The birth profile
    /// - Returns: AshtakavargaResult with BAV and SAV data
    func calculateAshtakavarga(for profile: BirthProfile) async throws -> AshtakavargaResult {
        throw CalculationError.notYetImplemented
    }

    // MARK: - Full Calculation

    /// Calculate all charts and predictions in one go
    /// - Parameter profile: The birth profile
    /// - Returns: FullCalculationResult containing all calculations
    func calculateFull(for profile: BirthProfile) async throws -> FullCalculationResult {
        throw CalculationError.notYetImplemented
    }

    // MARK: - Cached Calculations

    /// Get cached chart from database
    /// - Parameters:
    ///   - profileId: The profile ID
    ///   - varga: The varga name (default: D1)
    /// - Returns: Cached ChartData if available
    func getCachedChart(profileId: String, varga: String = "D1") async throws -> ChartData? {
        return try await database.getCachedChart(profileId: profileId, varga: varga)
    }

    /// Get cached dasha periods
    /// - Parameter profileId: The profile ID
    /// - Returns: Cached DashaPeriod array if available
    func getCachedDashas(profileId: String) async throws -> [DashaPeriod]? {
        // TODO: Implement when cache schema is ready
        throw CalculationError.notYetImplemented
    }

    /// Get cached shadbala
    /// - Parameter profileId: The profile ID
    /// - Returns: Cached ShadbalaResult array if available
    func getCachedShadbala(profileId: String) async throws -> [ShadbalaResult]? {
        // TODO: Implement when cache schema is ready
        throw CalculationError.notYetImplemented
    }

    /// Get cached ashtakavarga
    /// - Parameter profileId: The profile ID
    /// - Returns: Cached AshtakavargaResult if available
    func getCachedAshtakavarga(profileId: String) async throws -> AshtakavargaResult? {
        // TODO: Implement when cache schema is ready
        throw CalculationError.notYetImplemented
    }

    // MARK: - Cache Management

    /// Invalidate all cached calculations for a profile
    /// - Parameter profileId: The profile ID
    func invalidateCache(profileId: String) async throws {
        // TODO: Implement when cache schema is ready
        throw CalculationError.notYetImplemented
    }

    /// Save calculation result to cache
    /// - Parameters:
    ///   - chart: The chart data to cache
    func cacheChart(_ chart: ChartData) async throws {
        // TODO: Implement when cache schema is ready
        throw CalculationError.notYetImplemented
    }

    // MARK: - Predictions

    /// Get hourly predictions for a specific date
    /// - Parameters:
    ///   - profile: The birth profile
    ///   - date: The date to get predictions for (optional, defaults to now)
    /// - Returns: Array of hourly predictions
    func getHourlyPredictions(for profile: BirthProfile, date: Date = Date()) async throws -> [HourlyPrediction] {
        // Try cache first
        if let cached = try? await getCachedHourlyPredictions(profileId: profile.id, date: date) {
            return cached
        }

        // Generate locally using LocalPredictionGenerator
        guard let chart = try await getCachedChart(profileId: profile.id) else {
            throw CalculationError.cacheNotFound
        }

        let generator = LocalPredictionGenerator.shared
        let predictions = generator.generateHourlyPredictions(for: profile, chart: chart, date: date)
        return predictions
    }

    /// Get monthly predictions
    /// - Parameters:
    ///   - profile: The birth profile
    ///   - year: The year
    ///   - month: The month (1-12)
    /// - Returns: Monthly prediction with daily breakdowns
    func getMonthlyPredictions(for profile: BirthProfile, year: Int, month: Int) async throws -> MonthlyPrediction {
        // Try cache first
        if let cached = try? await getCachedMonthlyPredictions(profileId: profile.id, year: year, month: month) {
            return cached
        }

        // Generate locally using LocalPredictionGenerator
        guard let chart = try await getCachedChart(profileId: profile.id) else {
            throw CalculationError.cacheNotFound
        }

        let generator = LocalPredictionGenerator.shared
        let predictions = generator.generateMonthlyPredictions(for: profile, chart: chart, year: year, month: month)
        return predictions
    }

    /// Get cached hourly predictions
    /// - Parameters:
    ///   - profileId: The profile ID
    ///   - date: The date
    /// - Returns: Cached hourly predictions if available
    func getCachedHourlyPredictions(profileId: String, date: Date) async throws -> [HourlyPrediction]? {
        // TODO: Implement when cache schema is ready
        return nil
    }

    /// Get cached monthly predictions
    /// - Parameters:
    ///   - profileId: The profile ID
    ///   - year: The year
    ///   - month: The month (1-12)
    /// - Returns: Cached monthly prediction if available
    func getCachedMonthlyPredictions(profileId: String, year: Int, month: Int) async throws -> MonthlyPrediction? {
        // TODO: Implement when cache schema is ready
        return nil
    }
}

// MARK: - Integration Notes
//
// To integrate this service with ViewModels:
//
// 1. Replace APIService calls with CalculationService calls
// 2. Add cache-first fallback logic:
//    ```
//    func loadChart(for profile: BirthProfile) async {
//        // Try cache first
//        if let cached = try? await CalculationService.shared.getCachedChart(profileId: profile.id) {
//            chart = cached
//            return
//        }
//        // Compute locally
//        chart = try await CalculationService.shared.calculateChart(for: profile)
//    }
//    ```
//
// 3. Keep APIService for profile CRUD operations (create, update, delete, fetch)
//
// Method signature mapping from APIService:
// - APIService.calculateChart(profileId:) -> CalculationService.calculateChart(for:)
// - APIService.calculateAllVargas(profileId:) -> CalculationService.calculateAllVargas(for:)
// - APIService.calculateDashas(profileId:) -> CalculationService.calculateDashas(for:)
// - APIService.detectYogas(profileId:) -> CalculationService.detectYogas(for:)
// - APIService.calculateShadbala(profileId:) -> CalculationService.calculateShadbala(for:)
// - APIService.calculateAshtakavarga(profileId:) -> CalculationService.calculateAshtakavarga(for:)
// - APIService.calculateFull(profileId:) -> CalculationService.calculateFull(for:)
// - APIService.getHourlyPredictions(profileId:date:) -> CalculationService.getHourlyPredictions(for:date:)
// - APIService.getMonthlyPredictions(profileId:year:month:) -> CalculationService.getMonthlyPredictions(for:year:month:)
// - APIService.invalidateCache(profileId:) -> CalculationService.invalidateCache(profileId:)

// MARK: - Local Prediction Generator
//
// This class provides local astrological predictions when the API server is unavailable.
// It uses cached chart data and generates predictions based on:
// - Vimshottari Dasha periods
// - Moon transits and nakshatras
// - Planet sign positions and house placements
// - Hourly and daily score calculations

class LocalPredictionGenerator: @unchecked Sendable {
    static let shared = LocalPredictionGenerator()

    private let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    private let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        return f
    }()

    private init() {}

    // MARK: - Generate Hourly Predictions

    func generateHourlyPredictions(for profile: BirthProfile, chart: ChartData, date: Date) -> [HourlyPrediction] {
        var predictions: [HourlyPrediction] = []

        let calendar = Calendar.current
        let dateString = dateFormatter.string(from: date)
        let timezone = profile.timezone

        // Get current dasha periods (placeholder - would need real dasha calculation)
        let currentDasha = getCurrentDasha(for: date)
        let moonPosition = getMoonPosition(for: date, from: chart)

        for hour in 0..<24 {
            let hourDate = calendar.date(bySettingHour: hour, minute: 0, second: 0, of: date) ?? date

            // Calculate sookshma and prana dasha for this hour
            let sookshmaDasha = getSookshmaDasha(for: hourDate, mahaDasha: currentDasha)
            let pranaDasha = getPranaDasha(for: hourDate, sookshmaDasha: sookshmaDasha)

            // Get moon position for this hour
            let hourMoonPosition = getMoonPosition(for: hourDate, from: chart)

            // Calculate hourly score
            let score = calculateHourlyScore(
                hour: hour,
                sookshmaPlanet: sookshmaDasha.planet,
                moonSign: hourMoonPosition.sign,
                chart: chart
            )

            // Generate prediction text
            let predictionText = generateHourlyPredictionText(
                hour: hour,
                sookshmaPlanet: sookshmaDasha.planet,
                moonSign: hourMoonPosition.sign,
                moonNakshatra: hourMoonPosition.nakshatra,
                house: hourMoonPosition.house,
                chart: chart
            )

            let prediction = HourlyPrediction(
                id: UUID().uuidString,
                profileId: profile.id,
                date: dateString,
                hour: hour,
                timezone: timezone,
                sookshmaDashaPlanet: sookshmaDasha.planet,
                sookshmaDashaStart: isoFormatter.string(from: sookshmaDasha.start),
                sookshmaDashaEnd: isoFormatter.string(from: sookshmaDasha.end),
                pranaDashaPlanet: pranaDasha.planet,
                pranaDashaStart: isoFormatter.string(from: pranaDasha.start),
                pranaDashaEnd: isoFormatter.string(from: pranaDasha.end),
                moonNakshatra: hourMoonPosition.nakshatra,
                moonSign: hourMoonPosition.sign,
                moonDegree: hourMoonPosition.degree,
                transitLagna: nil,
                transitLagnaSign: nil,
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
        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = 1

        guard let firstDay = calendar.date(from: components) else {
            return MonthlyPrediction(year: year, month: month, profileId: profile.id, dailyPredictions: [])
        }

        // Get days in month by getting the next month and subtracting one day
        var nextMonthComponents = components
        nextMonthComponents.month = (nextMonthComponents.month ?? 1) + 1
        guard let lastDayOfMonth = calendar.date(from: nextMonthComponents),
              let daysInMonthRange = calendar.date(byAdding: .day, value: -1, to: lastDayOfMonth) else {
            return MonthlyPrediction(year: year, month: month, profileId: profile.id, dailyPredictions: [])
        }
        let daysInMonth = calendar.component(.day, from: daysInMonthRange)

        var dailyPredictions: [DailyPrediction] = []

        for day in 1...daysInMonth {
            components.day = day
            guard let date = calendar.date(from: components) else { continue }

            let dateString = dateFormatter.string(from: date)

            // Calculate daily score based on various factors
            let score = calculateDailyScore(for: date, chart: chart, profile: profile)

            // Determine categories for the day
            let categories = determineDailyCategories(for: date, chart: chart)

            let dailyPrediction = DailyPrediction(
                date: dateString,
                score: score,
                categories: categories,
                hourlyCount: 24
            )

            dailyPredictions.append(dailyPrediction)
        }

        return MonthlyPrediction(
            year: year,
            month: month,
            profileId: profile.id,
            dailyPredictions: dailyPredictions
        )
    }

    // MARK: - Helper Methods

    private func getCurrentDasha(for date: Date) -> (planet: Int, start: Date, end: Date) {
        // Placeholder implementation - returns current Mahadasha based on date
        // In a full implementation, this would use actual Vimshottari dasha calculation
        let year = Calendar.current.component(.year, from: date)
        let planetIndex = (year % 9) // Cycle through planets
        let planet = planetIndex

        // Generate date range for a dasha period
        let start = Calendar.current.date(byAdding: .year, value: -5, to: date) ?? date
        let end = Calendar.current.date(byAdding: .year, value: +5, to: date) ?? date

        return (planet, start, end)
    }

    private func getSookshmaDasha(for date: Date, mahaDasha: (planet: Int, start: Date, end: Date)) -> (planet: Int, start: Date, end: Date) {
        // Sookshma dasha is a sub-period of the pratyantardasha
        // Placeholder - cycles through planets based on hour
        let hour = Calendar.current.component(.hour, from: date)
        let planet = (mahaDasha.planet + hour) % 9

        let start = Calendar.current.date(byAdding: .hour, value: -1, to: date) ?? date
        let end = date

        return (planet, start, end)
    }

    private func getPranaDasha(for date: Date, sookshmaDasha: (planet: Int, start: Date, end: Date)) -> (planet: Int, start: Date, end: Date) {
        // Prana dasha is a sub-period of sookshma dasha
        // Placeholder - cycles based on minute
        let minute = Calendar.current.component(.minute, from: date)
        let planet = (sookshmaDasha.planet + minute / 10) % 9

        let start = Calendar.current.date(byAdding: .minute, value: -30, to: date) ?? date
        let end = date

        return (planet, start, end)
    }

    private func getMoonPosition(for date: Date, from chart: ChartData) -> (sign: Int, nakshatra: Int, degree: Double, house: Int) {
        // Get moon from the birth chart and estimate current position
        // This is a simplified calculation - real implementation would calculate actual moon position

        if let moon = chart.planets.first(where: { $0.planet == "Moon" }) {
            // Calculate approximate progression from birth time
            let birthDate = chart.calculatedAt ?? Date()
            let daysSinceBirth = date.timeIntervalSince(birthDate) / (24 * 3600)

            // Moon moves approximately 13 degrees per day
            let degreeProgression = (daysSinceBirth * 13.2).truncatingRemainder(dividingBy: 360)
            let currentDegree = (moon.signLongitude + degreeProgression).truncatingRemainder(dividingBy: 30)
            let currentSign = (moon.sign + Int((moon.signLongitude + degreeProgression) / 30)) % 12
            let nakshatra = Int(currentDegree / 13.33) // 27 nakshatras, each ~13.33 degrees
            let house = calculateHouse(degree: currentDegree, sign: currentSign, chart: chart)

            return (currentSign, nakshatra, currentDegree, house)
        }

        // Default if no moon found
        return (3, 0, 0.0, 4) // Default to Cancer, Ashwini nakshatra, 4th house
    }

    private func calculateHouse(degree: Double, sign: Int, chart: ChartData) -> Int {
        // Simple house calculation based on sign and degree
        // This is a simplified implementation
        let houseSize = 30.0
        let totalDegrees = Double(sign) * 30 + degree

        // Find which house this falls in based on ascendant
        let ascendant = chart.ascendantSign
        let house = Int((totalDegrees - Double(ascendant) * 30 + 360).truncatingRemainder(dividingBy: 360)) / 30 + 1

        return min(max(house, 1), 12)
    }

    private func calculateHourlyScore(hour: Int, sookshmaPlanet: Int, moonSign: Int, chart: ChartData) -> Int {
        // Base score from hour
        var score = 50

        // Add benefic/malefic influence from sookshma dasha planet
        let planetNature = getPlanetNature(sookshmaPlanet)
        score += planetNature == .benefic ? 15 : -10

        // Add sign influence from moon
        let signNature = getSignNature(moonSign)
        score += signNature == .benefic ? 10 : -5

        // Time of day factor
        if hour >= 6 && hour < 12 {
            score += 10 // Morning - favorable
        } else if hour >= 18 && hour < 22 {
            score += 5 // Evening - moderately favorable
        } else if hour >= 22 || hour < 4 {
            score -= 10 // Night - less favorable
        }

        // House placement bonus from chart
        if let moon = chart.planets.first(where: { $0.planet == "Moon" }) {
            let house = moon.house
            if isKendraHouse(house) {
                score += 10 // Kendra houses (1, 4, 7, 10) are strong
            }
            if isTrikaHouse(house) {
                score -= 5 // Trika houses (6, 8, 12) can be challenging
            }
        }

        return min(max(score, 0), 100)
    }

    private func calculateDailyScore(for date: Date, chart: ChartData, profile: BirthProfile) -> Int {
        var score = 50

        // Day of week influence
        let weekday = Calendar.current.component(.weekday, from: date)
        switch weekday {
        case 1: score += 5 // Sunday - Sun
        case 2: score -= 5 // Monday - Moon
        case 3: score += 0 // Tuesday - Mars
        case 4: score += 10 // Wednesday - Mercury
        case 5: score += 10 // Thursday - Jupiter
        case 6: score -= 5 // Friday - Venus
        case 7: score -= 10 // Saturday - Saturn
        default: break
        }

        // Current dasha influence
        let dasha = getCurrentDasha(for: date)
        let planetNature = getPlanetNature(dasha.planet)
        score += planetNature == .benefic ? 15 : -10

        // Moon sign influence
        let moonPos = getMoonPosition(for: date, from: chart)
        let signNature = getSignNature(moonPos.sign)
        score += signNature == .benefic ? 10 : -5

        return min(max(score, 0), 100)
    }

    private func determineDailyCategories(for date: Date, chart: ChartData) -> [String] {
        var categories: [String] = []

        let moonPos = getMoonPosition(for: date, from: chart)
        let hour = Calendar.current.component(.hour, from: date)
        let weekday = Calendar.current.component(.weekday, from: date)

        // Determine categories based on moon sign and day
        switch moonPos.sign {
        case 0, 8: categories.append("career")
        case 1, 5, 9: categories.append("finance")
        case 2, 6: categories.append("relationships")
        case 3, 7: categories.append("health")
        case 4: categories.append("family")
        case 10, 11: categories.append("spiritual")
        default: categories.append("general")
        }

        // Add second category based on time
        if hour >= 9 && hour < 17 {
            categories.append("career")
        } else if hour >= 17 && hour < 21 {
            categories.append("family")
        } else {
            categories.append("personal")
        }

        // Ensure unique categories
        categories = Array(Set(categories))

        return categories.isEmpty ? ["general"] : categories
    }

    private func generateHourlyPredictionText(hour: Int, sookshmaPlanet: Int, moonSign: Int, moonNakshatra: Int, house: Int, chart: ChartData) -> String {
        let planetName = PlanetName.from(id: sookshmaPlanet)
        let signName = Sign(rawValue: moonSign)?.name ?? "Unknown"
        let nakshatraName = getNakshatraName(moonNakshatra)
        let houseArea = getHouseArea(house)

        var text = "This hour is influenced by \(planetName) in \(signName) sign, focusing on \(houseArea)."

        // Add dasha-specific insight
        if sookshmaPlanet == 1 { // Moon
            text += " Your SOOKSHMA dasha of Moon heightens emotional sensitivity."
        } else if sookshmaPlanet == 4 { // Jupiter
            text += " Jupiter's influence brings wisdom and expansion."
        } else if sookshmaPlanet == 5 { // Venus
            text += " Venus brings focus on relationships and creative pursuits."
        } else if sookshmaPlanet == 6 { // Saturn
            text += " Saturn's energy demands discipline and persistence."
        }

        // Add nakshatra insight
        text += " The \(nakshatraName) nakshatra adds its unique flavor to this period."

        return text
    }

    private enum PlanetNature {
        case benefic
        case malefic
        case neutral
    }

    private func getPlanetNature(_ planet: Int) -> PlanetNature {
        switch planet {
        case 1: return .benefic // Moon
        case 4: return .benefic // Jupiter
        case 5: return .benefic // Venus
        case 6: return .malefic // Saturn
        case 7: return .malefic // Rahu
        case 8: return .malefic // Ketu
        case 0, 2, 3: return .neutral // Sun, Mars, Mercury
        default: return .neutral
        }
    }

    private func getSignNature(_ sign: Int) -> PlanetNature {
        // Fire signs (0, 4, 8) - Aries, Leo, Sagittarius - generally benefic for action
        // Earth signs (1, 5, 9) - Taurus, Virgo, Capricorn - generally benefic for material matters
        // Air signs (2, 6, 10) - Gemini, Libra, Aquarius - neutral
        // Water signs (3, 7, 11) - Cancer, Scorpio, Pisces - benefic for emotions

        switch sign {
        case 1, 5, 9: return .benefic // Taurus, Virgo, Capricorn
        case 3, 7, 11: return .benefic // Cancer, Scorpio, Pisces
        case 0, 4, 8: return .neutral // Aries, Leo, Sagittarius
        default: return .neutral // Gemini, Libra, Aquarius
        }
    }

    private func isKendraHouse(_ house: Int) -> Bool {
        return [1, 4, 7, 10].contains(house)
    }

    private func isTrikaHouse(_ house: Int) -> Bool {
        return [6, 8, 12].contains(house)
    }

    private func getNakshatraName(_ index: Int) -> String {
        let nakshatras = [
            "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashirsha", "Ardra",
            "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
            "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
            "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishtha",
            "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
        ]
        let safeIndex = max(0, min(index, nakshatras.count - 1))
        return nakshatras[safeIndex]
    }

    private func getHouseArea(_ house: Int) -> String {
        switch house {
        case 1: return "self and personality"
        case 2: return "wealth and family"
        case 3: return "siblings and communication"
        case 4: return "home and emotions"
        case 5: return "children and creativity"
        case 6: return "health and service"
        case 7: return "partnerships and marriage"
        case 8: return "transformation and shared resources"
        case 9: return "philosophy and travel"
        case 10: return "career and reputation"
        case 11: return "friendships and aspirations"
        case 12: return "spirituality and expenses"
        default: return "life matters"
        }
    }
}
