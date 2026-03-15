/**
 * migrate.ts — idempotent schema migration runner
 *
 * Reads `database/schema.sql` from the project root, splits it into
 * individual statements, and executes them in order inside a single
 * transaction.  All DDL uses IF NOT EXISTS / INSERT OR IGNORE so the
 * script is safe to re-run at any time.
 *
 * Usage (CLI):
 *   npm run db:migrate          # via tsx in package.json scripts
 *
 * Usage (programmatic):
 *   import { runMigrations } from './migrate.js';
 *   runMigrations();
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './db.js';

// ---------------------------------------------------------------------------
// Resolve the schema file path relative to this source file's location.
// packages/api/src/database  →  four levels up reaches monorepo root
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Absolute path to the project root. */
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

/** Absolute path to the canonical schema file. */
const SCHEMA_PATH = path.join(PROJECT_ROOT, 'database', 'schema.sql');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Splits a raw SQL file into an array of individual, executable statements.
 *
 * - Strips `--` single-line comments.
 * - Splits on `;`.
 * - Drops PRAGMA statements (handled by the connection layer in db.ts).
 * - Discards blank segments.
 */
function parseSqlStatements(sql: string): string[] {
  const stripped = sql.replace(/--[^\n]*/g, '');

  return stripped
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((s) => !/^PRAGMA\b/i.test(s));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Reads the schema SQL, parses it into statements, and executes them all
 * inside a single write transaction.  The transaction is rolled back
 * atomically if any statement throws.
 */
export function runMigrations(): void {
  if (!fs.existsSync(SCHEMA_PATH)) {
    throw new Error(
      `Schema file not found at expected path: ${SCHEMA_PATH}\n` +
        'Ensure you are running from the monorepo root and that ' +
        '`database/schema.sql` exists.',
    );
  }

  const raw = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  const statements = parseSqlStatements(raw);

  console.log(`[migrate] Schema file : ${SCHEMA_PATH}`);
  console.log(`[migrate] Statements  : ${statements.length}`);

  const db = getDb();

  const migrate = db.transaction(() => {
    for (const [i, stmt] of statements.entries()) {
      const preview = stmt.slice(0, 60).replace(/\s+/g, ' ');
      console.log(`[migrate] [${i + 1}/${statements.length}] ${preview}…`);
      db.exec(stmt);
    }
  });

  migrate();

  console.log('[migrate] All migrations completed successfully.');
}

// ---------------------------------------------------------------------------
// CLI entry-point
// Only runs when this file is invoked directly (e.g., `tsx src/database/migrate.ts`)
// ---------------------------------------------------------------------------
const isMain =
  typeof process.argv[1] === 'string' &&
  path.resolve(process.argv[1]) === path.resolve(__filename);

if (isMain) {
  try {
    runMigrations();
    process.exit(0);
  } catch (err) {
    console.error('[migrate] FATAL:', err);
    process.exit(1);
  }
}
