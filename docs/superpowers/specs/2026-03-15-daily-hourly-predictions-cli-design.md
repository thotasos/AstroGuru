# Daily and Hourly Predictions CLI Design

> **For agentic workers:** Implementation should use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Create CLI commands to generate daily/hourly astrological predictions with pre-cached data for 30 days.

**Architecture:** Two-layer prediction system:
- Macro Layer: Pre-calculated hourly predictions stored in SQLite
- Micro Layer: On-demand calculation for dates beyond cache window

**Tech Stack:** TypeScript, better-sqlite3, @parashari/core

---

## CLI Commands

### 1. predict — Get predictions for a specific date

```bash
# Daily predictions for a specific date (uses profile's birth timezone)
npx tsx src/cli.ts predict -i <profile-id> -d 2026-03-15

# Daily predictions with custom timezone
npx tsx src/cli.ts predict -i <profile-id> -d 2026-03-15 --timezone America/New_York

# Daily predictions (JSON output)
npx tsx src/cli.ts predict -i <profile-id> -d 2026-03-15 --json

# Hourly predictions for a day
npx tsx src/cli.ts predict -i <profile-id> -d 2026-03-15 --hourly

# Hourly predictions (JSON)
npx tsx src/cli.ts predict -i <profile-id> -d 2026-03-15 --hourly --json
```

**Options:**
- `-i, --id <id>` — Profile ID (required)
- `-d, --date <date>` — Date in YYYY-MM-DD format (required)
- `--timezone <tz>` — Timezone (default: profile's birth timezone)
- `--hourly` — Include hourly breakdown
- `--json` — Output JSON instead of plain text

### 2. predict-cache — Pre-generate 30-day cache (for cron)

```bash
# Generate cache for all ready profiles
npx tsx src/cli.ts predict-cache

# Generate cache for specific profile(s)
npx tsx src/cli.ts predict-cache -i <profile-id>

# Generate cache with custom timezone
npx tsx src/cli.ts predict-cache -i <profile-id> --timezone Asia/Kolkata

# Force regenerate even if cache exists
npx tsx src/cli.ts predict-cache -i <profile-id> --force
```

**Options:**
- `-i, --id <id>` — Profile ID(s) (optional, default: all ready profiles)
- `--timezone <tz>` — Timezone for all predictions
- `-f, --force` — Force regeneration even if cache exists

---

## Database Schema

### New Table: hourly_predictions

```sql
CREATE TABLE IF NOT EXISTS hourly_predictions (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  date TEXT NOT NULL,           -- YYYY-MM-DD
  hour INTEGER NOT NULL,        -- 0-23
  timezone TEXT NOT NULL,       -- e.g., America/New_York

  -- Sookshma Dasha (Level 4 - days)
  sookshma_dasha_planet INTEGER,
  sookshma_dasha_start TEXT,   -- ISO timestamp
  sookshma_dasha_end TEXT,     -- ISO timestamp

  -- Prana Dasha (Level 5 - hours)
  prana_dasha_planet INTEGER,
  prana_dasha_start TEXT,      -- ISO timestamp
  prana_dasha_end TEXT,        -- ISO timestamp

  -- Transit positions
  moon_nakshatra INTEGER,
  moon_sign INTEGER,
  moon_degree REAL,
  transit_lagna REAL,           -- Lagna degrees
  transit_lagna_sign INTEGER,

  -- Prediction data
  hourly_score INTEGER,         -- 0-100 composite score
  prediction_text TEXT,          -- Plain English prediction

  created_at TEXT NOT NULL,     -- ISO timestamp
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_hourly_profile_date
  ON hourly_predictions(profile_id, date);
```

---

## Implementation Steps

### Chunk 1: Database & Types

- [ ] Add `hourly_predictions` table to `schema.sql`
- [ ] Add `HourlyPrediction` type to `packages/api/src/database/cache.ts`

### Chunk 2: Prediction Engine Enhancement

- [ ] Extend `packages/core/src/calculations/predictions.ts`:
  - Add `generateHourlyPrediction()` function
  - Add `calculateTransitForDate()` function
  - Add `calculateHourlyScore()` function

### Chunk 3: Cache Management

- [ ] Add `saveHourlyPrediction()` to `packages/api/src/database/cache.ts`
- [ ] Add `getHourlyPredictions()` to retrieve cached predictions
- [ ] Add `deleteOldPredictions()` to clean up data older than today

### Chunk 4: predict-cache CLI

- [ ] Add `predict-cache` command to `cli.ts`
- [ ] Generate hourly predictions for next 30 days
- [ ] Handle timezone parameter

### Chunk 5: predict CLI

- [ ] Add `predict` command to `cli.ts`
- [ ] Check cache first, fallback to on-demand calculation
- [ ] Support `--hourly` and `--json` flags
- [ ] Plain text output formatting

---

## Prediction Logic (Per Hour)

### Score Calculation (0-100)

| Factor | Condition | Points |
|--------|-----------|--------|
| Prana Dasha Lord | Is functional benefic? | +20 |
| Transit Lagna | In Kendra (1,4,7,10) from natal Lagna? | +20 |
| Moon | In friendly Nakshatra from birth star? | +20 |
| Moon | In own sign or exalted? | +20 |
| Aspects | No malefic aspects on Lagna/Moon? | +20 |

### Hourly Output Format

```
Hour: 14:00 - 15:00 (2:00 PM - 3:00 PM)
Score: 75/100 (Good)

Transit Lagna: Leo (4th house from natal)
Moon: Scorpio 15° (Anuradha Nakshatra)
Sookshma Dasha: Jupiter (Mar 10 - Mar 17)
Prana Dasha: Venus (14:00 - 15:00)

Prediction: Good hour for financial matters. Moon in
favorable nakshatra supports emotional clarity.
```

---

## Example Output

### Daily Prediction (Plain Text)

```
======================================================================
DAILY PREDICTION: March 15, 2026
Profile: Srinivas Test
Location: Nalgonda, India (Asia/Kolkata)
======================================================================

Overall Day Score: 72/100 (Good)

Key Periods:
  Morning (06:00-12:00): Score 65 - Saturn influence, cautious approach
  Afternoon (12:00-18:00): Score 78 - Venus rising, favorable for meetings
  Evening (18:00-24:00): Score 70 - Moon transitioning, emotional time

Best Hour: 14:00-15:00 (Score: 82)
Worst Hour: 06:00-07:00 (Score: 55)

------------------------------------------------------------------
Hourly Breakdown:
------------------------------------------------------------------
06:00 | 55 | Moon in Scorpio - Start day slowly
07:00 | 60 | Mercury rising - Good for communication
08:00 | 65 | Ketu period - Introspection
09:00 | 68 | Venus hour - Financial planning
...
```

### JSON Output

```json
{
  "profileId": "f33d94ca-...",
  "date": "2026-03-15",
  "timezone": "Asia/Kolkata",
  "overallScore": 72,
  "summary": "A good day with afternoon hours being most favorable...",
  "bestHour": 14,
  "hours": [
    {
      "hour": 14,
      "score": 82,
      "sookshmaDasha": "Jupiter",
      "pranaDasha": "Venus",
      "moonNakshatra": "Anuradha",
      "moonSign": "Scorpio",
      "transitLagna": "Leo",
      "prediction": "Peak productivity hour. Favorable for..."
    }
  ]
}
```

---

## Dependencies

- `@parashari/core`: Chart calculations, transit positions
- `better-sqlite3`: Database operations
- `date-fns` or `date-fns-tz`: Timezone handling
- `commander`: CLI argument parsing

---

## Future Enhancements

1. **Multi-location predictions**: Allow specifying current location vs birth location
2. **Event timing**: Use hourly predictions to recommend best windows for specific activities
3. **Transit overlays**: Show major planet transits (Jupiter/Saturn) affecting the day
4. **Push notifications**: Alert when highly favorable hours occur
