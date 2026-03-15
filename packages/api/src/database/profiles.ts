/**
 * profiles.ts — Profile CRUD operations
 *
 * All functions are synchronous (better-sqlite3 is sync).
 * Types mirror the `profiles` table schema exactly.
 */

import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Profile {
  id: string;
  name: string;
  /** ISO 8601 UTC datetime, e.g. '1974-09-20T06:30:00Z' */
  dob_utc: string;
  /** Latitude, -90 to 90 */
  lat: number;
  /** Longitude, -180 to 180 */
  lon: number;
  /** IANA timezone string, e.g. 'Asia/Kolkata' */
  timezone: string;
  /** UTC offset in fractional hours at the time of birth */
  utc_offset_hours: number;
  /** Human-readable place name, e.g. 'Bangalore, India' */
  place_name: string | null;
  /** FK → ayanamsas.id (default 1 = Lahiri) */
  ayanamsa_id: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProfileInput {
  name: string;
  dob_utc: string;
  lat: number;
  lon: number;
  timezone: string;
  utc_offset_hours: number;
  place_name?: string | null;
  ayanamsa_id?: number;
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

/** Maps a raw DB row (unknown types) to a strongly-typed Profile. */
function rowToProfile(row: Record<string, unknown>): Profile {
  return {
    id: row['id'] as string,
    name: row['name'] as string,
    dob_utc: row['dob_utc'] as string,
    lat: row['lat'] as number,
    lon: row['lon'] as number,
    timezone: row['timezone'] as string,
    utc_offset_hours: row['utc_offset_hours'] as number,
    place_name: (row['place_name'] as string | null) ?? null,
    ayanamsa_id: row['ayanamsa_id'] as number,
    notes: (row['notes'] as string | null) ?? null,
    created_at: row['created_at'] as string,
    updated_at: row['updated_at'] as string,
  };
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Creates a new profile and returns the persisted record.
 * A UUID v4 is generated automatically.
 */
export function createProfile(data: CreateProfileInput): Profile {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  const stmt = db.prepare<[
    string, string, string, number, number,
    string, number, string | null, number, string | null,
    string, string,
  ]>(`
    INSERT INTO profiles
      (id, name, dob_utc, lat, lon, timezone, utc_offset_hours,
       place_name, ayanamsa_id, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.name,
    data.dob_utc,
    data.lat,
    data.lon,
    data.timezone,
    data.utc_offset_hours,
    data.place_name ?? null,
    data.ayanamsa_id ?? 1,
    data.notes ?? null,
    now,
    now,
  );

  const profile = getProfile(id);
  if (profile === undefined) {
    throw new Error(`Failed to retrieve profile after insert (id=${id})`);
  }
  return profile;
}

/**
 * Returns a profile by its UUID, or `undefined` if not found.
 */
export function getProfile(id: string): Profile | undefined {
  const db = getDb();
  const row = db
    .prepare<[string], Record<string, unknown>>(
      'SELECT * FROM profiles WHERE id = ?',
    )
    .get(id);

  return row !== undefined ? rowToProfile(row) : undefined;
}

/**
 * Returns all profiles ordered by name ascending.
 */
export function getAllProfiles(): Profile[] {
  const db = getDb();
  const rows = db
    .prepare<[], Record<string, unknown>>(
      'SELECT * FROM profiles ORDER BY name ASC',
    )
    .all();

  return rows.map(rowToProfile);
}

/**
 * Updates mutable fields on an existing profile and bumps `updated_at`.
 * Throws if the profile does not exist.
 */
export function updateProfile(
  id: string,
  data: Partial<CreateProfileInput>,
): Profile {
  const db = getDb();

  // Verify the profile exists before building the UPDATE
  const existing = getProfile(id);
  if (existing === undefined) {
    throw new Error(`Profile not found (id=${id})`);
  }

  const now = new Date().toISOString();

  // Build SET clause dynamically from provided keys only
  const allowed: Array<keyof CreateProfileInput> = [
    'name',
    'dob_utc',
    'lat',
    'lon',
    'timezone',
    'utc_offset_hours',
    'place_name',
    'ayanamsa_id',
    'notes',
  ];

  const setClauses: string[] = [];
  const values: unknown[] = [];

  for (const key of allowed) {
    if (key in data) {
      setClauses.push(`${key} = ?`);
      values.push(data[key] ?? null);
    }
  }

  if (setClauses.length === 0) {
    // Nothing to update — return as-is
    return existing;
  }

  setClauses.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE profiles SET ${setClauses.join(', ')} WHERE id = ?`).run(
    ...values,
  );

  const updated = getProfile(id);
  if (updated === undefined) {
    throw new Error(`Profile disappeared after update (id=${id})`);
  }
  return updated;
}

/**
 * Permanently deletes a profile and all its cascaded data
 * (cache + journal events via ON DELETE CASCADE).
 * No-ops if the profile does not exist.
 */
export function deleteProfile(id: string): void {
  const db = getDb();
  db.prepare<[string]>('DELETE FROM profiles WHERE id = ?').run(id);
}

/**
 * Full-text search across `name` and `place_name` using SQLite LIKE.
 * Returns results ordered by name ascending.
 */
export function searchProfiles(query: string): Profile[] {
  const db = getDb();
  const pattern = `%${query}%`;
  const rows = db
    .prepare<[string, string], Record<string, unknown>>(
      `SELECT * FROM profiles
       WHERE name LIKE ? OR place_name LIKE ?
       ORDER BY name ASC`,
    )
    .all(pattern, pattern);

  return rows.map(rowToProfile);
}
