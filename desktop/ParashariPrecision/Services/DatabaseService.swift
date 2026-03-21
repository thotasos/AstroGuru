import Foundation
import SQLite3

actor DatabaseService {
    private var db: OpaquePointer?
    private let dbPath: String

    init(inMemory: Bool = false) throws {
        if inMemory {
            self.dbPath = ":memory:"
        } else {
            let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
            let dir = appSupport.appendingPathComponent("ParashariPrecision")
            try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            self.dbPath = dir.appendingPathComponent("astrology.sqlite").path
        }
    }

    func initialize() throws {
        db = OpaquePointer(cString: dbPath)
        guard db != nil else { throw DatabaseError.openFailed }

        // Set WAL mode and FK enforcement
        try execute("PRAGMA journal_mode = WAL;")
        try execute("PRAGMA foreign_keys = ON;")

        // Create tables
        try execute("""
            CREATE TABLE IF NOT EXISTS profiles (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                dob_utc TEXT NOT NULL,
                lat REAL NOT NULL,
                lon REAL NOT NULL,
                timezone TEXT NOT NULL,
                utc_offset REAL NOT NULL,
                place_name TEXT,
                ayanamsa_id INTEGER DEFAULT 1,
                notes TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            );
        """)

        try execute("""
            CREATE TABLE IF NOT EXISTS calculation_cache (
                profile_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
                chart_json TEXT,
                vargas_json TEXT,
                dashas_json TEXT,
                yogas_json TEXT,
                shadbala_json TEXT,
                ashtakavarga_json TEXT,
                computed_at TEXT DEFAULT (datetime('now'))
            );
        """)

        try execute("""
            CREATE TABLE IF NOT EXISTS events_journal (
                id TEXT PRIMARY KEY,
                profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
                event_date TEXT NOT NULL,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                sentiment INTEGER,
                created_at TEXT DEFAULT (datetime('now'))
            );
        """)

        try execute("""
            CREATE TABLE IF NOT EXISTS ayanamsas (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT
            );
        """)

        // Seed ayanamsas
        try execute("INSERT OR IGNORE INTO ayanamsas VALUES (1, 'Lahiri', 'Chitrapaksha ayanamsa');")
        try execute("INSERT OR IGNORE INTO ayanamsas VALUES (2, 'Raman', 'B.V. Raman ayanamsa');")
        try execute("INSERT OR IGNORE INTO ayanamsas VALUES (3, 'KP', 'Krishnamurti Paddhati ayanamsa');")
    }

    func saveProfile(_ profile: Profile) throws {
        let sql = """
            INSERT OR REPLACE INTO profiles (id, name, dob_utc, lat, lon, timezone, utc_offset, place_name, ayanamsa_id, notes, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'));
        """
        let stmt = try prepare(sql)
        defer { sqlite3_finalize(stmt) }

        sqlite3_bind_text(stmt, 1, profile.id)
        sqlite3_bind_text(stmt, 2, profile.name)
        sqlite3_bind_text(stmt, 3, profile.dobUTC)
        sqlite3_bind_double(stmt, 4, profile.latitude)
        sqlite3_bind_double(stmt, 5, profile.longitude)
        sqlite3_bind_text(stmt, 6, profile.timezone)
        sqlite3_bind_double(stmt, 7, profile.utcOffset)
        if let place = profile.placeName {
            sqlite3_bind_text(stmt, 8, place)
        } else {
            sqlite3_bind_null(stmt, 8)
        }
        sqlite3_bind_int(stmt, 9, Int32(profile.ayanamsaId))
        if let notes = profile.notes {
            sqlite3_bind_text(stmt, 10, notes)
        } else {
            sqlite3_bind_null(stmt, 10)
        }
        try step(stmt)
    }

    func fetchProfile(id: String) throws -> Profile? {
        let sql = "SELECT * FROM profiles WHERE id = ?;"
        let stmt = try prepare(sql)
        defer { sqlite3_finalize(stmt) }

        sqlite3_bind_text(stmt, 1, id)

        if sqlite3_step(stmt) == SQLITE_ROW {
            return profileFromRow(stmt)
        }
        return nil
    }

    func fetchAllProfiles() throws -> [Profile] {
        let sql = "SELECT * FROM profiles ORDER BY created_at DESC;"
        let stmt = try prepare(sql)
        defer { sqlite3_finalize(stmt) }

        var profiles: [Profile] = []
        while sqlite3_step(stmt) == SQLITE_ROW {
            profiles.append(profileFromRow(stmt))
        }
        return profiles
    }

    func deleteProfile(id: String) throws {
        let sql = "DELETE FROM profiles WHERE id = ?;"
        let stmt = try prepare(sql)
        defer { sqlite3_finalize(stmt) }
        sqlite3_bind_text(stmt, 1, id)
        try step(stmt)
    }

    func saveChartCache(profileId: String, chartJson: String) throws {
        let sql = """
            INSERT OR REPLACE INTO calculation_cache (profile_id, chart_json, computed_at)
            VALUES (?, ?, datetime('now'));
        """
        let stmt = try prepare(sql)
        defer { sqlite3_finalize(stmt) }
        sqlite3_bind_text(stmt, 1, profileId)
        sqlite3_bind_text(stmt, 2, chartJson)
        try step(stmt)
    }

    func fetchChartCache(profileId: String) throws -> String? {
        let sql = "SELECT chart_json FROM calculation_cache WHERE profile_id = ?;"
        let stmt = try prepare(sql)
        defer { sqlite3_finalize(stmt) }
        sqlite3_bind_text(stmt, 1, profileId)
        if sqlite3_step(stmt) == SQLITE_ROW {
            if let text = sqlite3_column_text(stmt, 0) {
                return String(cString: text)
            }
        }
        return nil
    }

    // MARK: - Private helpers

    private func execute(_ sql: String) throws {
        let result = sqlite3_exec(db, sql, nil, nil, nil)
        guard result == SQLITE_OK else { throw DatabaseError.executeFailed(result) }
    }

    private func prepare(_ sql: String) throws -> OpaquePointer {
        var stmt: OpaquePointer?
        let result = sqlite3_prepare_v2(db, sql, -1, &stmt, nil)
        guard result == SQLITE_OK, let stmt = stmt else { throw DatabaseError.prepareFailed }
        return stmt
    }

    private func step(_ stmt: OpaquePointer) throws {
        let result = sqlite3_step(stmt)
        guard result == SQLITE_DONE else { throw DatabaseError.stepFailed(result) }
    }

    private func profileFromRow(_ stmt: OpaquePointer) -> Profile {
        return Profile(
            id: String(cString: sqlite3_column_text(stmt, 0)),
            name: String(cString: sqlite3_column_text(stmt, 1)),
            dobUTC: String(cString: sqlite3_column_text(stmt, 2)),
            latitude: sqlite3_column_double(stmt, 3),
            longitude: sqlite3_column_double(stmt, 4),
            timezone: String(cString: sqlite3_column_text(stmt, 5)),
            utcOffset: sqlite3_column_double(stmt, 6),
            placeName: sqlite3_column_text(stmt, 7).map { String(cString: $0) },
            ayanamsaId: Int(sqlite3_column_int(stmt, 8)),
            notes: sqlite3_column_text(stmt, 9).map { String(cString: $0) },
            createdAt: sqlite3_column_text(stmt, 10).map { String(cString: $0) },
            updatedAt: sqlite3_column_text(stmt, 11).map { String(cString: $0) }
        )
    }
}

enum DatabaseError: Error, LocalizedError {
    case openFailed
    case executeFailed(Int32)
    case prepareFailed
    case stepFailed(Int32)

    var errorDescription: String? {
        switch self {
        case .openFailed: return "Failed to open database"
        case .executeFailed(let code): return "SQL execute failed: \(code)"
        case .prepareFailed: return "SQL prepare failed"
        case .stepFailed(let code): return "SQL step failed: \(code)"
        }
    }
}