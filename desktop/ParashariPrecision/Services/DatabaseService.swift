import Foundation
import SQLite3

// MARK: - Database Errors

enum DatabaseError: LocalizedError {
    case notFound
    case openFailed(String)
    case queryFailed(String)
    case noData

    var errorDescription: String? {
        switch self {
        case .notFound: return "Database file not found"
        case .openFailed(let msg): return "Failed to open database: \(msg)"
        case .queryFailed(let msg): return "Query failed: \(msg)"
        case .noData: return "No data found"
        }
    }
}

// MARK: - Database Service

actor DatabaseService {
    static let shared = DatabaseService()

    let dbPath: String

    private var db: OpaquePointer?

    init() {
        let appSupport = FileManager.default
            .urls(for: .applicationSupportDirectory, in: .userDomainMask)
            .first!
            .appendingPathComponent("ParashariApp/astrology.sqlite")
        self.dbPath = appSupport.path
    }

    // MARK: - Connection Management

    private func openDatabase() throws -> OpaquePointer {
        if let existing = db {
            return existing
        }
        guard FileManager.default.fileExists(atPath: dbPath) else {
            throw DatabaseError.notFound
        }
        var pointer: OpaquePointer?
        let flags = SQLITE_OPEN_READONLY | SQLITE_OPEN_NOMUTEX
        let result = sqlite3_open_v2(dbPath, &pointer, flags, nil)
        guard result == SQLITE_OK, let pointer = pointer else {
            let msg = pointer.map { String(cString: sqlite3_errmsg($0)) } ?? "Unknown error"
            throw DatabaseError.openFailed(msg)
        }
        db = pointer
        return pointer
    }

    func close() {
        if let pointer = db {
            sqlite3_close(pointer)
            db = nil
        }
    }

    // MARK: - Profile Queries

    func getProfiles() throws -> [BirthProfile] {
        let connection = try openDatabase()
        let sql = """
            SELECT id, name, dob_utc, lat, lon, timezone, place_name, notes, status
            FROM profiles
            ORDER BY name ASC
            """
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(connection, sql, -1, &statement, nil) == SQLITE_OK else {
            let msg = String(cString: sqlite3_errmsg(connection))
            throw DatabaseError.queryFailed(msg)
        }
        defer { sqlite3_finalize(statement) }

        var profiles: [BirthProfile] = []
        while sqlite3_step(statement) == SQLITE_ROW {
            if let profile = parseProfile(from: statement) {
                profiles.append(profile)
            }
        }
        return profiles
    }

    func getProfile(id: String) throws -> BirthProfile? {
        let connection = try openDatabase()
        let sql = """
            SELECT id, name, dob_utc, lat, lon, timezone, place_name, notes, status
            FROM profiles
            WHERE id = ?
            """
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(connection, sql, -1, &statement, nil) == SQLITE_OK else {
            let msg = String(cString: sqlite3_errmsg(connection))
            throw DatabaseError.queryFailed(msg)
        }
        defer { sqlite3_finalize(statement) }

        sqlite3_bind_text(statement, 1, id, -1, SQLITE_TRANSIENT)
        if sqlite3_step(statement) == SQLITE_ROW {
            return parseProfile(from: statement)
        }
        return nil
    }

    // MARK: - Cached Chart Queries

    func getCachedChart(profileId: String, varga: String = "D1") throws -> ChartData? {
        let connection = try openDatabase()
        let sql = """
            SELECT data FROM chart_cache
            WHERE profile_id = ? AND varga = ?
            ORDER BY calculated_at DESC
            LIMIT 1
            """
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(connection, sql, -1, &statement, nil) == SQLITE_OK else {
            return nil
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
            return try? decoder.decode(ChartData.self, from: data)
        }
        return nil
    }

    // MARK: - Write Operations (open in read-write mode separately)

    func saveNote(profileId: String, note: String) throws {
        guard FileManager.default.fileExists(atPath: dbPath) else {
            throw DatabaseError.notFound
        }
        var writeDb: OpaquePointer?
        let flags = SQLITE_OPEN_READWRITE | SQLITE_OPEN_NOMUTEX
        let result = sqlite3_open_v2(dbPath, &writeDb, flags, nil)
        guard result == SQLITE_OK, let writeDb = writeDb else {
            throw DatabaseError.openFailed("Cannot open for writing")
        }
        defer { sqlite3_close(writeDb) }

        let sql = "UPDATE profiles SET notes = ? WHERE id = ?"
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(writeDb, sql, -1, &statement, nil) == SQLITE_OK else {
            let msg = String(cString: sqlite3_errmsg(writeDb))
            throw DatabaseError.queryFailed(msg)
        }
        defer { sqlite3_finalize(statement) }

        sqlite3_bind_text(statement, 1, note, -1, SQLITE_TRANSIENT)
        sqlite3_bind_text(statement, 2, profileId, -1, SQLITE_TRANSIENT)
        sqlite3_step(statement)
    }

    // MARK: - Helpers

    private func parseProfile(from statement: OpaquePointer?) -> BirthProfile? {
        guard let statement = statement else { return nil }

        guard let idPtr = sqlite3_column_text(statement, 0),
              let namePtr = sqlite3_column_text(statement, 1),
              let dobPtr = sqlite3_column_text(statement, 2) else {
            return nil
        }

        let id = String(cString: idPtr)
        let name = String(cString: namePtr)
        let dobString = String(cString: dobPtr)

        let lat = sqlite3_column_double(statement, 3)
        let lon = sqlite3_column_double(statement, 4)

        let timezone = sqlite3_column_text(statement, 5).map { String(cString: $0) } ?? "UTC"
        let placeName = sqlite3_column_text(statement, 6).map { String(cString: $0) } ?? ""
        let notes = sqlite3_column_text(statement, 7).map { String(cString: $0) } ?? ""
        let statusString = sqlite3_column_text(statement, 8).map { String(cString: $0) } ?? "new"
        let status = ProfileStatus(rawValue: statusString) ?? .new

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let dob = formatter.date(from: dobString) ?? Date()

        return BirthProfile(
            id: id,
            name: name,
            dobUTC: dob,
            lat: lat,
            lon: lon,
            timezone: timezone,
            placeName: placeName,
            notes: notes,
            status: status
        )
    }
}

// Workaround for SQLite SQLITE_TRANSIENT constant in Swift
private let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
