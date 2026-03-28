# Extended Remediation Engine Design

**Date:** 2026-03-27
**Status:** Approved
**Extends:** `2026-03-27-remediation-engine-design.md`

---

## Overview

Extends the existing remediation engine (gemstone, moola mantra, color) with five new remedy categories: hora/kaala timing, puja/ritual, charity (house-aware), dietary/lifestyle, and navagraha peeth. All remedies remain context-aware — triggered only for genuinely stressed planets.

---

## File Location

`packages/core/src/calculations/remediations.ts`

---

## New Remedy Types

```typescript
export type RemedyType =
  | 'gemstone' | 'moola_mantra' | 'color'     // existing
  | 'hora_kaala' | 'puja' | 'charity'         // new
  | 'dietary' | 'navagraha_peeth';             // new
```

---

## Two-Tier Display

Remedy report keeps existing `immediate` / `lifetime` split. Each section now shows:

1. **Primary Remedies** — gemstone, moola_mantra, color (existing, shown fully)
2. **Supporting Remedies** — hora_kaala, puja, charity, dietary, navagraha_peeth (new, shown in order of priority within each type)

Priority within each new type follows: `baseByLevel[level] * 10 + typeOffset` where type offsets are: hora_kaala=0, puja=1, charity=2, dietary=3, navagraha_peeth=4.

---

## Hora / Kaala Timing

### Table

| Planet | Day | Hora Window | Kaala Ghatis | Kaala Window |
|--------|-----|-------------|---------------|--------------|
| Sun | Sunday | 06:00–07:00 | 1–8 | 06:00–07:24 |
| Moon | Monday | 07:00–08:00 | 1–8 | 07:00–08:24 |
| Mars | Tuesday | 06:00–07:00 | 1–8 | 06:00–07:24 |
| Mercury | Wednesday | 07:00–08:00 | 1–8 | 07:00–08:24 |
| Jupiter | Thursday | 08:00–09:00 | 1–8 | 08:00–09:24 |
| Venus | Friday | 06:00–07:00 | 1–8 | 06:00–07:24 |
| Saturn | Saturday | 07:00–08:00 | 1–8 | 07:00–08:24 |
| Rahu | Saturday | 15:00–16:00 | Rahu Kaal | 15:00–16:00 (inauspicious — remedy during it is powerful) |
| Ketu | Saturday | 14:00–15:00 | Vyatipat | 14:00–15:00 (most inauspicious) |

### Remedy Fields

```typescript
interface HoraKaalaRemedy {
  id: string;              // e.g. "sun-hora-kaala"
  type: 'hora_kaala';
  planet: Planet;
  name: string;            // e.g. "Sun Hora + Kaala Window"
  day: string;              // e.g. "Sunday"
  horaWindow: string;       // e.g. "06:00–07:00"
  kaalaWindow: string;     // e.g. "06:00–07:24"
  description: string;     // e.g. "Feed the poor or perform arati during this window for maximum effect."
  benefit: string;
  stressLevel: StressLevel;
  priority: number;
}
```

---

## Puja / Ritual

### Table

| Planet | Puja Name | Duration | Procedure Summary | Warning |
|--------|-----------|----------|-------------------|---------|
| Sun | Surya Arghya | 15 min | Offer water to rising sun, Gayatri mantra 108x | Not during solar eclipse; avoid if Leo lagna |
| Moon | Chandra Arghya | 20 min | Silver vessel, moonrise milk offering, Somras chant | Avoid on Amavasya if Moon is already weak |
| Mars | Hanuman Chalisa | 30 min | Recite Hanuman Chalisa 8×, offer red flowers | Tuesday only; never on Saturdays |
| Mercury | Vishnu Sahasranam | 45 min | 108 recitations, offer green coconut | Wednesday only |
| Jupiter | Brihaspati Puja | 30 min | Yellow flowers, ghee lamp, Jupiter mantra 108× | Thursday only; caution during Jupiter retrograde |
| Venus | Lakshmi Puja | 30 min | White flowers, white cloth donation, Shukra mantra | Friday only; avoid non-vegetarian |
| Saturn | Shani Puja | 45 min | Oil abhishekam, black sesame, Hanuman Chalisa 108× | Saturday only; test remedy first |
| Rahu | Rahu Kala Puja | 20 min | Sweep floor with hands, offer coconut, Rahu beeja 108× | During Rahu Kaal only |
| Ketu | Ketu Ganesha Puja | 25 min | Offer modak, Ganesha mantra, Ketu beeja 108× | Saturday evenings only |

### Remedy Fields

```typescript
interface PujaRemedy {
  id: string;
  type: 'puja';
  planet: Planet;
  name: string;             // e.g. "Surya Arghya"
  duration: string;         // e.g. "15 min"
  procedure: string;        // e.g. "Offer water to rising sun, Gayatri mantra 108×"
  items: string[];          // e.g. ["Copper vessel", "Red flowers", "Gangajal"]
  dayRestriction: string;  // e.g. "Sunday only"
  warning: string;          // e.g. "Not during solar eclipse"
  benefit: string;
  stressLevel: StressLevel;
  priority: number;
}
```

---

## Charity (House-Aware)

### Base Items per Planet

| Planet | Base Item | Vessel |
|--------|-----------|--------|
| Sun | Jaggery + water | Copper |
| Moon | Rice + milk | Silver |
| Mars | Red lentils (masoor) | Copper |
| Mercury | Green gram (moong dal) | Brass |
| Jupiter | Yellow sweets + ghee | Gold |
| Venus | White clothes + dairy | Silver |
| Saturn | Black sesame + iron objects | Iron |
| Rahu | Coconut + black blanket | Brass |
| Ketu | Sweets + sesame oil | Copper |

### House Modifiers

| House Category | Modifier |
|----------------|----------|
| Dusthana (6, 8, 12) | Add protection items: iron nails, black cloth, blankets |
| Kendra (1, 4, 7, 10) | Add prestige items: gold, sacred threads, cow donation |
| Other (2, 3, 5, 9, 11) | Standard base item only |

### Dasha-Period Intensification

During active dasha/antardasha of the stressed planet, add a "dasha bonus item":
- Mahadasha → full base + modifier + bonus
- Antardasha → base + modifier
- Prana → base only

### Remedy Fields

```typescript
interface CharityRemedy {
  id: string;
  type: 'charity';
  planet: Planet;
  name: string;             // e.g. "Sun Charity (10th house)"
  items: string[];          // e.g. ["Jaggery in copper vessel", "Gold coin donation"]
  description: string;      // how and where to donate
  dashaBonus?: string;      // extra item during active dasha
  benefit: string;
  stressLevel: StressLevel;
  priority: number;
}
```

---

## Dietary / Lifestyle

### Table

| Planet | Fast | Eat | Avoid | Lifestyle |
|--------|------|-----|-------|-----------|
| Sun | Sunday | Gold/orange foods, jaggery, sweet fruits | Spicy, sour, tamarind | Face East at sunrise; wear bright colors |
| Moon | Monday (full) | White foods, rice, milk, coconut | Dry, stale, leftover food | Drink 8 glasses water; sleep before 22:00 |
| Mars | Tuesday | Sweet, cool foods (ghee, cucumber) | Spicy, red meat, fermented | Wake before sunrise; control anger/arguments |
| Mercury | Wednesday | Green foods, moong dal, leafy vegetables | Stale, excessive oily food | Speak truth; maintain personal hygiene |
| Jupiter | Thursday | Yellow foods, ghee, chana dal, bananas | Stale, non-vegetarian, alcohol | Charity on Thursdays; study sacred texts |
| Venus | Friday | White foods, dairy, mango, honey | Meat, eggs, alcohol, excessive salt | Wear white; apply sandalwood paste |
| Saturn | Saturday (partial) | Fast till noon; simple fruit | Salt, black foods (black gram, nightshades) | Serve others; sleep on floor occasionally |
| Rahu | Saturday (Rahu Kaal) | Simple vegetarian, coconut water | Overly sweet, artificial | Occult/spiritual study only with guru guidance |
| Ketu | Saturday evenings | Light fast, fruits, milk | Heavy meals, garlic, onion | Meditation facing South; solitary spiritual practice |

### Remedy Fields

```typescript
interface DietaryRemedy {
  id: string;
  type: 'dietary';
  planet: Planet;
  name: string;             // e.g. "Sun Dietary & Lifestyle"
  fastingRule: string;      // e.g. "Fast on Sundays, eat only fruit until noon"
  eat: string[];            // e.g. ["Gold/orange foods", "Jaggery", "Sweet fruits"]
  avoid: string[];          // e.g. ["Spicy food", "Sour foods", "Tamarind"]
  lifestyle: string[];      // e.g. ["Face East at sunrise", "Wear bright colors"]
  benefit: string;
  stressLevel: StressLevel;
  priority: number;
}
```

---

## Navagraha Peeth

### Direction (by House)

| House | Direction | Description |
|-------|-----------|-------------|
| 1 | East | Ekon (front of home), facing sunrise |
| 2 | Southeast | Agneya corner |
| 3 | South | Exact South |
| 4 | North | Exact North |
| 5 | Northeast | Ishaanya corner |
| 6 | South-Southeast | Nairitya corner |
| 7 | West | Prachya corner |
| 8 | Northwest | Vayavya corner |
| 9 | North | (shares with 4th) |
| 10 | Northeast/East | Near main door |
| 11 | East-Northeast | Near utility area |
| 12 | South-Southwest | Paśhima corner |

### Material (by Dignity)

| Dignity | Material | Why |
|---------|----------|-----|
| Exalted | Gold | Maximum strength, needs least pacification |
| Own sign | Brass | Standard, well-disposed relationship |
| Normal | Copper | Neutral, general strengthening |
| Debilitated | Silver | Softens, pacifies strongly |

### Ritual Frequency (by Dasha Activity)

| Dasha State | Frequency |
|-------------|-----------|
| Running Mahadasha | Daily arati + offering |
| Running Antardasha | 3× per week (Mon, Thu, Sat) |
| Running Prana | Weekly (Saturday) |
| No active dasha | Monthly (full moon) |

### Remedy Fields

```typescript
interface NavagrahaPeethRemedy {
  id: string;
  type: 'navagraha_peeth';
  planet: Planet;
  name: string;             // e.g. "Sun Navagraha Peeth (10th house)"
  direction: string;       // e.g. "East (10th house → direction: East)"
  material: string;        // e.g. "Gold idol (Sun exalted)"
  placement: string;       // e.g. "Place on elevated platform in East-facing window"
  frequency: string;       // e.g. "Daily arati during Sun Mahadasha, weekly otherwise"
  description: string;
  benefit: string;
  stressLevel: StressLevel;
  priority: number;
}
```

---

## Integration

### Type Expansions

`Remedy` union type expands to accommodate all 8 remedy types (3 existing + 5 new). Discriminated union via `type` field.

`RemediationReport` structure unchanged — each `remedies: Remedy[]` array now contains mixed types, display order controlled by `priority` field within each tier (primary vs supporting).

### CLI Changes

No changes to CLI command surface — `--remedies` flag already exists. `displayRemediationReport` in `cli.ts` gains a `showSupporting: boolean` parameter (default: true) to optionally suppress the supporting remedies section.

### New Exports

```typescript
// New types
export type { HoraKaalaRemedy, PujaRemedy, CharityRemedy, DietaryRemedy, NavagrahaPeethRemedy };

// New table data (for reference)
export { HORA_KAALA_TABLE, PUJA_TABLE, CHARITY_BASE_TABLE, DIETARY_TABLE, NAVAGRAHA_PEETH_DIRECTION_TABLE };
```

---

## Priority Ordering

All remedies (primary + supporting) share the same priority space for interleaving. Within the same priority band, sort by `planet` then `type`.

| Level | Base | Type offset → |
|-------|------|--------------|
| Severe | 10 | gemstone=10, moola_mantra=11, color=12, hora_kaala=13, puja=14, charity=15, dietary=16, navagraha_peeth=17 |
| Moderate | 20 | same offsets |
| Mild | 40 | same offsets |

The display separates primary vs supporting after sorting — primary types (gemstone, moola_mantra, color) print with full details; supporting types (hora_kaala, puja, charity, dietary, navagraha_peeth) print grouped by type.

---

## Notes

- Rahu/Ketu hora windows (Rahu Kaal, Vyatipat) are traditionally inauspicious windows — performing remedy *during* these windows is considered especially powerful for pacification, despite the name
- Hora times are approximate for a general reference — actual hora depends on sunrise time which varies by location and date; table values assume sunrise ~06:00
- Navagraha peeth recommendations assume home temple/altar placement; actual temple placement follows additional vastu rules not covered here
- Dietary remedies are additive — a planet-stressed person follows both the fasting rule and the eat/avoid lists
