/**
 * cache.ts — Calculation cache read/write operations
 *
 * Heavy Vedic computations (chart, varga, shadbala, etc.) are serialised
 * to JSON and stored in `calculations_cache`.  Each profile has at most one
 * cache row (PRIMARY KEY on profile_id).
 *
 * Cache validity is a simple timestamp check: a cached row is considered
 * valid if it was computed within CACHE_TTL_MS milliseconds.  Invalidation
 * can also be triggered manually (e.g. when the profile's birth data changes).
 */

import { getDb } from './db.js';
import { Profile } from './profiles.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Cache time-to-live: 7 days in milliseconds */
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1_000;

/** Increment this when the shape of any cached JSON changes. */
const CURRENT_CACHE_VERSION = 1;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Mirrors the `calculations_cache` table row.
 * JSON columns are kept as raw strings — callers parse/stringify them.
 */
export interface CachedCalculation {
  profile_id: string;
  cache_version: number;
  julian_day: number;
  /** Ayanamsa value (degrees) at the birth Julian Day */
  ayanamsa_value: number;
  /** D1 ChartData serialised to JSON */
  chart_json: string;
  /** Map<Varga, VargaChart> serialised to JSON, nullable */
  vargas_json: string | null;
  /** ShadbalaResult[] serialised to JSON, nullable */
  shadbala_json: string | null;
  /** AshtakavargaResult serialised to JSON, nullable */
  ashtakavarga_json: string | null;
  /** Full 120-year DashaPeriod[] serialised to JSON, nullable */
  dashas_json: string | null;
  /** YogaResult[] serialised to JSON, nullable */
  yogas_json: string | null;
  /** PredictionsResult serialised to JSON, nullable */
  predictions_json: string | null;
  /** ISO 8601 UTC datetime when row was last written */
  computed_at: string;
}

/**
 * Hourly prediction for a specific profile and date.
 */
export interface HourlyPrediction {
  id: string;
  profile_id: string;
  date: string;           // YYYY-MM-DD
  hour: number;           // 0-23
  timezone: string;

  // Sookshma Dasha (Level 4)
  sookshma_dasha_planet: number | null;
  sookshma_dasha_start: string | null;
  sookshma_dasha_end: string | null;

  // Prana Dasha (Level 5)
  prana_dasha_planet: number | null;
  prana_dasha_start: string | null;
  prana_dasha_end: string | null;

  // Transit positions
  moon_nakshatra: number | null;
  moon_sign: number | null;
  moon_degree: number | null;
  transit_lagna: number | null;
  transit_lagna_sign: number | null;

  // Prediction
  hourly_score: number | null;
  prediction_text: string | null;

  created_at: string;
}

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

function rowToCache(row: Record<string, unknown>): CachedCalculation {
  return {
    profile_id: row['profile_id'] as string,
    cache_version: row['cache_version'] as number,
    julian_day: row['julian_day'] as number,
    ayanamsa_value: row['ayanamsa_value'] as number,
    chart_json: row['chart_json'] as string,
    vargas_json: (row['vargas_json'] as string | null) ?? null,
    shadbala_json: (row['shadbala_json'] as string | null) ?? null,
    ashtakavarga_json: (row['ashtakavarga_json'] as string | null) ?? null,
    dashas_json: (row['dashas_json'] as string | null) ?? null,
    yogas_json: (row['yogas_json'] as string | null) ?? null,
    predictions_json: (row['predictions_json'] as string | null) ?? null,
    computed_at: row['computed_at'] as string,
  };
}

function rowToHourlyPrediction(row: Record<string, unknown>): HourlyPrediction {
  return {
    id: row['id'] as string,
    profile_id: row['profile_id'] as string,
    date: row['date'] as string,
    hour: row['hour'] as number,
    timezone: row['timezone'] as string,
    sookshma_dasha_planet: row['sookshma_dasha_planet'] as number | null,
    sookshma_dasha_start: row['sookshma_dasha_start'] as string | null,
    sookshma_dasha_end: row['sookshma_dasha_end'] as string | null,
    prana_dasha_planet: row['prana_dasha_planet'] as number | null,
    prana_dasha_start: row['prana_dasha_start'] as string | null,
    prana_dasha_end: row['prana_dasha_end'] as string | null,
    moon_nakshatra: row['moon_nakshatra'] as number | null,
    moon_sign: row['moon_sign'] as number | null,
    moon_degree: row['moon_degree'] as number | null,
    transit_lagna: row['transit_lagna'] as number | null,
    transit_lagna_sign: row['transit_lagna_sign'] as number | null,
    hourly_score: row['hourly_score'] as number | null,
    prediction_text: row['prediction_text'] as string | null,
    created_at: row['created_at'] as string,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Retrieves the cached calculation for a profile.
 * Returns `undefined` if no row exists.
 *
 * Note: this does NOT check TTL — use `isCacheValid` for that.
 */
export function getCachedCalculation(
  profileId: string,
): CachedCalculation | undefined {
  const db = getDb();
  const row = db
    .prepare<[string], Record<string, unknown>>(
      'SELECT * FROM calculations_cache WHERE profile_id = ?',
    )
    .get(profileId);

  return row !== undefined ? rowToCache(row) : undefined;
}

/**
 * Inserts or replaces the cached calculation for a profile.
 * `computed_at` is always set to the current UTC time.
 * `cache_version` is set to CURRENT_CACHE_VERSION.
 */
export function saveCachedCalculation(
  profileId: string,
  data: Omit<CachedCalculation, 'profile_id' | 'cache_version' | 'computed_at'>,
): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare<[
    string, number, number, number,
    string,
    string | null, string | null, string | null, string | null, string | null,
    string | null,
    string,
  ]>(`
    INSERT INTO calculations_cache
      (profile_id, cache_version, julian_day, ayanamsa_value,
       chart_json, vargas_json, shadbala_json, ashtakavarga_json,
       dashas_json, yogas_json, predictions_json, computed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(profile_id) DO UPDATE SET
      cache_version     = excluded.cache_version,
      julian_day        = excluded.julian_day,
      ayanamsa_value    = excluded.ayanamsa_value,
      chart_json        = excluded.chart_json,
      vargas_json       = excluded.vargas_json,
      shadbala_json     = excluded.shadbala_json,
      ashtakavarga_json = excluded.ashtakavarga_json,
      dashas_json       = excluded.dashas_json,
      yogas_json        = excluded.yogas_json,
      predictions_json  = excluded.predictions_json,
      computed_at       = excluded.computed_at
  `).run(
    profileId,
    CURRENT_CACHE_VERSION,
    data.julian_day,
    data.ayanamsa_value,
    data.chart_json,
    data.vargas_json ?? null,
    data.shadbala_json ?? null,
    data.ashtakavarga_json ?? null,
    data.dashas_json ?? null,
    data.yogas_json ?? null,
    data.predictions_json ?? null,
    now,
  );
}

/**
 * Deletes the cache row for a profile.
 * No-ops if no row exists.
 * Call this whenever birth data or ayanamsa selection changes.
 */
export function invalidateCache(profileId: string): void {
  const db = getDb();
  db.prepare<[string]>(
    'DELETE FROM calculations_cache WHERE profile_id = ?',
  ).run(profileId);
}

/**
 * Returns `true` if:
 *   - A cache row exists for the profile, AND
 *   - Its `cache_version` matches CURRENT_CACHE_VERSION, AND
 *   - It was computed within CACHE_TTL_MS
 */
export function isCacheValid(profileId: string): boolean {
  const cached = getCachedCalculation(profileId);
  if (cached === undefined) {
    return false;
  }

  if (cached.cache_version !== CURRENT_CACHE_VERSION) {
    return false;
  }

  const computedAt = new Date(cached.computed_at).getTime();
  const ageMs = Date.now() - computedAt;
  return ageMs <= CACHE_TTL_MS;
}

/**
 * Save multiple hourly predictions for a profile.
 */
export function saveHourlyPredictions(
  predictions: Omit<HourlyPrediction, 'created_at'>[],
): void {
  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO hourly_predictions
      (id, profile_id, date, hour, timezone,
       sookshma_dasha_planet, sookshma_dasha_start, sookshma_dasha_end,
       prana_dasha_planet, prana_dasha_start, prana_dasha_end,
       moon_nakshatra, moon_sign, moon_degree,
       transit_lagna, transit_lagna_sign,
       hourly_score, prediction_text, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((preds: typeof predictions) => {
    for (const p of preds) {
      stmt.run(
        p.id, p.profile_id, p.date, p.hour, p.timezone,
        p.sookshma_dasha_planet, p.sookshma_dasha_start, p.sookshma_dasha_end,
        p.prana_dasha_planet, p.prana_dasha_start, p.prana_dasha_end,
        p.moon_nakshatra, p.moon_sign, p.moon_degree,
        p.transit_lagna, p.transit_lagna_sign,
        p.hourly_score, p.prediction_text, now,
      );
    }
  });

  insertMany(predictions);
}

/**
 * Get hourly predictions for a profile on a specific date.
 */
export function getHourlyPredictions(
  profileId: string,
  date: string,
): HourlyPrediction[] {
  const db = getDb();
  const rows = db
    .prepare<[string, string], Record<string, unknown>>(
      'SELECT * FROM hourly_predictions WHERE profile_id = ? AND date = ? ORDER BY hour ASC',
    )
    .all(profileId, date);

  return rows.map(rowToHourlyPrediction);
}

/**
 * Delete hourly predictions older than today.
 */
export function deleteOldPredictions(): number {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0]!;
  const result = db.prepare<[string]>(
    'DELETE FROM hourly_predictions WHERE date < ?',
  ).run(today);
  return result.changes;
}

/**
 * Get all profiles that are ready for prediction caching.
 */
export function getReadyProfiles(): Pick<Profile, 'id' | 'name' | 'dob_utc' | 'lat' | 'lon' | 'timezone'>[] {
  const db = getDb();
  const rows = db
    .prepare<[], Record<string, unknown>>(
      "SELECT id, name, dob_utc, lat, lon, timezone FROM profiles WHERE status = 'ready'",
    )
    .all();

  return rows.map(row => ({
    id: row['id'] as string,
    name: row['name'] as string,
    dob_utc: row['dob_utc'] as string,
    lat: row['lat'] as number,
    lon: row['lon'] as number,
    timezone: row['timezone'] as string,
  }));
}
