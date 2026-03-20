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
        throw CalculationError.notYetImplemented
    }

    /// Get monthly predictions
    /// - Parameters:
    ///   - profile: The birth profile
    ///   - year: The year
    ///   - month: The month (1-12)
    /// - Returns: Monthly prediction with daily breakdowns
    func getMonthlyPredictions(for profile: BirthProfile, year: Int, month: Int) async throws -> MonthlyPrediction {
        throw CalculationError.notYetImplemented
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
