# Remediation Engine Design

**Date:** 2026-03-27
**Status:** Approved

---

## Overview

A context-aware remediation engine that recommends gemstone, moola mantra, and color remedies for planets under stress. Remedies are triggered only when a planet is genuinely stressed — not as a blanket recommendation.

---

## File Location

`packages/core/src/calculations/remediations.ts`

---

## Core Types

```typescript
export type StressLevel = 'mild' | 'moderate' | 'severe';
export type StressTrigger = 'dasha' | 'transit' | 'dignity' | 'shadbala' | 'house';

export interface PlanetStress {
  planet: Planet;
  stressLevel: StressLevel;
  reasons: string[];       // e.g. "Debilitated in Scorpio", "Low shadbala"
  triggers: StressTrigger[];
}

export type RemedyType = 'gemstone' | 'moola_mantra' | 'color';

export interface Remedy {
  id: string;
  type: RemedyType;
  planet: Planet;
  name: string;            // e.g. "Red Coral (Moonga)"
  description: string;      // how to use, precautions
  benefit: string;         // what it helps with
  stressLevel: StressLevel; // min stress level needed to recommend
  priority: number;        // 1-10, lower = more urgent
}

export interface RemediationReport {
  immediate: {
    periodDescription: string;  // e.g. "Mars Mahadasha + Rahu Antardasha"
    stressedPlanets: PlanetStress[];
    remedies: Remedy[];         // ranked by priority
  };
  lifetime: {
    stressedPlanets: PlanetStress[];
    remedies: Remedy[];         // ranked by priority
  };
}
```

---

## Stress Detection

### Stress Checks

| Check | Condition | Stress Level |
|-------|-----------|--------------|
| Debilitated sign | `planetSign === PLANET_DEBILITATED_SIGNS[planet]` | severe |
| Exalted sign | `planetSign === PLANET_EXALTED_SIGNS[planet]` | none (skip) |
| Low shadbala | `shadbala < 100` (per planet) | moderate |
| Planet in dusthana | house 6, 8, or 12 | mild |
| Rahu/Ketu in kendra | house 1, 4, 7, or 10 | moderate |
| Current mahadasha planet | running current mahadasha | per dignity |
| Malefic transit aspect | malefic planet transiting natal planet | mild |

### Immediate vs Lifetime

- **Immediate:** planet is stressed AND currently running a dasha (mahadasha/antardasha/prana)
- **Lifetime:** planet is stressed based on birth chart alone, regardless of dasha

---

## Remedy Tables

### Gemstones

| Planet | Gemstone | Sanskrit | Precaution |
|--------|----------|---------|------------|
| Sun | Ruby | मणिक (Manik) | Not for Leo lagna |
| Moon | Pearl | मोती (Moti) | Not for Cancer lagna |
| Mars | Red Coral | मूंग (Moonga) | Not for Aries/Scorpio lagna |
| Mercury | Emerald | पन्ना (Panna) | Not for Gemini/Virgo lagna |
| Jupiter | Yellow Sapphire | पुखराज (Pukhraj) | Not for Sagittarius/Pisces lagna |
| Venus | Diamond | हीरा (Heera) | Not for Taurus/Libra lagna |
| Saturn | Blue Sapphire | नीलम (Neelam) | Test first; risky if misplaced |
| Rahu | Gomed | गोमेद (Gomed) | Wear with care |
| Ketu | Cat's Eye | लहसुनिया (Lahsuniya) | Wear with care |

### Moola Mantras (108 recitations)

| Planet | Mantra (Devanagari) | Canonical Recitations |
|--------|--------------------|-----------------------|
| Sun | ॐ ह्रां ह्रीं ह्रौं सः सूर्याय नमः | 7,000 × 4 |
| Moon | ॐ सौं सौमाय नमः | 7,000 × 4 |
| Mars | ॐ क्रें क्रौं क्रिः फट् स्वाहा | 7,000 × 7 |
| Mercury | ॐ बुं बुधाय नमः | 7,000 × 7 |
| Jupiter | ॐ बृं बृहस्पतये नमः | 7,000 × 4 |
| Venus | ॐ शुक्राय नमः | 7,000 × 7 |
| Saturn | ॐ प्रां प्रां पृथिवीथाय नमः | 7,000 × 7 |
| Rahu | ॐ रां राहवे नमः | 7,000 × 7 |
| Ketu | ॐ स्यां स्यौं केतवे नमः | 7,000 × 7 |

### Colors

| Planet | Primary | Alternative |
|--------|---------|-------------|
| Sun | Gold (#FFD700) | Red (#FF0000) |
| Moon | White (#FFFFFF) | Silver (#C0C0C0) |
| Mars | Red (#FF0000) | Orange (#FFA500) |
| Mercury | Green (#00FF00) | Yellow (#FFFF00) |
| Jupiter | Yellow (#FFFF00) | Gold (#FFD700) |
| Venus | White (#FFFFFF) | Silver (#C0C0C0) |
| Saturn | Black (#000000) | Blue (#0000FF) |
| Rahu | Multi/Hybrid | Orange (#FFA500) |
| Ketu | Brown (#A52A2A) | Grey (#808080) |

---

## API

```typescript
// Primary entry point
export function calculateRemediations(
  chart: ChartData,
  dashas: DashaPeriod[],
  transit: TransitPosition,
  options?: {
    includeLifetime?: boolean;  // default: true
    maxResults?: number;        // default: 10 per section
  }
): RemediationReport

// Per-planet stress analysis
export function getPlanetStress(
  planet: Planet,
  chart: ChartData,
  dashas: DashaPeriod[],
  transit: TransitPosition,
  currentDate: Date
): PlanetStress | null  // null = not stressed enough

// Remedies for a specific stressed planet
export function getRemediesForPlanet(
  planet: Planet,
  stress: PlanetStress
): Remedy[]
```

---

## Integration Points

1. **`predictions.ts`** — `generatePredictions` calls `calculateRemediations` and attaches to response
2. **`transit.ts`** — `calculateTransit` result reused for transit stress checks
3. **`cli.ts`** — expose via `parashari predict --remedies` and `parashari report --remedies`
4. **`@parashari/core` barrel** — export `calculateRemediations`, `RemediationReport`, `PlanetStress`, `Remedy`

---

## Export List

```typescript
export type { PlanetStress, Remedy, RemediationReport, StressLevel, StressTrigger, RemedyType };
export { calculateRemediations, getPlanetStress, getRemediesForPlanet };
```

---

## Notes

- Rahu/Ketu remedies (Gomed, Cat's Eye) are traditionally considered "risky" — descriptions should include caution language
- Lagna check (lagna-based gemstone contraindications) requires lagna sign from chart — use `houses[0].sign`
- Shadbala thresholds: below 100 is weak, 100-200 is moderate, above 200 is strong (per classical texts)
- Priority scoring: severe+dasha = 1, moderate+dasha = 2-3, mild+dasha = 4-5, lifetime without dasha = 6-10
