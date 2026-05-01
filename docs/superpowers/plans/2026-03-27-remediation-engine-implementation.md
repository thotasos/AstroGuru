# Remediation Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a context-aware remediation engine that recommends gemstone, moola mantra, and color remedies for stressed planets.

**Architecture:** New `remediations.ts` module in `packages/core/src/calculations/` with pure functions. No external dependencies. Integrates with existing `ChartData`, `DashaPeriod`, and `TransitPosition` types. CLI gains `--remedies` flag on `predict` and `report` commands.

**Tech Stack:** TypeScript, `packages/core`, `packages/api`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `packages/core/src/calculations/remediations.ts` | **Create** | All remediation logic |
| `packages/core/src/index.ts` | Modify | Export new types and functions |
| `packages/api/src/cli.ts` | Modify | `--remedies` flag on predict/report |
| `packages/core/src/calculations/remediations.test.ts` | Create | Tests |

---

## Task 1: Types and Remedy Tables

**Files:**
- Create: `packages/core/src/calculations/remediations.ts`
- Test: `packages/core/src/calculations/remediations.test.ts`

- [ ] **Step 1: Create remediations.ts with all types and exports skeleton**

```typescript
// packages/core/src/calculations/remediations.ts

import { Planet, Sign, ChartData, DashaPeriod, House } from '../types/index.js';
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
// Placeholder exports — fill in per task
// ------------------------------------

export function calculateRemediations(
  chart: ChartData,
  dashas: DashaPeriod[],
  transit: TransitPosition,
  options?: { includeLifetime?: boolean; maxResults?: number }
): RemediationReport {
  throw new Error('Not yet implemented');
}

export function getPlanetStress(
  planet: Planet,
  chart: ChartData,
  dashas: DashaPeriod[],
  transit: TransitPosition,
  currentDate: Date
): PlanetStress | null {
  throw new Error('Not yet implemented');
}

export function getRemediesForPlanet(planet: Planet, stress: PlanetStress): Remedy[] {
  throw new Error('Not yet implemented');
}
```

- [ ] **Step 2: Run test to verify it compiles (types exist)**

Run: `cd packages/core && npx tsc --noEmit src/calculations/remediations.ts 2>&1 | head -20`
Expected: No errors related to missing types (stub functions will error at runtime but not compile time with --noEmit)

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/calculations/remediations.ts
git commit -m "feat(remediations): scaffold types and export skeleton"
```

---

## Task 2: Remedy Tables (Gemstones, Mantras, Colors)

**Files:**
- Modify: `packages/core/src/calculations/remediations.ts` — add tables after imports

- [ ] **Step 1: Add gemstone table**

Add this after the types section, before any function:

```typescript
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
  [Planet.Sun]:    { name: 'Ruby',          sanskrit: 'मणिक (Manik)',    precaution: 'Not for Leo lagna',       lagnaContraindicated: [Sign.Leo] },
  [Planet.Moon]:   { name: 'Pearl',         sanskrit: 'मोती (Moti)',     precaution: 'Not for Cancer lagna',    lagnaContraindicated: [Sign.Cancer] },
  [Planet.Mars]:   { name: 'Red Coral',     sanskrit: 'मूंग (Moonga)',   precaution: 'Not for Aries/Scorpio lagna', lagnaContraindicated: [Sign.Aries, Sign.Scorpio] },
  [Planet.Mercury]:{ name: 'Emerald',       sanskrit: 'पन्ना (Panna)',   precaution: 'Not for Gemini/Virgo lagna', lagnaContraindicated: [Sign.Gemini, Sign.Virgo] },
  [Planet.Jupiter]:{ name: 'Yellow Sapphire', sanskrit: 'पुखराज (Pukhraj)', precaution: 'Not for Sagittarius/Pisces lagna', lagnaContraindicated: [Sign.Sagittarius, Sign.Pisces] },
  [Planet.Venus]:  { name: 'Diamond',       sanskrit: 'हीरा (Heera)',    precaution: 'Not for Taurus/Libra lagna', lagnaContraindicated: [Sign.Taurus, Sign.Libra] },
  [Planet.Saturn]: { name: 'Blue Sapphire',  sanskrit: 'नीलम (Neelam)',  precaution: 'Test first; risky if misplaced' },
  [Planet.Rahu]:   { name: 'Gomed',         sanskrit: 'गोमेद (Gomed)',  precaution: 'Wear with care' },
  [Planet.Ketu]:   { name: "Cat's Eye",     sanskrit: 'लहसुनिया (Lahsuniya)', precaution: 'Wear with care' },
};

const MOOLA_MANTRA_TABLE: Record<Planet, { mantra: string; recitations: string }> = {
  [Planet.Sun]:    { mantra: 'ॐ ह्रां ह्रीं ह्रौं सः सूर्याय नमः',   recitations: '7,000 × 4' },
  [Planet.Moon]:   { mantra: 'ॐ सौं सौमाय नमः',                      recitations: '7,000 × 4' },
  [Planet.Mars]:   { mantra: 'ॐ क्रें क्रौं क्रिः फट् स्वाहा',        recitations: '7,000 × 7' },
  [Planet.Mercury]:{ mantra: 'ॐ बुं बुधाय नमः',                      recitations: '7,000 × 7' },
  [Planet.Jupiter]:{ mantra: 'ॐ बृं बृहस्पतये नमः',                 recitations: '7,000 × 4' },
  [Planet.Venus]:  { mantra: 'ॐ शुक्राय नमः',                         recitations: '7,000 × 7' },
  [Planet.Saturn]: { mantra: 'ॐ प्रां प्रां पृथिवीथाय नमः',           recitations: '7,000 × 7' },
  [Planet.Rahu]:   { mantra: 'ॐ रां राहवे नमः',                      recitations: '7,000 × 7' },
  [Planet.Ketu]:   { mantra: 'ॐ स्यां स्यौं केतवे नमः',              recitations: '7,000 × 7' },
};

interface ColorEntry {
  primary: string;
  hex: string;
  alternative?: string;
  altHex?: string;
}

const COLOR_TABLE: Record<Planet, ColorEntry> = {
  [Planet.Sun]:    { primary: 'Gold',     hex: '#FFD700',  alternative: 'Red',    altHex: '#FF0000' },
  [Planet.Moon]:   { primary: 'White',   hex: '#FFFFFF',  alternative: 'Silver',  altHex: '#C0C0C0' },
  [Planet.Mars]:   { primary: 'Red',      hex: '#FF0000',  alternative: 'Orange', altHex: '#FFA500' },
  [Planet.Mercury]:{ primary: 'Green',    hex: '#00FF00',  alternative: 'Yellow', altHex: '#FFFF00' },
  [Planet.Jupiter]:{ primary: 'Yellow',   hex: '#FFFF00',  alternative: 'Gold',   altHex: '#FFD700' },
  [Planet.Venus]:  { primary: 'White',    hex: '#FFFFFF',  alternative: 'Silver',  altHex: '#C0C0C0' },
  [Planet.Saturn]: { primary: 'Black',    hex: '#000000',  alternative: 'Blue',   altHex: '#0000FF' },
  [Planet.Rahu]:   { primary: 'Multi',    hex: '#FFA500',  alternative: 'Orange', altHex: '#FFA500' },
  [Planet.Ketu]:   { primary: 'Brown',    hex: '#A52A2A',  alternative: 'Grey',   altHex: '#808080' },
};
```

- [ ] **Step 2: Verify it compiles**

Run: `cd packages/core && npx tsc --noEmit src/calculations/remediations.ts 2>&1 | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/calculations/remediations.ts
git commit -m "feat(remediations): add gemstone, mantra, and color tables"
```

---

## Task 3: `getRemediesForPlanet` Implementation

**Files:**
- Modify: `packages/core/src/calculations/remediations.ts`

- [ ] **Step 1: Implement getRemediesForPlanet**

Replace the stub with:

```typescript
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
```

- [ ] **Step 2: Verify it compiles**

Run: `cd packages/core && npx tsc --noEmit src/calculations/remediations.ts 2>&1 | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/calculations/remediations.ts
git commit -m "feat(remediations): implement getRemediesForPlanet with tables"
```

---

## Task 4: `getPlanetStress` Implementation

**Files:**
- Modify: `packages/core/src/calculations/remediations.ts`
- Import from: `transit.ts` (FUNCTIONAL_NATURES, isFunctionalBenefic, isPlanetInDebilitated, isPlanetInOwnOrExalted, isInKendra), `shadbala.ts` (calculateShadbala, EXALT_DEBIL), `dashas.ts` (getDashaAtDate)

- [ ] **Step 1: Add imports and helper at top of file**

Add after existing imports:

```typescript
import { FUNCTIONAL_NATURES, isFunctionalBenefic, isPlanetInDebilitated, isPlanetInOwnOrExalted, isInKendra } from './transit.js';
import { calculateShadbala, EXALT_DEBIL } from './shadbala.js';
import { getDashaAtDate } from './dashas.js';
```

Add helper functions before `getPlanetStress`:

```typescript
// ------------------------------------
// Helpers
// ------------------------------------

const DUSTHANA_HOUSES = new Set([House.Sixth, House.Eighth, House.Twelfth]);
const KENDRA_HOUSES = new Set([House.First, House.Fourth, House.Seventh, House.Tenth]);
const MALEFICS = new Set([Planet.Sun, Planet.Mars, Planet.Saturn, Planet.Rahu, Planet.Ketu]);

function getPlanetHouse(planet: Planet, chart: ChartData): House | null {
  const pos = chart.planets.find(p => p.planet === planet);
  if (!pos) return null;
  // Find which house this planet occupies based on sign
  const sign = pos.sign;
  const lagnaSign = Math.floor(chart.ascendant / 30) as Sign;
  const houseNumber = ((sign - lagnaSign + 12) % 12) + 1;
  return houseNumber as House;
}

function getPlanetDignity(planet: Planet, chart: ChartData): 'exalted' | 'debilitated' | 'own' | 'normal' {
  const pos = chart.planets.find(p => p.planet === planet);
  if (!pos) return 'normal';
  if (isPlanetInOwnOrExalted(planet, pos.sign)) return 'own';
  if (isPlanetInDebilitated(planet, pos.sign)) return 'debilitated';
  return 'normal';
}

function getDashaStress(planet: Planet, dashas: DashaPeriod[], currentDate: Date): 'severe' | 'moderate' | 'mild' | null {
  const dashaAtTime = getDashaAtDate(dashas, currentDate);
  if (!dashaAtTime) return null;

  // Check all dasha levels for this planet
  const levels = [
    dashaAtTime.mahadasha,
    dashaAtTime.antardasha,
    dashaAtTime.prana,
  ];

  for (const level of levels) {
    if (level && level.planet === planet) {
      const dignity = getPlanetDignity(planet, { planets: [{ planet, sign: level.sign }] } as ChartData);
      if (dignity === 'debilitated') return 'severe';
      if (dignity === 'own') return 'mild';
      return 'moderate';
    }
  }
  return null;
}
```

- [ ] **Step 2: Implement getPlanetStress**

Add after the helpers:

```typescript
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

  const dignity = getPlanetDignity(planet, chart);
  if (dignity === 'debilitated') {
    reasons.push(`Debilitated in ${getSignName(pos.sign)}`);
    triggers.push('dignity');
    maxLevel = 'severe';
  }

  // House placement (dusthana)
  const house = getPlanetHouse(planet, chart);
  if (house && DUSTHANA_HOUSES.has(house)) {
    reasons.push(`In dusthana (${house}${getOrdinalSuffix(house)} house)`);
    triggers.push('house');
    if (maxLevel !== 'severe') maxLevel = 'mild';
  }

  // Rahu/Ketu in kendra
  if ((planet === Planet.Rahu || planet === Planet.Ketu) && house && KENDRA_HOUSES.has(house)) {
    reasons.push(`${getPlanetName(planet)} in kendra (${house}${getOrdinalSuffix(house)} house)`);
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
  const dashaStress = getDashaStress(planet, dashas, currentDate);
  if (dashaStress) {
    const dignity2 = getPlanetDignity(planet, chart);
    const level: StressLevel = dignity2 === 'debilitated' ? 'severe' : dashaStress === 'moderate' ? 'moderate' : 'mild';
    reasons.push(`Running dasha (${getPlanetName(planet)} mahadasha period)`);
    triggers.push('dasha');
    if (level === 'severe') maxLevel = 'severe';
    else if (level === 'moderate' && maxLevel !== 'severe') maxLevel = 'moderate';
  }

  if (reasons.length === 0) return null;

  return { planet, stressLevel: maxLevel, reasons, triggers };
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd packages/core && npx tsc --noEmit src/calculations/remediations.ts 2>&1 | head -20`
Expected: No errors. If there are import errors, fix them.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/calculations/remediations.ts
git commit -m "feat(remediations): implement getPlanetStress with dignity, house, dasha checks"
```

---

## Task 5: `calculateRemediations` and `generateRemediationReport`

**Files:**
- Modify: `packages/core/src/calculations/remediations.ts`

- [ ] **Step 1: Implement calculateRemediations**

Add at the end of the file:

```typescript
export function calculateRemediations(
  chart: ChartData,
  dashas: DashaPeriod[],
  transit: TransitPosition,
  options: { includeLifetime?: boolean; maxResults?: number } = {}
): RemediationReport {
  const { includeLifetime = true, maxResults = 10 } = options;
  const currentDate = new Date();

  const lagnaSign = Math.floor(chart.ascendant / 30) as Sign;
  const periodDescription = getPeriodDescription(dashas, currentDate);

  // Check all 9 planets
  const allStress: PlanetStress[] = [];
  for (const planet of [Planet.Sun, Planet.Moon, Planet.Mars, Planet.Mercury,
                        Planet.Jupiter, Planet.Venus, Planet.Saturn,
                        Planet.Rahu, Planet.Ketu] as Planet[]) {
    const stress = getPlanetStress(planet, chart, dashas, transit, currentDate);
    if (stress) allStress.push(stress);
  }

  // Separate immediate (has dasha trigger) vs lifetime
  const immediateStress = allStress.filter(s => s.triggers.includes('dasha'));
  const lifetimeStress = includeLifetime
    ? allStress.filter(s => !s.triggers.includes('dasha'))
    : [];

  // Build remedy lists
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
```

- [ ] **Step 2: Verify it compiles**

Run: `cd packages/core && npx tsc --noEmit src/calculations/remediations.ts 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/calculations/remediations.ts
git commit -m "feat(remediations): implement calculateRemediations entry point"
```

---

## Task 6: Core Barrel Exports

**Files:**
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Add export lines**

Find the `calculations/transit.ts` export block in `index.ts` and add after it:

```typescript
export {
  calculateRemediations,
  getPlanetStress,
  getRemediesForPlanet,
  type PlanetStress,
  type Remedy,
  type RemediationReport,
  type StressLevel,
  type StressTrigger,
  type RemedyType,
} from './calculations/remediations.js';
```

- [ ] **Step 2: Verify core package builds**

Run: `cd packages/core && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/index.ts
git commit -m "feat(core): export remediation engine from barrel"
```

---

## Task 7: CLI Integration

**Files:**
- Modify: `packages/api/src/cli.ts`

- [ ] **Step 1: Add --remedies flag to report command**

Find the `report` command definition (around line 860) and add an `--remedies` option:

```typescript
.report('--remedies', 'Include remediation recommendations')
```

Find where the report text is output (after building career/finance/health/etc.) and add:

```typescript
if (options.remedies) {
  const { calculateRemediations } = await import('@parashari/core');
  const remediationReport = calculateRemediations(chart, dashas, transit);

  output += '\n\n=== REMEDIATIONS ===\n';

  if (remediationReport.immediate.stressedPlanets.length > 0) {
    output += `\nIMMEDIATE (${remediationReport.immediate.periodDescription}):\n`;
    for (const remedy of remediationReport.immediate.remedies) {
      output += `  [${remedy.type.toUpperCase()}] ${remedy.name} — ${remedy.description}\n`;
    }
  }

  if (remediationReport.lifetime.stressedPlanets.length > 0) {
    output += `\nLIFETIME CHART STRESSES:\n`;
    for (const remedy of remediationReport.lifetime.remedies) {
      output += `  [${remedy.type.toUpperCase()}] ${remedy.name} — ${remedy.description}\n`;
    }
  }

  if (remediationReport.immediate.stressedPlanets.length === 0 &&
      remediationReport.lifetime.stressedPlanets.length === 0) {
    output += '\nNo significant planetary stresses detected.\n';
  }
}
```

- [ ] **Step 2: Add --remedies flag to predict command**

Find the `predict` command (around line 1475) and add `--remedies` option similarly.

Find where predictions are displayed and add the same remediation block after the predictions output.

- [ ] **Step 3: Verify it compiles**

Run: `cd packages/api && npx tsx --noEmit src/cli.ts 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Test CLI help shows new flag**

Run: `parashari report --help` and `parashari predict --help`
Expected: Both show `--remedies` flag

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/cli.ts
git commit -m "feat(cli): add --remedies flag to report and predict commands"
```

---

## Task 8: Basic Tests

**Files:**
- Create: `packages/core/src/calculations/remediations.test.ts`

- [ ] **Step 1: Write tests for getRemediesForPlanet**

```typescript
import { describe, it, expect } from 'vitest';
import { Planet, Sign, PlanetStress } from '../types/index.js';
import { getRemediesForPlanet } from './remediations.js';

describe('getRemediesForPlanet', () => {
  it('returns gemstone, mantra, and color for a stressed planet', () => {
    const stress: PlanetStress = {
      planet: Planet.Mars,
      stressLevel: 'moderate',
      reasons: ['In dusthana'],
      triggers: ['house'],
    };
    const remedies = getRemediesForPlanet(Planet.Mars, stress);
    expect(remedies).toHaveLength(3);
    expect(remedies.map(r => r.type)).toEqual(['gemstone', 'moola_mantra', 'color']);
  });

  it('returns higher priority for severe stress', () => {
    const mild: PlanetStress = { planet: Planet.Jupiter, stressLevel: 'mild', reasons: [], triggers: [] };
    const severe: PlanetStress = { planet: Planet.Jupiter, stressLevel: 'severe', reasons: [], triggers: [] };
    const mildRemedies = getRemediesForPlanet(Planet.Jupiter, mild);
    const severeRemedies = getRemediesForPlanet(Planet.Jupiter, severe);
    expect(severeRemedies[0].priority).toBeLessThan(mildRemedies[0].priority);
  });

  it('orders remedies by priority within same planet', () => {
    const stress: PlanetStress = { planet: Planet.Saturn, stressLevel: 'moderate', reasons: [], triggers: [] };
    const remedies = getRemediesForPlanet(Planet.Saturn, stress);
    for (let i = 1; i < remedies.length; i++) {
      expect(remedies[i - 1].priority).toBeLessThanOrEqual(remedies[i].priority);
    }
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd packages/core && npx vitest run src/calculations/remediations.test.ts 2>&1`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/calculations/remediations.test.ts
git commit -m "test(remediations): add unit tests for getRemediesForPlanet"
```

---

## Spec Coverage Check

| Spec Section | Task |
|-------------|------|
| Types (StressLevel, PlanetStress, Remedy, RemediationReport) | Task 1 |
| Gemstone table | Task 2 |
| Moola Mantra table | Task 2 |
| Color table | Task 2 |
| getRemediesForPlanet | Task 3 |
| getPlanetStress (dignity, dusthana, kendra, shadbala, dasha) | Task 4 |
| calculateRemediations (immediate vs lifetime split) | Task 5 |
| Core barrel export | Task 6 |
| CLI --remedies flag | Task 7 |
| Unit tests | Task 8 |

---

## Self-Review

- Types match spec exactly: ✅
- All 9 planets covered in tables: ✅
- Priority scoring: severe=1, moderate=2, mild=4 (multiplied by 10 + type offset): ✅
- Lagna contraindications stored on gemstone entries: ✅
- Immediate vs lifetime separation via 'dasha' trigger: ✅
- CLI flags added to both predict and report: ✅
