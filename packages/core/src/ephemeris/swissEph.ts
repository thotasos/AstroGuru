// ============================================================
// Swiss Ephemeris Wrapper — Parashari Precision
// ============================================================
// Uses the `swisseph` npm package (v2.x).
// The module exposes swe_* functions synchronously via callbacks.
// ============================================================

import swisseph from 'swisseph';
import { Ayanamsa } from '../types/index.js';

// ------------------------------------
// Swiss Ephemeris Planet ID Mapping
// ------------------------------------
// SE_SUN=0, SE_MOON=1, SE_MERCURY=2, SE_VENUS=3, SE_MARS=4,
// SE_JUPITER=5, SE_SATURN=6, SE_MEAN_NODE=10 (Rahu)
// Ketu is derived: Rahu longitude + 180 mod 360

export const SE_PLANET_IDS: Record<number, number> = {
  0: 0,   // Sun
  1: 1,   // Moon
  2: 4,   // Mars
  3: 2,   // Mercury
  4: 5,   // Jupiter
  5: 3,   // Venus
  6: 6,   // Saturn
  7: 10,  // Rahu (Mean Node)
  // Ketu (8) handled separately
};

// ------------------------------------
// Ayanamsa ID mapping
// ------------------------------------
// swisseph ayanamsa IDs
// Lahiri = 1, Raman = 3, KP = 2 (Krishnamurti)
const AYANAMSA_IDS: Record<Ayanamsa, number> = {
  [Ayanamsa.Lahiri]: 1,
  [Ayanamsa.Raman]: 3,
  [Ayanamsa.KP]: 2,
};

// ------------------------------------
// Flags
// ------------------------------------
// SEFLG_SWIEPH = 2, SEFLG_SPEED = 256, SEFLG_SIDEREAL = 64 * 1024 = 65536
// We use numeric literals to avoid relying on flag name availability
const SEFLG_SWIEPH: number = (swisseph as unknown as Record<string, number>)['SEFLG_SWIEPH'] ?? 2;
const SEFLG_SPEED: number = (swisseph as unknown as Record<string, number>)['SEFLG_SPEED'] ?? 256;
const SEFLG_SIDEREAL: number = (swisseph as unknown as Record<string, number>)['SEFLG_SIDEREAL'] ?? 65536;

export const FLAGS_TROPICAL = SEFLG_SWIEPH | SEFLG_SPEED;
export const FLAGS_SIDEREAL = SEFLG_SWIEPH | SEFLG_SPEED | SEFLG_SIDEREAL;

// ------------------------------------
// State
// ------------------------------------
let _initialized = false;
let _currentAyanamsa: Ayanamsa = Ayanamsa.Lahiri;

// ------------------------------------
// Raw swisseph callback types
// ------------------------------------
interface SweCalcResult {
  longitude: number;
  latitude: number;
  distance: number;
  longitudeSpeed: number;
  latitudeSpeed: number;
  distanceSpeed: number;
  rflag?: number;
  error?: string;
}

interface SweHousesResult {
  house: number[];   // [1..12] cusps (1-indexed, house[1]=1st cusp)
  ascendant: number;
  mc: number;
  armc: number;
  vertex: number;
  equatorialAscendant: number;
  coAscendantKoch: number;
  coAscendantMunkasey: number;
  polarAscendant: number;
  error?: string;
}

// ------------------------------------
// Public API
// ------------------------------------

/**
 * Initialise the Swiss Ephemeris.
 * Must be called once before any calculation.
 *
 * @param ephePath  Path to the ephemeris data files (optional; bundled ephemeris used if omitted)
 * @param ayanamsa  Ayanamsa system to use (defaults to Lahiri)
 */
export function initEphemeris(ephePath?: string, ayanamsa: Ayanamsa = Ayanamsa.Lahiri): void {
  if (ephePath) {
    swisseph.swe_set_ephe_path(ephePath);
  }

  const sid = AYANAMSA_IDS[ayanamsa];
  swisseph.swe_set_sid_mode(sid, 0, 0);
  _currentAyanamsa = ayanamsa;
  _initialized = true;
}

/**
 * Convert a civil date/time to a Julian Day Number (UT).
 *
 * @param year         Full 4-digit year
 * @param month        Month 1–12
 * @param day          Day 1–31
 * @param hour         Hour 0–23
 * @param minute       Minute 0–59
 * @param second       Second 0–59
 * @param utcOffsetHrs UTC offset in decimal hours (e.g. 5.5 for IST, -5 for EST)
 * @returns Julian Day Number (UT)
 */
export function getJulianDay(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  utcOffsetHrs: number,
): number {
  ensureInitialized();

  // Convert local time to UT
  const localDecimalHour = hour + minute / 60.0 + second / 3600.0;
  const utDecimalHour = localDecimalHour - utcOffsetHrs;

  // Handle day/month/year rollover from UT conversion
  let utHour = utDecimalHour;
  let utDay = day;
  let utMonth = month;
  let utYear = year;

  while (utHour < 0) {
    utHour += 24;
    utDay -= 1;
  }
  while (utHour >= 24) {
    utHour -= 24;
    utDay += 1;
  }

  // Simple day-of-month overflow handling
  const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const isLeap = (y: number) =>
    (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

  while (utDay < 1) {
    utMonth -= 1;
    if (utMonth < 1) {
      utMonth = 12;
      utYear -= 1;
    }
    const dim = utMonth === 2 && isLeap(utYear) ? 29 : (daysInMonth[utMonth] ?? 30);
    utDay += dim;
  }

  const curMonthDays =
    utMonth === 2 && isLeap(utYear) ? 29 : (daysInMonth[utMonth] ?? 30);
  while (utDay > curMonthDays) {
    utDay -= curMonthDays;
    utMonth += 1;
    if (utMonth > 12) {
      utMonth = 1;
      utYear += 1;
    }
  }

  // Gregorian calendar flag (1 = Gregorian)
  const jd: number = swisseph.swe_julday(utYear, utMonth, utDay, utHour, swisseph.SE_GREG_CAL ?? 1);
  return jd;
}

/**
 * Calculate a planet's position (tropical or sidereal depending on flags).
 *
 * @param julianDay  Julian Day Number (UT)
 * @param swePlanetId  Swiss Ephemeris planet ID (0=Sun, 1=Moon, etc.)
 * @param flags      Calculation flags
 * @returns Position data
 */
export function getPlanetPositionRaw(
  julianDay: number,
  swePlanetId: number,
  flags: number,
): SweCalcResult {
  ensureInitialized();

  let result!: SweCalcResult;

  swisseph.swe_calc_ut(julianDay, swePlanetId, flags, (data: unknown) => {
    result = data as SweCalcResult;
  });

  if (!result) {
    throw new Error(`swe_calc_ut returned no result for planet ${swePlanetId}`);
  }
  if (result.error) {
    throw new Error(`Swiss Ephemeris error for planet ${swePlanetId}: ${result.error}`);
  }

  return result;
}

/**
 * Get tropical position for a planet using our Planet enum index.
 * planetEnumIndex: 0=Sun,1=Moon,2=Mars,3=Mercury,4=Jupiter,5=Venus,6=Saturn,7=Rahu
 */
export function getPlanetPosition(
  julianDay: number,
  planetEnumIndex: number,
): { longitude: number; latitude: number; speed: number } {
  ensureInitialized();

  if (planetEnumIndex === 8) {
    // Ketu: Rahu + 180
    const rahu = getPlanetPosition(julianDay, 7);
    return {
      longitude: normalizeDegrees(rahu.longitude + 180),
      latitude: -rahu.latitude,
      speed: rahu.speed,
    };
  }

  const swePlanetId = SE_PLANET_IDS[planetEnumIndex];
  if (swePlanetId === undefined) {
    throw new Error(`Unknown planet enum index: ${planetEnumIndex}`);
  }

  const raw = getPlanetPositionRaw(julianDay, swePlanetId, FLAGS_TROPICAL);
  return {
    longitude: raw.longitude,
    latitude: raw.latitude,
    speed: raw.longitudeSpeed,
  };
}

/**
 * Get house cusps and angles using Swiss Ephemeris.
 *
 * @param julianDay    Julian Day Number (UT)
 * @param lat          Geographic latitude (decimal degrees, north positive)
 * @param lon          Geographic longitude (decimal degrees, east positive)
 * @param houseSystem  House system character: 'W'=Whole-sign, 'P'=Placidus, 'E'=Equal, 'O'=Porphyry
 * @returns Ascendant, MC, and 12 house cusps (tropical longitudes)
 */
export function getAscendant(
  julianDay: number,
  lat: number,
  lon: number,
  houseSystem: string = 'W',
): {
  ascendant: number;
  mc: number;
  armc: number;
  houseCusps: number[];
} {
  ensureInitialized();

  let result!: SweHousesResult;

  swisseph.swe_houses(julianDay, lat, lon, houseSystem, (data: unknown) => {
    result = data as SweHousesResult;
  });

  if (!result) {
    throw new Error('swe_houses returned no result');
  }
  if (result.error) {
    throw new Error(`swe_houses error: ${result.error}`);
  }

  // result.house is 1-indexed: house[1] = 1st cusp, house[12] = 12th cusp
  const cusps: number[] = [];
  for (let i = 1; i <= 12; i++) {
    cusps.push(result.house[i] ?? 0);
  }

  return {
    ascendant: result.ascendant,
    mc: result.mc,
    armc: result.armc,
    houseCusps: cusps,
  };
}

/**
 * Get the current Lahiri ayanamsa value for a given Julian Day.
 *
 * @param julianDay  Julian Day Number (UT)
 * @returns Ayanamsa in decimal degrees
 */
export function getAyanamsa(julianDay: number): number {
  ensureInitialized();
  return swisseph.swe_get_ayanamsa_ut(julianDay);
}

/**
 * Get the ayanamsa value for any supported system.
 *
 * @param julianDay Julian Day Number (UT)
 * @param ayanamsa  Ayanamsa system
 * @returns Ayanamsa in decimal degrees
 */
export function getAyanamsaForSystem(julianDay: number, ayanamsa: Ayanamsa): number {
  const sid = AYANAMSA_IDS[ayanamsa];
  // Temporarily set, get, then restore
  const current = AYANAMSA_IDS[_currentAyanamsa];
  swisseph.swe_set_sid_mode(sid, 0, 0);
  const value = swisseph.swe_get_ayanamsa_ut(julianDay);
  swisseph.swe_set_sid_mode(current, 0, 0);
  return value;
}

/**
 * Convert a tropical longitude to a sidereal longitude using the current ayanamsa.
 *
 * @param tropicalLong  Tropical ecliptic longitude in degrees 0–360
 * @param julianDay     Julian Day Number (UT)
 * @returns Sidereal longitude 0–360
 */
export function getSiderealLongitude(tropicalLong: number, julianDay: number): number {
  const ayanamsaValue = getAyanamsa(julianDay);
  return normalizeDegrees(tropicalLong - ayanamsaValue);
}

/**
 * Close the Swiss Ephemeris and free resources.
 */
export function closeEphemeris(): void {
  swisseph.swe_close();
  _initialized = false;
}

// ------------------------------------
// Utilities
// ------------------------------------

/** Normalise a degree value to [0, 360). */
export function normalizeDegrees(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

/** Sign index (0–11) from a longitude. */
export function signFromLongitude(longitude: number): number {
  return Math.floor(normalizeDegrees(longitude) / 30);
}

/** Degrees within sign from a longitude. */
export function degreeInSignFromLongitude(longitude: number): number {
  return normalizeDegrees(longitude) % 30;
}

function ensureInitialized(): void {
  if (!_initialized) {
    initEphemeris();
  }
}
