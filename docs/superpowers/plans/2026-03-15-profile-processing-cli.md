# Profile Processing CLI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a CLI tool that accepts profile data, stores it with "new" status, triggers async calculation processing, and marks profile as "ready" when complete.

**Architecture:**
- Add `status` column to profiles table (new, processing, ready, error)
- Create CLI entry point at `packages/api/src/cli.ts`
- Create async job processor for calculations
- Store predictions in calculations_cache or new table
- Add key_predictions table for summarized predictions

**Tech Stack:** TypeScript, better-sqlite3, commander (CLI), node:child_process for async jobs

---

## Chunk 1: Database Schema Updates

### Task 1: Add status column to profiles

**Files:**
- Modify: `database/schema.sql`
- Modify: `packages/api/src/database/profiles.ts`

- [ ] **Step 1: Add status column to schema**

Run: Edit `database/schema.sql` to add after `updated_at`:

```sql
-- Profile processing status
CREATE TABLE IF NOT EXISTS profile_status (
  id TEXT PRIMARY KEY,          -- 'new', 'processing', 'ready', 'error'
  name TEXT NOT NULL,
  description TEXT
);

-- Add status to profiles
ALTER TABLE profiles ADD COLUMN status TEXT NOT NULL DEFAULT 'new';
```

- [ ] **Step 2: Add status to Profile type**

Run: Edit `packages/api/src/database/profiles.ts` - add `status` field to Profile interface:

```typescript
export interface Profile {
  // ... existing fields
  status: 'new' | 'processing' | 'ready' | 'error';
}
```

- [ ] **Step 3: Add updateStatus function**

Run: Edit `packages/api/src/database/profiles.ts` - add:

```typescript
export function updateProfileStatus(
  id: string,
  status: 'new' | 'processing' | 'ready' | 'error'
): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare<[string, string]>('UPDATE profiles SET status = ?, updated_at = ? WHERE id = ?')
    .run(status, now, id);
}
```

- [ ] **Step 4: Run migration**

Run: `npm run db:migrate`

- [ ] **Step 5: Commit**

```bash
git add database/schema.sql packages/api/src/database/profiles.ts
git commit -m "feat: add profile status column and updateStatus function"
```

---

### Task 2: Add predictions storage

**Files:**
- Modify: `database/schema.sql`
- Modify: `packages/api/src/database/cache.ts`

- [ ] **Step 1: Add predictions_json to cache table**

Run: Edit `database/schema.sql` - add to calculations_cache:

```sql
ALTER TABLE calculations_cache ADD COLUMN predictions_json TEXT;
```

- [ ] **Step 2: Update CachedCalculation type**

Run: Edit `packages/api/src/database/cache.ts` - add predictions_json:

```typescript
export interface CachedCalculation {
  // ... existing fields
  predictions_json: string | null;
}
```

- [ ] **Step 3: Commit**

```bash
git add database/schema.sql packages/api/src/database/cache.ts
git commit -m "feat: add predictions storage to cache table"
```

---

## Chunk 2: CLI Implementation

### Task 3: Create CLI entry point

**Files:**
- Create: `packages/api/src/cli.ts`
- Modify: `packages/api/package.json`

- [ ] **Step 1: Create CLI with commander**

Run: Write `packages/api/src/cli.ts`:

```typescript
#!/usr/bin/env node

import { Command } from 'commander';
import { createProfile } from './database/profiles.js';
import { getDb } from './database/db.js';
import { runMigrations } from './database/migrate.js';

const PREDEFINED_PLACES: Record<string, { lat: number; lon: number; timezone: string }> = {
  'nalgonda-india': { lat: 17.0500, lon: 79.2700, timezone: 'Asia/Kolkata' },
  'houston-texas': { lat: 29.7604, lon: -95.3698, timezone: 'America/Chicago' },
  'sunnyvale-california': { lat: 37.3688, lon: -122.0363, timezone: 'America/Los_Angeles' },
};

interface CreateOptions {
  name: string;
  dob: string;
  time: string;
  place: string;
}

async function createProfileAction(options: CreateOptions) {
  // Run migrations first
  runMigrations();

  const placeKey = options.place.toLowerCase().replace(/\s+/g, '-');
  const place = PREDEFINED_PLACES[placeKey];

  if (!place) {
    console.error(`Error: Unknown place "${options.place}"`);
    console.log('Available places:');
    Object.keys(PREDEFINED_PLACES).forEach(p => console.log(`  - ${p}`));
    process.exit(1);
  }

  // Parse date and time
  const dobDate = new Date(options.dob);
  if (isNaN(dobDate.getTime())) {
    console.error('Error: Invalid date format. Use YYYY-MM-DD');
    process.exit(1);
  }

  const [hours, minutes] = options.time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    console.error('Error: Invalid time format. Use HH:MM');
    process.exit(1);
  }

  dobDate.setHours(hours, minutes, 0, 0);

  // Calculate UTC offset
  const offsetMinutes = -dobDate.getTimezoneOffset();
  const offsetHours = offsetMinutes / 60;

  const profile = createProfile({
    name: options.name,
    dob_utc: dobDate.toISOString(),
    lat: place.lat,
    lon: place.lon,
    timezone: place.timezone,
    utc_offset_hours: offsetHours,
    place_name: options.place,
    ayanamsa_id: 1, // Lahiri default
  });

  console.log(`Created profile: ${profile.id}`);
  console.log(`  Name: ${profile.name}`);
  console.log(`  DOB: ${profile.dob_utc}`);
  console.log(`  Place: ${profile.place_name}`);
  console.log(`  Status: ${profile.status}`);
  console.log(`\nTriggering async processing...`);

  // TODO: Trigger async job (Task 4)
}

const program = new Command();

program
  .name('parashari')
  .description('Parashari Precision CLI')
  .version('1.0.0');

program
  .command('create')
  .description('Create a new profile')
  .requiredOption('-n, --name <name>', 'Name of the person')
  .requiredOption('-d, --dob <date>', 'Date of birth (YYYY-MM-DD)')
  .requiredOption('-t, --time <time>', 'Time of birth (HH:MM)')
  .requiredOption('-p, --place <place>', 'Place of birth (predefined: Nalgonda-India, Houston-Texas, Sunnyvale-California)')
  .action(createProfileAction);

program.parse();
```

- [ ] **Step 2: Update package.json with bin**

Run: Edit `packages/api/package.json`:

```json
{
  "bin": {
    "parashari": "./src/cli.ts"
  }
}
```

- [ ] **Step 3: Install commander**

Run: `cd packages/api && npm install commander`

- [ ] **Step 4: Test CLI**

Run: `cd packages/api && npx tsx src/cli.ts create -n "Test User" -d "1990-01-15" -t "10:30" -p "Nalgonda-India"`

Expected: Profile created with status "new"

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/cli.ts packages/api/package.json
git commit -m "feat: add CLI for profile creation"
```

---

## Chunk 3: Async Job Processor

### Task 4: Create async calculation processor

**Files:**
- Create: `packages/api/src/jobs/processor.ts`
- Modify: `packages/api/src/cli.ts`

- [ ] **Step 1: Create job processor module**

Run: Create `packages/api/src/jobs/processor.ts`:

```typescript
/**
 * processor.ts — Async job processor for profile calculations
 *
 * Processes profiles with status 'new', computes all astrological data,
 * and updates status to 'ready' on completion.
 */

import { getDb } from '../database/db.js';
import { getProfile, updateProfileStatus } from '../database/profiles.js';
import { saveCachedCalculation } from '../database/cache.js';
import { AstrologyEngine, Ayanamsa, type BirthData, type ChartData } from '@parashari/core';

interface ProfileJob {
  profile_id: string;
}

function getEngine(ayanamsa: Ayanamsa = Ayanamsa.Lahiri): AstrologyEngine {
  return new AstrologyEngine(ayanamsa);
}

function buildBirthData(profile: ReturnType<typeof getProfile>): BirthData | null {
  if (!profile) return null;
  return {
    name: profile.name,
    dateOfBirth: profile.dob_utc,
    latitude: profile.lat,
    longitude: profile.lon,
    timezone: profile.utc_offset_hours,
    ayanamsaId: Ayanamsa.Lahiri,
  };
}

export async function processProfile(profileId: string): Promise<void> {
  console.log(`[processor] Starting processing for profile ${profileId}`);

  // Update status to processing
  updateProfileStatus(profileId, 'processing');

  try {
    const profile = getProfile(profileId);
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    const birthData = buildBirthData(profile);
    if (!birthData) {
      throw new Error(`Failed to build birth data for ${profileId}`);
    }

    const engine = getEngine(Ayanamsa.Lahiri);

    console.log('[processor] Calculating chart...');
    const chart: ChartData = await engine.calculateChart(birthData);

    console.log('[processor] Calculating dashas...');
    const dashas = await engine.calculateDashas(chart);

    console.log('[processor] Detecting yogas...');
    const yogas = await engine.detectYogas(chart);

    console.log('[processor] Calculating shadbala...');
    const shadbala = await engine.calculateShadbala(chart);

    console.log('[processor] Calculating ashtakavarga...');
    const ashtakavarga = await engine.calculateAshtakavarga(chart);

    // Get Julian Day and Ayanamsa value
    const julianDay = chart.julianDay;
    const ayanamsaValue = chart.ayanamsa;

    // Save all calculations to cache
    saveCachedCalculation(profileId, {
      julian_day: julianDay,
      ayanamsa_value: ayanamsaValue,
      chart_json: JSON.stringify(chart),
      vargas_json: null, // TODO: Add vargas
      shadbala_json: JSON.stringify(shadbala),
      ashtakavarga_json: JSON.stringify({
        bav: Array.from(ashtakavarga.bav.entries()),
        sav: ashtakavarga.sav,
        planetBav: Array.from(ashtakavarga.planetBav.entries()),
      }),
      dashas_json: JSON.stringify(dashas),
      yogas_json: JSON.stringify(yogas),
      predictions_json: null, // TODO: Generate predictions
    });

    // Update status to ready
    updateProfileStatus(profileId, 'ready');
    console.log(`[processor] Completed processing for profile ${profileId}`);

  } catch (error) {
    console.error(`[processor] Error processing profile ${profileId}:`, error);
    updateProfileStatus(profileId, 'error');
    throw error;
  }
}

export function getNextPendingProfile(): string | null {
  const db = getDb();
  const row = db.prepare<[], { id: string }>(
    'SELECT id FROM profiles WHERE status = ? ORDER BY created_at ASC LIMIT 1'
  ).get('new');

  return row?.id ?? null;
}

export async function runProcessor(): Promise<void> {
  console.log('[processor] Starting job processor...');

  while (true) {
    const profileId = getNextPendingProfile();

    if (!profileId) {
      console.log('[processor] No pending profiles, waiting...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      continue;
    }

    try {
      await processProfile(profileId);
    } catch (error) {
      console.error('[processor] Job failed:', error);
    }
  }
}
```

- [ ] **Step 2: Add process command to CLI**

Run: Edit `packages/api/src/cli.ts` - add process command:

```typescript
import { runProcessor, processProfile } from './jobs/processor.js';

async function processAction(options: { id?: string }) {
  runMigrations();

  if (options.id) {
    // Process specific profile
    console.log(`Processing profile: ${options.id}`);
    await processProfile(options.id);
  } else {
    // Run continuous processor
    await runProcessor();
  }
}

program
  .command('process')
  .description('Process profiles (run without args for continuous processing)')
  .option('-i, --id <id>', 'Process specific profile ID')
  .action(processAction);
```

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/jobs/processor.ts packages/api/src/cli.ts
git commit -m "feat: add async job processor for profile calculations"
```

---

## Chunk 4: Integration and Testing

### Task 5: Full end-to-end test

- [ ] **Step 1: Create test profile via CLI**

Run:
```bash
cd packages/api && npx tsx src/cli.ts create -n "John Doe" -d "1985-06-15" -t "14:30" -p "Houston-Texas"
```

Expected: Profile created with ID shown

- [ ] **Step 2: Process the profile**

Run:
```bash
cd packages/api && npx tsx src/cli.ts process -i "<profile-id-from-step-1>"
```

Expected: All calculations complete, status updated to "ready"

- [ ] **Step 3: Verify in database**

Run:
```bash
sqlite3 database/parashari.db "SELECT id, name, status FROM profiles;"
sqlite3 database/parashari.db "SELECT profile_id, chart_json IS NOT NULL, dashas_json IS NOT NULL FROM calculations_cache;"
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: complete CLI with async processing"
```

---

## Summary

After completing all tasks:

1. **CLI available:**
   - `parashari create -n "Name" -d "YYYY-MM-DD" -t "HH:MM" -p "Place"`
   - `parashari process` (continuous) or `parashari process -i <id>`

2. **Database updates:**
   - `profiles.status` column (new/processing/ready/error)
   - `calculations_cache.predictions_json` column

3. **Workflow:**
   1. User runs `create` command → profile saved with status="new"
   2. User runs `process` command → background job picks up "new" profiles
   3. Job calculates chart, dashas, yogas, shadbala, ashtakavarga
   4. Job updates status to "ready" on completion

**Next improvements (out of scope):**
- Add predictions generation in processor
- Add vargas calculation
- Add job queue for resilience
- Add webhooks/callbacks for completion notification
