/**
 * seed.ts — Development test data
 *
 * Inserts three well-known test profiles and sample journal events.
 * Safe to re-run: uses `createProfile` which generates fresh UUIDs,
 * but guards against duplicate names so the DB doesn't accumulate
 * duplicate seeds across multiple runs.
 *
 * Usage:
 *   npm run db:seed          # via tsx in package.json scripts
 */

import { runMigrations } from './migrate.js';
import { createProfile, getAllProfiles } from './profiles.js';
import { createEvent } from './events.js';
import type { CreateProfileInput } from './profiles.js';
import type { CreateEventInput } from './events.js';

// ---------------------------------------------------------------------------
// Seed data definitions
// ---------------------------------------------------------------------------

interface SeedProfile {
  profile: CreateProfileInput;
  events: Omit<CreateEventInput, 'profile_id'>[];
}

const SEED_PROFILES: SeedProfile[] = [
  {
    // TC-01 canonical test case — Bangalore, 20 Sep 1974, 12:00 PM IST
    profile: {
      name: 'Test User 1',
      dob_utc: '1974-09-20T06:30:00Z', // 12:00 IST = 06:30 UTC
      lat: 12.9716,
      lon: 77.5946,
      timezone: 'Asia/Kolkata',
      utc_offset_hours: 5.5,
      place_name: 'Bangalore, India',
      ayanamsa_id: 1,
      notes: 'TC-01 canonical test case',
    },
    events: [
      {
        event_date: '1996-07-01',
        category: 'Education',
        title: 'Completed undergraduate degree',
        description: 'Graduated with a B.Sc. in Physics.',
        sentiment: 1,
      },
      {
        event_date: '2001-03-15',
        category: 'Career',
        title: 'First software engineering role',
        description: 'Joined a startup in Bangalore as a junior developer.',
        sentiment: 1,
      },
      {
        event_date: '2008-11-20',
        category: 'Relationship',
        title: 'Marriage',
        description: 'Married in Bangalore.',
        sentiment: 1,
      },
      {
        event_date: '2012-04-10',
        category: 'Health',
        title: 'Surgery',
        description: 'Minor knee surgery; full recovery in six weeks.',
        sentiment: -1,
      },
    ],
  },
  {
    // Edge case: near-midnight birth in New York on New Year's Day 1990
    profile: {
      name: 'Test User 2',
      dob_utc: '1990-01-01T05:01:00Z', // 00:01 EST = 05:01 UTC
      lat: 40.7128,
      lon: -74.006,
      timezone: 'America/New_York',
      utc_offset_hours: -5,
      place_name: 'New York, USA',
      ayanamsa_id: 1,
      notes: 'Edge case: near-midnight, year boundary, Western hemisphere',
    },
    events: [
      {
        event_date: '2008-09-01',
        category: 'Education',
        title: 'Enrolled in college',
        description: 'Started a four-year degree in Business Administration.',
        sentiment: 1,
      },
      {
        event_date: '2015-06-30',
        category: 'Finance',
        title: 'Significant investment loss',
        description: 'Lost a substantial sum due to a failed startup investment.',
        sentiment: -1,
      },
      {
        event_date: '2020-03-01',
        category: 'Career',
        title: 'Remote work transition',
        description: 'Moved to fully remote work due to the pandemic.',
        sentiment: 0,
      },
    ],
  },
  {
    // London, 15 March 2000, 06:30 AM GMT — equinox birth
    profile: {
      name: 'Test User 3',
      dob_utc: '2000-03-15T06:30:00Z', // 06:30 GMT = 06:30 UTC
      lat: 51.5074,
      lon: -0.1278,
      timezone: 'Europe/London',
      utc_offset_hours: 0,
      place_name: 'London, UK',
      ayanamsa_id: 2, // Raman ayanamsa for variety
      notes: 'Near-equinox birth, GMT baseline, millennial',
    },
    events: [
      {
        event_date: '2018-09-15',
        category: 'Education',
        title: 'Started university',
        description: 'Enrolled in Computer Science at UCL.',
        sentiment: 1,
      },
      {
        event_date: '2021-07-04',
        category: 'Travel',
        title: 'First solo international trip',
        description: 'Backpacked through South-East Asia for three months.',
        sentiment: 1,
      },
      {
        event_date: '2022-11-01',
        category: 'Career',
        title: 'First full-time job offer',
        description: 'Accepted a software engineering role in London.',
        sentiment: 1,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Seeding logic
// ---------------------------------------------------------------------------

function seed(): void {
  console.log('[seed] Running migrations before seeding…');
  runMigrations();

  const existingNames = new Set(getAllProfiles().map((p) => p.name));

  for (const seedItem of SEED_PROFILES) {
    const { profile: profileData, events } = seedItem;

    if (existingNames.has(profileData.name)) {
      console.log(`[seed] Skipping "${profileData.name}" — already exists.`);
      continue;
    }

    console.log(`[seed] Inserting profile: ${profileData.name}`);
    const profile = createProfile(profileData);

    for (const eventData of events) {
      const input: CreateEventInput = {
        profile_id: profile.id,
        ...eventData,
      };
      createEvent(input);
      console.log(`[seed]   → Event: "${eventData.title}" (${eventData.event_date})`);
    }
  }

  console.log('[seed] Seeding complete.');
}

// ---------------------------------------------------------------------------
// CLI entry-point
// ---------------------------------------------------------------------------
const __filename = new URL(import.meta.url).pathname;
const isMain =
  typeof process.argv[1] === 'string' &&
  // Normalise away any tsx/ts-node wrapper paths
  (process.argv[1].endsWith('seed.ts') ||
    process.argv[1].endsWith('seed.js'));

if (isMain) {
  try {
    seed();
    process.exit(0);
  } catch (err) {
    console.error('[seed] FATAL:', err);
    process.exit(1);
  }
}

export { seed };
