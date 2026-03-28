// packages/core/src/calculations/remediations.ts

import { Planet, Sign, House, ChartData, DashaPeriod } from '../types/index.js';
import { TransitPosition } from './transit.js';
import { FUNCTIONAL_NATURES, isFunctionalBenefic, isPlanetInDebilitated, isPlanetInOwnOrExalted, isInKendra } from './transit.js';
import { calculateShadbala, EXALT_DEBIL } from './shadbala.js';
import { getDashaAtDate } from './dashas.js';

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
// Helpers for getPlanetStress
// ------------------------------------

const DUSTHANA_HOUSES = new Set([House.Sixth, House.Eighth, House.Twelfth]);
const KENDRA_HOUSES = new Set([House.First, House.Fourth, House.Seventh, House.Tenth]);

function getPlanetHouse(planet: Planet, chart: ChartData): House | null {
  const pos = chart.planets.find(p => p.planet === planet);
  if (!pos) return null;
  const lagnaSign = Math.floor(chart.ascendant / 30) as Sign;
  const houseNumber = ((pos.sign - lagnaSign + 12) % 12) + 1;
  return houseNumber as House;
}

function getPlanetDignity(planet: Planet, chart: ChartData): 'exalted' | 'debilitated' | 'own' | 'normal' {
  const pos = chart.planets.find(p => p.planet === planet);
  if (!pos) return 'normal';
  if (isPlanetInOwnOrExalted(planet, pos.sign)) return 'own';
  if (isPlanetInDebilitated(planet, pos.sign)) return 'debilitated';
  return 'normal';
}

function getDashaStress(planet: Planet, dashas: DashaPeriod[], chart: ChartData, currentDate: Date): 'severe' | 'moderate' | 'mild' | null {
  const dashaAtTime = getDashaAtDate(dashas, currentDate);
  if (!dashaAtTime) return null;
  const levels = [dashaAtTime.mahadasha, dashaAtTime.antardasha, dashaAtTime.prana];
  for (const level of levels) {
    if (level && level.planet === planet) {
      const pos = chart.planets.find(p => p.planet === planet);
      if (pos) {
        if (isPlanetInDebilitated(planet, pos.sign)) return 'severe';
        if (isPlanetInOwnOrExalted(planet, pos.sign)) return 'mild';
      }
      return 'moderate';
    }
  }
  return null;
}

// ------------------------------------
// Placeholder exports
// ------------------------------------

export function calculateRemediations(
  chart: ChartData,
  dashas: DashaPeriod[],
  transit: TransitPosition,
  options: { includeLifetime?: boolean; maxResults?: number } = {}
): RemediationReport {
  const { includeLifetime = true, maxResults = 10 } = options;
  const currentDate = new Date();

  const periodDescription = getPeriodDescription(dashas, currentDate);

  // Check all 9 planets for stress
  const allStress: PlanetStress[] = [];
  for (const planet of [
    Planet.Sun, Planet.Moon, Planet.Mars, Planet.Mercury,
    Planet.Jupiter, Planet.Venus, Planet.Saturn,
    Planet.Rahu, Planet.Ketu,
  ] as Planet[]) {
    const stress = getPlanetStress(planet, chart, dashas, transit, currentDate);
    if (stress) allStress.push(stress);
  }

  // Separate immediate (has dasha trigger) vs lifetime (chart-only stress)
  const immediateStress = allStress.filter(s => s.triggers.includes('dasha'));
  const lifetimeStress = includeLifetime
    ? allStress.filter(s => !s.triggers.includes('dasha'))
    : [];

  // Build ranked remedy lists
  const immediateRemedies = immediateStress
    .flatMap(s => getRemediesForPlanet(s.planet, s))
    .slice(0, maxResults);

  const lifetimeRemedies = lifetimeStress
    .flatMap(s => getRemediesForPlanet(s.planet, s))
    .slice(0, maxResults);

  return {
    immediate: {
      periodDescription,
      stressedPlanets: immediateStress,
      remedies: immediateRemedies,
    },
    lifetime: {
      stressedPlanets: lifetimeStress,
      remedies: lifetimeRemedies,
    },
  };
}

function getPeriodDescription(dashas: DashaPeriod[], date: Date): string {
  const dashaAtTime = getDashaAtDate(dashas, date);
  if (!dashaAtTime) return 'Current period';

  const parts: string[] = [];
  if (dashaAtTime.mahadasha) {
    parts.push(`${getPlanetName(dashaAtTime.mahadasha.planet)} Mahadasha`);
  }
  if (dashaAtTime.antardasha) {
    parts.push(`${getPlanetName(dashaAtTime.antardasha.planet)} Antardasha`);
  }
  return parts.join(' + ') || 'Current period';
}

export function getPlanetStress(
  planet: Planet,
  chart: ChartData,
  dashas: DashaPeriod[],
  _transit: TransitPosition,
  currentDate: Date
): PlanetStress | null {
  const pos = chart.planets.find(p => p.planet === planet);
  if (!pos) return null;

  const reasons: string[] = [];
  const triggers: StressTrigger[] = [];
  let maxLevel: StressLevel = 'mild';

  // Check dignity
  const dignity = getPlanetDignity(planet, chart);
  if (dignity === 'debilitated') {
    const signName = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'][pos.sign];
    reasons.push(`Debilitated in ${signName}`);
    triggers.push('dignity');
    maxLevel = 'severe';
  }

  // House placement
  const house = getPlanetHouse(planet, chart);
  if (house && DUSTHANA_HOUSES.has(house)) {
    const ordinal = house === 6 ? '6th' : house === 8 ? '8th' : '12th';
    reasons.push(`In dusthana (${ordinal} house)`);
    triggers.push('house');
    if (maxLevel !== 'severe') maxLevel = 'mild';
  }

  // Rahu/Ketu in kendra
  if ((planet === Planet.Rahu || planet === Planet.Ketu) && house && KENDRA_HOUSES.has(house)) {
    const ordinal = ['', '1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th'][house];
    reasons.push(`${getPlanetName(planet)} in kendra (${ordinal} house)`);
    triggers.push('house');
    if (maxLevel === 'mild') maxLevel = 'moderate';
  }

  // Shadbala
  const shadbalaResults = calculateShadbala(chart);
  const shadbala = shadbalaResults.find(s => s.planet === planet);
  if (shadbala && shadbala.total < 100) {
    reasons.push(`Weak shadbala (${shadbala.total.toFixed(1)} Rupas)`);
    triggers.push('shadbala');
    if (maxLevel !== 'severe') maxLevel = 'moderate';
  }

  // Dasha stress
  const dashaStress = getDashaStress(planet, dashas, chart, currentDate);
  if (dashaStress) {
    reasons.push(`Running ${getPlanetName(planet)} mahadasha period`);
    triggers.push('dasha');
    if (dashaStress === 'severe') maxLevel = 'severe';
    else if (dashaStress === 'moderate' && maxLevel !== 'severe') maxLevel = 'moderate';
  }

  if (reasons.length === 0) return null;

  return { planet, stressLevel: maxLevel, reasons, triggers };
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
