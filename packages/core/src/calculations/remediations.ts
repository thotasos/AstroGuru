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

export type RemedyType =
  | 'gemstone' | 'moola_mantra' | 'color'
  | 'hora_kaala' | 'puja' | 'charity'
  | 'dietary' | 'navagraha_peeth';

export interface PlanetStress {
  planet: Planet;
  stressLevel: StressLevel;
  reasons: string[];
  triggers: StressTrigger[];
}

// Discriminated union — 'type' is the discriminant
export type Remedy =
  | GemstoneRemedy | MoolaMantraRemedy | ColorRemedy
  | HoraKaalaRemedy | PujaRemedy | CharityRemedy
  | DietaryRemedy | NavagrahaPeethRemedy;

interface GemstoneRemedy {
  id: string; type: 'gemstone'; planet: Planet;
  name: string; description: string; benefit: string;
  stressLevel: StressLevel; priority: number;
}
interface MoolaMantraRemedy {
  id: string; type: 'moola_mantra'; planet: Planet;
  name: string; description: string; benefit: string;
  stressLevel: StressLevel; priority: number;
}
interface ColorRemedy {
  id: string; type: 'color'; planet: Planet;
  name: string; description: string; benefit: string;
  stressLevel: StressLevel; priority: number;
}
export interface HoraKaalaRemedy {
  id: string; type: 'hora_kaala'; planet: Planet;
  name: string; day: string; horaWindow: string; kaalaWindow: string;
  description: string; benefit: string;
  stressLevel: StressLevel; priority: number;
}
export interface PujaRemedy {
  id: string; type: 'puja'; planet: Planet;
  name: string; duration: string; procedure: string;
  items: string[]; dayRestriction: string; warning: string;
  benefit: string; stressLevel: StressLevel; priority: number;
}
export interface CharityRemedy {
  id: string; type: 'charity'; planet: Planet;
  name: string; items: string[];
  description: string; dashaBonus?: string;
  benefit: string; stressLevel: StressLevel; priority: number;
}
export interface DietaryRemedy {
  id: string; type: 'dietary'; planet: Planet;
  name: string; fastingRule: string; eat: string[]; avoid: string[];
  lifestyle: string[]; benefit: string;
  stressLevel: StressLevel; priority: number;
}
export interface NavagrahaPeethRemedy {
  id: string; type: 'navagraha_peeth'; planet: Planet;
  name: string; direction: string; material: string;
  placement: string; frequency: string;
  description: string; benefit: string;
  stressLevel: StressLevel; priority: number;
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
// Hora / Kaala Table
// ------------------------------------

interface HoraKaalaEntry {
  day: string;
  horaWindow: string;
  kaalaWindow: string;
  description: string;
}

const HORA_KAALA_TABLE: Record<Planet, HoraKaalaEntry> = {
  [Planet.Sun]:    { day: 'Sunday',    horaWindow: '06:00–07:00', kaalaWindow: '06:00–07:24', description: 'Perform Surya arati or feed the poor during this window.' },
  [Planet.Moon]:   { day: 'Monday',    horaWindow: '07:00–08:00', kaalaWindow: '07:00–08:24', description: 'Chandra ararghya or charity during Moon hora for emotional peace.' },
  [Planet.Mars]:   { day: 'Tuesday',   horaWindow: '06:00–07:00', kaalaWindow: '06:00–07:24', description: 'Red coral remedy or Hanuman arati during Mars hora.' },
  [Planet.Mercury]:{ day: 'Wednesday', horaWindow: '07:00–08:00', kaalaWindow: '07:00–08:24', description: 'Mercury-friendly activities like studying or commerce during Mercury hora.' },
  [Planet.Jupiter]:{ day: 'Thursday',  horaWindow: '08:00–09:00', kaalaWindow: '08:00–09:24', description: 'Brihaspati puja or charity during Jupiter hora for wisdom.' },
  [Planet.Venus]:  { day: 'Friday',    horaWindow: '06:00–07:00', kaalaWindow: '06:00–07:24', description: 'Lakshmi puja or white garment donation during Venus hora.' },
  [Planet.Saturn]: { day: 'Saturday',  horaWindow: '07:00–08:00', kaalaWindow: '07:00–08:24', description: 'Shani remedy or oil abhishekam during Saturn hora.' },
  [Planet.Rahu]:   { day: 'Saturday',  horaWindow: '15:00–16:00', kaalaWindow: '15:00–16:00', description: 'Rahu Kaal — powerful for Rahu remedies despite being inauspicious. Offer coconut.' },
  [Planet.Ketu]:   { day: 'Saturday',  horaWindow: '14:00–15:00', kaalaWindow: '14:00–15:00', description: 'Vyatipat — most inauspicious but potent for Ketu remedies. Meditate facing South.' },
};

// ------------------------------------
// Puja / Ritual Table
// ------------------------------------

interface PujaEntry {
  name: string;
  duration: string;
  procedure: string;
  items: string[];
  dayRestriction: string;
  warning: string;
}

const PUJA_TABLE: Record<Planet, PujaEntry> = {
  [Planet.Sun]:    { name: 'Surya Arghya',     duration: '15 min', procedure: 'Offer water to rising sun in copper vessel, Gayatri mantra 108×', items: ['Copper vessel', 'Red flowers', 'Gangajal', 'Sacred thread'], dayRestriction: 'Sunday',    warning: 'Not during solar eclipse; avoid if Leo lagna' },
  [Planet.Moon]:   { name: 'Chandra Arghya',   duration: '20 min', procedure: 'Silver vessel with milk, offer at moonrise, Somras chant 108×', items: ['Silver vessel', 'Milk', 'Rice', 'White flowers'], dayRestriction: 'Monday',    warning: 'Avoid on Amavasya if Moon is already weak' },
  [Planet.Mars]:   { name: 'Hanuman Chalisa',  duration: '30 min', procedure: 'Recite Hanuman Chalisa 8×, offer red flowers and sindoor', items: ['Red flowers', 'Sindoor', 'Lal Sindoor', 'Hanuman Chalisa book'], dayRestriction: 'Tuesday',   warning: 'Tuesday only; never on Saturdays' },
  [Planet.Mercury]:{ name: 'Vishnu Sahasranam',duration: '45 min', procedure: '108 recitations of Vishnu Sahasranamam, offer green coconut', items: ['Green coconut', 'Vishnu Sahasranamam book', 'Tulsi leaves', 'Yellow flowers'], dayRestriction: 'Wednesday', warning: 'Wednesday only' },
  [Planet.Jupiter]:{ name: 'Brihaspati Puja',  duration: '30 min', procedure: 'Yellow flowers, ghee lamp, Jupiter beeja mantra 108×', items: ['Yellow flowers', 'Ghee lamp', 'Turmeric', 'Yellow sweets'], dayRestriction: 'Thursday',  warning: 'Thursday only; caution during Jupiter retrograde' },
  [Planet.Venus]:  { name: 'Lakshmi Puja',     duration: '30 min', procedure: 'White flowers, white cloth donation, Shukra mantra 108×', items: ['White flowers', 'White cloth', 'Coconut', 'Lakshmi lotus'], dayRestriction: 'Friday',     warning: 'Friday only; avoid non-vegetarian' },
  [Planet.Saturn]: { name: 'Shani Puja',       duration: '45 min', procedure: 'Oil abhishekam on Shani idol, black sesame, Hanuman Chalisa 108×', items: ['Sesame oil', 'Black sesame', 'Iron nail', 'Hanuman Chalisa'], dayRestriction: 'Saturday',  warning: 'Saturday only; test remedy first — risky if misplaced' },
  [Planet.Rahu]:   { name: 'Rahu Kala Puja',  duration: '20 min', procedure: 'Sweep floor with bare hands, offer coconut, Rahu beeja 108×', items: ['Coconut', 'Black blanket', 'Iron object', 'Rahu beeja yantra'], dayRestriction: 'Rahu Kaal', warning: 'During Rahu Kaal only (15:00–16:00 on Saturdays)' },
  [Planet.Ketu]:   { name: 'Ketu Ganesha Puja',duration: '25 min', procedure: 'Offer modak to Ganesha, Ganesha mantra 108×, Ketu beeja 108×', items: ['Modak', 'Durva grass', 'White flowers', 'Ketu beeja yantra'], dayRestriction: 'Saturday evenings', warning: 'Saturday evenings only' },
};

// ------------------------------------
// Charity Tables
// ------------------------------------

interface CharityBaseEntry {
  baseItem: string;
  vessel: string;
}

const CHARITY_BASE_TABLE: Record<Planet, CharityBaseEntry> = {
  [Planet.Sun]:    { baseItem: 'Jaggery + water',         vessel: 'Copper' },
  [Planet.Moon]:   { baseItem: 'Rice + milk',               vessel: 'Silver' },
  [Planet.Mars]:   { baseItem: 'Red lentils (masoor)',      vessel: 'Copper' },
  [Planet.Mercury]:{ baseItem: 'Green gram (moong dal)',     vessel: 'Brass' },
  [Planet.Jupiter]:{ baseItem: 'Yellow sweets + ghee',       vessel: 'Gold' },
  [Planet.Venus]:  { baseItem: 'White clothes + dairy',      vessel: 'Silver' },
  [Planet.Saturn]: { baseItem: 'Black sesame + iron objects', vessel: 'Iron' },
  [Planet.Rahu]:   { baseItem: 'Coconut + black blanket',   vessel: 'Brass' },
  [Planet.Ketu]:   { baseItem: 'Sweets + sesame oil',       vessel: 'Copper' },
};

function getCharityItemsForPlanet(planet: Planet, house: number | null, dashaLevel: 'maha' | 'antara' | 'prana' | null): string[] {
  const base = CHARITY_BASE_TABLE[planet];
  const items: string[] = [`${base.baseItem} in ${base.vessel} vessel`];

  if (house && DUSTHANA_HOUSES.has(house)) {
    items.push('Iron nails (protection)');
    items.push('Black cloth');
    items.push('Blankets for the poor');
  } else if (house && KENDRA_HOUSES.has(house)) {
    items.push('Gold coin donation');
    items.push('Sacred thread');
    items.push('Cow/goat donation (if affluent)');
  }

  if (dashaLevel === 'maha') {
    items.push(`Special: Full ${base.baseItem} + all house modifier items`);
  } else if (dashaLevel === 'antara') {
    items.push(`Enhanced: ${base.baseItem} + house modifier items`);
  }

  return items;
}

// ------------------------------------
// Dietary / Lifestyle Table
// ------------------------------------

interface DietaryEntry {
  fastingRule: string;
  eat: string[];
  avoid: string[];
  lifestyle: string[];
}

const DIETARY_TABLE: Record<Planet, DietaryEntry> = {
  [Planet.Sun]:    { fastingRule: 'Fast on Sundays — fruit only until noon',                          eat: ['Gold/orange foods', 'Jaggery', 'Sweet fruits', 'Ghee'],              avoid: ['Spicy food', 'Sour foods', 'Tamarind', 'Red chilies'],           lifestyle: ['Face East at sunrise', 'Wear bright colors (red, gold)', 'Do not skip breakfast'] },
  [Planet.Moon]:   { fastingRule: 'Full moon (Purnima) fast — milk and fruit only',                   eat: ['White foods', 'Rice', 'Milk', 'Coconut', 'Paneer'],                     avoid: ['Dry foods', 'Stale food', 'Leftover food', 'Excessive salt'],        lifestyle: ['Drink 8 glasses of water daily', 'Sleep before 22:00', 'Keep a water vessel overnight'] },
  [Planet.Mars]:   { fastingRule: 'Fast on Tuesdays — only fruit and milk',                           eat: ['Sweet foods', 'Ghee', 'Cucumber', 'Paneer', 'Sweet lassi'],              avoid: ['Spicy food', 'Red meat', 'Fermented foods', 'Garlic', 'Onion'],    lifestyle: ['Wake before sunrise', 'Control anger and arguments', 'Practice patience'] },
  [Planet.Mercury]:{ fastingRule: 'Fast on Wednesdays — single meal only',                             eat: ['Green foods', 'Moong dal', 'Leafy vegetables', 'Green smoothie'],          avoid: ['Stale food', 'Excessive oily food', 'Fast food', 'Processed sugars'], lifestyle: ['Speak truth always', 'Maintain personal hygiene', 'Read/write daily'] },
  [Planet.Jupiter]:{ fastingRule: 'Fast on Thursdays — single meal, yellow foods only',               eat: ['Yellow foods', 'Ghee', 'Chana dal', 'Bananas', 'Turmeric rice'],        avoid: ['Stale food', 'Non-vegetarian', 'Alcohol', 'Recycled stale food'],  lifestyle: ['Charity on Thursdays', 'Study sacred texts', 'Morning prayer'] },
  [Planet.Venus]:  { fastingRule: 'Fast on Fridays — single meal, dairy only',                      eat: ['White foods', 'Dairy', 'Mango', 'Honey', 'Rice pudding'],                avoid: ['Meat', 'Eggs', 'Alcohol', 'Excessive salt', 'Tamsi (lotus root)'], lifestyle: ['Wear white clothing', 'Apply sandalwood paste on forehead', 'Listen to devotional music'] },
  [Planet.Saturn]: { fastingRule: 'Partial fast on Saturdays — nothing after 14:00',                eat: ['Simple fruits', 'Roasted barley', 'Black chana', 'Buttermilk'],           avoid: ['Salt', 'Black gram (urad)', 'Nightshades (tomato, brinjal)', 'Alcohol'], lifestyle: ['Serve others without expecting return', 'Sleep on floor occasionally', 'Walk barefoot on grass'] },
  [Planet.Rahu]:   { fastingRule: 'Fast during Rahu Kaal on Saturdays — only coconut water',          eat: ['Simple vegetarian', 'Coconut water', 'Fruits', 'Barley water'],            avoid: ['Overly sweet foods', 'Artificial ingredients', 'Food from outgroup'],  lifestyle: ['Spiritual study with guru only', 'No occult without guidance', 'Meditate daily'] },
  [Planet.Ketu]:   { fastingRule: 'Light fast on Saturday evenings after sunset',                    eat: ['Light fruits', 'Milk', 'Buttermilk', 'Light vegetables'],                  avoid: ['Heavy meals', 'Garlic', 'Onion', 'Non-vegetarian'],                  lifestyle: ['Meditation facing South', 'Solitary spiritual practice', 'No crowded social events'] },
};

// ------------------------------------
// Navagraha Peeth Tables
// ------------------------------------

const PEETH_DIRECTION_TABLE: Record<number, string> = {
  1:  'East — Ekon (front of home), facing sunrise',
  2:  'Southeast — Agneya corner (kitchen or heat source)',
  3:  'South — Exact South wall',
  4:  'North — Exact North wall or puja room',
  5:  'Northeast — Ishaanya corner (most auspicious)',
  6:  'South-Southeast — Nairitya corner',
  7:  'West — Prachya corner',
  8:  'Northwest — Vayavya corner',
  9:  'North — shares with 4th (sacred corner)',
  10: 'Northeast/East — near main entrance door',
  11: 'East-Northeast — near utility area',
  12: 'South-Southwest — Paśhima corner (least preferred)',
};

const PEETH_MATERIAL_TABLE: Record<string, string> = {
  exalted:    'Gold idol — maximum strength, needs least pacification',
  own:        'Brass idol — standard, well-disposed relationship',
  normal:     'Copper idol — neutral, general strengthening',
  debilitated: 'Silver idol — softens and pacifies strongly',
};

function getPeethFrequency(maha: boolean, antara: boolean, prana: boolean): string {
  if (maha)   return 'Daily arati + offering (Mahadasha active)';
  if (antara) return '3× per week — Monday, Thursday, Saturday (Antardasha active)';
  if (prana)  return 'Weekly on Saturday (Prana dasha active)';
  return 'Monthly on full moon (no active dasha)';
}

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
    .flatMap(s => getRemediesForPlanet(s.planet, s, chart, dashas))
    .slice(0, maxResults);

  const lifetimeRemedies = lifetimeStress
    .flatMap(s => getRemediesForPlanet(s.planet, s, chart, dashas))
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
  const baseByLevel: Record<StressLevel, number> = { severe: 10, moderate: 20, mild: 40 };
  const typeOffset: Record<RemedyType, number> = {
    gemstone: 0, moola_mantra: 1, color: 2,
    hora_kaala: 3, puja: 4, charity: 5, dietary: 6, navagraha_peeth: 7,
  };
  return baseByLevel[level] * 10 + typeOffset[type];
}

// ------------------------------------
// Core Functions
// ------------------------------------

export function getRemediesForPlanet(
  planet: Planet,
  stress: PlanetStress,
  chart?: ChartData,
  dashas?: DashaPeriod[],
): Remedy[] {
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

  // Supporting remedies — need chart/dasha context for house/dasha awareness
  if (chart && dashas) {
    const house = getPlanetHouse(planet, chart);
    const dignity = getPlanetDignity(planet, chart);
    const dashaAtTime = getDashaAtDate(dashas, new Date());
    let dashaLevel: 'maha' | 'antara' | 'prana' | null = null;
    if (dashaAtTime) {
      const levels = [dashaAtTime.mahadasha, dashaAtTime.antardasha, dashaAtTime.prana];
      for (const l of levels) {
        if (l?.planet === planet) {
          if (l === dashaAtTime.mahadasha) dashaLevel = 'maha';
          else if (l === dashaAtTime.antardasha) dashaLevel = 'antara';
          else dashaLevel = 'prana';
          break;
        }
      }
    }

    // Hora/Kaala
    const hk = HORA_KAALA_TABLE[planet];
    if (hk) {
      remedies.push({
        id: `${planet}-hora-kaala`,
        type: 'hora_kaala',
        planet,
        name: `${getPlanetName(planet)} Hora + Kaala Window`,
        day: hk.day,
        horaWindow: hk.horaWindow,
        kaalaWindow: hk.kaalaWindow,
        description: hk.description,
        benefit: `Auspicious window to perform ${getPlanetName(planet)} remedies`,
        stressLevel: level,
        priority: getPriority(planet, level, 'hora_kaala'),
      } as HoraKaalaRemedy);
    }

    // Puja
    const p = PUJA_TABLE[planet];
    if (p) {
      remedies.push({
        id: `${planet}-puja`,
        type: 'puja',
        planet,
        name: p.name,
        duration: p.duration,
        procedure: p.procedure,
        items: p.items,
        dayRestriction: p.dayRestriction,
        warning: p.warning,
        benefit: `Powers ${getPlanetName(planet)}'s positive influence through ritual`,
        stressLevel: level,
        priority: getPriority(planet, level, 'puja'),
      } as PujaRemedy);
    }

    // Charity
    const charityItems = getCharityItemsForPlanet(planet, house, dashaLevel);
    const charityDesc = house
      ? `${getPlanetName(planet)} in ${house}${DUSTHANA_HOUSES.has(house) ? ' (dusthana — add protection)' : KENDRA_HOUSES.has(house) ? ' (kendra — add prestige)' : ' (other house)'}`
      : `${getPlanetName(planet)} charity`;
    remedies.push({
      id: `${planet}-charity`,
      type: 'charity',
      planet,
      name: `${getPlanetName(planet)} Charity`,
      items: charityItems,
      description: `Donate in a ${CHARITY_BASE_TABLE[planet].vessel.toLowerCase()} vessel${dashaLevel ? ` — intensified during ${dashaLevel === 'maha' ? 'Mahadasha' : dashaLevel === 'antara' ? 'Antardasha' : 'Prana dasha'}` : ''}.`,
      dashaBonus: dashaLevel === 'maha' ? charityItems[charityItems.length - 1] : undefined,
      benefit: `Pleases ${getPlanetName(planet)} through selfless giving`,
      stressLevel: level,
      priority: getPriority(planet, level, 'charity'),
    } as CharityRemedy);

    // Dietary
    const diet = DIETARY_TABLE[planet];
    if (diet) {
      remedies.push({
        id: `${planet}-dietary`,
        type: 'dietary',
        planet,
        name: `${getPlanetName(planet)} Dietary & Lifestyle`,
        fastingRule: diet.fastingRule,
        eat: diet.eat,
        avoid: diet.avoid,
        lifestyle: diet.lifestyle,
        benefit: `Aligns body and mind with ${getPlanetName(planet)}'s energy`,
        stressLevel: level,
        priority: getPriority(planet, level, 'dietary'),
      } as DietaryRemedy);
    }

    // Navagraha Peeth
    const peethDir = house ? PEETH_DIRECTION_TABLE[house] ?? 'East' : 'East';
    const peethMat = PEETH_MATERIAL_TABLE[dignity] ?? PEETH_MATERIAL_TABLE.normal!;
    const peethFreq = getPeethFrequency(
      dashaLevel === 'maha',
      dashaLevel === 'antara',
      dashaLevel === 'prana',
    );
    remedies.push({
      id: `${planet}-navagraha-peeth`,
      type: 'navagraha_peeth',
      planet,
      name: `${getPlanetName(planet)} Navagraha Peeth${house ? ` (${house}${DUSTHANA_HOUSES.has(house) ? ' dusthana' : KENDRA_HOUSES.has(house) ? ' kendra' : ''})` : ''}`,
      direction: peethDir,
      material: peethMat,
      placement: `Place ${getPlanetName(planet)} idol/seat in the ${peethDir.split('—')[0]!.trim()} corner of your home altar.`,
      frequency: peethFreq,
      description: `Seat placement of ${getPlanetName(planet)} deity for home vastu alignment. ${peethMat.split('—')[0]!.trim()} idol preferred (${dignity} dignity). ${peethFreq.toLowerCase()}.`,
      benefit: `Aligns living space with ${getPlanetName(planet)}'s energy through vastu`,
      stressLevel: level,
      priority: getPriority(planet, level, 'navagraha_peeth'),
    } as NavagrahaPeethRemedy);
  }

  // Sort by priority ascending (lower = more urgent)
  return remedies.sort((a, b) => a.priority - b.priority);
}
