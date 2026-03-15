/**
 * globalSetup.ts — Jest global setup
 *
 * Executed once before all test suites (not inside any individual test file).
 * Ensures the SQLite schema is present so every test can hit the DB
 * without worrying about table creation.
 *
 * Uses an in-memory DB (DB_PATH=:memory:) when tests set that env var;
 * otherwise falls back to a temporary file so that the test DB never
 * conflicts with the production database.
 */

import path from 'path';
import os from 'os';

export default async function globalSetup(): Promise<void> {
  // Point the DB at a dedicated temp file so tests are isolated from
  // the user's real application data.
  if (process.env['DB_PATH'] === undefined) {
    const tmpDb = path.join(os.tmpdir(), `parashari_test_${process.pid}.sqlite`);
    process.env['DB_PATH'] = tmpDb;
  }

  // Force test environment so verbose DB logging is suppressed.
  process.env['NODE_ENV'] = process.env['NODE_ENV'] ?? 'test';

  // Dynamically import after the env vars are set so getDb() picks up DB_PATH.
  const { runMigrations } = await import('../../src/database/migrate.js');

  try {
    runMigrations();
    console.log(`[globalSetup] Migrations applied to ${process.env['DB_PATH']}`);
  } catch (err) {
    console.error('[globalSetup] Migration failed:', err);
    throw err;
  }
}
