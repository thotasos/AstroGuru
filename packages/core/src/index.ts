// ============================================================
// Parashari Precision — Main Entry Point
// ============================================================
// Barrel export for all types, functions, and the high-level
// AstrologyEngine class.
// ============================================================

// ------------------------------------
// Type exports
// ------------------------------------
export type {
  PlanetPosition,
  HousePosition,
  ChartData,
  VargaChart,
  DashaLevel,
  DashaPeriod,
  YogaResult,
  ShadbalaResult,
  AshtakavargaResult,
  BirthData,
  GridCell,
  NakshatraInfo,
} from './types/index.js';

export {
  Planet,
  Sign,
  House,
  Varga,
  Nakshatra,
  Ayanamsa,
} from './types/index.js';

// ------------------------------------
// Ephemeris exports
// ------------------------------------
export {
  initEphemeris,
  getJulianDay,
  getPlanetPosition,
  getPlanetPositionRaw,
  getAscendant,
  getSiderealLongitude,
  getAyanamsa,
  getAyanamsaForSystem,
  closeEphemeris,
  normalizeDegrees,
  signFromLongitude,
  degreeInSignFromLongitude,
  FLAGS_TROPICAL,
  FLAGS_SIDEREAL,
  SE_PLANET_IDS,
} from './ephemeris/swissEph.js';

// ------------------------------------
// Calculation exports
// ------------------------------------
export { getVargaSign, getAllVargaSigns, getSignNameFromIndex } from './calculations/vargas.js';

export {
  calculateDasha,
  getDashaLordAtDate,
  getDashaLordsAtDate,
  getDashaAtDate,
  getMahadashas,
  getNakshatra,
  DASHA_SEQUENCE,
  NAKSHATRA_LORD,
} from './calculations/dashas.js';

export {
  calculateTransit,
  calculateHourlyScore,
  calculateHourlyCategories,
  type TransitPosition,
  type HourlyCategories,
} from './calculations/transit.js';

export {
  calculateShadbala,
  getSignLord,
  EXALT_DEBIL,
  NAISARGIKA_BALA,
  SIGN_RULERSHIP,
  DIGBALA_BEST_HOUSE,
  getNaturalFriends,
  getNaturalEnemies,
  getHouseType,
  getPlanetHouseNumber,
} from './calculations/shadbala.js';

export {
  calculateAshtakavarga,
  calculatePlanetBAV,
  applyTrikonaShodhana,
  applyEkadhipatyaShodhana,
  applyShodhana,
  getTransitStrength,
} from './calculations/ashtakavarga.js';

export {
  YogaDetector,
  detectAllYogas,
  getHouseOfPlanet,
  getPlanetsInHouse,
  getPlanetsInSign,
  areInConjunction,
  areInMutualAspect,
  doesPlanetAspect,
  getLagnaSign,
  getHouseLordPlanet,
  getPlanetSign,
} from './calculations/yogas.js';

export {
  generatePredictions,
  generateSinglePeriodSummary,
  getCurrentPeriodPrediction,
  generateImmediatePredictions,
  type PredictionPeriod,
  type PredictionRequest,
  type PredictionResponse,
  type ImmediatePrediction,
} from './calculations/predictions.js';

// ------------------------------------
// Chart layout exports
// ------------------------------------
export {
  getSouthIndianLayout,
  getGridCellForSign,
  renderSouthIndianASCII,
  getSignName,
  getSignShortName,
  getPlanetSymbol,
  GRID_SIGN_AT,
  GRID_POSITION,
} from './chart/southIndian.js';

// ------------------------------------
// AstrologyEngine — High-Level API
// ------------------------------------

import {
  BirthData,
  ChartData,
  VargaChart,
  DashaPeriod,
  YogaResult,
  ShadbalaResult,
  AshtakavargaResult,
  GridCell,
  Varga,
  Ayanamsa,
  Planet,
  Sign,
  House,
  PlanetPosition,
  HousePosition,
  Nakshatra,
} from './types/index.js';

import {
  initEphemeris,
  getJulianDay,
  getPlanetPosition as getRawPlanetPosition,
  getAscendant as getRawAscendant,
  getSiderealLongitude,
  getAyanamsa,
  normalizeDegrees,
} from './ephemeris/swissEph.js';

import { getVargaSign } from './calculations/vargas.js';
import { calculateDasha } from './calculations/dashas.js';
import { calculateShadbala } from './calculations/shadbala.js';
import { calculateAshtakavarga } from './calculations/ashtakavarga.js';
import { detectAllYogas } from './calculations/yogas.js';
import { getSouthIndianLayout } from './chart/southIndian.js';

/** Maps our Planet enum to Swiss Ephemeris planet IDs (used for ordering) */
const ALL_PLANETS: Planet[] = [
  Planet.Sun, Planet.Moon, Planet.Mars, Planet.Mercury,
  Planet.Jupiter, Planet.Venus, Planet.Saturn, Planet.Rahu, Planet.Ketu,
];

export class AstrologyEngine {
  private readonly ayanamsa: Ayanamsa;

  constructor(ayanamsa: Ayanamsa = Ayanamsa.Lahiri) {
    this.ayanamsa = ayanamsa;
    initEphemeris(undefined, ayanamsa);
  }

  /**
   * Calculate a complete Vedic natal chart.
   *
   * @param birthData  Birth data (name, UTC datetime, lat/lon, timezone, ayanamsa)
   * @returns Fully computed ChartData
   */
  async calculateChart(birthData: BirthData): Promise<ChartData> {
    const ayanamsaId = birthData.ayanamsaId ?? this.ayanamsa;
    initEphemeris(undefined, ayanamsaId);

    // Parse the ISO date string
    const dt = new Date(birthData.dateOfBirth);
    const year = dt.getUTCFullYear();
    const month = dt.getUTCMonth() + 1;
    const day = dt.getUTCDate();
    const hour = dt.getUTCHours();
    const minute = dt.getUTCMinutes();
    const second = dt.getUTCSeconds();

    // Julian Day (UT) — pass timezone=0 since we already have UTC
    const jd = getJulianDay(year, month, day, hour, minute, second, 0);

    // Ayanamsa value
    const ayanamsaValue = getAyanamsa(jd);

    // Ascendant and house cusps (tropical)
    const angles = getRawAscendant(jd, birthData.latitude, birthData.longitude, 'W');
    const ascendantTropical = angles.ascendant;
    const ascendantSidereal = getSiderealLongitude(ascendantTropical, jd);
    const mcSidereal = getSiderealLongitude(normalizeDegrees(angles.mc), jd);

    // Whole-sign houses
    const lagnaSign = Math.floor(ascendantSidereal / 30);
    const houses: HousePosition[] = [];
    for (let i = 0; i < 12; i++) {
      const houseSign = ((lagnaSign + i) % 12) as Sign;
      houses.push({
        house: (i + 1) as House,
        sign: houseSign,
        degreeOnCusp: houseSign * 30,
      });
    }

    // Planet positions
    const planets: PlanetPosition[] = [];
    for (const planet of ALL_PLANETS) {
      const raw = getRawPlanetPosition(jd, planet as number);
      const tropicalLon = raw.longitude;
      const siderealLon = normalizeDegrees(tropicalLon - ayanamsaValue);
      const sign = Math.floor(siderealLon / 30) as Sign;
      const degreeInSign = siderealLon % 30;

      // Nakshatra
      const nakshatraIndex = Math.floor(siderealLon / (360 / 27)) as Nakshatra;
      const degInNakshatra = siderealLon % (360 / 27);
      const pada = Math.min(4, Math.floor(degInNakshatra / (360 / 27 / 4)) + 1);

      planets.push({
        planet,
        tropicalLongitude: tropicalLon,
        siderealLongitude: siderealLon,
        sign,
        degreeInSign,
        nakshatra: nakshatraIndex,
        nakshatraPada: pada,
        isRetrograde: raw.speed < 0,
        speed: raw.speed,
        latitude: raw.latitude,
      });
    }

    return {
      ascendant: ascendantSidereal,
      planets,
      houses,
      julianDay: jd,
      ayanamsa: ayanamsaValue,
      ayanamsaType: ayanamsaId,
      mc: mcSidereal,
    };
  }

  /**
   * Calculate all 16 divisional (varga) charts.
   *
   * @param chart  Base natal chart (D1)
   * @returns Map of Varga → VargaChart
   */
  async calculateAllVargas(chart: ChartData): Promise<Map<Varga, VargaChart>> {
    const result = new Map<Varga, VargaChart>();

    for (const varga of Object.values(Varga)) {
      const vargaSigns = {} as Record<Planet, Sign>;

      for (const planet of ALL_PLANETS) {
        const planetPos = chart.planets.find((p) => p.planet === planet);
        if (!planetPos) continue;
        vargaSigns[planet] = getVargaSign(planetPos.siderealLongitude, varga) as Sign;
      }

      // Build varga planets list with varga sign positions
      const vargaPlanets: PlanetPosition[] = chart.planets.map((p) => {
        const vargaSign = vargaSigns[p.planet] ?? p.sign;
        const vargaDegInSign = vargaSign * 30 + (p.degreeInSign % (30 / getVargaDivisor(varga)));
        return {
          ...p,
          sign: vargaSign,
          degreeInSign: vargaDegInSign % 30,
          siderealLongitude: vargaSign * 30 + (vargaDegInSign % 30),
        };
      });

      // Varga ascendant
      const ascVargaSign = getVargaSign(chart.ascendant, varga);
      const vargaAscendant = ascVargaSign * 30; // Start of sign

      // Varga houses (whole-sign from varga ascendant)
      const vargaLagnaSign = ascVargaSign;
      const vargaHouses: HousePosition[] = [];
      for (let i = 0; i < 12; i++) {
        const houseSign = ((vargaLagnaSign + i) % 12) as Sign;
        vargaHouses.push({
          house: (i + 1) as House,
          sign: houseSign,
          degreeOnCusp: houseSign * 30,
        });
      }

      const vargaChart: VargaChart = {
        ascendant: vargaAscendant,
        planets: vargaPlanets,
        houses: vargaHouses,
        julianDay: chart.julianDay,
        ayanamsa: chart.ayanamsa,
        ayanamsaType: chart.ayanamsaType,
        mc: chart.mc,
        varga,
        vargaSigns,
      };

      result.set(varga, vargaChart);
    }

    return result;
  }

  /**
   * Calculate the complete 5-level Vimshottari dasha tree.
   *
   * @param chart  Natal chart (Moon's position used)
   * @returns Array of fully nested DashaPeriod objects
   */
  async calculateDashas(chart: ChartData): Promise<DashaPeriod[]> {
    const moonPos = chart.planets.find((p) => p.planet === Planet.Moon);
    if (!moonPos) throw new Error('Moon position not found in chart');

    // Birth date from Julian Day
    const birthDate = julianDayToDate(chart.julianDay);

    return calculateDasha(moonPos.siderealLongitude, birthDate);
  }

  /**
   * Detect all classical yogas in the chart.
   *
   * @param chart  Natal chart
   * @returns Array of YogaResult (both present and absent yogas)
   */
  async detectYogas(chart: ChartData): Promise<YogaResult[]> {
    return detectAllYogas(chart);
  }

  /**
   * Calculate the six-fold Shadbala for all planets.
   *
   * @param chart  Natal chart
   * @returns Array of ShadbalaResult
   */
  async calculateShadbala(chart: ChartData): Promise<ShadbalaResult[]> {
    return calculateShadbala(chart);
  }

  /**
   * Calculate the complete Ashtakavarga.
   *
   * @param chart  Natal chart
   * @returns AshtakavargaResult containing BAV, SAV, and per-planet BAV
   */
  async calculateAshtakavarga(chart: ChartData): Promise<AshtakavargaResult> {
    return calculateAshtakavarga(chart);
  }

  /**
   * Generate the South Indian chart layout for display.
   *
   * @param chart  Natal chart
   * @returns 4×4 GridCell array
   */
  getSouthIndianLayout(chart: ChartData): GridCell[][] {
    return getSouthIndianLayout(chart);
  }
}

// ------------------------------------
// Utility: Julian Day → Date
// ------------------------------------

/**
 * Convert a Julian Day Number (UT) to a JavaScript Date (UTC).
 * Uses the proleptic Gregorian calendar conversion.
 */
export function julianDayToDate(jd: number): Date {
  // Algorithm from "Astronomical Algorithms" by Jean Meeus, chapter 7
  const jdPlus = jd + 0.5;
  const Z = Math.floor(jdPlus);
  const F = jdPlus - Z;

  let A: number;
  if (Z < 2299161) {
    A = Z;
  } else {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }

  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);

  const dayDecimal = B - D - Math.floor(30.6001 * E) + F;
  const day = Math.floor(dayDecimal);
  const hour = Math.floor((dayDecimal - day) * 24);
  const minute = Math.floor(((dayDecimal - day) * 24 - hour) * 60);
  const second = Math.floor((((dayDecimal - day) * 24 - hour) * 60 - minute) * 60);

  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;

  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

/**
 * Get the number of divisions for a varga chart (for degree interpolation).
 */
function getVargaDivisor(varga: Varga): number {
  const divisors: Record<Varga, number> = {
    [Varga.D1]: 1, [Varga.D2]: 2, [Varga.D3]: 3, [Varga.D4]: 4,
    [Varga.D7]: 7, [Varga.D9]: 9, [Varga.D10]: 10, [Varga.D12]: 12,
    [Varga.D16]: 16, [Varga.D20]: 20, [Varga.D24]: 24, [Varga.D27]: 27,
    [Varga.D30]: 30, [Varga.D40]: 40, [Varga.D45]: 45, [Varga.D60]: 60,
  };
  return divisors[varga] ?? 1;
}
