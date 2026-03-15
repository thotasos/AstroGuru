import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

/**
 * Returns the absolute path to the SQLite database file.
 *
 * Production (macOS): ~/Library/Application Support/ParashariApp/astrology.sqlite
 * Development fallback: ./astrology.sqlite (relative to cwd)
 */
export function getDbPath(): string {
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }

  if (process.platform === 'darwin') {
    const appSupport = path.join(
      os.homedir(),
      'Library',
      'Application Support',
      'ParashariApp',
    );
    return path.join(appSupport, 'astrology.sqlite');
  }

  if (process.platform === 'win32') {
    const appData = process.env['APPDATA'] ?? path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'ParashariApp', 'astrology.sqlite');
  }

  // Linux / development fallback
  const xdgData = process.env['XDG_DATA_HOME'] ?? path.join(os.homedir(), '.local', 'share');
  return path.join(xdgData, 'ParashariApp', 'astrology.sqlite');
}

// ---------------------------------------------------------------------------
// Singleton instance
// ---------------------------------------------------------------------------

let _db: Database.Database | undefined;

/**
 * Returns the singleton better-sqlite3 Database instance.
 *
 * On first call:
 *   1. Creates the parent directory if it does not exist.
 *   2. Opens the database with optional verbose logging in development.
 *   3. Configures WAL journal mode and enforces foreign-key constraints.
 */
export function getDb(): Database.Database {
  if (_db !== undefined) {
    return _db;
  }

  const dbPath = getDbPath();

  // Ensure the directory exists before SQLite tries to open the file
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const verbose =
    process.env['NODE_ENV'] === 'development' ? console.log : undefined;

  _db = new Database(dbPath, { verbose });

  // Performance & consistency pragmas
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.pragma('synchronous = NORMAL');
  // Increase busy timeout so concurrent readers don't immediately fail
  _db.pragma('busy_timeout = 5000');

  return _db;
}

/**
 * Closes the database connection and clears the singleton reference.
 * Call this during graceful shutdown or in test teardown.
 */
export function closeDb(): void {
  if (_db !== undefined) {
    _db.close();
    _db = undefined;
  }
}
