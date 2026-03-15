// ============================================================
// Shadbala Tests — Parashari Precision
// ============================================================
// Tests for six-fold planetary strength calculations.
// No Swiss Ephemeris required.
// ============================================================

import {
  calculateShadbala,
  NAISARGIKA_BALA,
  EXALT_DEBIL,
  DIGBALA_BEST_HOUSE,
  getSignLord,
  getPlanetHouseNumber,
} from './shadbala.js';
import { Planet, Sign, Ayanamsa, ChartData, PlanetPosition, HousePosition, House } from '../types/index.js';

// ------------------------------------
// Helper: build a minimal ChartData
// ------------------------------------

function buildTestChart(
  ascendantSign: number,
  placements: Array<{ planet: Planet; sign: Sign; degreeInSign?: number; isRetrograde?: boolean; speed?: number }>,
): ChartData {
  const ascendant = ascendantSign * 30 + 0.1;

  const planets: PlanetPosition[] = placements.map(
    ({ planet, sign, degreeInSign = 5, isRetrograde = false, speed = 0.9 }) => ({
      planet,
      tropicalLongitude: (sign as number) * 30 + degreeInSign,
      siderealLongitude: (sign as number) * 30 + degreeInSign,
      sign,
      degreeInSign,
      nakshatra: 0 as any,
      nakshatraPada: 1,
      isRetrograde,
      speed: isRetrograde ? -Math.abs(speed) : Math.abs(speed),
      latitude: 0,
    }),
  );

  const houses: HousePosition[] = [];
  for (let i = 0; i < 12; i++) {
    const houseSign = ((ascendantSign + i) % 12) as Sign;
    houses.push({
      house: (i + 1) as House,
      sign: houseSign,
      degreeOnCusp: houseSign * 30,
    });
  }

  return {
    ascendant,
    planets,
    houses,
    julianDay: 2451910.0,   // ~2001-01-01T12:00:00Z (daytime)
    ayanamsa: 23.85,
    ayanamsaType: Ayanamsa.Lahiri,
    mc: ((ascendantSign + 9) % 12) * 30,
  };
}

// ===========================================================================
// NAISARGIKA_BALA — Natural Strengths (fixed values)
// ===========================================================================

describe('Naisargika Bala — Natural Strengths', () => {
  test('Sun natural strength = 60 Virupas', () => {
    expect(NAISARGIKA_BALA[Planet.Sun]).toBe(60.0);
  });

  test('Moon natural strength = 51.43 Virupas', () => {
    expect(NAISARGIKA_BALA[Planet.Moon]).toBeCloseTo(51.43, 1);
  });

  test('Venus natural strength = 42.86 Virupas', () => {
    expect(NAISARGIKA_BALA[Planet.Venus]).toBeCloseTo(42.86, 1);
  });

  test('Jupiter natural strength = 34.29 Virupas', () => {
    expect(NAISARGIKA_BALA[Planet.Jupiter]).toBeCloseTo(34.29, 1);
  });

  test('Mercury natural strength = 25.71 Virupas', () => {
    expect(NAISARGIKA_BALA[Planet.Mercury]).toBeCloseTo(25.71, 1);
  });

  test('Mars natural strength = 17.14 Virupas', () => {
    expect(NAISARGIKA_BALA[Planet.Mars]).toBeCloseTo(17.14, 1);
  });

  test('Saturn natural strength = 8.57 Virupas', () => {
    expect(NAISARGIKA_BALA[Planet.Saturn]).toBeCloseTo(8.57, 1);
  });

  test('Naisargika strengths are in descending order: Sun > Moon > Venus > Jupiter > Mercury > Mars > Saturn', () => {
    expect(NAISARGIKA_BALA[Planet.Sun]).toBeGreaterThan(NAISARGIKA_BALA[Planet.Moon]!);
    expect(NAISARGIKA_BALA[Planet.Moon]).toBeGreaterThan(NAISARGIKA_BALA[Planet.Venus]!);
    expect(NAISARGIKA_BALA[Planet.Venus]).toBeGreaterThan(NAISARGIKA_BALA[Planet.Jupiter]!);
    expect(NAISARGIKA_BALA[Planet.Jupiter]).toBeGreaterThan(NAISARGIKA_BALA[Planet.Mercury]!);
    expect(NAISARGIKA_BALA[Planet.Mercury]).toBeGreaterThan(NAISARGIKA_BALA[Planet.Mars]!);
    expect(NAISARGIKA_BALA[Planet.Mars]).toBeGreaterThan(NAISARGIKA_BALA[Planet.Saturn]!);
  });

  test('Rahu and Ketu have 0 naisargika strength', () => {
    expect(NAISARGIKA_BALA[Planet.Rahu]).toBe(0);
    expect(NAISARGIKA_BALA[Planet.Ketu]).toBe(0);
  });
});

// ===========================================================================
// EXALT_DEBIL — Exaltation/Debilitation data
// ===========================================================================

describe('Exaltation and Debilitation data', () => {
  test('Sun exalted in Aries at 10°', () => {
    expect(EXALT_DEBIL[Planet.Sun].exaltSign).toBe(Sign.Aries);
    expect(EXALT_DEBIL[Planet.Sun].exaltDeg).toBe(10);
  });

  test('Sun debilitated in Libra at 10°', () => {
    expect(EXALT_DEBIL[Planet.Sun].debilSign).toBe(Sign.Libra);
    expect(EXALT_DEBIL[Planet.Sun].debilDeg).toBe(10);
  });

  test('Moon exalted in Taurus, debilitated in Scorpio', () => {
    expect(EXALT_DEBIL[Planet.Moon].exaltSign).toBe(Sign.Taurus);
    expect(EXALT_DEBIL[Planet.Moon].debilSign).toBe(Sign.Scorpio);
  });

  test('Mars exalted in Capricorn at 28°', () => {
    expect(EXALT_DEBIL[Planet.Mars].exaltSign).toBe(Sign.Capricorn);
    expect(EXALT_DEBIL[Planet.Mars].exaltDeg).toBe(28);
  });

  test('Jupiter exalted in Cancer, debilitated in Capricorn', () => {
    expect(EXALT_DEBIL[Planet.Jupiter].exaltSign).toBe(Sign.Cancer);
    expect(EXALT_DEBIL[Planet.Jupiter].debilSign).toBe(Sign.Capricorn);
  });

  test('Saturn exalted in Libra', () => {
    expect(EXALT_DEBIL[Planet.Saturn].exaltSign).toBe(Sign.Libra);
  });
});

// ===========================================================================
// DIGBALA_BEST_HOUSE — Directional Strength positions
// ===========================================================================

describe('Digbala best house positions', () => {
  test('Sun best in 10th house', () => {
    expect(DIGBALA_BEST_HOUSE[Planet.Sun]).toBe(10);
  });

  test('Saturn best in 7th house', () => {
    expect(DIGBALA_BEST_HOUSE[Planet.Saturn]).toBe(7);
  });

  test('Mercury best in 1st house', () => {
    expect(DIGBALA_BEST_HOUSE[Planet.Mercury]).toBe(1);
  });

  test('Jupiter best in 1st house', () => {
    expect(DIGBALA_BEST_HOUSE[Planet.Jupiter]).toBe(1);
  });

  test('Moon best in 4th house', () => {
    expect(DIGBALA_BEST_HOUSE[Planet.Moon]).toBe(4);
  });

  test('Venus best in 4th house', () => {
    expect(DIGBALA_BEST_HOUSE[Planet.Venus]).toBe(4);
  });

  test('Mars best in 10th house', () => {
    expect(DIGBALA_BEST_HOUSE[Planet.Mars]).toBe(10);
  });
});

// ===========================================================================
// getSignLord
// ===========================================================================

describe('getSignLord', () => {
  test('Aries → Mars', () => {
    expect(getSignLord(Sign.Aries)).toBe(Planet.Mars);
  });

  test('Taurus → Venus', () => {
    expect(getSignLord(Sign.Taurus)).toBe(Planet.Venus);
  });

  test('Gemini → Mercury', () => {
    expect(getSignLord(Sign.Gemini)).toBe(Planet.Mercury);
  });

  test('Cancer → Moon', () => {
    expect(getSignLord(Sign.Cancer)).toBe(Planet.Moon);
  });

  test('Leo → Sun', () => {
    expect(getSignLord(Sign.Leo)).toBe(Planet.Sun);
  });

  test('Virgo → Mercury', () => {
    expect(getSignLord(Sign.Virgo)).toBe(Planet.Mercury);
  });

  test('Libra → Venus', () => {
    expect(getSignLord(Sign.Libra)).toBe(Planet.Venus);
  });

  test('Scorpio → Mars', () => {
    expect(getSignLord(Sign.Scorpio)).toBe(Planet.Mars);
  });

  test('Sagittarius → Jupiter', () => {
    expect(getSignLord(Sign.Sagittarius)).toBe(Planet.Jupiter);
  });

  test('Capricorn → Saturn', () => {
    expect(getSignLord(Sign.Capricorn)).toBe(Planet.Saturn);
  });

  test('Aquarius → Saturn', () => {
    expect(getSignLord(Sign.Aquarius)).toBe(Planet.Saturn);
  });

  test('Pisces → Jupiter', () => {
    expect(getSignLord(Sign.Pisces)).toBe(Planet.Jupiter);
  });
});

// ===========================================================================
// Uccha Bala (Exaltation strength) — verified through calculateShadbala
// ===========================================================================

describe('Uccha Bala via calculateShadbala', () => {
  test('Sun at exact exaltation (10° Aries) → sthanabala has high uccha contribution', () => {
    // Sun exalted in Aries at 10°
    const chart = buildTestChart(Sign.Leo, [
      { planet: Planet.Sun, sign: Sign.Aries, degreeInSign: 10 },
      { planet: Planet.Moon, sign: Sign.Cancer, degreeInSign: 5 },
      { planet: Planet.Mars, sign: Sign.Gemini, degreeInSign: 5 },
      { planet: Planet.Mercury, sign: Sign.Virgo, degreeInSign: 5 },
      { planet: Planet.Jupiter, sign: Sign.Sagittarius, degreeInSign: 5 },
      { planet: Planet.Venus, sign: Sign.Libra, degreeInSign: 5 },
      { planet: Planet.Saturn, sign: Sign.Capricorn, degreeInSign: 5 },
    ]);
    const results = calculateShadbala(chart);
    const sunResult = results.find((r) => r.planet === Planet.Sun)!;

    // Sun at exact exaltation → sthanabala should be high
    // Uccha bala at exact exaltation = 60 Virupas
    // Total sthanabala is higher; verify it's well above minimum
    expect(sunResult.sthanabala).toBeGreaterThan(60);
  });

  test('Sun at exact debilitation (10° Libra) → uccha bala contribution near 0', () => {
    // The sthanabala will be lower without the uccha contribution
    const chart = buildTestChart(Sign.Aries, [
      { planet: Planet.Sun, sign: Sign.Libra, degreeInSign: 10 },
      { planet: Planet.Moon, sign: Sign.Cancer, degreeInSign: 5 },
      { planet: Planet.Mars, sign: Sign.Gemini, degreeInSign: 5 },
      { planet: Planet.Mercury, sign: Sign.Virgo, degreeInSign: 5 },
      { planet: Planet.Jupiter, sign: Sign.Sagittarius, degreeInSign: 5 },
      { planet: Planet.Venus, sign: Sign.Libra, degreeInSign: 5 },
      { planet: Planet.Saturn, sign: Sign.Capricorn, degreeInSign: 5 },
    ]);
    const exaltedChart = buildTestChart(Sign.Aries, [
      { planet: Planet.Sun, sign: Sign.Aries, degreeInSign: 10 },
      { planet: Planet.Moon, sign: Sign.Cancer, degreeInSign: 5 },
      { planet: Planet.Mars, sign: Sign.Gemini, degreeInSign: 5 },
      { planet: Planet.Mercury, sign: Sign.Virgo, degreeInSign: 5 },
      { planet: Planet.Jupiter, sign: Sign.Sagittarius, degreeInSign: 5 },
      { planet: Planet.Venus, sign: Sign.Libra, degreeInSign: 5 },
      { planet: Planet.Saturn, sign: Sign.Capricorn, degreeInSign: 5 },
    ]);

    const debilResults = calculateShadbala(chart);
    const exaltedResults = calculateShadbala(exaltedChart);

    const debilSun = debilResults.find((r) => r.planet === Planet.Sun)!;
    const exaltedSun = exaltedResults.find((r) => r.planet === Planet.Sun)!;

    // Exalted Sun should have higher sthanabala than debilitated Sun
    expect(exaltedSun.sthanabala).toBeGreaterThan(debilSun.sthanabala);
  });

  test('Sun sthanabala is higher in Aries (exalted) than in Libra (debilitated)', () => {
    const baseChart = buildTestChart(Sign.Aries, [
      { planet: Planet.Moon, sign: Sign.Cancer, degreeInSign: 5 },
      { planet: Planet.Mars, sign: Sign.Gemini, degreeInSign: 5 },
      { planet: Planet.Mercury, sign: Sign.Virgo, degreeInSign: 5 },
      { planet: Planet.Jupiter, sign: Sign.Sagittarius, degreeInSign: 5 },
      { planet: Planet.Venus, sign: Sign.Capricorn, degreeInSign: 5 },
      { planet: Planet.Saturn, sign: Sign.Capricorn, degreeInSign: 5 },
    ]);

    const chartExalt: ChartData = {
      ...baseChart,
      planets: [
        ...baseChart.planets,
        {
          planet: Planet.Sun, sign: Sign.Aries, degreeInSign: 10,
          tropicalLongitude: 10, siderealLongitude: 10,
          nakshatra: 0 as any, nakshatraPada: 1, isRetrograde: false, speed: 0.9, latitude: 0,
        },
      ],
    };

    const chartDebil: ChartData = {
      ...baseChart,
      planets: [
        ...baseChart.planets,
        {
          planet: Planet.Sun, sign: Sign.Libra, degreeInSign: 10,
          tropicalLongitude: 190, siderealLongitude: 190,
          nakshatra: 0 as any, nakshatraPada: 1, isRetrograde: false, speed: 0.9, latitude: 0,
        },
      ],
    };

    const exaltedResults = calculateShadbala(chartExalt);
    const debilResults = calculateShadbala(chartDebil);

    const exaltedSun = exaltedResults.find((r) => r.planet === Planet.Sun)!;
    const debilSun = debilResults.find((r) => r.planet === Planet.Sun)!;

    expect(exaltedSun.sthanabala).toBeGreaterThan(debilSun.sthanabala);
  });
});

// ===========================================================================
// Digbala — Directional strength
// ===========================================================================

describe('Digbala — Directional strength', () => {
  test('Sun in 10th house → high digbala', () => {
    // Sun best in 10th house = Capricorn for Aries lagna
    const chart = buildTestChart(Sign.Aries, [
      { planet: Planet.Sun, sign: Sign.Capricorn, degreeInSign: 5 },
      { planet: Planet.Moon, sign: Sign.Cancer, degreeInSign: 5 },
      { planet: Planet.Mars, sign: Sign.Gemini, degreeInSign: 5 },
      { planet: Planet.Mercury, sign: Sign.Virgo, degreeInSign: 5 },
      { planet: Planet.Jupiter, sign: Sign.Aries, degreeInSign: 5 },
      { planet: Planet.Venus, sign: Sign.Pisces, degreeInSign: 5 },
      { planet: Planet.Saturn, sign: Sign.Libra, degreeInSign: 5 },
    ]);
    const results = calculateShadbala(chart);
    const sunResult = results.find((r) => r.planet === Planet.Sun)!;
    // Digbala should be max (60) for Sun in 10th house
    expect(sunResult.digbala).toBeCloseTo(60, 0);
  });

  test('Saturn in 7th house → high digbala', () => {
    // Saturn best in 7th = Libra for Aries lagna
    const chart = buildTestChart(Sign.Aries, [
      { planet: Planet.Sun, sign: Sign.Leo, degreeInSign: 5 },
      { planet: Planet.Moon, sign: Sign.Cancer, degreeInSign: 5 },
      { planet: Planet.Mars, sign: Sign.Aries, degreeInSign: 5 },
      { planet: Planet.Mercury, sign: Sign.Virgo, degreeInSign: 5 },
      { planet: Planet.Jupiter, sign: Sign.Sagittarius, degreeInSign: 5 },
      { planet: Planet.Venus, sign: Sign.Taurus, degreeInSign: 5 },
      { planet: Planet.Saturn, sign: Sign.Libra, degreeInSign: 5 },  // 7th house
    ]);
    const results = calculateShadbala(chart);
    const saturnResult = results.find((r) => r.planet === Planet.Saturn)!;
    expect(saturnResult.digbala).toBeCloseTo(60, 0);
  });

  test('Sun in 4th house (opposite to 10th) → digbala near 0', () => {
    // Sun worst in 4th (opposite to 10th)
    const chart = buildTestChart(Sign.Aries, [
      { planet: Planet.Sun, sign: Sign.Cancer, degreeInSign: 5 },  // 4th house
      { planet: Planet.Moon, sign: Sign.Taurus, degreeInSign: 5 },
      { planet: Planet.Mars, sign: Sign.Gemini, degreeInSign: 5 },
      { planet: Planet.Mercury, sign: Sign.Virgo, degreeInSign: 5 },
      { planet: Planet.Jupiter, sign: Sign.Sagittarius, degreeInSign: 5 },
      { planet: Planet.Venus, sign: Sign.Aquarius, degreeInSign: 5 },
      { planet: Planet.Saturn, sign: Sign.Scorpio, degreeInSign: 5 },
    ]);
    const results = calculateShadbala(chart);
    const sunResult = results.find((r) => r.planet === Planet.Sun)!;
    // Digbala should be near 0 when Sun is in 4th (opposite to best 10th)
    expect(sunResult.digbala).toBeLessThan(15);
  });
});

// ===========================================================================
// calculateShadbala — full integration
// ===========================================================================

describe('calculateShadbala — full calculation', () => {
  function buildFullChart(): ChartData {
    return buildTestChart(Sign.Aries, [
      { planet: Planet.Sun, sign: Sign.Aries, degreeInSign: 10 },
      { planet: Planet.Moon, sign: Sign.Cancer, degreeInSign: 5 },
      { planet: Planet.Mars, sign: Sign.Capricorn, degreeInSign: 28 },
      { planet: Planet.Mercury, sign: Sign.Virgo, degreeInSign: 15 },
      { planet: Planet.Jupiter, sign: Sign.Cancer, degreeInSign: 5 },
      { planet: Planet.Venus, sign: Sign.Pisces, degreeInSign: 27 },
      { planet: Planet.Saturn, sign: Sign.Libra, degreeInSign: 20 },
      { planet: Planet.Rahu, sign: Sign.Gemini, degreeInSign: 5 },
      { planet: Planet.Ketu, sign: Sign.Sagittarius, degreeInSign: 5 },
    ]);
  }

  test('Returns results for all 7 main planets', () => {
    const chart = buildFullChart();
    const results = calculateShadbala(chart);
    expect(results).toHaveLength(7);

    const planets = results.map((r) => r.planet);
    expect(planets).toContain(Planet.Sun);
    expect(planets).toContain(Planet.Moon);
    expect(planets).toContain(Planet.Mars);
    expect(planets).toContain(Planet.Mercury);
    expect(planets).toContain(Planet.Jupiter);
    expect(planets).toContain(Planet.Venus);
    expect(planets).toContain(Planet.Saturn);
  });

  test('Each result has all required fields', () => {
    const chart = buildFullChart();
    const results = calculateShadbala(chart);
    for (const result of results) {
      expect(typeof result.sthanabala).toBe('number');
      expect(typeof result.digbala).toBe('number');
      expect(typeof result.kalabala).toBe('number');
      expect(typeof result.chestabala).toBe('number');
      expect(typeof result.naisargikabala).toBe('number');
      expect(typeof result.drigbala).toBe('number');
      expect(typeof result.total).toBe('number');
      expect(typeof result.totalRupas).toBe('number');
      expect(typeof result.ishtaPhala).toBe('number');
      expect(typeof result.kashtaPhala).toBe('number');
    }
  });

  test('Total = sum of all six balas (excluding negative drigbala)', () => {
    const chart = buildFullChart();
    const results = calculateShadbala(chart);
    for (const result of results) {
      const expectedTotal =
        result.sthanabala +
        result.digbala +
        result.kalabala +
        result.chestabala +
        result.naisargikabala +
        Math.max(0, result.drigbala);
      expect(result.total).toBeCloseTo(expectedTotal, 2);
    }
  });

  test('totalRupas = total / 60', () => {
    const chart = buildFullChart();
    const results = calculateShadbala(chart);
    for (const result of results) {
      expect(result.totalRupas).toBeCloseTo(result.total / 60, 4);
    }
  });

  test('Naisargika bala matches fixed values', () => {
    const chart = buildFullChart();
    const results = calculateShadbala(chart);
    for (const result of results) {
      expect(result.naisargikabala).toBeCloseTo(NAISARGIKA_BALA[result.planet]!, 1);
    }
  });

  test('All strength values are non-negative (except drigbala which can be negative)', () => {
    const chart = buildFullChart();
    const results = calculateShadbala(chart);
    for (const result of results) {
      expect(result.sthanabala).toBeGreaterThanOrEqual(0);
      expect(result.digbala).toBeGreaterThanOrEqual(0);
      expect(result.kalabala).toBeGreaterThanOrEqual(0);
      expect(result.chestabala).toBeGreaterThanOrEqual(0);
      expect(result.naisargikabala).toBeGreaterThanOrEqual(0);
      expect(result.total).toBeGreaterThanOrEqual(0);
    }
  });

  test('All planets have some meaningful strength (total > 0)', () => {
    const chart = buildFullChart();
    const results = calculateShadbala(chart);
    for (const result of results) {
      expect(result.total).toBeGreaterThan(0);
    }
  });

  test('ishtaPhala and kashtaPhala are non-negative', () => {
    const chart = buildFullChart();
    const results = calculateShadbala(chart);
    for (const result of results) {
      expect(result.ishtaPhala).toBeGreaterThanOrEqual(0);
      expect(result.kashtaPhala).toBeGreaterThanOrEqual(0);
    }
  });

  test('All exalted planets scenario — higher strengths overall', () => {
    // All planets at their exaltation
    const chart = buildTestChart(Sign.Aries, [
      { planet: Planet.Sun, sign: Sign.Aries, degreeInSign: 10 },
      { planet: Planet.Moon, sign: Sign.Taurus, degreeInSign: 3 },
      { planet: Planet.Mars, sign: Sign.Capricorn, degreeInSign: 28 },
      { planet: Planet.Mercury, sign: Sign.Virgo, degreeInSign: 15 },
      { planet: Planet.Jupiter, sign: Sign.Cancer, degreeInSign: 5 },
      { planet: Planet.Venus, sign: Sign.Pisces, degreeInSign: 27 },
      { planet: Planet.Saturn, sign: Sign.Libra, degreeInSign: 20 },
    ]);

    const exaltedResults = calculateShadbala(chart);
    const sunResult = exaltedResults.find((r) => r.planet === Planet.Sun)!;

    // Exalted Sun should have excellent sthanabala
    expect(sunResult.sthanabala).toBeGreaterThan(80);
  });

  test('Retrograde planet gets higher chestabala (60)', () => {
    const chart = buildTestChart(Sign.Aries, [
      { planet: Planet.Sun, sign: Sign.Leo, degreeInSign: 5 },
      { planet: Planet.Moon, sign: Sign.Cancer, degreeInSign: 5 },
      { planet: Planet.Mars, sign: Sign.Aries, degreeInSign: 5, isRetrograde: true },
      { planet: Planet.Mercury, sign: Sign.Virgo, degreeInSign: 5 },
      { planet: Planet.Jupiter, sign: Sign.Sagittarius, degreeInSign: 5, isRetrograde: true },
      { planet: Planet.Venus, sign: Sign.Libra, degreeInSign: 5 },
      { planet: Planet.Saturn, sign: Sign.Capricorn, degreeInSign: 5, isRetrograde: true },
    ]);

    const results = calculateShadbala(chart);
    const marsResult = results.find((r) => r.planet === Planet.Mars)!;
    // Retrograde planet should have chestabala = 60
    expect(marsResult.chestabala).toBe(60);
  });

  test('Planets at mean speed get chestabala ~30 (Sama)', () => {
    const chart = buildTestChart(Sign.Aries, [
      { planet: Planet.Sun, sign: Sign.Leo, degreeInSign: 5, speed: 0.9856 },
      { planet: Planet.Moon, sign: Sign.Cancer, degreeInSign: 5, speed: 13.1764 },
      { planet: Planet.Mars, sign: Sign.Aries, degreeInSign: 5, speed: 0.5240 },
      { planet: Planet.Mercury, sign: Sign.Virgo, degreeInSign: 5, speed: 1.3833 },
      { planet: Planet.Jupiter, sign: Sign.Sagittarius, degreeInSign: 5, speed: 0.0831 },
      { planet: Planet.Venus, sign: Sign.Libra, degreeInSign: 5, speed: 1.2028 },
      { planet: Planet.Saturn, sign: Sign.Capricorn, degreeInSign: 5, speed: 0.0335 },
    ]);
    const results = calculateShadbala(chart);
    const sunResult = results.find((r) => r.planet === Planet.Sun)!;
    // At mean speed ratio = 1.0, chestabala should be ~30 (Sama category)
    expect(sunResult.chestabala).toBe(30);
  });
});

// ===========================================================================
// getPlanetHouseNumber
// ===========================================================================

describe('getPlanetHouseNumber', () => {
  test('Sun in Leo with Leo lagna → 1st house', () => {
    const chart = buildTestChart(Sign.Leo, [
      { planet: Planet.Sun, sign: Sign.Leo, degreeInSign: 5 },
    ]);
    expect(getPlanetHouseNumber(chart, Planet.Sun)).toBe(1);
  });

  test('Sun in Aquarius with Leo lagna → 7th house', () => {
    const chart = buildTestChart(Sign.Leo, [
      { planet: Planet.Sun, sign: Sign.Aquarius, degreeInSign: 5 },
    ]);
    expect(getPlanetHouseNumber(chart, Planet.Sun)).toBe(7);
  });

  test('Missing planet returns 1 (default)', () => {
    const chart = buildTestChart(Sign.Aries, []);
    expect(getPlanetHouseNumber(chart, Planet.Mars)).toBe(1);
  });
});
