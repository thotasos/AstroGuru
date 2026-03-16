# Daily and Hourly Predictions CLI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create CLI commands for daily/hourly predictions with 30-day pre-cached data.

**Architecture:**
- Two-layer system: pre-cached hourly predictions + on-demand fallback
- Store hourly predictions in new `hourly_predictions` table
- CLI commands: `predict` (get predictions) and `predict-cache` (generate cache)

**Tech Stack:** TypeScript, better-sqlite3, @parashari/core, commander

---

## Chunk 1: Database Schema & Types

### Task 1: Add hourly_predictions table

**Files:**
- Modify: `database/schema.sql`
- Test: Manual verify table creation

- [ ] **Step 1: Add hourly_predictions table to schema**

Run: Edit `database/schema.sql` - add before the closing:

```sql
-- Hourly predictions cache (30-day rolling window)
CREATE TABLE IF NOT EXISTS hourly_predictions (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  date TEXT NOT NULL,           -- YYYY-MM-DD
  hour INTEGER NOT NULL,        -- 0-23
  timezone TEXT NOT NULL,       -- e.g., America/New_York

  -- Sookshma Dasha (Level 4 - days)
  sookshma_dasha_planet INTEGER,
  sookshma_dasha_start TEXT,
  sookshma_dasha_end TEXT,

  -- Prana Dasha (Level 5 - hours)
  prana_dasha_planet INTEGER,
  prana_dasha_start TEXT,
  prana_dasha_end TEXT,

  -- Transit positions
  moon_nakshatra INTEGER,
  moon_sign INTEGER,
  moon_degree REAL,
  transit_lagna REAL,
  transit_lagna_sign INTEGER,

  -- Prediction data
  hourly_score INTEGER,
  prediction_text TEXT,

  created_at TEXT NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_hourly_profile_date
  ON hourly_predictions(profile_id, date);
```

- [ ] **Step 2: Add migration to run**

Run: `cd packages/api && npx tsx src/database/migrate.ts`

- [ ] **Step 3: Commit**

```bash
git add database/schema.sql
git commit -m "feat: add hourly_predictions table for 30-day cache

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Add HourlyPrediction types

**Files:**
- Modify: `packages/api/src/database/cache.ts`

- [ ] **Step 1: Add HourlyPrediction type**

Run: Edit `packages/api/src/database/cache.ts` - add after CachedCalculation interface:

```typescript
/**
 * Hourly prediction for a specific profile and date.
 */
export interface HourlyPrediction {
  id: string;
  profile_id: string;
  date: string;           // YYYY-MM-DD
  hour: number;           // 0-23
  timezone: string;

  // Sookshma Dasha (Level 4)
  sookshma_dasha_planet: number | null;
  sookshma_dasha_start: string | null;
  sookshma_dasha_end: string | null;

  // Prana Dasha (Level 5)
  prana_dasha_planet: number | null;
  prana_dasha_start: string | null;
  prana_dasha_end: string | null;

  // Transit positions
  moon_nakshatra: number | null;
  moon_sign: number | null;
  moon_degree: number | null;
  transit_lagna: number | null;
  transit_lagna_sign: number | null;

  // Prediction
  hourly_score: number | null;
  prediction_text: string | null;

  created_at: string;
}
```

- [ ] **Step 2: Add row mapper**

Run: Edit `packages/api/src/database/cache.ts` - add after `rowToCache`:

```typescript
function rowToHourlyPrediction(row: Record<string, unknown>): HourlyPrediction {
  return {
    id: row['id'] as string,
    profile_id: row['profile_id'] as string,
    date: row['date'] as string,
    hour: row['hour'] as number,
    timezone: row['timezone'] as string,
    sookshma_dasha_planet: row['sookshma_dasha_planet'] as number | null,
    sookshma_dasha_start: row['sookshma_dasha_start'] as string | null,
    sookshma_dasha_end: row['sookshma_dasha_end'] as string | null,
    prana_dasha_planet: row['prana_dasha_planet'] as number | null,
    prana_dasha_start: row['prana_dasha_start'] as string | null,
    prana_dasha_end: row['prana_dasha_end'] as string | null,
    moon_nakshatra: row['moon_nakshatra'] as number | null,
    moon_sign: row['moon_sign'] as number | null,
    moon_degree: row['moon_degree'] as number | null,
    transit_lagna: row['transit_lagna'] as number | null,
    transit_lagna_sign: row['transit_lagna_sign'] as number | null,
    hourly_score: row['hourly_score'] as number | null,
    prediction_text: row['prediction_text'] as string | null,
    created_at: row['created_at'] as string,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/database/cache.ts
git commit -m "feat: add HourlyPrediction type and row mapper

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 2: Core Prediction Functions

### Task 3: Add hourly prediction calculation to core

**Files:**
- Modify: `packages/core/src/calculations/dashas.ts`
- Modify: `packages/core/src/index.ts`
- Test: Run debug script to verify

- [ ] **Step 1: Add getDashaAtDate function**

Run: Edit `packages/core/src/calculations/dashas.ts` - add at end:

```typescript
/**
 * Get the specific dasha period (all 5 levels) for a given date/time.
 */
export function getDashaAtDate(
  dashas: DashaPeriod[],
  date: Date,
): DashaPeriod | undefined {
  const ts = date.getTime();
  return dashas.find(
    (d) =>
      d.prana.startDate.getTime() <= ts &&
      ts < d.prana.endDate.getTime(),
  );
}
```

- [ ] **Step 2: Add transit calculation functions**

Run: Create new file `packages/core/src/calculations/transit.ts`:

```typescript
import { getJulianDay, getPlanetPosition, getAscendant } from '../ephemeris/swissEph.js';
import { getNakshatra } from './dashas.js';
import { Planet, Sign, type ChartData } from '../types/index.js';

/**
 * Calculate transit positions for a specific date, time, and location.
 */
export interface TransitPosition {
  moonLongitude: number;
  moonNakshatra: number;
  moonSign: number;
  moonDegree: number;
  lagna: number;
  lagnaSign: number;
}

export function calculateTransit(
  date: Date,
  latitude: number,
  longitude: number,
  ayanamsaId: number = 1,
): TransitPosition {
  const jd = getJulianDay(date);
  const moonPos = getPlanetPosition(jd, Planet.Moon, latitude, longitude);
  const lagna = getAscendant(jd, latitude, longitude);

  const moonNakshatraInfo = getNakshatra(moonPos.sidereal);
  const moonSign = Math.floor(moonPos.sidereal / 30);
  const moonDegree = moonPos.sidereal % 30;

  const lagnaSign = Math.floor(lagna / 30);

  return {
    moonLongitude: moonPos.sidereal,
    moonNakshatra: moonNakshatraInfo.nakshatra,
    moonSign,
    moonDegree,
    lagna,
    lagnaSign,
  };
}

/**
 * Calculate hourly score (0-100) based on transit and natal chart.
 */
export function calculateHourlyScore(
  transit: TransitPosition,
  dashaPlanet: Planet | null,
  chart: ChartData,
): number {
  let score = 50; // Base score

  // TODO: Implement scoring logic:
  // - Prana Dasha lord is functional benefic? (+20)
  // - Transit Lagna in Kendra from natal Lagna? (+20)
  // - Moon in friendly Nakshatra from birth star? (+20)
  // - Moon in own/exalted sign? (+20)
  // - No malefic aspects? (+20)

  return Math.min(100, Math.max(0, score));
}
```

- [ ] **Step 3: Export new functions**

Run: Edit `packages/core/src/index.ts` - add exports:

```typescript
export { getDashaAtDate } from './calculations/dashas.js';
export { calculateTransit, calculateHourlyScore, type TransitPosition } from './calculations/transit.js';
```

- [ ] **Step 4: Build and verify**

Run: `cd packages/core && npm run build`

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/calculations/dashas.ts packages/core/src/calculations/transit.ts packages/core/src/index.ts
git commit -m "feat: add transit calculation functions for hourly predictions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 3: Database Operations

### Task 4: Add hourly prediction CRUD functions

**Files:**
- Modify: `packages/api/src/database/cache.ts`
- Test: Verify functions work

- [ ] **Step 1: Add saveHourlyPredictions**

Run: Edit `packages/api/src/database/cache.ts` - add after saveCachedCalculation:

```typescript
/**
 * Save multiple hourly predictions for a profile.
 */
export function saveHourlyPredictions(
  predictions: Omit<HourlyPrediction, 'created_at'>[],
): void {
  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO hourly_predictions
      (id, profile_id, date, hour, timezone,
       sookshma_dasha_planet, sookshma_dasha_start, sookshma_dasha_end,
       prana_dasha_planet, prana_dasha_start, prana_dasha_end,
       moon_nakshatra, moon_sign, moon_degree,
       transit_lagna, transit_lagna_sign,
       hourly_score, prediction_text, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((preds: typeof predictions) => {
    for (const p of preds) {
      stmt.run(
        p.id, p.profile_id, p.date, p.hour, p.timezone,
        p.sookshma_dasha_planet, p.sookshma_dasha_start, p.sookshma_dasha_end,
        p.prana_dasha_planet, p.prana_dasha_start, p.prana_dasha_end,
        p.moon_nakshatra, p.moon_sign, p.moon_degree,
        p.transit_lagna, p.transit_lagna_sign,
        p.hourly_score, p.prediction_text, now,
      );
    }
  });

  insertMany(predictions);
}
```

- [ ] **Step 2: Add getHourlyPredictions**

Run: Edit `packages/api/src/database/cache.ts` - add:

```typescript
/**
 * Get hourly predictions for a profile on a specific date.
 */
export function getHourlyPredictions(
  profileId: string,
  date: string,
): HourlyPrediction[] {
  const db = getDb();
  const rows = db
    .prepare<[string, string], Record<string, unknown>>(
      'SELECT * FROM hourly_predictions WHERE profile_id = ? AND date = ? ORDER BY hour ASC',
    )
    .all(profileId, date);

  return rows.map(rowToHourlyPrediction);
}
```

- [ ] **Step 3: Add deleteOldPredictions**

Run: Edit `packages/api/src/database/cache.ts` - add:

```typescript
/**
 * Delete hourly predictions older than today.
 */
export function deleteOldPredictions(): number {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0]!;
  const result = db.prepare<[string]>(
    'DELETE FROM hourly_predictions WHERE date < ?',
  ).run(today);
  return result.changes;
}
```

- [ ] **Step 4: Add getProfilesForCache**

Run: Edit `packages/api/src/database/cache.ts` - add:

```typescript
/**
 * Get all profiles that are ready for prediction caching.
 */
export function getReadyProfiles(): Pick<Profile, 'id' | 'name' | 'dob_utc' | 'lat' | 'lon' | 'timezone'>[] {
  const db = getDb();
  const rows = db
    .prepare<[string], Record<string, unknown>>(
      "SELECT id, name, dob_utc, lat, lon, timezone FROM profiles WHERE status = 'ready'",
    )
    .all('ready');

  return rows.map(row => ({
    id: row['id'] as string,
    name: row['name'] as string,
    dob_utc: row['dob_utc'] as string,
    lat: row['lat'] as number,
    lon: row['lon'] as number,
    timezone: row['timezone'] as string,
  }));
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/database/cache.ts
git commit -m "feat: add hourly prediction CRUD functions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 4: predict-cache CLI Command

### Task 5: Implement predict-cache command

**Files:**
- Modify: `packages/api/src/cli.ts`
- Modify: `packages/api/src/jobs/processor.ts`
- Test: Run command and verify database

- [ ] **Step 1: Add predict-cache command**

Run: Edit `packages/api/src/cli.ts` - add imports:

```typescript
import { saveHourlyPredictions, getHourlyPredictions, deleteOldPredictions, getReadyProfiles } from './database/cache.js';
import { getProfile } from './database/profiles.js';
import { calculateTransit, calculateHourlyScore, getDashaAtDate, TransitPosition } from '@parashari/core';
import { getCachedCalculation } from './database/cache.js';
```

- [ ] **Step 2: Add generateHourlyForProfile function**

Run: Edit `packages/api/src/cli.ts` - add before the program definition:

```typescript
async function generateHourlyCacheForProfile(
  profileId: string,
  timezone: string,
  force: boolean = false
): Promise<number> {
  const profile = getProfile(profileId);
  if (!profile) {
    console.error(`Profile not found: ${profileId}`);
    return 0;
  }

  const cache = getCachedCalculation(profileId);
  if (!cache) {
    console.error(`No calculations found for profile ${profileId}. Run process first.`);
    return 0;
  }

  // Parse cached data
  const dashas = JSON.parse(cache.dashas_json || '[]');
  const chart = JSON.parse(cache.chart_json);

  // Generate for next 30 days
  const predictions: any[] = [];
  const now = new Date();
  const today = now.toISOString().split('T')[0]!;

  for (let day = 0; day < 30; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split('T')[0]!;

    // Get timezone-adjusted date
    const { default: dateFnsTz } = await import('date-fns-tz');
    const localDate = dateFnsTz.toDate(dateStr + 'T12:00:00', timezone);

    for (let hour = 0; hour < 24; hour++) {
      const hourDate = new Date(localDate);
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
        sookshma_dasha_start: dashaAtTime?.sookshma.startDate.toISOString() ?? null,
        sookshma_dasha_end: dashaAtTime?.sookshma.endDate.toISOString() ?? null,
        prana_dasha_planet: dashaAtTime?.prana.planet ?? null,
        prana_dasha_start: dashaAtTime?.prana.startDate.toISOString() ?? null,
        prana_dasha_end: dashaAtTime?.prana.endDate.toISOString() ?? null,
        moon_nakshatra: transit.moonNakshatra,
        moon_sign: transit.moonSign,
        moon_degree: transit.moonDegree,
        transit_lagna: transit.lagna,
        transit_lagna_sign: transit.lagnaSign,
        hourly_score: score,
        prediction_text: null, // TODO: Generate text
      });
    }
  }

  // Save to database
  saveHourlyPredictions(predictions);
  console.log(`Generated ${predictions.length} hourly predictions for ${profile.name}`);
  return predictions.length;
}
```

- [ ] **Step 3: Add predict-cache action**

Run: Edit `packages/api/src/cli.ts` - add:

```typescript
interface PredictCacheOptions {
  id?: string;
  timezone?: string;
  force?: boolean;
}

async function predictCacheAction(options: PredictCacheOptions) {
  runMigrations();

  // Clean old data first
  console.log('Cleaning old predictions...');
  const deleted = deleteOldPredictions();
  console.log(`Deleted ${deleted} old prediction records.`);

  const profiles = options.id
    ? [getProfile(options.id)!].filter(Boolean)
    : getReadyProfiles();

  console.log(`\nGenerating cache for ${profiles.length} profile(s)...\n`);

  let totalGenerated = 0;
  for (const profile of profiles) {
    const timezone = options.timezone || profile.timezone;
    const count = await generateHourlyCacheForProfile(profile.id, timezone, options.force ?? false);
    totalGenerated += count;
  }

  console.log(`\nTotal hourly predictions generated: ${totalGenerated}`);
}
```

- [ ] **Step 4: Register predict-cache command**

Run: Edit `packages/api/src/cli.ts` - add after report command:

```typescript
program
  .command('predict-cache')
  .description('Pre-generate 30-day hourly prediction cache (for cron)')
  .option('-i, --id <id>', 'Specific profile ID (default: all ready profiles)')
  .option('-t, --timezone <tz>', 'Timezone for predictions')
  .option('-f, --force', 'Force regeneration even if cache exists')
  .action(predictCacheAction);
```

- [ ] **Step 5: Test predict-cache command**

Run: `npx tsx src/cli.ts predict-cache -i <profile-id>`

Expected: Generates 720 hourly predictions (30 days × 24 hours)

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/cli.ts packages/api/src/jobs/processor.ts
git commit -m "feat: add predict-cache CLI command

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 5: predict CLI Command

### Task 6: Implement predict command

**Files:**
- Modify: `packages/api/src/cli.ts`
- Test: Run command and verify output

- [ ] **Step 1: Add predict action**

Run: Edit `packages/api/src/cli.ts` - add before program definition:

```typescript
interface PredictOptions {
  id: string;
  date: string;
  timezone?: string;
  hourly?: boolean;
  json?: boolean;
}

function predictAction(options: PredictOptions) {
  runMigrations();

  const profile = getProfile(options.id);
  if (!profile) {
    console.error(`Profile not found: ${options.id}`);
    process.exit(1);
  }

  const timezone = options.timezone || profile.timezone;
  const date = options.date;

  // Try to get from cache first
  let predictions = getHourlyPredictions(options.id, date);

  if (predictions.length === 0) {
    console.log(`No cached predictions for ${date}. Generating on-demand...`);
    // TODO: Implement on-demand generation
    console.error('On-demand generation not yet implemented. Run predict-cache first.');
    process.exit(1);
  }

  if (options.json) {
    // JSON output
    console.log(JSON.stringify({
      profileId: profile.id,
      profileName: profile.name,
      date,
      timezone,
      predictions: options.hourly ? predictions : predictions.filter((_, i) => i % 6 === 0),
    }, null, 2));
    return;
  }

  // Plain text output
  console.log('\n' + '='.repeat(70));
  console.log(`DAILY PREDICTION: ${date}`);
  console.log(`Profile: ${profile.name}`);
  console.log(`Location: ${profile.place_name || 'Unknown'} (${timezone})`);
  console.log('='.repeat(70));

  // Calculate overall score
  const scores = predictions.map(p => p.hourly_score ?? 50);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  console.log(`\nOverall Day Score: ${avgScore.toFixed(0)}/100`);

  if (options.hourly) {
    console.log('\n--- Hourly Breakdown ---');
    const planetNames = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
    const nakshatraNames = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'];
    const signNames = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

    for (const p of predictions) {
      const time = `${String(p.hour).padStart(2, '0')}:00`;
      const score = p.hourly_score ?? 50;
      const moonNaksh = nakshatraNames[p.moon_nakshatra ?? 0];
      const lagnaSign = signNames[p.transit_lagna_sign ?? 0];
      const pranaPlanet = planetNames[p.prana_dasha_planet ?? 0];

      console.log(`${time} | ${score.toString().padStart(3)} | Moon in ${moonNaksh}, Lagna ${lagnaSign}, Prana ${pranaPlanet}`);
    }
  } else {
    // Show 4 periods (morning, afternoon, evening, night)
    console.log('\n--- Period Summary ---');
    const periods = [
      { name: 'Morning', hours: [6, 7, 8, 9, 10, 11] },
      { name: 'Afternoon', hours: [12, 13, 14, 15, 16, 17] },
      { name: 'Evening', hours: [18, 19, 20, 21, 22, 23] },
      { name: 'Night', hours: [0, 1, 2, 3, 4, 5] },
    ];

    for (const period of periods) {
      const periodScores = period.hours.map(h => predictions[h]?.hourly_score ?? 50);
      const avg = periodScores.reduce((a, b) => a + b, 0) / periodScores.length;
      console.log(`${period.name.padEnd(10)}: ${avg.toFixed(0)}/100`);
    }
  }

  console.log('\n' + '='.repeat(70) + '\n');
}
```

- [ ] **Step 2: Register predict command**

Run: Edit `packages/api/src/cli.ts` - add after predict-cache:

```typescript
program
  .command('predict')
  .description('Get daily/hourly predictions for a profile')
  .requiredOption('-i, --id <id>', 'Profile ID')
  .requiredOption('-d, --date <date>', 'Date (YYYY-MM-DD)')
  .option('-t, --timezone <tz>', 'Timezone (default: profile birth timezone)')
  .option('-h, --hourly', 'Show hourly breakdown')
  .option('--json', 'Output JSON')
  .action(predictAction);
```

- [ ] **Step 3: Test predict command**

Run: `npx tsx src/cli.ts predict -i <profile-id> -d 2026-03-15`

Expected: Shows daily prediction for the date

Run: `npx tsx src/cli.ts predict -i <profile-id> -d 2026-03-15 --hourly`

Expected: Shows hourly breakdown

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/cli.ts
git commit -m "feat: add predict CLI command for daily/hourly predictions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Summary

After completing all tasks:

1. **predict-cache** command generates 30-day hourly predictions:
   ```bash
   npx tsx src/cli.ts predict-cache
   npx tsx src/cli.ts predict-cache -i <profile-id> --timezone Asia/Kolkata
   ```

2. **predict** command retrieves predictions:
   ```bash
   npx tsx src/cli.ts predict -i <profile-id> -d 2026-03-15
   npx tsx src/cli.ts predict -i <profile-id> -d 2026-03-15 --hourly --json
   ```

3. Auto-cleanup removes data older than today

**Next improvements (out of scope):**
- Generate plain English prediction text for each hour
- Implement full scoring logic (functional benefics, Kendras, etc.)
- Add on-demand generation for dates beyond 30-day cache
- Support multi-location predictions
