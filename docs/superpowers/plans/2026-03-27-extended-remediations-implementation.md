# Extended Remediation Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the remediation engine with 5 new remedy types (hora/kaala, puja, charity, dietary, navagraha peeth), update the CLI two-tier display, and add comprehensive unit tests.

**Architecture:** All new remedy data lives in `remediations.ts` as new `Record<Planet, ...>` tables. The `getRemediesForPlanet` function grows to 8 remedy types. The `Remedy` union becomes a discriminated union with all 8 variants. CLI `displayRemediationReport` gets a `showSupporting` parameter for the two-tier display.

**Tech Stack:** TypeScript, vitest, `@parashari/core`

---

## File Map

- **Modify:** `packages/core/src/calculations/remediations.ts` — add new types, tables, and expand `getRemediesForPlanet`
- **Modify:** `packages/core/src/calculations/remediations.test.ts` — extend with new tests
- **Modify:** `packages/core/src/index.ts` — add new exports
- **Modify:** `packages/api/src/cli.ts` — update `displayRemediationReport` for two-tier display

---

## Task 1: Add new discriminated union types

**Files:**
- Modify: `packages/core/src/calculations/remediations.ts:13-45`

- [ ] **Step 1: Replace `RemedyType` and `Remedy` with discriminated union**

Replace lines 13–45 in `remediations.ts` with:

```typescript
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
```

- [ ] **Step 2: Update `getPriority` function type offsets**

Replace the `getPriority` function (lines 285–289) with:

```typescript
function getPriority(planet: Planet, level: StressLevel, type: RemedyType): number {
  const baseByLevel: Record<StressLevel, number> = { severe: 10, moderate: 20, mild: 40 };
  const typeOffset: Record<RemedyType, number> = {
    gemstone: 0, moola_mantra: 1, color: 2,
    hora_kaala: 3, puja: 4, charity: 5, dietary: 6, navagraha_peeth: 7,
  };
  return baseByLevel[level] * 10 + typeOffset[type];
}
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd packages/core && npx tsc --noEmit`
Expected: No errors (or only pre-existing unrelated errors)

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/calculations/remediations.ts
git commit -m "feat(remediations): add discriminated union types for all 8 remedy types

Adds HoraKaalaRemedy, PujaRemedy, CharityRemedy, DietaryRemedy,
NavagrahaPeethRemedy interfaces. Updates RemedyType and Remedy
to discriminated union. Updates getPriority type offsets.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Add all 5 new remedy data tables

**Files:**
- Modify: `packages/core/src/calculations/remediations.ts` — add tables after `COLOR_TABLE` (~line 99)

- [ ] **Step 1: Add HoraKaala table after COLOR_TABLE (line ~99)**

```typescript
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
```

- [ ] **Step 2: Add Puja table after HORA_KAALA_TABLE**

```typescript
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
```

- [ ] **Step 3: Add Charity base + house modifier tables after PUJA_TABLE**

```typescript
// ------------------------------------
// Charity Tables
// ------------------------------------

interface CharityBaseEntry {
  baseItem: string;
  vessel: string;
}

const CHARITY_BASE_TABLE: Record<Planet, CharityBaseEntry> = {
  [Planet.Sun]:    { baseItem: 'Jaggery + water',       vessel: 'Copper' },
  [Planet.Moon]:   { baseItem: 'Rice + milk',             vessel: 'Silver' },
  [Planet.Mars]:   { baseItem: 'Red lentils (masoor)',    vessel: 'Copper' },
  [Planet.Mercury]:{ baseItem: 'Green gram (moong dal)',  vessel: 'Brass' },
  [Planet.Jupiter]:{ baseItem: 'Yellow sweets + ghee',    vessel: 'Gold' },
  [Planet.Venus]:  { baseItem: 'White clothes + dairy',   vessel: 'Silver' },
  [Planet.Saturn]: { baseItem: 'Black sesame + iron objects', vessel: 'Iron' },
  [Planet.Rahu]:   { baseItem: 'Coconut + black blanket', vessel: 'Brass' },
  [Planet.Ketu]:   { baseItem: 'Sweets + sesame oil',     vessel: 'Copper' },
};

const DUSTHANA_HOUSE_SET = new Set([6, 8, 12]);
const KENDRA_HOUSE_SET = new Set([1, 4, 7, 10]);

function getCharityItemsForPlanet(planet: Planet, house: number | null, dashaLevel: 'maha' | 'antara' | 'prana' | null): string[] {
  const base = CHARITY_BASE_TABLE[planet];
  const items: string[] = [`${base.baseItem} in ${base.vessel} vessel`];

  if (house && DUSTHANA_HOUSE_SET.has(house)) {
    items.push('Iron nails (protection)');
    items.push('Black cloth');
    items.push('Blankets for the poor');
  } else if (house && KENDRA_HOUSE_SET.has(house)) {
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
```

- [ ] **Step 4: Add Dietary table after charity tables**

```typescript
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
```

- [ ] **Step 5: Add Navagraha Peeth tables after DIETARY_TABLE**

```typescript
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
```

- [ ] **Step 6: Verify TypeScript compilation**

Run: `cd packages/core && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/calculations/remediations.ts
git commit -m "feat(remediations): add all 5 new remedy data tables

Adds HORA_KAALA_TABLE, PUJA_TABLE, CHARITY_BASE_TABLE,
DIETARY_TABLE, PEETH_DIRECTION_TABLE, PEETH_MATERIAL_TABLE,
plus getCharityItemsForPlanet and getPeethFrequency helpers.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Expand getRemediesForPlanet to return all 8 remedy types

**Files:**
- Modify: `packages/core/src/calculations/remediations.ts:295–351` (the existing `getRemediesForPlanet` function)

- [ ] **Step 1: Update getRemediesForPlanet signature and add chart/dasha params**

Replace the entire `getRemediesForPlanet` function with:

```typescript
export function getRemediesForPlanet(
  planet: Planet,
  stress: PlanetStress,
  chart?: ChartData,
  dashas?: DashaPeriod[],
): Remedy[] {
  const remedies: Remedy[] = [];
  const level = stress.stressLevel;

  // Primary remedies (gemstone, moola_mantra, color) — existing
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
      ? `${getPlanetName(planet)} in ${house}${DUSTHANA_HOUSE_SET.has(house) ? ' (dusthana — add protection)' : KENDRA_HOUSE_SET.has(house) ? ' (kendra — add prestige)' : ' (other house)'}`
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
    const peethMat = PEETH_MATERIAL_TABLE[dignity] ?? PEETH_MATERIAL_TABLE.normal;
    const peethFreq = getPeethFrequency(
      dashaLevel === 'maha',
      dashaLevel === 'antara',
      dashaLevel === 'prana',
    );
    remedies.push({
      id: `${planet}-navagraha-peeth`,
      type: 'navagraha_peeth',
      planet,
      name: `${getPlanetName(planet)} Navagraha Peeth${house ? ` (${house}${DUSTHANA_HOUSE_SET.has(house) ? ' dusthana' : KENDRA_HOUSE_SET.has(house) ? ' kendra' : ''})` : ''}`,
      direction: peethDir,
      material: peethMat,
      placement: `Place ${getPlanetName(planet)} idol/seat in the ${peethDir.split('—')[0].trim()} corner of your home altar.`,
      frequency: peethFreq,
      description: `Seat placement of ${getPlanetName(planet)} deity for home vastu alignment. ${peethMat.split('—')[0].trim()} idol preferred (${dignity} dignity). ${peethFreq.toLowerCase()}.`,
      benefit: `Aligns living space with ${getPlanetName(planet)}'s energy through vastu`,
      stressLevel: level,
      priority: getPriority(planet, level, 'navagraha_peeth'),
    } as NavagrahaPeethRemedy);
  }

  // Sort by priority ascending (lower = more urgent)
  return remedies.sort((a, b) => a.priority - b.priority);
}
```

- [ ] **Step 2: Update `calculateRemediations` to pass chart and dashas to getRemediesForPlanet**

In `calculateRemediations` (line ~174), change:
```typescript
.flatMap(s => getRemediesForPlanet(s.planet, s))
```
to:
```typescript
.flatMap(s => getRemediesForPlanet(s.planet, s, chart, dashas))
```
(do this for both `immediateRemedies` and `lifetimeRemedies` lines)

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd packages/core && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Run existing tests**

Run: `cd packages/core && npx vitest run src/calculations/remediations.test.ts`
Expected: All 7 existing tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/calculations/remediations.ts
git commit -m "feat(remediations): expand getRemediesForPlanet to all 8 remedy types

Adds hora_kaala, puja, charity (house-aware), dietary, and navagraha_peeth
to the remedy list. chart and dashas params enable house-aware charity
and dasha-aware frequency. calculateRemediations passes chart/dashas context.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Update CLI two-tier display

**Files:**
- Modify: `packages/api/src/cli.ts` — find `displayRemediationReport` and update it

- [ ] **Step 1: Find the current displayRemediationReport function**

Grep for `displayRemediationReport` in `packages/api/src/cli.ts` and note the exact line range.

- [ ] **Step 2: Replace the function with two-tier version**

Replace the existing `displayRemediationReport` function with:

```typescript
function displayRemediationReport(report: RemediationReport, showSupporting = true): void {
  const PRIMARY_TYPES = new Set(['gemstone', 'moola_mantra', 'color']);

  function printRemedy(remedy: Remedy, index: number): void {
    const prio = `[${index + 1}]`.padEnd(4);
    const planet = getPlanetDisplayName(remedy.planet);
    switch (remedy.type) {
      case 'gemstone':
        console.log(`  ${prio} GEMSTONE  │ ${planet} │ ${remedy.name}`);
        console.log(`             │ ${remedy.description}`);
        break;
      case 'moola_mantra':
        console.log(`  ${prio} MANTRA   │ ${planet} │ ${remedy.name}`);
        console.log(`             │ ${remedy.description}`);
        break;
      case 'color':
        console.log(`  ${prio} COLOR    │ ${planet} │ ${remedy.description}`);
        break;
      case 'hora_kaala':
        console.log(`  ${prio} HORA/KAALA│ ${planet} │ ${remedy.name} — ${remedy.day} ${remedy.kaalaWindow}`);
        console.log(`             │ ${remedy.description}`);
        break;
      case 'puja': {
        console.log(`  ${prio} PUJA     │ ${planet} │ ${remedy.name} (${remedy.duration})`);
        console.log(`             │ Day: ${remedy.dayRestriction} │ Items: ${remedy.items.join(', ')}`);
        console.log(`             │ ${remedy.procedure}`);
        if (remedy.warning) console.log(`             │ ⚠ ${remedy.warning}`);
        break;
      }
      case 'charity':
        console.log(`  ${prio} CHARITY  │ ${planet} │ ${remedy.name}`);
        console.log(`             │ Donate: ${remedy.items.join(' | ')}`);
        console.log(`             │ ${remedy.description}`);
        if (remedy.dashaBonus) console.log(`             │ ✦ Dasha bonus: ${remedy.dashaBonus}`);
        break;
      case 'dietary':
        console.log(`  ${prio} DIETARY │ ${planet} │ ${remedy.name}`);
        console.log(`             │ Fast: ${remedy.fastingRule}`);
        console.log(`             │ Eat: ${remedy.eat.join(', ')}`);
        console.log(`             │ Avoid: ${remedy.avoid.join(', ')}`);
        console.log(`             │ Lifestyle: ${remedy.lifestyle.join(' | ')}`);
        break;
      case 'navagraha_peeth':
        console.log(`  ${prio} PEETH    │ ${planet} │ ${remedy.name}`);
        console.log(`             │ Direction: ${remedy.direction}`);
        console.log(`             │ ${remedy.material}`);
        console.log(`             │ ${remedy.placement}`);
        console.log(`             │ ${remedy.frequency}`);
        break;
    }
  }

  function printSection(
    title: string,
    description: string,
    stressedPlanets: PlanetStress[],
    remedies: Remedy[],
  ): void {
    console.log(`\n${title}`);
    console.log(`─`.repeat(65));
    console.log(`  ${description}`);
    if (stressedPlanets.length > 0) {
      const planetList = stressedPlanets.map(p =>
        `${getPlanetDisplayName(p.planet)} (${p.stressLevel}) — ${p.reasons.join(', ')}`
      ).join('; ');
      console.log(`  Stressed: ${planetList}`);
    }
    if (remedies.length === 0) {
      console.log(`  No remedies needed.`);
      return;
    }
    const primary = remedies.filter(r => PRIMARY_TYPES.has(r.type));
    const supporting = remedies.filter(r => !PRIMARY_TYPES.has(r.type));
    console.log(`\n  ── Primary Remedies ──`);
    primary.forEach((r, i) => printRemedy(r, i));
    if (showSupporting && supporting.length > 0) {
      console.log(`\n  ── Timing, Puja, Charity, Dietary & Peeth ──`);
      supporting.forEach((r, i) => printRemedy(r, i));
    }
  }

  printSection(
    'IMMEDIATE REMEDIATIONS',
    report.immediate.periodDescription,
    report.immediate.stressedPlanets,
    report.immediate.remedies,
  );
  printSection(
    'LIFETIME REMEDIATIONS',
    'Birth chart stress — remedies for long-term well-being',
    report.lifetime.stressedPlanets,
    report.lifetime.remedies,
  );
}
```

- [ ] **Step 3: Verify CLI compiles**

Run: `cd packages/api && npx tsx --noEmit src/cli.ts --help 2>&1 | head -5`
Expected: Help output (no errors)

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/cli.ts
git commit -m "feat(cli): two-tier remediation display in report/predict

Primary remedies (gemstone, mantra, color) shown first with full details.
Supporting remedies (hora/kaala, puja, charity, dietary, navagraha peeth)
grouped by type with complete field coverage. showSupporting param
(default true) allows suppressing supporting section.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Update barrel exports

**Files:**
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Add new type exports**

Find the remediation exports section in `index.ts` and add:

```typescript
  export type {
    HoraKaalaRemedy, PujaRemedy, CharityRemedy,
    DietaryRemedy, NavagrahaPeethRemedy,
  } from './calculations/remediations.js';
```

Keep all existing remediation exports (`calculateRemediations`, `getPlanetStress`, `getRemediesForPlanet`, `PlanetStress`, `Remedy`, `RemediationReport`, `StressLevel`, `StressTrigger`, `RemedyType`).

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd packages/core && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/index.ts
git commit -m "feat(core): export new remedy types from barrel

Exports HoraKaalaRemedy, PujaRemedy, CharityRemedy, DietaryRemedy,
NavagrahaPeethRemedy from the core barrel.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Add unit tests for all 5 new remedy types

**Files:**
- Modify: `packages/core/src/calculations/remediations.test.ts`

- [ ] **Step 1: Add test for hora_kaala remedy fields**

Add after the existing tests (before the closing `});`):

```typescript
  it('returns hora_kaala remedy with correct fields for all planets', () => {
    const stress: PlanetStress = {
      planet: Planet.Sun,
      stressLevel: 'moderate',
      reasons: ['Running Sun mahadasha'],
      triggers: ['dasha'],
    };
    const chart = createMockChart();
    const dashas = createMockDashas(Planet.Sun);
    const remedies = getRemediesForPlanet(Planet.Sun, stress, chart, dashas);
    const hk = remedies.find(r => r.type === 'hora_kaala');
    expect(hk).toBeDefined();
    expect((hk as HoraKaalaRemedy).day).toBe('Sunday');
    expect((hk as HoraKaalaRemedy).horaWindow).toBe('06:00–07:00');
    expect((hk as HoraKaalaRemedy).kaalaWindow).toBe('06:00–07:24');
    expect((hk as HoraKaalaRemedy).description).toBeTruthy();
  });

  it('returns puja remedy with items, procedure, duration, and warning for all planets', () => {
    const stress: PlanetStress = { planet: Planet.Mars, stressLevel: 'moderate', reasons: [], triggers: [] };
    const chart = createMockChart();
    const dashas = createMockDashas(Planet.Mars);
    const remedies = getRemediesForPlanet(Planet.Mars, stress, chart, dashas);
    const puja = remedies.find(r => r.type === 'puja') as PujaRemedy;
    expect(puja).toBeDefined();
    expect(puja.items.length).toBeGreaterThan(0);
    expect(puja.duration).toBeTruthy();
    expect(puja.procedure).toBeTruthy();
    expect(puja.warning).toBeTruthy();
    expect(puja.dayRestriction).toBeTruthy();
  });

  it('returns charity remedy with house-aware items (dusthana modifier)', () => {
    // Sun in 8th house (dusthana)
    const stress: PlanetStress = { planet: Planet.Sun, stressLevel: 'severe', reasons: ['Debilitated'], triggers: ['dignity'] };
    const chart = createMockChartWithPlanetInHouse(Planet.Sun, 8);
    const dashas = createMockDashasWithLevel(Planet.Sun, 'maha');
    const remedies = getRemediesForPlanet(Planet.Sun, stress, chart, dashas);
    const charity = remedies.find(r => r.type === 'charity') as CharityRemedy;
    expect(charity).toBeDefined();
    expect(charity.items.some(i => i.toLowerCase().includes('iron') || i.toLowerCase().includes('protection') || i.toLowerCase().includes('blanket'))).toBe(true);
    expect(charity.dashaBonus).toBeDefined();
  });

  it('returns charity remedy with kendra modifier for 10th house', () => {
    const stress: PlanetStress = { planet: Planet.Venus, stressLevel: 'moderate', reasons: [], triggers: [] };
    const chart = createMockChartWithPlanetInHouse(Planet.Venus, 10);
    const dashas = createMockDashas(Planet.Venus);
    const remedies = getRemediesForPlanet(Planet.Venus, stress, chart, dashas);
    const charity = remedies.find(r => r.type === 'charity') as CharityRemedy;
    expect(charity).toBeDefined();
    expect(charity.items.some(i => i.toLowerCase().includes('gold') || i.toLowerCase().includes('sacred') || i.toLowerCase().includes('cow'))).toBe(true);
  });

  it('returns dietary remedy with fastingRule, eat, avoid, and lifestyle fields', () => {
    const stress: PlanetStress = { planet: Planet.Jupiter, stressLevel: 'mild', reasons: [], triggers: [] };
    const chart = createMockChart();
    const dashas = createMockDashas(Planet.Jupiter);
    const remedies = getRemediesForPlanet(Planet.Jupiter, stress, chart, dashas);
    const diet = remedies.find(r => r.type === 'dietary') as DietaryRemedy;
    expect(diet).toBeDefined();
    expect(diet.fastingRule).toBeTruthy();
    expect(diet.eat.length).toBeGreaterThan(0);
    expect(diet.avoid.length).toBeGreaterThan(0);
    expect(diet.lifestyle.length).toBeGreaterThan(0);
  });

  it('returns navagraha_peeth remedy with direction from house', () => {
    const stress: PlanetStress = { planet: Planet.Saturn, stressLevel: 'severe', reasons: [], triggers: [] };
    // Saturn in 10th house
    const chart = createMockChartWithPlanetInHouse(Planet.Saturn, 10);
    const dashas = createMockDashas(Planet.Saturn);
    const remedies = getRemediesForPlanet(Planet.Saturn, stress, chart, dashas);
    const peeth = remedies.find(r => r.type === 'navagraha_peeth') as NavagrahaPeethRemedy;
    expect(peeth).toBeDefined();
    expect(peeth.direction).toContain('Northeast');
    expect(peeth.material).toBeTruthy();
    expect(peeth.placement).toBeTruthy();
    expect(peeth.frequency).toBeTruthy();
  });

  it('navagraha_peeth material changes by dignity', () => {
    const dashas = createMockDashas(Planet.Mercury);
    // Exalted Mercury
    const exaltedChart = createMockChartWithPlanetInHouse(Planet.Mercury, 2); // Taurus = Mercury exalted
    const stress: PlanetStress = { planet: Planet.Mercury, stressLevel: 'moderate', reasons: [], triggers: [] };
    const exaltedRemedies = getRemediesForPlanet(Planet.Mercury, stress, exaltedChart, dashas);
    const exaltedPeeth = exaltedRemedies.find(r => r.type === 'navagraha_peeth') as NavagrahaPeethRemedy;
    expect(exaltedPeeth.material.toLowerCase()).toContain('gold');

    // Debilitated Mercury
    const debilChart = createMockChartWithPlanetInHouse(Planet.Mercury, 7); // Libra = Mercury debilitated
    const debilRemedies = getRemediesForPlanet(Planet.Mercury, stress, debilChart, dashas);
    const debilPeeth = debilRemedies.find(r => r.type === 'navagraha_peeth') as NavagrahaPeethRemedy;
    expect(debilPeeth.material.toLowerCase()).toContain('silver');
  });

  it('returns all 8 remedy types when chart and dashas are provided', () => {
    const stress: PlanetStress = { planet: Planet.Sun, stressLevel: 'moderate', reasons: [], triggers: [] };
    const chart = createMockChart();
    const dashas = createMockDashas(Planet.Sun);
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
```

- [ ] **Step 2: Add mock helper functions to the test file**

Add at the top of the test file (after imports):

```typescript
// Minimal mock helpers — chart and dashas only needed for supporting remedies
function createMockChart(): import('../types/index.js').ChartData {
  const { Planet, Sign, House } = require('../types/index.js');
  return {
    planets: Object.values(Planet)
      .filter((p: number) => typeof p === 'number')
      .map((p: number) => ({
        planet: p,
        sign: Sign.Aries,
        longitude: p * 30,
        latitude: 0,
        speed: 0,
        isRetrograde: false,
      })),
    ascendant: 0,
    houses: [],
  } as import('../types/index.js').ChartData;
}

function createMockDashas(planet: Planet): import('./dashas.js').DashaPeriod[] {
  return [{
    index: 0,
    planet,
    startYear: 1990,
    endYear: 2010,
    months: 0,
    days: 0,
    mahadasha: { planet, years: 20, startYear: 1990, endYear: 2010, months: 0, days: 0 },
    antardasha: [{ planet, years: 2, startYear: 1990, endYear: 1992, months: 0, days: 0 }],
    prana: [{ planet, years: 0, months: 2, days: 0, startYear: 1990, endYear: 1990 }],
  }];
}

function createMockDashasWithLevel(planet: Planet, level: 'maha' | 'antara' | 'prana'): import('./dashas.js').DashaPeriod[] {
  return [{
    index: 0,
    planet,
    startYear: 1990,
    endYear: 2010,
    months: 0,
    days: 0,
    mahadasha: level === 'maha' ? { planet, years: 20, startYear: 1990, endYear: 2010, months: 0, days: 0 } : { planet: Planet.Sun, years: 20, startYear: 1990, endYear: 2010, months: 0, days: 0 },
    antardasha: level === 'antara' ? [{ planet, years: 2, startYear: 1990, endYear: 1992, months: 0, days: 0 }] : [],
    prana: level === 'prana' ? [{ planet, years: 0, months: 2, days: 0, startYear: 1990, endYear: 1990 }] : [],
  }];
}

function createMockChartWithPlanetInHouse(planet: Planet, house: number): import('../types/index.js').ChartData {
  const { Planet, Sign, House } = require('../types/index.js');
  return {
    planets: Object.values(Planet)
      .filter((p: number) => typeof p === 'number')
      .map((p: number) => ({
        planet: p,
        sign: p === planet ? (house - 1) as Sign : Sign.Aries,
        longitude: p === planet ? (house - 1) * 30 : p * 30,
        latitude: 0,
        speed: 0,
        isRetrograde: false,
      })),
    ascendant: 0,
    houses: [],
  } as import('../types/index.js').ChartData;
}
```

- [ ] **Step 3: Run tests**

Run: `cd packages/core && npx vitest run src/calculations/remediations.test.ts`
Expected: All 7 existing + 8 new tests pass

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/calculations/remediations.test.ts
git commit -m "test(remediations): add unit tests for all 5 new remedy types

Tests hora_kaala fields, puja (items/procedure/duration/warning),
charity house-aware (dusthana/kendra modifiers), dietary
(fastingRule/eat/avoid/lifestyle), navagraha_peeth (direction
by house, material by dignity), full 8-type coverage with
chart/dashas, 3-type fallback without.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Push all commits

```bash
git push
```

---

## Spec Coverage Checklist

| Spec Section | Task |
|---|---|
| New RemedyType union (hora_kaala, puja, charity, dietary, navagraha_peeth) | Task 1 |
| HoraKaalaRemedy discriminated union type | Task 1 |
| PujaRemedy discriminated union type | Task 1 |
| CharityRemedy discriminated union type | Task 1 |
| DietaryRemedy discriminated union type | Task 1 |
| NavagrahaPeethRemedy discriminated union type | Task 1 |
| HORA_KAALA_TABLE | Task 2 |
| PUJA_TABLE | Task 2 |
| CHARITY_BASE_TABLE + house modifier logic | Task 2 |
| DIETARY_TABLE | Task 2 |
| PEETH_DIRECTION_TABLE + PEETH_MATERIAL_TABLE | Task 2 |
| getRemediesForPlanet → 8 types | Task 3 |
| Priority offsets for 5 new types | Task 1+3 |
| CLI two-tier display | Task 4 |
| Barrel exports for new types | Task 5 |
| Unit tests for 5 new types | Task 6 |
