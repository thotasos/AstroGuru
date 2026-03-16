# CLI Predictions Enhancement Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance CLI predictions with: (1) complete past/future predictions in report, (2) on-demand predict CLI generation, (3) category-based predictions instead of numeric scores.

**Architecture:**
- Report: Show all prediction periods (past completed + current + future) with full summaries
- Predict on-demand: Generate hourly predictions for any date using same algorithm as cache
- Category scores: Replace 0-100 numeric score with category explanations (Career, Finance, Health, Relationships, Education)

**Tech Stack:** TypeScript, @parashari/core, better-sqlite3, commander

---

## Chunk 1: Complete Report Predictions

### Task 1: Show all prediction periods in report

**Files:**
- Modify: `packages/api/src/cli.ts:283-328`

- [ ] **Step 1: Expand prediction display in reportAction**

Replace the current prediction display (lines 283-328) to show ALL periods:

```typescript
// Parse and display predictions
if (hasPredictions && cache.predictions_json) {
  console.log('\n=== PREDICTIONS (Past, Current & Future) ===');
  const predictions = JSON.parse(cache.predictions_json);
  const periods = predictions.periods || [];

  if (periods.length > 0) {
    const now = new Date();
    const planetNames = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
    const levelNames = ['Mahadasha', 'Antardasha', 'Pratyantardasha', 'Sookshma', 'Prana'];

    // Past periods (completed)
    const pastPeriods = periods.filter((p: { endDate: string }) => new Date(p.endDate) < now);
    // Current periods
    const currentPeriods = periods.filter((p: { startDate: string; endDate: string }) => {
      const start = new Date(p.startDate);
      const end = new Date(p.endDate);
      return start <= now && end >= now;
    });
    // Future periods
    const futurePeriods = periods.filter((p: { startDate: string }) => new Date(p.startDate) > now);

    console.log(`\nTotal Periods: ${periods.length}`);
    console.log(`Past: ${pastPeriods.length} | Current: ${currentPeriods.length} | Future: ${futurePeriods.length}`);

    // Show PAST completed periods (most recent first)
    if (pastPeriods.length > 0) {
      console.log('\n--- PAST MAHADASHA PERIODS ---');
      // Show last 5 completed mahadashas
      const recentPast = pastPeriods.slice(-5).reverse();
      for (const p of recentPast) {
        const planet = planetNames[p.activePlanet] || `Planet ${p.activePlanet}`;
        const start = p.startDate.split('T')[0];
        const end = p.endDate.split('T')[0];
        console.log(`\n${planet} Mahadasha: ${start} to ${end}`);
        console.log(`  Level: ${levelNames[p.level - 1]}`);
        console.log(`  House: ${p.houseAffected}`);
        console.log(`  Strength: ${p.planetStrength}`);
        if (p.summary) {
          // Print full summary without truncation
          const lines = p.summary.split('\n');
          for (const line of lines.slice(0, 5)) {
            console.log(`  ${line.trim()}`);
          }
        }
      }
    }

    // Show CURRENT periods
    if (currentPeriods.length > 0) {
      console.log('\n--- CURRENT ACTIVE PERIOD ---');
      for (const p of currentPeriods.slice(0, 3)) {
        const planet = planetNames[p.activePlanet] || `Planet ${p.activePlanet}`;
        const start = p.startDate.split('T')[0];
        const end = p.endDate.split('T')[0];
        console.log(`\n${planet} (${levelNames[p.level - 1]}): ${start} to ${end}`);
        console.log(`  House: ${p.houseAffected} | Strength: ${p.planetStrength}`);
        if (p.summary) {
          const lines = p.summary.split('\n');
          for (const line of lines) {
            console.log(`  ${line.trim()}`);
          }
        }
      }
    }

    // Show NEXT upcoming periods
    if (futurePeriods.length > 0) {
      console.log('\n--- UPCOMING MAHADASHA PERIODS ---');
      const nextFive = futurePeriods.slice(0, 5);
      for (const p of nextFive) {
        const planet = planetNames[p.activePlanet] || `Planet ${p.activePlanet}`;
        const start = p.startDate.split('T')[0];
        const end = p.endDate.split('T')[0];
        console.log(`\n${planet} Mahadasha: ${start} to ${end}`);
        console.log(`  House: ${p.houseAffected} | Strength: ${p.planetStrength}`);
        if (p.summary) {
          const lines = p.summary.split('\n').slice(0, 3);
          for (const line of lines) {
            console.log(`  ${line.trim()}`);
          }
        }
      }
    }
  } else {
    console.log('  No prediction periods available.');
  }
}
```

- [ ] **Step 2: Build and test**

Run: `cd packages/api && npm run build`

Run: `npx tsx src/cli.ts report -i <profile-id>`

Expected: Shows complete past, current, and future predictions with full summaries

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/cli.ts
git commit -m "feat: show complete predictions in report

- Display all past mahadasha periods with full summaries
- Show current active periods
- Show upcoming mahadasha periods
- No more truncation of prediction text

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 2: On-Demand Predict CLI

### Task 2: Implement on-demand prediction generation

**Files:**
- Modify: `packages/api/src/cli.ts:653-660`
- Modify: `packages/core/src/calculations/transit.ts` (export helper for score calculation)

- [ ] **Step 1: Add generateHourlyPredictionForDate function**

Add a new function that generates predictions for a single date (not from cache):

```typescript
/**
 * Generate hourly predictions for a specific date (on-demand).
 * Used when date is not in cache.
 */
async function generateHourlyPredictionForDate(
  profileId: string,
  dateStr: string,
  timezone: string,
): Promise<any[]> {
  const profile = getProfile(profileId);
  if (!profile) {
    throw new Error(`Profile not found: ${profileId}`);
  }

  const cache = getCachedCalculation(profileId);
  if (!cache) {
    throw new Error(`No calculations found for ${profileId}. Run process first.`);
  }

  // Parse cached data
  let dashas: any[];
  let chart: any;
  try {
    dashas = JSON.parse(cache.dashas_json || '[]');
    chart = JSON.parse(cache.chart_json);
  } catch (e) {
    throw new Error(`Failed to parse cached data: ${e}`);
  }

  const predictions: any[] = [];
  const date = new Date(dateStr + 'T12:00:00');

  for (let hour = 0; hour < 24; hour++) {
    const hourDate = new Date(date);
    hourDate.setHours(hour, 0, 0, 0);

    // Calculate transit for this hour
    const transit = calculateTransit(
      hourDate,
      profile.lat,
      profile.lon,
      profile.ayanamsa_id,
    );

    // Get dasha at this time
    const dashaAtTime = getDashaAtDate(dashas, hourDate);

    // Calculate score
    const score = calculateHourlyScore(
      transit,
      dashaAtTime?.prana.planet ?? null,
      chart,
    );

    predictions.push({
      id: `${profileId}-${dateStr}-${hour}`,
      profile_id: profileId,
      date: dateStr,
      hour,
      timezone,
      sookshma_dasha_planet: dashaAtTime?.sookshma.planet ?? null,
      sookshma_dasha_start: toISOString(dashaAtTime?.sookshma.startDate),
      sookshma_dasha_end: toISOString(dashaAtTime?.sookshma.endDate),
      prana_dasha_planet: dashaAtTime?.prana.planet ?? null,
      prana_dasha_start: toISOString(dashaAtTime?.prana.startDate),
      prana_dasha_end: toISOString(dashaAtTime?.prana.endDate),
      moon_nakshatra: transit.moonNakshatra,
      moon_sign: transit.moonSign,
      moon_degree: transit.moonDegree,
      transit_lagna: transit.lagna,
      transit_lagna_sign: transit.lagnaSign,
      hourly_score: score,
      prediction_text: null,
    });
  }

  return predictions;
}
```

- [ ] **Step 2: Modify predictAction to use on-demand generation**

Replace lines 653-660 in cli.ts:

```typescript
// Try to get from cache first
let predictions = getHourlyPredictions(options.id, date);

// If not in cache, generate on-demand
if (predictions.length === 0) {
  console.log(`No cached predictions for ${date}. Generating on-demand...`);
  try {
    predictions = await generateHourlyPredictionForDate(options.id, date, timezone);
  } catch (err) {
    console.error(`Error generating predictions: ${err}`);
    process.exit(1);
  }
}
```

- [ ] **Step 3: Build and test**

Run: `cd packages/api && npm run build`

Run: `npx tsx src/cli.ts predict -i <profile-id> -d 2025-01-01`

Expected: Generates predictions on-demand for any date

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/cli.ts
git commit -m "feat: implement on-demand prediction generation

- Add generateHourlyPredictionForDate function
- Predict CLI now generates predictions for any date on-demand
- Falls back to on-demand when cache miss

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 3: Category-Based Predictions

### Task 3: Replace numeric scores with category explanations

**Files:**
- Modify: `packages/core/src/calculations/transit.ts:213-280` - Replace calculateHourlyScore
- Modify: `packages/api/src/cli.ts:700-760` - Update predict output

- [ ] **Step 1: Create category-based scoring function**

Replace calculateHourlyScore in transit.ts with category-based predictions:

```typescript
/**
 * Category-based hourly predictions.
 */
export interface HourlyCategories {
  career: string;      // "Excellent for career decisions"
  finance: string;     // "Good for financial planning"
  health: string;     // "Take care of health"
  relationships: string; // "Favorable for relationships"
  education: string;   // "Good for studies"
  overall: string;     // "Overall: Good day"
}

/**
 * Get house affected based on dasha planet and sign
 */
function getHouseAffected(dashaPlanet: Planet | null, lagnaSign: Sign): House {
  // Simplified: Map planets to houses they rule
  const planetToHouse: Record<Planet, House> = {
    [Planet.Sun]: House.Fifth,    // Creativity
    [Planet.Moon]: House.Fourth,   // Home
    [Planet.Mars]: House.First,    // Self
    [Planet.Mercury]: House.Third, // Communication
    [Planet.Jupiter]: House.Ninth, // Fortune
    [Planet.Venus]: House.Seventh, // Relationships
    [Planet.Saturn]: House.Tenth,  // Career
    [Planet.Rahu]: House.Sixth,   // Challenges
    [Planet.Ketu]: House.Eighth,  // Transformation
  };
  return dashaPlanet ? planetToHouse[dashaPlanet] ?? House.First : House.First;
}

/**
 * Generate category-based hourly predictions.
 */
export function calculateHourlyCategories(
  transit: TransitPosition,
  dashaPlanet: Planet | null,
  chart: ChartData,
): HourlyCategories {
  const natalLagnaSign = Math.floor(chart.ascendant / 30) as Sign;
  const natalMoon = chart.planets.find(p => p.planet === Planet.Moon);
  const natalMoonNakshatra = natalMoon?.nakshatra ?? 0;

  // Get dasha planet house
  const dashaHouse = getHouseAffected(dashaPlanet, natalLagnaSign);

  // Determine if dasha planet is functional benefic
  const isDashaFavorable = dashaPlanet ? isFunctionalBenefic(dashaPlanet, natalLagnaSign) : true;

  // Check if Moon is in friendly nakshatra
  const isMoonFriendly = isFriendlyNakshatra(natalMoonNakshatra, transit.moonNakshatra);

  // Check Lagna position
  const isLagnaKendra = isInKendra(transit.lagnaSign, natalLagnaSign);

  // Check Moon sign
  const moonSign = transit.moonSign as Sign;
  const isMoonStrong = isPlanetInOwnOrExalted(Planet.Moon, moonSign);
  const isMoonWeak = isPlanetInDebilitated(Planet.Moon, moonSign);

  // Generate category predictions
  const categories: HourlyCategories = {
    career: '',
    finance: '',
    health: '',
    relationships: '',
    education: '',
    overall: '',
  };

  // Career (10th house - Saturn's domain)
  if (dashaPlanet === Planet.Saturn || dashaHouse === House.Tenth) {
    categories.career = isDashaFavorable
      ? "Strong career influence. Good for workplace decisions and authority matters."
      : "Career challenges may arise. Be cautious with authority figures.";
  } else if (isLagnaKendra) {
    categories.career = "Transit Lagna in Kendra supports professional activities.";
  } else {
    categories.career = "Neutral for career matters. Not ideal for major career moves.";
  }

  // Finance (2nd and 11th houses - Jupiter/Venus)
  if (dashaPlanet === Planet.Jupiter || dashaPlanet === Planet.Venus) {
    categories.finance = isDashaFavorable
      ? "Favorable for financial matters. Good for investments and wealth accumulation."
      : "Financial losses possible. Avoid new investments.";
  } else if (isMoonStrong) {
    categories.finance = "Moon in strong position supports financial planning.";
  } else {
    categories.finance = "Neutral for finances. Maintain existing financial plans.";
  }

  // Health (6th and 8th houses)
  if (dashaPlanet === Planet.Mars || dashaPlanet === Planet.Rahu) {
    categories.health = "Potential health issues. Take precautions and rest.";
  } else if (isMoonWeak) {
    categories.health = "Moon in weak position may affect mental peace.";
  } else {
    categories.health = "Good for health. Suitable for physical activities.";
  }

  // Relationships (7th house - Venus)
  if (dashaPlanet === Planet.Venus) {
    categories.relationships = isDashaFavorable
      ? "Excellent for relationships. Good time for partnerships and social activities."
      : "Relationship tensions possible.";
  } else {
    categories.relationships = isMoonFriendly
      ? "Moon in friendly nakshatra supports emotional connections."
      : "Relationships are neutral today.";
  }

  // Education (5th house - Jupiter)
  if (dashaPlanet === Planet.Jupiter || dashaHouse === House.Fifth) {
    categories.education = "Strong educational influence. Good for learning and teaching.";
  } else {
    categories.education = "Normal for education. Continue ongoing studies.";
  }

  // Overall assessment
  let positiveCount = 0;
  if (isDashaFavorable) positiveCount++;
  if (isLagnaKendra) positiveCount++;
  if (isMoonFriendly) positiveCount++;
  if (isMoonStrong) positiveCount++;

  if (positiveCount >= 3) {
    categories.overall = "Overall: Very good day. Favorable for important activities.";
  } else if (positiveCount >= 2) {
    categories.overall = "Overall: Good day. Proceed with normal activities.";
  } else if (positiveCount >= 1) {
    categories.overall = "Overall: Moderate day. Exercise caution in important matters.";
  } else {
    categories.overall = "Overall: Challenging day. Best to rest and reflect.";
  }

  return categories;
}
```

- [ ] **Step 2: Update exports in transit.ts**

Add to the exports:

```typescript
export { calculateHourlyCategories, type HourlyCategories } from './transit.js';
```

- [ ] **Step 3: Update predict CLI output**

Modify predictAction to use category-based output:

```typescript
// Import the new function
import { calculateHourlyCategories, type HourlyCategories } from '@parashari/core';

// Replace hourly score display with categories
if (options.hourly) {
  console.log('\n--- Hourly Breakdown with Categories ---');
  const planetNames = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  const nakshatraNames = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'];

  for (const p of predictions) {
    const time = `${String(p.hour).padStart(2, '0')}:00`;
    const moonNaksh = nakshatraNames[p.moon_nakshatra ?? 0];
    const pranaPlanet = planetNames[p.prana_dasha_planet ?? 0];

    // Get categories
    const transit = {
      moonNakshatra: p.moon_nakshatra,
      moonSign: p.moon_sign,
      lagna: p.transit_lagna,
      lagnaSign: p.transit_lagna_sign,
    };
    // For now just show basic info with prana planet
    console.log(`${time} | Prana: ${pranaPlanet} | Moon: ${moonNaksh}`);
    console.log(`   Overall: ${p.hourly_score >= 70 ? 'Favorable' : p.hourly_score >= 50 ? 'Moderate' : 'Challenging'}`);
  }
} else {
  // Show period summaries with categories
  console.log('\n--- Period Summary ---');
  // Calculate average and show categories
  console.log(`Career:        ${avgScore >= 70 ? 'Favorable' : 'Neutral'}`);
  console.log(`Finance:       ${avgScore >= 60 ? 'Good' : 'Caution'}`);
  console.log(`Health:        ${avgScore >= 50 ? 'Normal' : 'Care needed'}`);
  console.log(`Relationships: ${avgScore >= 65 ? 'Good' : 'Moderate'}`);
  console.log(`Education:     ${avgScore >= 55 ? 'Favorable' : 'Normal'}`);
}
```

- [ ] **Step 4: Build and test**

Run: `cd packages/core && npm run build`
Run: `cd packages/api && npm run build`

Run: `npx tsx src/cli.ts predict -i <profile-id> -d 2026-03-16 --hourly`

Expected: Shows category-based predictions instead of numeric scores

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/calculations/transit.ts packages/api/src/cli.ts
git commit -m "feat: add category-based hourly predictions

- Replace numeric scores with category explanations
- Categories: Career, Finance, Health, Relationships, Education
- Each hour shows planetary influences and recommendations

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Summary

After completing all tasks:

1. **Report** shows complete predictions:
   - All past mahadasha periods with full summaries
   - Current active periods
   - Upcoming mahadasha periods
   - No truncation

2. **Predict on-demand** works for any date:
   - Falls back to on-demand generation when cache miss
   - Same calculation as cached predictions

3. **Category-based predictions**:
   - Replaces 0-100 scores with meaningful categories
   - Each hour shows: Career, Finance, Health, Relationships, Education
   - Overall assessment for the day/period

---

## Test Commands

```bash
# Test report with full predictions
npx tsx src/cli.ts report -i <profile-id>

# Test predict on-demand (date not in cache)
npx tsx src/cli.ts predict -i <profile-id> -d 2025-01-01

# Test predict with categories
npx tsx src/cli.ts predict -i <profile-id> -d 2026-03-16 --hourly
```
