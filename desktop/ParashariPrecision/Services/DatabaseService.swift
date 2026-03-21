import Foundation
import SQLite3

final class DatabaseService: @unchecked Sendable {
    private nonisolated(unsafe) var db: OpaquePointer?
    private let dbPath: String
    private let queue = DispatchQueue(label: "com.parashari.database")

    /// When `inMemory` is `true`, this initializer never throws — it only sets `dbPath = ":memory:"`.
    /// This guarantee is relied upon by `ProfilesViewModel` for its crash-safe fallback init.
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
        try queue.sync {
            let result = sqlite3_open(dbPath, &db)
            guard result == SQLITE_OK else { throw DatabaseError.openFailed }

            try executeInternal("PRAGMA journal_mode = WAL;")
            try executeInternal("PRAGMA foreign_keys = ON;")

            try executeInternal("""
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

            try executeInternal("""
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

            try executeInternal("""
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

            try executeInternal("""
                CREATE TABLE IF NOT EXISTS ayanamsas (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT
                );
            """)

            try executeInternal("INSERT OR IGNORE INTO ayanamsas VALUES (1, 'Lahiri', 'Chitrapaksha ayanamsa');")
            try executeInternal("INSERT OR IGNORE INTO ayanamsas VALUES (2, 'Raman', 'B.V. Raman ayanamsa');")
            try executeInternal("INSERT OR IGNORE INTO ayanamsas VALUES (3, 'KP', 'Krishnamurti Paddhati ayanamsa');")
        }
    }

    func saveProfile(_ profile: Profile) throws {
        try queue.sync {
            let sql = """
                INSERT OR REPLACE INTO profiles (id, name, dob_utc, lat, lon, timezone, utc_offset, place_name, ayanamsa_id, notes, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'));
            """
            var stmt: OpaquePointer?
            guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK, let s = stmt else {
                throw DatabaseError.prepareFailed
            }
            defer { sqlite3_finalize(s) }

            let idCStr = profile.id.cString(using: .utf8)!
            let nameCStr = profile.name.cString(using: .utf8)!
            let dobCStr = profile.dobUTC.cString(using: .utf8)!
            let tzCStr = profile.timezone.cString(using: .utf8)!

            sqlite3_bind_text(s, 1, idCStr, -1, nil)
            sqlite3_bind_text(s, 2, nameCStr, -1, nil)
            sqlite3_bind_text(s, 3, dobCStr, -1, nil)
            sqlite3_bind_double(s, 4, profile.latitude)
            sqlite3_bind_double(s, 5, profile.longitude)
            sqlite3_bind_text(s, 6, tzCStr, -1, nil)
            sqlite3_bind_double(s, 7, profile.utcOffset)
            if let place = profile.placeName {
                let placeCStr = place.cString(using: .utf8)!
                sqlite3_bind_text(s, 8, placeCStr, -1, nil)
            } else {
                sqlite3_bind_null(s, 8)
            }
            sqlite3_bind_int(s, 9, Int32(profile.ayanamsaId))
            if let notes = profile.notes {
                let notesCStr = notes.cString(using: .utf8)!
                sqlite3_bind_text(s, 10, notesCStr, -1, nil)
            } else {
                sqlite3_bind_null(s, 10)
            }

            guard sqlite3_step(s) == SQLITE_DONE else {
                throw DatabaseError.stepFailed(0)
            }
        }
    }

    func fetchProfile(id profileId: String) throws -> Profile? {
        try queue.sync {
            let sql = "SELECT id, name, dob_utc, lat, lon, timezone, utc_offset, place_name, ayanamsa_id, notes, created_at, updated_at FROM profiles WHERE id = ?;"
            var stmt: OpaquePointer?
            guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK, let s = stmt else {
                throw DatabaseError.prepareFailed
            }
            defer { sqlite3_finalize(s) }

            let idCStr = profileId.cString(using: .utf8)!
            sqlite3_bind_text(s, 1, idCStr, -1, nil)

            if sqlite3_step(s) == SQLITE_ROW {
                return profileFromRow(s)
            }
            return nil
        }
    }

    func fetchAllProfiles() throws -> [Profile] {
        try queue.sync {
            let sql = "SELECT id, name, dob_utc, lat, lon, timezone, utc_offset, place_name, ayanamsa_id, notes, created_at, updated_at FROM profiles ORDER BY created_at DESC;"
            var stmt: OpaquePointer?
            guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK, let s = stmt else {
                throw DatabaseError.prepareFailed
            }
            defer { sqlite3_finalize(s) }

            var profiles: [Profile] = []
            while sqlite3_step(s) == SQLITE_ROW {
                profiles.append(profileFromRow(s))
            }
            return profiles
        }
    }

    func deleteProfile(id profileId: String) throws {
        try queue.sync {
            let sql = "DELETE FROM profiles WHERE id = ?;"
            var stmt: OpaquePointer?
            guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK, let s = stmt else {
                throw DatabaseError.prepareFailed
            }
            defer { sqlite3_finalize(s) }

            let idCStr = profileId.cString(using: .utf8)!
            sqlite3_bind_text(s, 1, idCStr, -1, nil)

            guard sqlite3_step(s) == SQLITE_DONE else {
                throw DatabaseError.stepFailed(0)
            }
        }
    }

    func saveChartCache(profileId: String, chartJson: String) throws {
        try queue.sync {
            let sql = "INSERT OR REPLACE INTO calculation_cache (profile_id, chart_json, computed_at) VALUES (?, ?, datetime('now'));"
            var stmt: OpaquePointer?
            guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK, let s = stmt else {
                throw DatabaseError.prepareFailed
            }
            defer { sqlite3_finalize(s) }

            let idCStr = profileId.cString(using: .utf8)!
            let jsonCStr = chartJson.cString(using: .utf8)!
            sqlite3_bind_text(s, 1, idCStr, -1, nil)
            sqlite3_bind_text(s, 2, jsonCStr, -1, nil)

            guard sqlite3_step(s) == SQLITE_DONE else {
                throw DatabaseError.stepFailed(0)
            }
        }
    }

    func fetchChartCache(profileId: String) throws -> String? {
        try queue.sync {
            let sql = "SELECT chart_json FROM calculation_cache WHERE profile_id = ?;"
            var stmt: OpaquePointer?
            guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK, let s = stmt else {
                throw DatabaseError.prepareFailed
            }
            defer { sqlite3_finalize(s) }

            let idCStr = profileId.cString(using: .utf8)!
            sqlite3_bind_text(s, 1, idCStr, -1, nil)

            if sqlite3_step(s) == SQLITE_ROW {
                if let text = sqlite3_column_text(s, 0) {
                    return String(cString: text)
                }
            }
            return nil
        }
    }

    // MARK: - Private helpers

    private func executeInternal(_ sql: String) throws {
        let result = sqlite3_exec(db, sql, nil, nil, nil)
        guard result == SQLITE_OK else { throw DatabaseError.executeFailed(result) }
    }

    private func profileFromRow(_ stmt: OpaquePointer) -> Profile {
        func getString(_ idx: Int32) -> String? {
            guard let text = sqlite3_column_text(stmt, idx) else { return nil }
            return String(cString: text)
        }

        return Profile(
            id: getString(0) ?? "",
            name: getString(1) ?? "",
            dobUTC: getString(2) ?? "",
            latitude: sqlite3_column_double(stmt, 3),
            longitude: sqlite3_column_double(stmt, 4),
            timezone: getString(5) ?? "",
            utcOffset: sqlite3_column_double(stmt, 6),
            placeName: getString(7),
            ayanamsaId: Int(sqlite3_column_int(stmt, 8)),
            notes: getString(9),
            createdAt: getString(10),
            updatedAt: getString(11)
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
