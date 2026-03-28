import { describe, it, expect } from 'vitest';
import { Planet, PlanetStress } from '../types/index.js';
import { getRemediesForPlanet } from './remediations.js';

describe('getRemediesForPlanet', () => {
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

  it('returns 3 remedies for all 9 planets', () => {
    const stress: PlanetStress = {
      planet: Planet.Sun,
      stressLevel: 'mild',
      reasons: ['Some stress'],
      triggers: ['dasha'],
    };
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
    // Severe first (lower priority), mild after
    expect(severeRemedies[0].priority).toBeLessThan(mildRemedies[0].priority);
  });

  it('orders remedies by priority ascending within same planet', () => {
    const stress: PlanetStress = { planet: Planet.Saturn, stressLevel: 'moderate', reasons: [], triggers: [] };
    const remedies = getRemediesForPlanet(Planet.Saturn, stress);
    for (let i = 1; i < remedies.length; i++) {
      expect(remedies[i - 1].priority).toBeLessThanOrEqual(remedies[i].priority);
    }
  });

  it('gemstone has id ending in -gemstone', () => {
    const stress: PlanetStress = { planet: Planet.Moon, stressLevel: 'mild', reasons: [], triggers: [] };
    const remedies = getRemediesForPlanet(Planet.Moon, stress);
    const gemstone = remedies.find(r => r.type === 'gemstone');
    expect(gemstone?.id).toBe('1-gemstone'); // Moon = 1
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
});
