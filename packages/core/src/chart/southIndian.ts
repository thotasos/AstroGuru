// ============================================================
// South Indian Chart Layout — Parashari Precision
// ============================================================
// The South Indian chart has a fixed 4×4 grid where each cell
// is permanently assigned to a zodiac sign. The planets move,
// but the signs stay in their fixed positions.
//
// Grid layout (rows 0–3, cols 0–3):
//   [Pi][Ar][Ta][Ge]   row 0
//   [Aq][  ][  ][Ca]   row 1   (cells [1][1] and [1][2] = metadata)
//   [Cp][  ][  ][Le]   row 2   (cells [2][1] and [2][2] = metadata)
//   [Sg][Sc][Li][Vi]   row 3
//
// Sign indices: Aries=0 … Pisces=11
// ============================================================

import { Planet, Sign, ChartData, GridCell } from '../types/index.js';

// ------------------------------------
// Fixed grid: sign at [row][col]
// ------------------------------------

/** GRID_SIGN_AT[row][col] = Sign at that position. -1 = metadata cell. */
export const GRID_SIGN_AT: ReadonlyArray<ReadonlyArray<number>> = [
  [Sign.Pisces,    Sign.Aries,  Sign.Taurus,  Sign.Gemini],    // row 0
  [Sign.Aquarius,  -1,          -1,           Sign.Cancer],    // row 1
  [Sign.Capricorn, -1,          -1,           Sign.Leo],       // row 2
  [Sign.Sagittarius, Sign.Scorpio, Sign.Libra, Sign.Virgo],    // row 3
];

/** GRID_POSITION[sign] = [row, col] */
export const GRID_POSITION: ReadonlyArray<readonly [number, number]> = [
  [0, 1],  // Aries      (0)
  [0, 2],  // Taurus     (1)
  [0, 3],  // Gemini     (2)
  [1, 3],  // Cancer     (3)
  [2, 3],  // Leo        (4)
  [3, 3],  // Virgo      (5)
  [3, 2],  // Libra      (6)
  [3, 1],  // Scorpio    (7)
  [3, 0],  // Sagittarius(8)
  [2, 0],  // Capricorn  (9)
  [1, 0],  // Aquarius   (10)
  [0, 0],  // Pisces     (11)
];

// ------------------------------------
// Sign name utilities
// ------------------------------------

const SIGN_NAMES: ReadonlyArray<string> = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const SIGN_SHORT_NAMES: ReadonlyArray<string> = [
  'Ar', 'Ta', 'Ge', 'Ca',
  'Le', 'Vi', 'Li', 'Sc',
  'Sa', 'Cp', 'Aq', 'Pi',
];

/** Get the full sign name from a Sign enum value. */
export function getSignName(sign: Sign): string {
  return SIGN_NAMES[sign as number] ?? 'Unknown';
}

/** Get the abbreviated sign name from a Sign enum value. */
export function getSignShortName(sign: Sign): string {
  return SIGN_SHORT_NAMES[sign as number] ?? '??';
}

// ------------------------------------
// Planet symbol utilities
// ------------------------------------

const PLANET_SYMBOLS: Record<Planet, string> = {
  [Planet.Sun]:     'Su',
  [Planet.Moon]:    'Mo',
  [Planet.Mars]:    'Ma',
  [Planet.Mercury]: 'Me',
  [Planet.Jupiter]: 'Ju',
  [Planet.Venus]:   'Ve',
  [Planet.Saturn]:  'Sa',
  [Planet.Rahu]:    'Ra',
  [Planet.Ketu]:    'Ke',
};

/** Get the Sanskrit abbreviation for a planet. */
export function getPlanetSymbol(planet: Planet): string {
  return PLANET_SYMBOLS[planet] ?? '??';
}

// ------------------------------------
// Main layout function
// ------------------------------------

/**
 * Generate the South Indian chart grid for a given ChartData.
 *
 * @param chart  Computed ChartData (with sidereal positions)
 * @returns 4×4 array of GridCell objects
 */
export function getSouthIndianLayout(chart: ChartData): GridCell[][] {
  const lagnaSign = Math.floor(chart.ascendant / 30) as Sign;

  // Build a map: sign → planets
  const signPlanets = new Map<number, Planet[]>();
  for (let s = 0; s < 12; s++) {
    signPlanets.set(s, []);
  }

  for (const planetPos of chart.planets) {
    const signIdx = planetPos.sign as number;
    const existing = signPlanets.get(signIdx) ?? [];
    existing.push(planetPos.planet);
    signPlanets.set(signIdx, existing);
  }

  // Build 4×4 grid
  const grid: GridCell[][] = [];

  for (let row = 0; row < 4; row++) {
    const gridRow: GridCell[] = [];
    for (let col = 0; col < 4; col++) {
      const signAtCell = GRID_SIGN_AT[row]?.[col] ?? -1;

      if (signAtCell === -1) {
        // Metadata/center cell
        gridRow.push({
          row,
          col,
          sign: Sign.Aries,   // Placeholder — not a real sign cell
          planets: [],
          isLagna: false,
          isMetadata: true,
        });
      } else {
        const sign = signAtCell as Sign;
        const planets = signPlanets.get(signAtCell) ?? [];
        gridRow.push({
          row,
          col,
          sign,
          planets: [...planets],
          isLagna: sign === lagnaSign,
          isMetadata: false,
        });
      }
    }
    grid.push(gridRow);
  }

  return grid;
}

/**
 * Get the GridCell for a specific sign.
 *
 * @param chart  ChartData
 * @param sign   Sign to look up
 * @returns The GridCell at the sign's fixed position
 */
export function getGridCellForSign(chart: ChartData, sign: Sign): GridCell {
  const layout = getSouthIndianLayout(chart);
  const [row, col] = GRID_POSITION[sign as number] ?? [0, 0];
  return layout[row]?.[col] ?? {
    row: 0, col: 0, sign, planets: [], isLagna: false, isMetadata: false,
  };
}

/**
 * Render the South Indian chart to a simple ASCII string for debugging.
 *
 * @param chart  ChartData
 * @returns Multi-line string representation
 */
export function renderSouthIndianASCII(chart: ChartData): string {
  const grid = getSouthIndianLayout(chart);
  const lines: string[] = [];

  for (let row = 0; row < 4; row++) {
    const rowCells = grid[row] ?? [];
    const topLine: string[] = [];
    const contentLine: string[] = [];
    const bottomLine: string[] = [];

    for (let col = 0; col < 4; col++) {
      const cell = rowCells[col];
      if (!cell) continue;

      const borderH = '+--------';
      topLine.push(borderH);

      if (cell.isMetadata) {
        contentLine.push('|        ');
      } else {
        const signShort = getSignShortName(cell.sign);
        const lagnaMarker = cell.isLagna ? '*' : ' ';
        const planetStr = cell.planets.map(getPlanetSymbol).join(' ');
        const content = `${lagnaMarker}${signShort} ${planetStr}`.padEnd(8).slice(0, 8);
        contentLine.push(`|${content}`);
      }
      bottomLine.push('+--------');
    }

    lines.push(topLine.join('') + '+');
    lines.push(contentLine.join('') + '|');
    lines.push(bottomLine.join('') + '+');
  }

  return lines.join('\n');
}
