// ============================================================
// Ashtakavarga — Parashari Precision
// ============================================================
// Calculates the Bindu (benefic points) in each of the 12 signs
// contributed by each of the 8 contributors (7 planets + Ascendant).
//
// Reference: BPHS Ch.66-69, Saravali Ch.44.
// ============================================================

import { Planet, Sign, ChartData, AshtakavargaResult } from '../types/index.js';

// ------------------------------------
// Contributor type
// ------------------------------------
type Contributor = Planet | 'Ascendant';

// ------------------------------------
// Benefic position tables
// ------------------------------------
// For each planet's BAV, benefic points are contributed FROM each contributor
// based on the contributor's position. The table gives which houses FROM the
// contributor's sign the planet receives benefic points.
//
// Format: contributorBeneficPositions[planet][contributor] = house numbers (1-indexed)
// that are benefic for `planet` from `contributor`'s position.

// Use a partial record for the contributor dimension since Rahu/Ketu are not
// traditional contributors in classical Ashtakavarga (only 7 planets + Ascendant).
// We type the outer record as Record<Planet, ...> but use Partial for the inner,
// then cast — which avoids requiring Rahu/Ketu keys while keeping planet-level exhaustiveness.
type BeneficTable = Record<Planet, Partial<Record<Contributor, number[]>>>;

const BENEFIC_POSITIONS: BeneficTable = {
  [Planet.Sun]: {
    [Planet.Sun]:       [1, 2, 4, 7, 8, 9, 10, 11],
    [Planet.Moon]:      [3, 6, 10, 11],
    [Planet.Mars]:      [1, 2, 4, 7, 8, 9, 10, 11],
    [Planet.Mercury]:   [3, 5, 6, 9, 10, 11, 12],
    [Planet.Jupiter]:   [5, 6, 9, 11],
    [Planet.Venus]:     [6, 7, 12],
    [Planet.Saturn]:    [1, 2, 4, 7, 8, 9, 10, 11],
    'Ascendant':        [3, 4, 6, 10, 11, 12],
  },
  [Planet.Moon]: {
    [Planet.Sun]:       [3, 6, 7, 8, 10, 11],
    [Planet.Moon]:      [1, 3, 6, 7, 10, 11],
    [Planet.Mars]:      [2, 3, 5, 6, 9, 10, 11],
    [Planet.Mercury]:   [1, 3, 4, 5, 7, 8, 10, 11],
    [Planet.Jupiter]:   [1, 4, 7, 8, 10, 11, 12],
    [Planet.Venus]:     [3, 4, 5, 7, 9, 10, 11],
    [Planet.Saturn]:    [3, 5, 6, 11],
    'Ascendant':        [3, 6, 10, 11],
  },
  [Planet.Mars]: {
    [Planet.Sun]:       [3, 5, 6, 10, 11],
    [Planet.Moon]:      [3, 6, 11],
    [Planet.Mars]:      [1, 2, 4, 7, 8, 10, 11],
    [Planet.Mercury]:   [3, 5, 6, 11],
    [Planet.Jupiter]:   [6, 10, 11, 12],
    [Planet.Venus]:     [6, 8, 11, 12],
    [Planet.Saturn]:    [1, 4, 7, 8, 9, 10, 11],
    'Ascendant':        [1, 3, 6, 10, 11],
  },
  [Planet.Mercury]: {
    [Planet.Sun]:       [5, 6, 9, 11, 12],
    [Planet.Moon]:      [2, 4, 6, 8, 10, 11],
    [Planet.Mars]:      [1, 2, 4, 7, 8, 9, 10, 11],
    [Planet.Mercury]:   [1, 3, 5, 6, 9, 10, 11, 12],
    [Planet.Jupiter]:   [6, 8, 11, 12],
    [Planet.Venus]:     [1, 2, 3, 4, 5, 8, 9, 11],
    [Planet.Saturn]:    [1, 2, 4, 7, 8, 9, 10, 11],
    'Ascendant':        [1, 2, 4, 6, 8, 10, 11],
  },
  [Planet.Jupiter]: {
    [Planet.Sun]:       [1, 2, 3, 4, 7, 8, 9, 10, 11],
    [Planet.Moon]:      [2, 5, 7, 9, 11],
    [Planet.Mars]:      [1, 2, 4, 7, 8, 10, 11],
    [Planet.Mercury]:   [1, 2, 4, 5, 6, 9, 10, 11],
    [Planet.Jupiter]:   [1, 2, 3, 4, 7, 8, 10, 11],
    [Planet.Venus]:     [2, 5, 6, 9, 10, 11],
    [Planet.Saturn]:    [3, 5, 6, 12],
    'Ascendant':        [1, 2, 4, 5, 6, 7, 9, 10, 11],
  },
  [Planet.Venus]: {
    [Planet.Sun]:       [8, 11, 12],
    [Planet.Moon]:      [1, 2, 3, 4, 5, 8, 9, 11, 12],
    [Planet.Mars]:      [3, 4, 6, 9, 11, 12],
    [Planet.Mercury]:   [3, 5, 6, 9, 11],
    [Planet.Jupiter]:   [5, 8, 9, 10, 11],
    [Planet.Venus]:     [1, 2, 3, 4, 5, 8, 9, 10, 11],
    [Planet.Saturn]:    [3, 4, 5, 8, 9, 10, 11],
    'Ascendant':        [1, 2, 3, 4, 5, 8, 9, 11],
  },
  [Planet.Saturn]: {
    [Planet.Sun]:       [1, 2, 4, 7, 8, 10, 11],
    [Planet.Moon]:      [3, 6, 11],
    [Planet.Mars]:      [3, 5, 6, 10, 11, 12],
    [Planet.Mercury]:   [6, 8, 9, 10, 11, 12],
    [Planet.Jupiter]:   [5, 6, 11, 12],
    [Planet.Venus]:     [6, 11, 12],
    [Planet.Saturn]:    [3, 5, 6, 11],
    'Ascendant':        [1, 3, 4, 6, 10, 11],
  },
  // Nodes — included for completeness; typically excluded from SAV summation.
  // Benefic positions from classical texts use trikona (3,6,9,12) from each contributor.
  [Planet.Rahu]: {
    [Planet.Sun]:       [3, 6, 9, 12],
    [Planet.Moon]:      [3, 6, 9, 12],
    [Planet.Mars]:      [3, 6, 9, 12],
    [Planet.Mercury]:   [3, 6, 9, 12],
    [Planet.Jupiter]:   [3, 6, 9, 12],
    [Planet.Venus]:     [3, 6, 9, 12],
    [Planet.Saturn]:    [3, 6, 9, 12],
    'Ascendant':        [3, 6, 9, 12],
  },
  [Planet.Ketu]: {
    [Planet.Sun]:       [3, 6, 9, 12],
    [Planet.Moon]:      [3, 6, 9, 12],
    [Planet.Mars]:      [3, 6, 9, 12],
    [Planet.Mercury]:   [3, 6, 9, 12],
    [Planet.Jupiter]:   [3, 6, 9, 12],
    [Planet.Venus]:     [3, 6, 9, 12],
    [Planet.Saturn]:    [3, 6, 9, 12],
    'Ascendant':        [3, 6, 9, 12],
  },
};

// ------------------------------------
// Helper: get sign index of a planet
// ------------------------------------
function getPlanetSign(chart: ChartData, planet: Planet): number {
  const pos = chart.planets.find((p) => p.planet === planet);
  return pos ? (pos.sign as number) : 0;
}

// ------------------------------------
// BAV (Benefic Ashta-Varga) for one planet
// ------------------------------------

/**
 * Calculate the Benefic Ashta-varga (BAV) for a single planet.
 *
 * @param chart      ChartData
 * @param planet     The planet whose BAV we calculate
 * @returns Array of 12 benefic point totals (one per sign, index 0=Aries…11=Pisces)
 */
export function calculatePlanetBAV(chart: ChartData, planet: Planet): number[] {
  const bav = new Array<number>(12).fill(0);

  const beneficPositionsForPlanet = BENEFIC_POSITIONS[planet];
  if (!beneficPositionsForPlanet) return bav;

  const contributors: Contributor[] = [
    Planet.Sun, Planet.Moon, Planet.Mars, Planet.Mercury,
    Planet.Jupiter, Planet.Venus, Planet.Saturn, 'Ascendant',
  ];

  for (const contributor of contributors) {
    // Determine contributor's sign
    let contributorSign: number;
    if (contributor === 'Ascendant') {
      contributorSign = Math.floor(chart.ascendant / 30);
    } else {
      contributorSign = getPlanetSign(chart, contributor);
    }

    const beneficHouses = beneficPositionsForPlanet[contributor] ?? [];

    for (const house of beneficHouses) {
      // The benefic sign = contributor's sign + (house - 1), modulo 12
      const beneficSign = ((contributorSign + house - 1) % 12 + 12) % 12;
      bav[beneficSign] = (bav[beneficSign] ?? 0) + 1;
    }
  }

  return bav;
}

// ------------------------------------
// Full Ashtakavarga calculation
// ------------------------------------

/**
 * Calculate the complete Ashtakavarga for all planets in a chart.
 *
 * @param chart  ChartData
 * @returns AshtakavargaResult containing BAV, SAV, and per-planet BAV
 */
export function calculateAshtakavarga(chart: ChartData): AshtakavargaResult {
  const planets: Planet[] = [
    Planet.Sun, Planet.Moon, Planet.Mars, Planet.Mercury,
    Planet.Jupiter, Planet.Venus, Planet.Saturn,
  ];

  const bav = new Map<Contributor, number[]>();
  const planetBav = new Map<Planet, number[]>();

  // Calculate BAV for each of the 7 planets
  for (const planet of planets) {
    const bavForPlanet = calculatePlanetBAV(chart, planet);
    bav.set(planet, bavForPlanet);
    planetBav.set(planet, bavForPlanet);
  }

  // Calculate ascendant's own contribution (Lagna BAV)
  const lagnaBav = calculateLagnaBAV(chart);
  bav.set('Ascendant', lagnaBav);

  // SAV = sum of all 7 planet BAVs (Lagna BAV is excluded from standard SAV)
  const sav = new Array<number>(12).fill(0);
  for (const planet of planets) {
    const pBav = bav.get(planet) ?? [];
    for (let i = 0; i < 12; i++) {
      sav[i] = (sav[i] ?? 0) + (pBav[i] ?? 0);
    }
  }

  return {
    bav,
    sav,
    planetBav,
  };
}

// ------------------------------------
// Lagna (Ascendant) BAV
// ------------------------------------

/**
 * Calculate the Lagna (Ascendant) BAV contribution.
 * The Lagna itself also contributes to certain signs.
 *
 * Lagna benefic positions from the Lagna:
 * Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Lagna
 * Each contributes to the signs indicated.
 */
function calculateLagnaBAV(chart: ChartData): number[] {
  const lagnaBav = new Array<number>(12).fill(0);
  const lagnaSign = Math.floor(chart.ascendant / 30);

  // Lagna BAV contribution table (houses from each contributor benefic for Lagna)
  const lagnaBeneficTable: Partial<Record<Contributor, number[]>> = {
    [Planet.Sun]:       [1, 2, 4, 7, 8, 9, 10, 11],
    [Planet.Moon]:      [3, 6, 10, 11],
    [Planet.Mars]:      [1, 3, 6, 10, 11],
    [Planet.Mercury]:   [1, 2, 4, 6, 8, 10, 11],
    [Planet.Jupiter]:   [1, 2, 4, 5, 6, 7, 9, 10, 11],
    [Planet.Venus]:     [1, 2, 3, 4, 5, 8, 9, 11],
    [Planet.Saturn]:    [1, 3, 4, 6, 10, 11],
    'Ascendant':        [3, 4, 6, 10, 11, 12],
  };

  const contributors: Contributor[] = [
    Planet.Sun, Planet.Moon, Planet.Mars, Planet.Mercury,
    Planet.Jupiter, Planet.Venus, Planet.Saturn, 'Ascendant',
  ];

  for (const contributor of contributors) {
    let contributorSign: number;
    if (contributor === 'Ascendant') {
      contributorSign = lagnaSign;
    } else {
      contributorSign = getPlanetSign(chart, contributor);
    }

    const beneficHouses = lagnaBeneficTable[contributor] ?? [];
    for (const house of beneficHouses) {
      const beneficSign = ((contributorSign + house - 1) % 12 + 12) % 12;
      lagnaBav[beneficSign] = (lagnaBav[beneficSign] ?? 0) + 1;
    }
  }

  return lagnaBav;
}

// ------------------------------------
// Trikona Shodhana (Trikona reduction)
// ------------------------------------

/**
 * Apply Trikona Shodhana to a BAV array.
 * Subtract the minimum value among trikona signs (1st, 5th, 9th) from all three.
 *
 * @param bav  Array of 12 values (sign 0=Aries … 11=Pisces)
 * @returns Reduced BAV array
 */
export function applyTrikonaShodhana(bav: number[]): number[] {
  const result = [...bav];

  const trikonaGroups = [
    [0, 4, 8],   // Aries, Leo, Sagittarius (Fire trikona)
    [1, 5, 9],   // Taurus, Virgo, Capricorn (Earth trikona)
    [2, 6, 10],  // Gemini, Libra, Aquarius (Air trikona)
    [3, 7, 11],  // Cancer, Scorpio, Pisces (Water trikona)
  ];

  for (const group of trikonaGroups) {
    const [a, b, c] = group as [number, number, number];
    const minVal = Math.min(result[a] ?? 0, result[b] ?? 0, result[c] ?? 0);
    result[a] = Math.max(0, (result[a] ?? 0) - minVal);
    result[b] = Math.max(0, (result[b] ?? 0) - minVal);
    result[c] = Math.max(0, (result[c] ?? 0) - minVal);
  }

  return result;
}

// ------------------------------------
// Ekadhipatya Shodhana (Single-lord reduction)
// ------------------------------------

/**
 * Apply Ekadhipatya Shodhana to a post-trikona BAV array.
 * For planets ruling two signs (Mars, Mercury, Jupiter, Venus, Saturn),
 * if both signs have values > 0, subtract the lower from the higher.
 *
 * @param bav  Post-trikona-shodhana BAV array
 * @returns Further reduced BAV array
 */
export function applyEkadhipatyaShodhana(bav: number[]): number[] {
  const result = [...bav];

  // Pairs of signs ruled by the same planet
  const dualRuleshipPairs: [number, number][] = [
    [2, 5],   // Gemini & Virgo (Mercury)
    [0, 7],   // Aries & Scorpio (Mars)
    [8, 11],  // Sagittarius & Pisces (Jupiter)
    [1, 6],   // Taurus & Libra (Venus)
    [9, 10],  // Capricorn & Aquarius (Saturn)
  ];

  for (const [signA, signB] of dualRuleshipPairs) {
    const valA = result[signA] ?? 0;
    const valB = result[signB] ?? 0;

    if (valA === 0 || valB === 0) continue; // Skip if either is zero

    const minVal = Math.min(valA, valB);
    result[signA] = Math.max(0, valA - minVal);
    result[signB] = Math.max(0, valB - minVal);
  }

  return result;
}

/**
 * Apply both Shodhana reductions (Trikona + Ekadhipatya) to the SAV.
 *
 * @param sav  Sarvashtakavarga array (12 values)
 * @returns Reduced SAV (Sodhita SAV)
 */
export function applyShodhana(sav: number[]): number[] {
  const afterTrikona = applyTrikonaShodhana(sav);
  return applyEkadhipatyaShodhana(afterTrikona);
}

// ------------------------------------
// Sign strength analysis
// ------------------------------------

/**
 * Get the transit strength indicator for a sign based on its Bindus.
 * A sign with 4+ Bindus is considered benefic for transit;
 * < 4 is considered challenging.
 *
 * @param bindus  Number of benefic points in the sign
 */
export function getTransitStrength(bindus: number): 'excellent' | 'good' | 'average' | 'weak' | 'difficult' {
  if (bindus >= 6) return 'excellent';
  if (bindus >= 5) return 'good';
  if (bindus >= 4) return 'average';
  if (bindus >= 3) return 'weak';
  return 'difficult';
}
