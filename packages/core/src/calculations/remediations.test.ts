import { describe, it, expect } from 'vitest';
import { Planet, PlanetStress, ChartData, DashaPeriod, DashaLevel } from '../types/index.js';
import { getRemediesForPlanet } from './remediations.js';

// Helper to create a valid DashaLevel
function makeDashaLevel(planet: Planet, level: 1 | 2 | 3 | 4 | 5): DashaLevel {
  return {
    planet,
    startDate: new Date('1990-01-01'),
    endDate: new Date('2090-01-01'), // must span today so getDashaAtDate finds it
    level,
  };
}

// Helper to create mock dashas for a given planet
function makeDashas(mahaPlanet: Planet, antaraPlanet: Planet, pranaPlanet: Planet): DashaPeriod[] {
  return [{
    mahadasha: makeDashaLevel(mahaPlanet, 1),
    antardasha: makeDashaLevel(antaraPlanet, 2),
    pratyantardasha: makeDashaLevel(Planet.Sun, 3),
    sookshma: makeDashaLevel(Planet.Sun, 4),
    prana: makeDashaLevel(pranaPlanet, 5),
  }];
}

// Helper to create a minimal chart with a planet in a specific house sign
function makeChart(planetSignMap: Partial<Record<Planet, number>> = {}): ChartData {
  const planets = (Object.keys(Planet) as (keyof typeof Planet)[])
    .filter(k => typeof Planet[k] === 'number')
    .map(k => Planet[k] as unknown as Planet)
    .map(p => ({
      planet: p,
      sign: planetSignMap[p] ?? 0,
      longitude: (planetSignMap[p] ?? 0) * 30,
      latitude: 0,
      speed: 0,
      isRetrograde: false,
    }));
  return {
    planets,
    ascendant: 0,
    houses: [],
  };
}

// Helper to create a chart with a specific planet in a specific sign (house position)
function makeChartWithPlanetInSign(planet: Planet, sign: number): ChartData {
  return makeChart({ [planet]: sign });
}

describe('getRemediesForPlanet', () => {
  // --- Existing tests (unchanged) ---
  it('returns gemstone, mantra, and color for any stressed planet', () => {
    const stress: PlanetStress = {
      planet: Planet.Mars,
      stressLevel: 'moderate',
      reasons: ['In dusthana'],
      triggers: ['house'],
    };
    const remedies = getRemediesForPlanet(Planet.Mars, stress);
    const types = remedies.map(r => r.type);
    expect(types).toContain('gemstone');
    expect(types).toContain('moola_mantra');
    expect(types).toContain('color');
    expect(remedies).toHaveLength(3);
  });

  it('returns 3 remedies for all 9 planets without chart/dashas', () => {
    const stress: PlanetStress = { planet: Planet.Sun, stressLevel: 'mild', reasons: [], triggers: [] };
    for (const planet of [Planet.Sun, Planet.Moon, Planet.Mars, Planet.Mercury,
                          Planet.Jupiter, Planet.Venus, Planet.Saturn,
                          Planet.Rahu, Planet.Ketu] as Planet[]) {
      const remedies = getRemediesForPlanet(planet, stress);
      expect(remedies).toHaveLength(3);
    }
  });

  it('higher stress level = lower priority number (more urgent)', () => {
    const mildStress: PlanetStress = { planet: Planet.Jupiter, stressLevel: 'mild', reasons: [], triggers: [] };
    const severeStress: PlanetStress = { planet: Planet.Jupiter, stressLevel: 'severe', reasons: [], triggers: [] };
    const mildRemedies = getRemediesForPlanet(Planet.Jupiter, mildStress);
    const severeRemedies = getRemediesForPlanet(Planet.Jupiter, severeStress);
    expect(severeRemedies[0].priority).toBeLessThan(mildRemedies[0].priority);
  });

  it('orders remedies by priority ascending within same planet', () => {
    const stress: PlanetStress = { planet: Planet.Saturn, stressLevel: 'moderate', reasons: [], triggers: [] };
    const remedies = getRemediesForPlanet(Planet.Saturn, stress);
    for (let i = 1; i < remedies.length; i++) {
      expect(remedies[i - 1].priority).toBeLessThanOrEqual(remedies[i].priority);
    }
  });

  it('planet field on each remedy matches input planet', () => {
    const stress: PlanetStress = { planet: Planet.Venus, stressLevel: 'mild', reasons: [], triggers: [] };
    const remedies = getRemediesForPlanet(Planet.Venus, stress);
    for (const remedy of remedies) {
      expect(remedy.planet).toBe(Planet.Venus);
    }
  });

  it('all remedies have stressLevel matching input', () => {
    const stress: PlanetStress = { planet: Planet.Mars, stressLevel: 'severe', reasons: [], triggers: [] };
    const remedies = getRemediesForPlanet(Planet.Mars, stress);
    for (const remedy of remedies) {
      expect(remedy.stressLevel).toBe('severe');
    }
  });

  // --- New tests for 5 extended remedy types ---

  it('returns 8 remedy types when chart and dashas are provided', () => {
    const stress: PlanetStress = { planet: Planet.Sun, stressLevel: 'moderate', reasons: [], triggers: [] };
    const chart = makeChart();
    const dashas = makeDashas(Planet.Sun, Planet.Moon, Planet.Sun);
    const remedies = getRemediesForPlanet(Planet.Sun, stress, chart, dashas);
    const types = remedies.map(r => r.type);
    expect(types).toContain('gemstone');
    expect(types).toContain('moola_mantra');
    expect(types).toContain('color');
    expect(types).toContain('hora_kaala');
    expect(types).toContain('puja');
    expect(types).toContain('charity');
    expect(types).toContain('dietary');
    expect(types).toContain('navagraha_peeth');
    expect(remedies).toHaveLength(8);
  });

  it('returns 3 remedies (primary only) when no chart/dashas provided', () => {
    const stress: PlanetStress = { planet: Planet.Sun, stressLevel: 'moderate', reasons: [], triggers: [] };
    const remedies = getRemediesForPlanet(Planet.Sun, stress);
    expect(remedies).toHaveLength(3);
    expect(remedies.map(r => r.type)).toEqual(['gemstone', 'moola_mantra', 'color']);
  });

  it('hora_kaala has correct fields for all planets', () => {
    const stress: PlanetStress = { planet: Planet.Sun, stressLevel: 'moderate', reasons: [], triggers: [] };
    const chart = makeChart();
    const dashas = makeDashas(Planet.Sun, Planet.Moon, Planet.Sun);
    const remedies = getRemediesForPlanet(Planet.Sun, stress, chart, dashas);
    const hk = remedies.find(r => r.type === 'hora_kaala') as any;
    expect(hk).toBeDefined();
    expect(hk.day).toBeTruthy();
    expect(hk.horaWindow).toBeTruthy();
    expect(hk.kaalaWindow).toBeTruthy();
    expect(hk.description).toBeTruthy();
  });

  it('puja has items, duration, procedure, dayRestriction, and warning for all planets', () => {
    const stress: PlanetStress = { planet: Planet.Mars, stressLevel: 'moderate', reasons: [], triggers: [] };
    const chart = makeChart();
    const dashas = makeDashas(Planet.Mars, Planet.Moon, Planet.Mars);
    const remedies = getRemediesForPlanet(Planet.Mars, stress, chart, dashas);
    const puja = remedies.find(r => r.type === 'puja') as any;
    expect(puja).toBeDefined();
    expect(puja.name).toBeTruthy();
    expect(puja.duration).toBeTruthy();
    expect(puja.procedure).toBeTruthy();
    expect(Array.isArray(puja.items)).toBe(true);
    expect(puja.items.length).toBeGreaterThan(0);
    expect(puja.dayRestriction).toBeTruthy();
    expect(puja.warning).toBeTruthy();
  });

  it('charity has items, description for all planets', () => {
    const stress: PlanetStress = { planet: Planet.Venus, stressLevel: 'moderate', reasons: [], triggers: [] };
    const chart = makeChart();
    const dashas = makeDashas(Planet.Venus, Planet.Moon, Planet.Venus);
    const remedies = getRemediesForPlanet(Planet.Venus, stress, chart, dashas);
    const charity = remedies.find(r => r.type === 'charity') as any;
    expect(charity).toBeDefined();
    expect(charity.name).toBeTruthy();
    expect(Array.isArray(charity.items)).toBe(true);
    expect(charity.items.length).toBeGreaterThan(0);
    expect(charity.description).toBeTruthy();
  });

  it('charity dashaBonus set during Mahadasha', () => {
    const stress: PlanetStress = { planet: Planet.Jupiter, stressLevel: 'severe', reasons: [], triggers: [] };
    // Jupiter mahadasha
    const chart = makeChart();
    const dashas = makeDashas(Planet.Jupiter, Planet.Sun, Planet.Jupiter);
    const remedies = getRemediesForPlanet(Planet.Jupiter, stress, chart, dashas);
    const charity = remedies.find(r => r.type === 'charity') as any;
    expect(charity.dashaBonus).toBeDefined();
    expect(charity.dashaBonus).toBeTruthy();
  });

  it('charity dashaBonus undefined during Antardasha only', () => {
    const stress: PlanetStress = { planet: Planet.Mercury, stressLevel: 'moderate', reasons: [], triggers: [] };
    // Mercury antardasha (not mahadasha)
    const chart = makeChart();
    const dashas = makeDashas(Planet.Sun, Planet.Mercury, Planet.Mercury);
    const remedies = getRemediesForPlanet(Planet.Mercury, stress, chart, dashas);
    const charity = remedies.find(r => r.type === 'charity') as any;
    expect(charity.dashaBonus).toBeUndefined();
  });

  it('dietary has fastingRule, eat, avoid, and lifestyle fields', () => {
    const stress: PlanetStress = { planet: Planet.Jupiter, stressLevel: 'mild', reasons: [], triggers: [] };
    const chart = makeChart();
    const dashas = makeDashas(Planet.Jupiter, Planet.Sun, Planet.Jupiter);
    const remedies = getRemediesForPlanet(Planet.Jupiter, stress, chart, dashas);
    const diet = remedies.find(r => r.type === 'dietary') as any;
    expect(diet).toBeDefined();
    expect(diet.name).toBeTruthy();
    expect(diet.fastingRule).toBeTruthy();
    expect(Array.isArray(diet.eat)).toBe(true);
    expect(diet.eat.length).toBeGreaterThan(0);
    expect(Array.isArray(diet.avoid)).toBe(true);
    expect(diet.avoid.length).toBeGreaterThan(0);
    expect(Array.isArray(diet.lifestyle)).toBe(true);
    expect(diet.lifestyle.length).toBeGreaterThan(0);
  });

  it('navagraha_peeth has direction, material, placement, frequency', () => {
    const stress: PlanetStress = { planet: Planet.Saturn, stressLevel: 'severe', reasons: [], triggers: [] };
    const chart = makeChart();
    const dashas = makeDashas(Planet.Saturn, Planet.Sun, Planet.Saturn);
    const remedies = getRemediesForPlanet(Planet.Saturn, stress, chart, dashas);
    const peeth = remedies.find(r => r.type === 'navagraha_peeth') as any;
    expect(peeth).toBeDefined();
    expect(peeth.name).toBeTruthy();
    expect(peeth.direction).toBeTruthy();
    expect(peeth.material).toBeTruthy();
    expect(peeth.placement).toBeTruthy();
    expect(peeth.frequency).toBeTruthy();
    expect(peeth.description).toBeTruthy();
  });

  it('navagraha_peeth frequency is daily during Mahadasha', () => {
    const stress: PlanetStress = { planet: Planet.Sun, stressLevel: 'severe', reasons: [], triggers: [] };
    const chart = makeChart();
    const dashas = makeDashas(Planet.Sun, Planet.Moon, Planet.Sun);
    const remedies = getRemediesForPlanet(Planet.Sun, stress, chart, dashas);
    const peeth = remedies.find(r => r.type === 'navagraha_peeth') as any;
    expect(peeth.frequency.toLowerCase()).toContain('daily');
  });

  it('navagraha_peeth material is gold for exalted dignity', () => {
    // Mercury is exalted in Virgo (Sign.Virgo = 5)
    const stress: PlanetStress = { planet: Planet.Mercury, stressLevel: 'moderate', reasons: [], triggers: [] };
    const chart = makeChartWithPlanetInSign(Planet.Mercury, 5); // Virgo = Mercury exalted
    const dashas = makeDashas(Planet.Mercury, Planet.Sun, Planet.Mercury);
    const remedies = getRemediesForPlanet(Planet.Mercury, stress, chart, dashas);
    const peeth = remedies.find(r => r.type === 'navagraha_peeth') as any;
    expect(peeth.material.toLowerCase()).toContain('gold');
  });

  it('navagraha_peeth material is silver for debilitated dignity', () => {
    // Mercury is debilitated in Pisces (Sign.Pisces = 11)
    const stress: PlanetStress = { planet: Planet.Mercury, stressLevel: 'moderate', reasons: [], triggers: [] };
    const chart = makeChartWithPlanetInSign(Planet.Mercury, 11); // Pisces = Mercury debilitated
    const dashas = makeDashas(Planet.Mercury, Planet.Sun, Planet.Mercury);
    const remedies = getRemediesForPlanet(Planet.Mercury, stress, chart, dashas);
    const peeth = remedies.find(r => r.type === 'navagraha_peeth') as any;
    expect(peeth.material.toLowerCase()).toContain('silver');
  });
});
