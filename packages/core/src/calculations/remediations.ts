// packages/core/src/calculations/remediations.ts

import { Planet, Sign, ChartData, DashaPeriod } from '../types/index.js';
import { TransitPosition } from './transit.js';

// ------------------------------------
// Types
// ------------------------------------

export type StressLevel = 'mild' | 'moderate' | 'severe';
export type StressTrigger = 'dasha' | 'transit' | 'dignity' | 'shadbala' | 'house';
export type RemedyType = 'gemstone' | 'moola_mantra' | 'color';

export interface PlanetStress {
  planet: Planet;
  stressLevel: StressLevel;
  reasons: string[];
  triggers: StressTrigger[];
}

export interface Remedy {
  id: string;
  type: RemedyType;
  planet: Planet;
  name: string;
  description: string;
  benefit: string;
  stressLevel: StressLevel;
  priority: number;
}

export interface RemediationReport {
  immediate: {
    periodDescription: string;
    stressedPlanets: PlanetStress[];
    remedies: Remedy[];
  };
  lifetime: {
    stressedPlanets: PlanetStress[];
    remedies: Remedy[];
  };
}

// ------------------------------------
// Remedy Tables
// ------------------------------------

interface GemstoneEntry {
  name: string;
  sanskrit: string;
  precaution?: string;
  lagnaContraindicated?: Sign[];
}

const GEMSTONE_TABLE: Record<Planet, GemstoneEntry> = {
  [Planet.Sun]:    { name: 'Ruby',             sanskrit: 'मणिक (Manik)',     precaution: 'Not for Leo lagna',        lagnaContraindicated: [Sign.Leo] },
  [Planet.Moon]:   { name: 'Pearl',            sanskrit: 'मोती (Moti)',      precaution: 'Not for Cancer lagna',   lagnaContraindicated: [Sign.Cancer] },
  [Planet.Mars]:   { name: 'Red Coral',        sanskrit: 'मूंग (Moonga)',   precaution: 'Not for Aries/Scorpio lagna', lagnaContraindicated: [Sign.Aries, Sign.Scorpio] },
  [Planet.Mercury]:{ name: 'Emerald',           sanskrit: 'पन्ना (Panna)',  precaution: 'Not for Gemini/Virgo lagna', lagnaContraindicated: [Sign.Gemini, Sign.Virgo] },
  [Planet.Jupiter]:{ name: 'Yellow Sapphire',   sanskrit: 'पुखराज (Pukhraj)', precaution: 'Not for Sagittarius/Pisces lagna', lagnaContraindicated: [Sign.Sagittarius, Sign.Pisces] },
  [Planet.Venus]:  { name: 'Diamond',           sanskrit: 'हीरा (Heera)',   precaution: 'Not for Taurus/Libra lagna', lagnaContraindicated: [Sign.Taurus, Sign.Libra] },
  [Planet.Saturn]: { name: 'Blue Sapphire',     sanskrit: 'नीलम (Neelam)',  precaution: 'Test first; risky if misplaced' },
  [Planet.Rahu]:   { name: 'Gomed',            sanskrit: 'गोमेद (Gomed)',  precaution: 'Wear with care' },
  [Planet.Ketu]:   { name: "Cat's Eye",         sanskrit: 'लहसुनिया (Lahsuniya)', precaution: 'Wear with care' },
};

const MOOLA_MANTRA_TABLE: Record<Planet, { mantra: string; recitations: string }> = {
  [Planet.Sun]:    { mantra: 'ॐ ह्रां ह्रीं ह्रौं सः सूर्याय नमः',    recitations: '7,000 × 4' },
  [Planet.Moon]:   { mantra: 'ॐ सौं सौमाय नमः',                       recitations: '7,000 × 4' },
  [Planet.Mars]:   { mantra: 'ॐ क्रें क्रौं क्रिः फट् स्वाहा',         recitations: '7,000 × 7' },
  [Planet.Mercury]:{ mantra: 'ॐ बुं बुधाय नमः',                         recitations: '7,000 × 7' },
  [Planet.Jupiter]:{ mantra: 'ॐ बृं बृहस्पतये नमः',                    recitations: '7,000 × 4' },
  [Planet.Venus]:  { mantra: 'ॐ शुक्राय नमः',                           recitations: '7,000 × 7' },
  [Planet.Saturn]: { mantra: 'ॐ प्रां प्रां पृथिवीथाय नमः',              recitations: '7,000 × 7' },
  [Planet.Rahu]:   { mantra: 'ॐ रां राहवे नमः',                        recitations: '7,000 × 7' },
  [Planet.Ketu]:   { mantra: 'ॐ स्यां स्यौं केतवे नमः',                  recitations: '7,000 × 7' },
};

interface ColorEntry {
  primary: string;
  hex: string;
  alternative?: string;
  altHex?: string;
}

const COLOR_TABLE: Record<Planet, ColorEntry> = {
  [Planet.Sun]:    { primary: 'Gold',     hex: '#FFD700',  alternative: 'Red',    altHex: '#FF0000' },
  [Planet.Moon]:   { primary: 'White',   hex: '#FFFFFF',  alternative: 'Silver', altHex: '#C0C0C0' },
  [Planet.Mars]:   { primary: 'Red',      hex: '#FF0000',  alternative: 'Orange', altHex: '#FFA500' },
  [Planet.Mercury]:{ primary: 'Green',    hex: '#00FF00',  alternative: 'Yellow', altHex: '#FFFF00' },
  [Planet.Jupiter]:{ primary: 'Yellow',   hex: '#FFFF00',  alternative: 'Gold',   altHex: '#FFD700' },
  [Planet.Venus]:  { primary: 'White',    hex: '#FFFFFF',  alternative: 'Silver', altHex: '#C0C0C0' },
  [Planet.Saturn]: { primary: 'Black',    hex: '#000000',  alternative: 'Blue',   altHex: '#0000FF' },
  [Planet.Rahu]:   { primary: 'Multi',    hex: '#FFA500',  alternative: 'Orange', altHex: '#FFA500' },
  [Planet.Ketu]:   { primary: 'Brown',    hex: '#A52A2A',  alternative: 'Grey',   altHex: '#808080' },
};

// ------------------------------------
// Placeholder exports
// ------------------------------------

export function calculateRemediations(
  _chart: ChartData,
  _dashas: DashaPeriod[],
  _transit: TransitPosition,
  _options?: { includeLifetime?: boolean; maxResults?: number }
): RemediationReport {
  throw new Error('Not yet implemented');
}

export function getPlanetStress(
  _planet: Planet,
  _chart: ChartData,
  _dashas: DashaPeriod[],
  _transit: TransitPosition,
  _currentDate: Date
): PlanetStress | null {
  throw new Error('Not yet implemented');
}

// ------------------------------------
// Helpers
// ------------------------------------

function getPlanetName(planet: Planet): string {
  const names: Record<Planet, string> = {
    [Planet.Sun]: 'Sun', [Planet.Moon]: 'Moon', [Planet.Mars]: 'Mars',
    [Planet.Mercury]: 'Mercury', [Planet.Jupiter]: 'Jupiter', [Planet.Venus]: 'Venus',
    [Planet.Saturn]: 'Saturn', [Planet.Rahu]: 'Rahu', [Planet.Ketu]: 'Ketu',
  };
  return names[planet];
}

function getPriority(planet: Planet, level: StressLevel, type: RemedyType): number {
  const baseByLevel: Record<StressLevel, number> = { severe: 1, moderate: 2, mild: 4 };
  const typeOffset: Record<RemedyType, number> = { gemstone: 0, moola_mantra: 1, color: 2 };
  return baseByLevel[level] * 10 + typeOffset[type];
}

// ------------------------------------
// Core Functions
// ------------------------------------

export function getRemediesForPlanet(planet: Planet, stress: PlanetStress): Remedy[] {
  const remedies: Remedy[] = [];
  const level = stress.stressLevel;

  // Gemstone
  const gem = GEMSTONE_TABLE[planet];
  if (gem) {
    remedies.push({
      id: `${planet}-gemstone`,
      type: 'gemstone',
      planet,
      name: `${gem.name} (${gem.sanskrit})`,
      description: gem.precaution
        ? `Traditional gemstone for ${getPlanetName(planet)}. ${gem.precaution}.`
        : `Traditional gemstone for ${getPlanetName(planet)}.`,
      benefit: `Strengthens ${getPlanetName(planet)}'s influence`,
      stressLevel: level,
      priority: getPriority(planet, level, 'gemstone'),
    });
  }

  // Moola Mantra
  const mantra = MOOLA_MANTRA_TABLE[planet];
  if (mantra) {
    remedies.push({
      id: `${planet}-moola-mantra`,
      type: 'moola_mantra',
      planet,
      name: `${getPlanetName(planet)} Moola Mantra`,
      description: `Chant "${mantra.mantra}" — ${mantra.recitations} recitations recommended.`,
      benefit: `Powers ${getPlanetName(planet)}'s positive influence`,
      stressLevel: level,
      priority: getPriority(planet, level, 'moola_mantra'),
    });
  }

  // Color
  const color = COLOR_TABLE[planet];
  if (color) {
    const colorText = color.alternative
      ? `${color.primary} (${color.hex}) or ${color.alternative} (${color.altHex})`
      : `${color.primary} (${color.hex})`;
    remedies.push({
      id: `${planet}-color`,
      type: 'color',
      planet,
      name: `${getPlanetName(planet)} Color: ${color.primary}`,
      description: `Wear ${colorText} to strengthen ${getPlanetName(planet)}.`,
      benefit: `Enhances ${getPlanetName(planet)}'s energy in your environment`,
      stressLevel: level,
      priority: getPriority(planet, level, 'color'),
    });
  }

  // Sort by priority ascending (lower = more urgent)
  return remedies.sort((a, b) => a.priority - b.priority);
}
