import Foundation
import SQLite3

// MARK: - Database Cache Errors

enum DatabaseCacheError: LocalizedError {
    case notFound
    case parseError(String)
    case databaseError(String)

    var errorDescription: String? {
        switch self {
        case .notFound:
            return "No cached data found"
        case .parseError(let message):
            return "Failed to parse cached data: \(message)"
        case .databaseError(let message):
            return "Database error: \(message)"
        }
    }
}

// MARK: - Cache Entry

struct CacheEntry<T: Sendable>: Sendable {
    let data: T
    let computedAt: Date
    let profileId: String
}

// MARK: - Database Cache
//
// Reads pre-computed calculations from the shared SQLite database.
// The CLI writes calculations to the database, and Swift reads them here.

public actor DatabaseCache {
    public static let shared = DatabaseCache()

    private let dbPath: String

    private var db: OpaquePointer?

    private init() {
        // Same path as DatabaseService
        let appSupport = FileManager.default
            .urls(for: .applicationSupportDirectory, in: .userDomainMask)
            .first!
            .appendingPathComponent("ParashariApp/astrology.sqlite")
        self.dbPath = appSupport.path
    }

    // MARK: - Connection

    private func openDatabase() throws -> OpaquePointer {
        if let existing = db {
            return existing
        }
        guard FileManager.default.fileExists(atPath: dbPath) else {
            throw DatabaseCacheError.notFound
        }
        var pointer: OpaquePointer?
        let flags = SQLITE_OPEN_READONLY | SQLITE_OPEN_NOMUTEX
        let result = sqlite3_open_v2(dbPath, &pointer, flags, nil)
        guard result == SQLITE_OK, let pointer = pointer else {
            let msg = pointer.map { String(cString: sqlite3_errmsg($0)) } ?? "Unknown error"
            throw DatabaseCacheError.databaseError(msg)
        }
        db = pointer
        return pointer
    }

    public func close() {
        if let pointer = db {
            sqlite3_close(pointer)
            db = nil
        }
    }

    // MARK: - Chart Cache

    /// Get cached chart data for a profile
    public func getChart(profileId: String, varga: String = "D1") throws -> ChartData? {
        let connection = try openDatabase()
        let sql = """
            SELECT data, computed_at
            FROM calculations_cache
            WHERE profile_id = ? AND calculation_type = 'chart' AND varga = ?
            ORDER BY computed_at DESC
            LIMIT 1
            """
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(connection, sql, -1, &statement, nil) == SQLITE_OK else {
            let msg = String(cString: sqlite3_errmsg(connection))
            throw DatabaseCacheError.databaseError(msg)
        }
        defer { sqlite3_finalize(statement) }

        sqlite3_bind_text(statement, 1, profileId, -1, SQLITE_TRANSIENT)
        sqlite3_bind_text(statement, 2, varga, -1, SQLITE_TRANSIENT)

        if sqlite3_step(statement) == SQLITE_ROW {
            guard let dataPtr = sqlite3_column_text(statement, 0) else { return nil }
            let jsonString = String(cString: dataPtr)
            guard let data = jsonString.data(using: .utf8) else { return nil }

            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            decoder.dateDecodingStrategy = .iso8601

            do {
                return try decoder.decode(ChartData.self, from: data)
            } catch {
                throw DatabaseCacheError.parseError(error.localizedDescription)
            }
        }
        return nil
    }

    /// Get all cached vargas for a profile
    public func getAllVargas(profileId: String) throws -> [String: ChartData] {
        let connection = try openDatabase()
        let sql = """
            SELECT varga, data, computed_at
            FROM calculations_cache
            WHERE profile_id = ? AND calculation_type = 'chart'
            ORDER BY computed_at DESC
            """
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(connection, sql, -1, &statement, nil) == SQLITE_OK else {
            let msg = String(cString: sqlite3_errmsg(connection))
            throw DatabaseCacheError.databaseError(msg)
        }
        defer { sqlite3_finalize(statement) }

        sqlite3_bind_text(statement, 1, profileId, -1, SQLITE_TRANSIENT)

        var result: [String: ChartData] = [:]
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601

        while sqlite3_step(statement) == SQLITE_ROW {
            guard let vargaPtr = sqlite3_column_text(statement, 0),
                  let dataPtr = sqlite3_column_text(statement, 1) else { continue }

            let varga = String(cString: vargaPtr)
            let jsonString = String(cString: dataPtr)

            if let data = jsonString.data(using: .utf8),
               let chart = try? decoder.decode(ChartData.self, from: data) {
                result[varga] = chart
            }
        }

        return result
    }

    // MARK: - Dasha Cache

    /// Get cached dasha periods
    public func getDashas(profileId: String) throws -> [DashaPeriod]? {
        let connection = try openDatabase()
        let sql = """
            SELECT data, computed_at
            FROM calculations_cache
            WHERE profile_id = ? AND calculation_type = 'dasha'
            ORDER BY computed_at DESC
            LIMIT 1
            """
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(connection, sql, -1, &statement, nil) == SQLITE_OK else {
            let msg = String(cString: sqlite3_errmsg(connection))
            throw DatabaseCacheError.databaseError(msg)
        }
        defer { sqlite3_finalize(statement) }

        sqlite3_bind_text(statement, 1, profileId, -1, SQLITE_TRANSIENT)

        if sqlite3_step(statement) == SQLITE_ROW {
            guard let dataPtr = sqlite3_column_text(statement, 0) else { return nil }
            let jsonString = String(cString: dataPtr)
            guard let data = jsonString.data(using: .utf8) else { return nil }

            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            decoder.dateDecodingStrategy = .iso8601

            do {
                return try decoder.decode([DashaPeriod].self, from: data)
            } catch {
                throw DatabaseCacheError.parseError(error.localizedDescription)
            }
        }
        return nil
    }

    // MARK: - Shadbala Cache

    /// Get cached shadbala results
    public func getShadbala(profileId: String) throws -> [ShadbalaResult]? {
        let connection = try openDatabase()
        let sql = """
            SELECT data, computed_at
            FROM calculations_cache
            WHERE profile_id = ? AND calculation_type = 'shadbala'
            ORDER BY computed_at DESC
            LIMIT 1
            """
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(connection, sql, -1, &statement, nil) == SQLITE_OK else {
            let msg = String(cString: sqlite3_errmsg(connection))
            throw DatabaseCacheError.databaseError(msg)
        }
        defer { sqlite3_finalize(statement) }

        sqlite3_bind_text(statement, 1, profileId, -1, SQLITE_TRANSIENT)

        if sqlite3_step(statement) == SQLITE_ROW {
            guard let dataPtr = sqlite3_column_text(statement, 0) else { return nil }
            let jsonString = String(cString: dataPtr)
            guard let data = jsonString.data(using: .utf8) else { return nil }

            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            decoder.dateDecodingStrategy = .iso8601

            do {
                return try decoder.decode([ShadbalaResult].self, from: data)
            } catch {
                throw DatabaseCacheError.parseError(error.localizedDescription)
            }
        }
        return nil
    }

    // MARK: - Ashtakavarga Cache

    /// Get cached ashtakavarga result
    public func getAshtakavarga(profileId: String) throws -> AshtakavargaResult? {
        let connection = try openDatabase()
        let sql = """
            SELECT data, computed_at
            FROM calculations_cache
            WHERE profile_id = ? AND calculation_type = 'ashtakavarga'
            ORDER BY computed_at DESC
            LIMIT 1
            """
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(connection, sql, -1, &statement, nil) == SQLITE_OK else {
            let msg = String(cString: sqlite3_errmsg(connection))
            throw DatabaseCacheError.databaseError(msg)
        }
        defer { sqlite3_finalize(statement) }

        sqlite3_bind_text(statement, 1, profileId, -1, SQLITE_TRANSIENT)

        if sqlite3_step(statement) == SQLITE_ROW {
            guard let dataPtr = sqlite3_column_text(statement, 0) else { return nil }
            let jsonString = String(cString: dataPtr)
            guard let data = jsonString.data(using: .utf8) else { return nil }

            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            decoder.dateDecodingStrategy = .iso8601

            do {
                return try decoder.decode(AshtakavargaResult.self, from: data)
            } catch {
                throw DatabaseCacheError.parseError(error.localizedDescription)
            }
        }
        return nil
    }

    // MARK: - Yoga Cache

    /// Get cached yoga results
    public func getYogas(profileId: String) throws -> [YogaResult]? {
        let connection = try openDatabase()
        let sql = """
            SELECT data, computed_at
            FROM calculations_cache
            WHERE profile_id = ? AND calculation_type = 'yoga'
            ORDER BY computed_at DESC
            LIMIT 1
            """
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(connection, sql, -1, &statement, nil) == SQLITE_OK else {
            let msg = String(cString: sqlite3_errmsg(connection))
            throw DatabaseCacheError.databaseError(msg)
        }
        defer { sqlite3_finalize(statement) }

        sqlite3_bind_text(statement, 1, profileId, -1, SQLITE_TRANSIENT)

        if sqlite3_step(statement) == SQLITE_ROW {
            guard let dataPtr = sqlite3_column_text(statement, 0) else { return nil }
            let jsonString = String(cString: dataPtr)
            guard let data = jsonString.data(using: .utf8) else { return nil }

            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            decoder.dateDecodingStrategy = .iso8601

            do {
                return try decoder.decode([YogaResult].self, from: data)
            } catch {
                throw DatabaseCacheError.parseError(error.localizedDescription)
            }
        }
        return nil
    }

    // MARK: - Full Calculation Cache

    /// Get all cached calculations for a profile (most efficient - single query)
    public func getFullCalculation(profileId: String) throws -> (
        chart: ChartData,
        vargas: [String: ChartData],
        dashas: [DashaPeriod],
        shadbala: [ShadbalaResult],
        ashtakavarga: AshtakavargaResult,
        yogas: [YogaResult],
        computedAt: Date
    )? {
        // Get main chart
        guard let chart = try getChart(profileId: profileId, varga: "D1") else {
            return nil
        }

        // Get vargas
        let vargas = (try? getAllVargas(profileId: profileId)) ?? [:]

        // Get dashas
        let dashas = (try? getDashas(profileId: profileId)) ?? []

        // Get shadbala
        let shadbala = (try? getShadbala(profileId: profileId)) ?? []

        // Get ashtakavarga
        let ashtakavarga = (try? getAshtakavarga(profileId: profileId))

        // Get yogas
        let yogas = (try? getYogas(profileId: profileId)) ?? []

        // Get computedAt from chart
        let computedAt = chart.calculatedAt ?? Date()

        return (chart, vargas, dashas, shadbala, ashtakavarga ?? AshtakavargaResult(profileId: profileId, bav: [], sav: []), yogas, computedAt)
    }

    // MARK: - Cache Validity

    /// Check if cache is valid for a profile (exists and is recent)
    public func isCacheValid(profileId: String, maxAge: TimeInterval = 86400 * 30) async -> Bool {
        do {
            if let chart = try getChart(profileId: profileId, varga: "D1"),
               let computedAt = chart.calculatedAt {
                return Date().timeIntervalSince(computedAt) < maxAge
            }
        } catch {
            return false
        }
        return false
    }
}

// Workaround for SQLite SQLITE_TRANSIENT constant in Swift
private let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
