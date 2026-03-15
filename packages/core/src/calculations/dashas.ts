// ============================================================
// Vimshottari Dasha Calculation — Parashari Precision
// ============================================================
// Implements the complete 5-level dasha system.
// Total Vimshottari cycle = 120 years.
// Reference unit: 365.25 Julian days per year.
// ============================================================

import { Planet, Nakshatra, DashaLevel, DashaPeriod, NakshatraInfo } from '../types/index.js';
import { normalizeDegrees } from '../ephemeris/swissEph.js';

// ------------------------------------
// Constants
// ------------------------------------

const DAYS_PER_YEAR = 365.25;
const NAKSHATRA_SPAN_DEG = 360 / 27;           // 13°20' = 13.3333...°
const PADA_SPAN_DEG = NAKSHATRA_SPAN_DEG / 4;  // 3°20'  = 3.3333...°
const VIMSHOTTARI_TOTAL_YEARS = 120;

/** Dasha sequence starting from Ketu. Each entry: [planet, duration_years] */
export const DASHA_SEQUENCE: [Planet, number][] = [
  [Planet.Ketu,    7],
  [Planet.Venus,  20],
  [Planet.Sun,     6],
  [Planet.Moon,   10],
  [Planet.Mars,    7],
  [Planet.Rahu,   18],
  [Planet.Jupiter,16],
  [Planet.Saturn, 19],
  [Planet.Mercury,17],
];

/**
 * Nakshatra to dasha lord mapping (index 0=Ashwini to 26=Revati).
 * The cycle repeats: Ashwini=Ketu, Bharani=Venus, …, Revati=Mercury.
 */
export const NAKSHATRA_LORD: Planet[] = [
  Planet.Ketu,     // 0  Ashwini
  Planet.Venus,    // 1  Bharani
  Planet.Sun,      // 2  Krittika
  Planet.Moon,     // 3  Rohini
  Planet.Mars,     // 4  Mrigashira
  Planet.Rahu,     // 5  Ardra
  Planet.Jupiter,  // 6  Punarvasu
  Planet.Saturn,   // 7  Pushya
  Planet.Mercury,  // 8  Ashlesha
  Planet.Ketu,     // 9  Magha
  Planet.Venus,    // 10 Purva Phalguni
  Planet.Sun,      // 11 Uttara Phalguni
  Planet.Moon,     // 12 Hasta
  Planet.Mars,     // 13 Chitra
  Planet.Rahu,     // 14 Swati
  Planet.Jupiter,  // 15 Vishakha
  Planet.Saturn,   // 16 Anuradha
  Planet.Mercury,  // 17 Jyeshtha
  Planet.Ketu,     // 18 Mula
  Planet.Venus,    // 19 Purva Ashadha
  Planet.Sun,      // 20 Uttara Ashadha
  Planet.Moon,     // 21 Shravana
  Planet.Mars,     // 22 Dhanishta
  Planet.Rahu,     // 23 Shatabhisha
  Planet.Jupiter,  // 24 Purva Bhadrapada
  Planet.Saturn,   // 25 Uttara Bhadrapada
  Planet.Mercury,  // 26 Revati
];

// ------------------------------------
// Nakshatra calculation
// ------------------------------------

/**
 * Determine the nakshatra, pada, lord, and position within nakshatra
 * from a sidereal longitude.
 *
 * @param siderealLongitude  Sidereal longitude 0–360°
 * @returns NakshatraInfo
 */
export function getNakshatra(siderealLongitude: number): NakshatraInfo {
  const lon = normalizeDegrees(siderealLongitude);
  const nakshatraIndex = Math.floor(lon / NAKSHATRA_SPAN_DEG);
  const degreeInNakshatra = lon - nakshatraIndex * NAKSHATRA_SPAN_DEG;
  const pada = Math.floor(degreeInNakshatra / PADA_SPAN_DEG) + 1;  // 1–4

  const nakshatra = nakshatraIndex as Nakshatra;
  const lord = NAKSHATRA_LORD[nakshatraIndex] ?? Planet.Ketu;

  return {
    nakshatra,
    pada: Math.min(pada, 4),
    lord,
    degreeInNakshatra,
  };
}

// ------------------------------------
// Dasha sequence lookup
// ------------------------------------

/**
 * Find the index in DASHA_SEQUENCE for a given planet.
 */
function dashaSequenceIndex(planet: Planet): number {
  const idx = DASHA_SEQUENCE.findIndex(([p]) => p === planet);
  if (idx === -1) throw new Error(`Planet ${planet} not found in dasha sequence`);
  return idx;
}

// ------------------------------------
// Five-Level Dasha Calculation
// ------------------------------------

/**
 * Calculate the full 5-level Vimshottari dasha tree starting from the birth date.
 *
 * @param moonSiderealLongitude  Moon's sidereal longitude at birth (0–360°)
 * @param birthDate              Birth date (local or UTC; used as epoch)
 * @returns Array of fully nested DashaPeriod objects covering 120 years
 */
export function calculateDasha(
  moonSiderealLongitude: number,
  birthDate: Date,
): DashaPeriod[] {
  const nakshatraInfo = getNakshatra(moonSiderealLongitude);
  const { lord: birthNakshatraLord, degreeInNakshatra } = nakshatraInfo;

  // Balance of current mahadasha at birth
  const fractionRemaining = 1 - degreeInNakshatra / NAKSHATRA_SPAN_DEG;
  const startingDashaIndex = dashaSequenceIndex(birthNakshatraLord);
  const [, startingDashaYears] = DASHA_SEQUENCE[startingDashaIndex]!;
  const balanceYears = fractionRemaining * startingDashaYears;
  const balanceDays = balanceYears * DAYS_PER_YEAR;

  // Start date is adjusted back so that the "current" dasha started before birth
  // The mahadasha technically started (balanceYears) before birth.
  const birthMs = birthDate.getTime();
  const mahaStart = new Date(birthMs - balanceDays * 86400000);

  const periods: DashaPeriod[] = [];

  let mahaCurrentStart = mahaStart;

  // Iterate through all 9 mahadashas (cycle once = 120 years)
  for (let mi = 0; mi < 9; mi++) {
    const mahaIdx = (startingDashaIndex + mi) % 9;
    const [mahaPlanet, mahaYears] = DASHA_SEQUENCE[mahaIdx]!;

    let mahaActualStartMs = mahaCurrentStart.getTime();
    // For the first mahadasha, the actual period we calculate starts at birth
    // (the mahadasha itself started before birth; we still generate full period for completeness)
    const mahaDurationDays = mahaYears * DAYS_PER_YEAR;
    const mahaEnd = new Date(mahaActualStartMs + mahaDurationDays * 86400000);

    // Level 1
    const mahaLevel: DashaLevel = {
      planet: mahaPlanet,
      startDate: new Date(mahaActualStartMs),
      endDate: mahaEnd,
      level: 1,
    };

    // Iterate antardasha (bhukti)
    let antarCurrentStartMs = mahaActualStartMs;

    for (let ai = 0; ai < 9; ai++) {
      const antarIdx = (mahaIdx + ai) % 9;
      const [antarPlanet, antarYears] = DASHA_SEQUENCE[antarIdx]!;
      const antarFraction = antarYears / VIMSHOTTARI_TOTAL_YEARS;
      const antarDurationDays = antarFraction * mahaDurationDays;
      const antarEndMs = antarCurrentStartMs + antarDurationDays * 86400000;

      const antarLevel: DashaLevel = {
        planet: antarPlanet,
        startDate: new Date(antarCurrentStartMs),
        endDate: new Date(antarEndMs),
        level: 2,
      };

      // Iterate pratyantardasha
      let pratyCurrentStartMs = antarCurrentStartMs;

      for (let pi = 0; pi < 9; pi++) {
        const pratyIdx = (antarIdx + pi) % 9;
        const [pratyPlanet, pratyYears] = DASHA_SEQUENCE[pratyIdx]!;
        const pratyFraction = pratyYears / VIMSHOTTARI_TOTAL_YEARS;
        const pratyDurationDays = pratyFraction * antarDurationDays;
        const pratyEndMs = pratyCurrentStartMs + pratyDurationDays * 86400000;

        const pratyLevel: DashaLevel = {
          planet: pratyPlanet,
          startDate: new Date(pratyCurrentStartMs),
          endDate: new Date(pratyEndMs),
          level: 3,
        };

        // Iterate sookshma
        let sookshmaCurrentStartMs = pratyCurrentStartMs;

        for (let si = 0; si < 9; si++) {
          const sookshmaIdx = (pratyIdx + si) % 9;
          const [sookshmaPlanet, sookshmaYears] = DASHA_SEQUENCE[sookshmaIdx]!;
          const sookshmaFraction = sookshmaYears / VIMSHOTTARI_TOTAL_YEARS;
          const sookshmaDurationDays = sookshmaFraction * pratyDurationDays;
          const sookshmaEndMs = sookshmaCurrentStartMs + sookshmaDurationDays * 86400000;

          const sookshmaLevel: DashaLevel = {
            planet: sookshmaPlanet,
            startDate: new Date(sookshmaCurrentStartMs),
            endDate: new Date(sookshmaEndMs),
            level: 4,
          };

          // Iterate prana
          let pranaCurrentStartMs = sookshmaCurrentStartMs;

          for (let xi = 0; xi < 9; xi++) {
            const pranaIdx = (sookshmaIdx + xi) % 9;
            const [pranaPlanet, pranaYears] = DASHA_SEQUENCE[pranaIdx]!;
            const pranaFraction = pranaYears / VIMSHOTTARI_TOTAL_YEARS;
            const pranaDurationDays = pranaFraction * sookshmaDurationDays;
            const pranaEndMs = pranaCurrentStartMs + pranaDurationDays * 86400000;

            const pranaLevel: DashaLevel = {
              planet: pranaPlanet,
              startDate: new Date(pranaCurrentStartMs),
              endDate: new Date(pranaEndMs),
              level: 5,
            };

            periods.push({
              mahadasha: mahaLevel,
              antardasha: antarLevel,
              pratyantardasha: pratyLevel,
              sookshma: sookshmaLevel,
              prana: pranaLevel,
            });

            pranaCurrentStartMs = pranaEndMs;
          }

          sookshmaCurrentStartMs = sookshmaEndMs;
        }

        pratyCurrentStartMs = pratyEndMs;
      }

      antarCurrentStartMs = antarEndMs;
    }

    mahaCurrentStart = mahaEnd;
    mahaActualStartMs = mahaEnd.getTime();
  }

  return periods;
}

/**
 * Get the active dasha lord at a specific date.
 *
 * @param dashas  Array of DashaPeriod as returned by calculateDasha()
 * @param date    Date to query
 * @returns The DashaPeriod active at that date, or undefined if outside range
 */
export function getDashaLordAtDate(
  dashas: DashaPeriod[],
  date: Date,
): DashaPeriod | undefined {
  const ts = date.getTime();
  return dashas.find(
    (d) =>
      d.prana.startDate.getTime() <= ts &&
      ts < d.prana.endDate.getTime(),
  );
}

/**
 * Get a condensed view of dasha lords at a given date.
 *
 * @param dashas  Array of DashaPeriod
 * @param date    Date to query
 */
export function getDashaLordsAtDate(
  dashas: DashaPeriod[],
  date: Date,
): {
  mahadasha: Planet;
  antardasha: Planet;
  pratyantardasha: Planet;
  sookshma: Planet;
  prana: Planet;
} | undefined {
  const period = getDashaLordAtDate(dashas, date);
  if (!period) return undefined;
  return {
    mahadasha: period.mahadasha.planet,
    antardasha: period.antardasha.planet,
    pratyantardasha: period.pratyantardasha.planet,
    sookshma: period.sookshma.planet,
    prana: period.prana.planet,
  };
}

/**
 * Get the list of mahadasha periods (level 1 only) with their start/end dates.
 */
export function getMahadashas(
  moonSiderealLongitude: number,
  birthDate: Date,
): DashaLevel[] {
  const info = getNakshatra(moonSiderealLongitude);
  const { lord, degreeInNakshatra } = info;
  const fractionRemaining = 1 - degreeInNakshatra / NAKSHATRA_SPAN_DEG;
  const startingIdx = dashaSequenceIndex(lord);
  const [, startingYears] = DASHA_SEQUENCE[startingIdx]!;
  const balanceDays = fractionRemaining * startingYears * DAYS_PER_YEAR;
  const birthMs = birthDate.getTime();
  let currentStartMs = birthMs - balanceDays * 86400000;

  const mahadashas: DashaLevel[] = [];
  for (let i = 0; i < 9; i++) {
    const idx = (startingIdx + i) % 9;
    const [planet, years] = DASHA_SEQUENCE[idx]!;
    const durationMs = years * DAYS_PER_YEAR * 86400000;
    const endMs = currentStartMs + durationMs;
    mahadashas.push({
      planet,
      startDate: new Date(currentStartMs),
      endDate: new Date(endMs),
      level: 1,
    });
    currentStartMs = endMs;
  }

  return mahadashas;
}
