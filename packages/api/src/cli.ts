#!/usr/bin/env node

import { Command } from 'commander';
import { createProfile, getAllProfiles, getProfile, deleteProfile } from './database/profiles.js';
import { runMigrations } from './database/migrate.js';
import { getCachedCalculation, saveHourlyPredictions, getHourlyPredictions, deleteOldPredictions, deletePredictionsForProfile, getReadyProfiles } from './database/cache.js';
import { runProcessor, processProfile, processAllNewProfiles } from './jobs/processor.js';
import { calculateTransit, calculateHourlyScore, calculateHourlyCategories, parseCategoryTrend, getDashaAtDate, generateImmediatePredictions, generateMonthlyPredictions } from '@parashari/core';

const PREDEFINED_PLACES: Record<string, { lat: number; lon: number; timezone: string; utcOffset: number }> = {
  'nalgonda-india': { lat: 17.0500, lon: 79.2700, timezone: 'Asia/Kolkata', utcOffset: 5.5 },
  'houston-texas': { lat: 29.7604, lon: -95.3698, timezone: 'America/Chicago', utcOffset: -6 },
  'sunnyvale-california': { lat: 37.3688, lon: -122.0363, timezone: 'America/Los_Angeles', utcOffset: -8 },
};

/** Valid timezone options for CLI */
export const VALID_TIMEZONES = [
  // Asia
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Tokyo', 'Asia/Seoul',
  'Asia/Bangkok', 'Asia/Jakarta', 'Asia/Manila', 'Asia/Karachi', 'Asia/Dhaka', 'Asia/Kathmandu',
  'Asia/Colombo', 'Asia/Maldives',
  // Europe
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome', 'Europe/Madrid', 'Europe/Amsterdam',
  'Europe/Moscow', 'Europe/Istanbul', 'Europe/Athens', 'Europe/Warsaw', 'Europe/Stockholm',
  // Americas
  'America/New_York', 'America/Los_Angeles', 'America/Chicago', 'America/Denver', 'America/Toronto',
  'America/Vancouver', 'America/Mexico_City', 'America/Sao_Paulo', 'America/Buenos_Aires',
  'America/Lima', 'America/Bogota', 'America/Santiago',
  // Pacific
  'Pacific/Auckland', 'Pacific/Fiji', 'Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth',
  // US
  'US/Eastern', 'US/Central', 'US/Mountain', 'US/Pacific', 'US/Alaska', 'US/Hawaii',
  // UTC
  'UTC',
];

interface CreateOptions {
  name: string;
  dob: string;
  time: string;
  place: string;
}

async function createProfileAction(options: CreateOptions) {
  // Run migrations first
  runMigrations(true);

  const placeKey = options.place.toLowerCase().replace(/\s+/g, '-');
  const place = PREDEFINED_PLACES[placeKey];

  if (!place) {
    console.error(`Error: Unknown place "${options.place}"`);
    console.log('Available places:');
    Object.keys(PREDEFINED_PLACES).forEach(p => console.log(`  - ${p}`));
    process.exit(1);
  }

  // Parse date and time - treat input as LOCAL time for the given timezone
  // For example: 10:00 AM in Nalgonda = 10:00 AM IST = UTC + 5:30
  // We need to convert this to UTC: 10:00 - 5:30 = 4:30 UTC
  const dobParts = options.dob.split('-').map(Number);
  const timeParts = options.time.split(':').map(Number);
  const year = dobParts[0]!;
  const month = dobParts[1]!;
  const day = dobParts[2]!;
  const hours = timeParts[0]!;
  const minutes = timeParts[1]!;

  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
    console.error('Error: Invalid date or time format');
    process.exit(1);
  }

  // Use the predefined offset
  const offsetHours = place.utcOffset;

  // Convert local time to UTC
  // If offset is +5.5 (IST), then 10:00 local = 10:00 - 5:30 = 4:30 UTC
  const localDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  const offsetMs = offsetHours * 60 * 60 * 1000;
  const utcMs = localDate.getTime() - offsetMs;

  // Create UTC date
  const utcDate = new Date(utcMs);

  const profile = createProfile({
    name: options.name,
    dob_utc: utcDate.toISOString(),
    lat: place.lat,
    lon: place.lon,
    timezone: place.timezone,
    utc_offset_hours: offsetHours,
    place_name: options.place,
    ayanamsa_id: 1, // Lahiri default
  });

  console.log(`Created profile: ${profile.id}`);
  console.log(`  Name: ${profile.name}`);
  console.log(`  DOB (UTC): ${profile.dob_utc}`);
  console.log(`  Local Time: ${options.dob} ${options.time}`);
  console.log(`  Place: ${profile.place_name}`);
  console.log(`  Timezone: ${profile.timezone} (UTC${offsetHours >= 0 ? '+' : ''}${offsetHours})`);
  console.log(`  Status: ${profile.status}`);
  console.log(`\nRun 'npx tsx src/cli.ts process -i "${profile.id}"' to process this profile.`);
}

interface ProcessOptions {
  id?: string;
  force?: boolean;
}

async function processAction(options: ProcessOptions) {
  runMigrations(true);

  if (options.id) {
    // Process specific profile (with optional force reprocess)
    console.log(`Processing profile: ${options.id}${options.force ? ' (forced reprocess)' : ''}`);
    await processProfile(options.id);
  } else {
    // Process all new profiles once
    await processAllNewProfiles();
  }
}

function listAction() {
  runMigrations(true);

  const profiles = getAllProfiles();

  if (profiles.length === 0) {
    console.log('No profiles found.');
    return;
  }

  console.log(`\nFound ${profiles.length} profile(s):\n`);
  console.log('ID'.padEnd(38) + 'Name'.padEnd(20) + 'DOB (Local)'.padEnd(25) + 'Place'.padEnd(25) + 'Status');
  console.log('-'.repeat(118));

  for (const p of profiles) {
    const id = p.id.substring(0, 36);
    const name = p.name.substring(0, 18);

    // Convert UTC to local timezone
    const dobUtc = new Date(p.dob_utc);
    const timezone = p.timezone || 'UTC';
    const localDob = dobUtc.toLocaleString('en-US', { timeZone: timezone, dateStyle: 'medium', timeStyle: 'short' });

    const place = (p.place_name || 'Unknown').substring(0, 23);
    const status = p.status;

    console.log(`${id}  ${name.padEnd(20)} ${localDob.padEnd(25)} ${place.padEnd(25)} ${status}`);
  }
  console.log('');
}

interface ReportOptions {
  id: string;
}

function reportAction(options: ReportOptions) {
  runMigrations(true);

  const profile = getProfile(options.id);
  if (!profile) {
    console.error(`Error: Profile not found: ${options.id}`);
    process.exit(1);
  }

  const cache = getCachedCalculation(options.id);

  console.log('\n' + '='.repeat(70));
  console.log(`PROFILE REPORT: ${profile.name}`);
  console.log('='.repeat(70));

  console.log('\n--- Basic Information ---');
  console.log(`ID:         ${profile.id}`);
  console.log(`Name:       ${profile.name}`);
  console.log(`DOB (UTC):  ${profile.dob_utc}`);
  console.log(`Place:      ${profile.place_name || 'Unknown'}`);
  console.log(`Latitude:   ${profile.lat}`);
  console.log(`Longitude:  ${profile.lon}`);
  console.log(`Timezone:   ${profile.timezone}`);
  console.log(`Ayanamsa:   ${profile.ayanamsa_id === 1 ? 'Lahiri' : profile.ayanamsa_id === 2 ? 'Raman' : 'KP'}`);
  console.log(`Status:     ${profile.status}`);

  if (!cache) {
    console.log('\n--- No calculations found ---');
    console.log('Run "npx tsx src/cli.ts process -i <profile-id>" to process this profile.');
    return;
  }

  console.log('\n--- Calculations ---');
  const hasChart = cache.chart_json !== null;
  const hasVargas = cache.vargas_json !== null;
  const hasDashas = cache.dashas_json !== null;
  const hasYogas = cache.yogas_json !== null;
  const hasShadbala = cache.shadbala_json !== null;
  const hasAshtakavarga = cache.ashtakavarga_json !== null;
  const hasPredictions = cache.predictions_json !== null;

  console.log(`Chart:          ${hasChart ? '✓' : '✗'}`);
  console.log(`Vargas:         ${hasVargas ? '✓' : '✗'}`);
  console.log(`Dashas:         ${hasDashas ? '✓' : '✗'}`);
  console.log(`Yogas:          ${hasYogas ? '✓' : '✗'}`);
  console.log(`Shadbala:       ${hasShadbala ? '✓' : '✗'}`);
  console.log(`Ashtakavarga:   ${hasAshtakavarga ? '✓' : '✗'}`);
  console.log(`Predictions:    ${hasPredictions ? '✓' : '✗'}`);
  console.log(`Computed at:    ${cache.computed_at}`);

  // Parse and display chart data
  if (hasChart) {
    console.log('\n--- Birth Chart (Rasi) ---');
    const chart = JSON.parse(cache.chart_json);
    console.log(`Julian Day:    ${chart.julianDay}`);
    console.log(`Ayanamsa:      ${chart.ayanamsa?.toFixed(2)}°`);
    console.log(`Ascendant:     ${chart.ascendant?.toFixed(2)}°`);

    if (chart.planets && Array.isArray(chart.planets)) {
      console.log('\nPlanet Positions:');
      const signNames = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
      const planetNames = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

      for (const p of chart.planets) {
        const name = planetNames[p.planet] || `Planet ${p.planet}`;
        const sign = signNames[p.sign] || 'Unknown';
        const degree = p.degreeInSign?.toFixed(1) || '?';
        console.log(`  ${name.padEnd(10)}: ${sign.padEnd(10)} ${degree.padEnd(6)}°`);
      }
    }
  }

  // Parse and display yogas
  if (hasYogas && cache.yogas_json) {
    console.log('\n--- Yogas (Planetary Combinations) ---');
    const yogas = JSON.parse(cache.yogas_json);
    if (yogas.length === 0) {
      console.log('  No significant yogas detected.');
    } else {
      // Show active yogas first
      const activeYogas = yogas.filter((y: { isPresent: boolean }) => y.isPresent);
      const inactiveYogas = yogas.filter((y: { isPresent: boolean }) => !y.isPresent);

      if (activeYogas.length > 0) {
        console.log('\n  Active Yogas:');
        for (const yoga of activeYogas.slice(0, 10)) {
          console.log(`    • ${yoga.name}: ${yoga.description}`);
        }
        if (activeYogas.length > 10) {
          console.log(`    ... and ${activeYogas.length - 10} more`);
        }
      }

      if (inactiveYogas.length > 0) {
        console.log(`\n  Inactive Yogas: ${inactiveYogas.length} (not currently active)`);
      }
    }
  }

  // Parse and display Vargas (divisional charts)
  if (hasVargas && cache.vargas_json) {
    console.log('\n--- Vargas (Divisional Charts) ---');
    const vargas = JSON.parse(cache.vargas_json);
    const vargaNames: Record<string, string> = {
      D1: 'Rasi (Lagna)',
      D2: 'Hora',
      D3: 'Drekkana',
      D4: 'Chaturthamsha',
      D5: 'Panchamsha',
      D6: 'Shashthamsha',
      D7: 'Saptamsha',
      D8: 'Ashtamsha',
      D9: 'Navamsha',
      D10: 'Dashamsha',
      D11: 'Rudramsha',
      D12: 'Dwadashamsha',
    };
    const vargasList = Object.keys(vargas);
    if (vargasList.length > 0) {
      for (const v of vargasList) {
        const name = vargaNames[v] || v;
        console.log(`  ${name.padEnd(20)}: ${v}`);
      }
    } else {
      console.log('  No vargas calculated.');
    }
  }

  // Parse and display predictions
  if (hasPredictions && cache.predictions_json) {
    const predictions = JSON.parse(cache.predictions_json);
    const periods = predictions.periods || [];

    // Try to generate enhanced immediate predictions if we have all data
    if (hasChart && hasDashas && hasYogas && hasShadbala && cache.chart_json && cache.dashas_json && cache.yogas_json && cache.shadbala_json) {
      const chart = JSON.parse(cache.chart_json);
      const dashas = JSON.parse(cache.dashas_json);
      const yogas = JSON.parse(cache.yogas_json);
      const shadbalaData = cache.shadbala_json ? JSON.parse(cache.shadbala_json) : [];

      try {
        const immediatePreds = generateImmediatePredictions(
          chart, dashas, yogas, shadbalaData,
          profile.lat, profile.lon, profile.utc_offset_hours
        );

        console.log('\n=== ENHANCED PREDICTIONS (Past Year, Current & Next Year) ===\n');

        // Past
        if (immediatePreds.past) {
          console.log('━'.repeat(60));
          console.log('📌 IMMEDIATE PAST (Last 1-2 Years)');
          console.log('━'.repeat(60));
          const p = immediatePreds.past;
          console.log(`Period: ${p.startDate.toISOString().split('T')[0]} to ${p.endDate.toISOString().split('T')[0]}`);
          console.log(`Assessment: ${p.overallAssessment.toUpperCase()}`);
          console.log(`\n${p.title}`);
          console.log(`\n${p.summary}`);
          console.log('\nKey Factors:');
          for (const factor of p.keyFactors) {
            console.log(`  • ${factor}`);
          }
          if (p.activeYogas.length > 0) {
            console.log('\nActive Yogas:');
            for (const yoga of p.activeYogas.slice(0, 3)) {
              console.log(`  • ${yoga}`);
            }
          }
          if (p.transitInfluences.length > 0) {
            console.log('\nTransit Influences:');
            for (const t of p.transitInfluences.slice(0, 3)) {
              console.log(`  • ${t}`);
            }
          }
        }

        // Current
        if (immediatePreds.current) {
          console.log('\n' + '━'.repeat(60));
          console.log('📌 CURRENT PERIOD (Now - Next Year)');
          console.log('━'.repeat(60));
          const c = immediatePreds.current;
          console.log(`Period: ${c.startDate.toISOString().split('T')[0]} to ${c.endDate.toISOString().split('T')[0]}`);
          console.log(`Assessment: ${c.overallAssessment.toUpperCase()}`);
          console.log(`\n${c.title}`);
          console.log(`\n${c.summary}`);
          console.log('\nKey Factors:');
          for (const factor of c.keyFactors) {
            console.log(`  • ${factor}`);
          }
          if (c.activeYogas.length > 0) {
            console.log('\nActive Yogas:');
            for (const yoga of c.activeYogas.slice(0, 3)) {
              console.log(`  • ${yoga}`);
            }
          }
          if (c.transitInfluences.length > 0) {
            console.log('\nTransit Influences:');
            for (const t of c.transitInfluences.slice(0, 3)) {
              console.log(`  • ${t}`);
            }
          }
        }

        // Future
        if (immediatePreds.future) {
          console.log('\n' + '━'.repeat(60));
          console.log('📌 IMMEDIATE FUTURE (Next 1-2 Years)');
          console.log('━'.repeat(60));
          const f = immediatePreds.future;
          console.log(`Period: ${f.startDate.toISOString().split('T')[0]} to ${f.endDate.toISOString().split('T')[0]}`);
          console.log(`Assessment: ${f.overallAssessment.toUpperCase()}`);
          console.log(`\n${f.title}`);
          console.log(`\n${f.summary}`);
          console.log('\nKey Factors:');
          for (const factor of f.keyFactors) {
            console.log(`  • ${factor}`);
          }
          if (f.activeYogas.length > 0) {
            console.log('\nActive Yogas:');
            for (const yoga of f.activeYogas.slice(0, 3)) {
              console.log(`  • ${yoga}`);
            }
          }
          if (f.transitInfluences.length > 0) {
            console.log('\nTransit Influences:');
            for (const t of f.transitInfluences.slice(0, 3)) {
              console.log(`  • ${t}`);
            }
          }
        }

        console.log('\n');
      } catch (e) {
        // Fall back to basic predictions
        displayBasicPredictions(periods);
      }
    } else {
      displayBasicPredictions(periods);
    }
  }

  // Helper function for basic predictions
  function displayBasicPredictions(periods: any[]) {
    console.log('\n=== PREDICTIONS (Past, Current & Future) ===');
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
  }

  // Parse and display shadbala
  if (hasShadbala && cache.shadbala_json) {
    console.log('\n--- Shadbala (Planetary Strengths) ---');
    const shadbala = JSON.parse(cache.shadbala_json);
    const planetNames = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
    if (Array.isArray(shadbala)) {
      console.log('\nPlanet'.padEnd(10) + 'Total'.padEnd(10) + 'Direction'.padEnd(10) + 'Natural'.padEnd(10) + 'Temporal'.padEnd(10));
      console.log('-'.repeat(50));
      for (const sb of shadbala) {
        const name = (planetNames[sb.planet] || `Planet ${sb.planet}`).padEnd(10);
        const total = (sb.total?.toFixed(1) || '?').padEnd(10);
        const dir = (sb.digbala?.toFixed(1) || '?').padEnd(10);
        const natural = (sb.naisargikabala?.toFixed(1) || '?').padEnd(10);
        const temporal = (sb.kalabala?.toFixed(1) || '?');
        console.log(`${name}${total}${dir}${natural}${temporal}`);
      }
    }
  }

  // Parse and display dashas
  if (hasDashas && cache.dashas_json) {
    console.log('\n--- Vimshottari Dasha (Planetary Periods) ---');
    const dashas = JSON.parse(cache.dashas_json);
    const planetNames = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

    if (dashas.length > 0) {
      const now = new Date();
      const current = dashas.find((d: { mahadasha: { startDate: string; endDate: string } }) => {
        const start = new Date(d.mahadasha.startDate);
        const end = new Date(d.mahadasha.endDate);
        return start <= now && end >= now;
      });

      if (current) {
        const mahaPlanet = planetNames[current.mahadasha.planet] || `Planet ${current.mahadasha.planet}`;
        console.log(`\n  Current Mahadasha: ${mahaPlanet}`);
        console.log(`  Period: ${current.mahadasha.startDate.split('T')[0]} to ${current.mahadasha.endDate.split('T')[0]}`);

        if (current.antardasha) {
          const antardashaPlanet = planetNames[current.antardasha.planet] || `Planet ${current.antardasha.planet}`;
          console.log(`\n  Current Antardasha (Sub-period): ${antardashaPlanet}`);
          console.log(`  Period: ${current.antardasha.startDate.split('T')[0]} to ${current.antardasha.endDate.split('T')[0]}`);
        }
      }

      // Count unique mahadashas
      const uniqueMahadashas = new Set(dashas.map((d: { mahadasha: { planet: number } }) => d.mahadasha.planet));
      console.log(`\n  Unique Mahadashas: ${uniqueMahadashas.size}`);
      console.log(`  Total Dasha Periods: ${dashas.length} (all 5 levels)`);
      console.log(`  Full 120-year cycle from birth`);
    }
  }

  // Key predictions from past periods
  if (hasDashas && hasChart && cache.dashas_json) {
    console.log('\n--- Past Mahadasha Periods ---');
    const dashas = JSON.parse(cache.dashas_json);
    const planetNames = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
    const now = new Date();

    // Get unique mahadasha periods (level === 1 means top-level mahadasha)
    const mahaEntries = dashas.filter((d: { mahadasha: { level: number } }) => d.mahadasha.level === 1);

    // Deduplicate by mahadasha planet + startDate
    const seen = new Set<string>();
    const mahadashas: typeof mahaEntries = [];
    for (const d of mahaEntries) {
      const key = `${d.mahadasha.planet}-${d.mahadasha.startDate}`;
      if (!seen.has(key)) {
        seen.add(key);
        mahadashas.push(d);
      }
    }
    const pastDashas = mahadashas.filter((d: { mahadasha: { endDate: string } }) => new Date(d.mahadasha.endDate) < now);

    if (pastDashas.length > 0) {
      console.log(`\n  Past ${Math.min(5, pastDashas.length)} Mahadasha Periods:\n`);
      for (const d of pastDashas.slice(-5).reverse()) {
        const planet = planetNames[d.mahadasha.planet] || `Planet ${d.mahadasha.planet}`;
        const start = d.mahadasha.startDate.split('T')[0];
        const end = d.mahadasha.endDate.split('T')[0];
        console.log(`  ${planet.padEnd(8)}: ${start} - ${end}`);
      }
    } else {
      console.log('  No completed mahadasha periods yet.');
    }
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

const CACHE_DAYS = 30;
const HOURS_PER_DAY = 24;

/** Helper to convert date to ISO string, handling both Date objects and string inputs */
function toISOString(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  if (typeof date === 'string') return date;
  if (date instanceof Date) return date.toISOString();
  return null;
}

interface HourlyPredictionInput {
  id: string;
  profile_id: string;
  date: string;
  hour: number;
  timezone: string;
  sookshma_dasha_planet: number | null;
  sookshma_dasha_start: string | null;
  sookshma_dasha_end: string | null;
  prana_dasha_planet: number | null;
  prana_dasha_start: string | null;
  prana_dasha_end: string | null;
  moon_nakshatra: number;
  moon_sign: number;
  moon_degree: number;
  transit_lagna: number;
  transit_lagna_sign: number;
  hourly_score: number;
  prediction_text: null;
}

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

  // Delete existing predictions if force is true
  if (force) {
    const deleted = deletePredictionsForProfile(profileId);
    console.log(`Deleted ${deleted} existing predictions.`);
  }

  // Parse cached data with error handling
  let dashas: any[];
  let chart: any;
  try {
    const rawDashas = JSON.parse(cache.dashas_json || '[]');
    // Convert date strings to Date objects for dasha calculations
    dashas = rawDashas.map((d: any) => ({
      ...d,
      mahadasha: d.mahadasha ? {
        ...d.mahadasha,
        startDate: new Date(d.mahadasha.startDate),
        endDate: new Date(d.mahadasha.endDate),
      } : undefined,
      antardasha: Array.isArray(d.antardasha) ? d.antardasha.map((a: any) => ({
        ...a,
        startDate: new Date(a.startDate),
        endDate: new Date(a.endDate),
      })) : [],
      prana: d.prana ? {
        ...d.prana,
        startDate: new Date(d.prana.startDate),
        endDate: new Date(d.prana.endDate),
      } : null,
    }));
    chart = JSON.parse(cache.chart_json);
  } catch (e) {
    console.error(`Failed to parse cached data for profile ${profileId}:`, e);
    return 0;
  }

  // Generate for next 30 days
  const predictions: HourlyPredictionInput[] = [];
  const now = new Date();

  for (let day = 0; day < CACHE_DAYS; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split('T')[0]!;

    for (let hour = 0; hour < HOURS_PER_DAY; hour++) {
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
        sookshma_dasha_start: toISOString(dashaAtTime?.sookshma.startDate) ?? null,
        sookshma_dasha_end: toISOString(dashaAtTime?.sookshma.endDate) ?? null,
        prana_dasha_planet: dashaAtTime?.prana.planet ?? null,
        prana_dasha_start: toISOString(dashaAtTime?.prana.startDate) ?? null,
        prana_dasha_end: toISOString(dashaAtTime?.prana.endDate) ?? null,
        moon_nakshatra: transit.moonNakshatra,
        moon_sign: transit.moonSign,
        moon_degree: transit.moonDegree,
        transit_lagna: transit.lagna,
        transit_lagna_sign: transit.lagnaSign,
        hourly_score: score,
        prediction_text: null,
      });
    }
  }

  // Save to database
  saveHourlyPredictions(predictions);
  console.log(`Generated ${predictions.length} hourly predictions for ${profile.name}`);
  return predictions.length;
}

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

  const predictions: HourlyPredictionInput[] = [];
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

interface PredictCacheOptions {
  id?: string;
  timezone?: string;
  force?: boolean;
}

async function predictCacheAction(options: PredictCacheOptions) {
  runMigrations(true);

  // Clean old data first
  console.log('Cleaning old predictions...');
  const deleted = deleteOldPredictions();
  console.log(`Deleted ${deleted} old prediction records.`);

  const profiles = options.id
    ? [getProfile(options.id)].filter(Boolean)
    : getReadyProfiles();

  if (profiles.length === 0) {
    console.log('No ready profiles found.');
    return;
  }

  console.log(`\nGenerating cache for ${profiles.length} profile(s)...\n`);

  let totalGenerated = 0;
  for (const profile of profiles) {
    if (!profile) continue;
    try {
      const tz = options.timezone || profile.timezone;
      const count = await generateHourlyCacheForProfile(profile.id, tz, options.force ?? false);
      totalGenerated += count;
    } catch (err) {
      console.error(`Error generating cache for ${profile.name}:`, err);
    }
  }

  console.log(`\nTotal hourly predictions generated: ${totalGenerated}`);
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

program
  .command('process')
  .description('Process profiles (run without args for all new profiles)')
  .option('-i, --id <id>', 'Process specific profile ID')
  .option('-f, --force', 'Force reprocess even if already processed')
  .action(processAction);

program
  .command('list')
  .description('List all profiles with their status')
  .action(listAction);

program
  .command('report')
  .description('Generate a detailed report for a profile')
  .requiredOption('-i, --id <id>', 'Profile ID')
  .action(reportAction);

program
  .command('predict-cache')
  .description('Pre-generate 30-day hourly prediction cache (for cron)')
  .option('-i, --id <id>', 'Specific profile ID (default: all ready profiles)')
  .option('-t, --timezone <tz>', 'Timezone for predictions')
  .option('-f, --force', 'Force regeneration even if cache exists')
  .action(predictCacheAction);

interface PredictOptions {
  id: string;
  date: string;
  timezone?: string;
  hourly?: boolean;
  json?: boolean;
}

async function predictAction(options: PredictOptions) {
  runMigrations(true);

  const profile = getProfile(options.id);
  if (!profile) {
    console.error(`Profile not found: ${options.id}`);
    process.exit(1);
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(options.date)) {
    console.error(`Invalid date format: ${options.date}. Use YYYY-MM-DD.`);
    process.exit(1);
  }

  const timezone = options.timezone || profile.timezone;
  const date = options.date;

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

    // Get chart data for category calculation
    const cache = getCachedCalculation(profile.id);
    let chart: any = null;
    if (cache) {
      try {
        chart = JSON.parse(cache.chart_json);
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Calculate categories for each hour and build trend strings
    const hourlyTrends: string[] = [];

    for (const p of predictions) {
      const time = `${String(p.hour).padStart(2, '0')}:00`;

      if (chart) {
        const transit = {
          moonLongitude: 0,
          moonNakshatra: p.moon_nakshatra ?? 0,
          moonSign: p.moon_sign ?? 0,
          moonDegree: p.moon_degree ?? 0,
          lagna: p.transit_lagna ?? 0,
          lagnaSign: p.transit_lagna_sign ?? 0,
          venusSign: null,
          jupiterSign: null,
        };
        const dashaPlanet = p.prana_dasha_planet as any;
        const categories = calculateHourlyCategories(transit, dashaPlanet, chart);

        // Build trend string from categories
        const trends: string[] = [];
        const trendMap: Record<string, string> = {
          career: 'C',
          finance: 'F',
          health: 'H',
          relationships: 'R',
          education: 'E',
        };

        for (const [cat, trend] of Object.entries(categories)) {
          if (cat === 'overall') continue;
          const trendResult = parseCategoryTrend(trend as string);
          if (trendResult === 'positive') trends.push(`↑${trendMap[cat]}`);
          else if (trendResult === 'negative') trends.push(`↓${trendMap[cat]}`);
        }

        hourlyTrends.push(`${time} | ${trends.join(' ')}`);
      } else {
        // Fallback if no chart data
        const score = p.hourly_score ?? 50;
        const mood = score >= 70 ? '↑' : score >= 50 ? '-' : '↓';
        hourlyTrends.push(`${time} | ${mood}`);
      }
    }

    // Print all hourly trends
    for (const line of hourlyTrends) {
      console.log(line);
    }

    // Calculate and show category summary if we have chart data
    if (chart && cache) {
      console.log('\n--- Category Summary ---');

      // Calculate categories for each hour and determine best/worst for each category
      type CategoryTrendType = 'career' | 'finance' | 'health' | 'relationships' | 'education';

      const categoryBestWorst: Record<CategoryTrendType, { best: number; worst: number; bestScore: number; worstScore: number }> = {
        career: { best: 0, worst: 0, bestScore: -1, worstScore: 101 },
        finance: { best: 0, worst: 0, bestScore: -1, worstScore: 101 },
        health: { best: 0, worst: 0, bestScore: -1, worstScore: 101 },
        relationships: { best: 0, worst: 0, bestScore: -1, worstScore: 101 },
        education: { best: 0, worst: 0, bestScore: -1, worstScore: 101 },
      };

      // Calculate hourly categories and track best/worst for each
      // Also track absolute best/worst by score as fallback for neutral categories
      let absBestHour = 0;
      let absWorstHour = 0;
      let absBestScore = -1;
      let absWorstScore = 101;

      for (let i = 0; i < predictions.length; i++) {
        const p = predictions[i];
        if (!p) continue;

        const transit = {
          moonLongitude: 0,
          moonNakshatra: p.moon_nakshatra ?? 0,
          moonSign: p.moon_sign ?? 0,
          moonDegree: p.moon_degree ?? 0,
          lagna: p.transit_lagna ?? 0,
          lagnaSign: p.transit_lagna_sign ?? 0,
          venusSign: null,
          jupiterSign: null,
        };
        const dashaPlanet = p.prana_dasha_planet as any;
        const categories = calculateHourlyCategories(transit, dashaPlanet, chart);
        const score = p.hourly_score ?? 50;

        // Track absolute best/worst by score
        if (score > absBestScore) {
          absBestScore = score;
          absBestHour = i;
        }
        if (score < absWorstScore) {
          absWorstScore = score;
          absWorstHour = i;
        }

        for (const cat of ['career', 'finance', 'health', 'relationships', 'education'] as CategoryTrendType[]) {
          const trend = parseCategoryTrend(categories[cat]);
          const cw = categoryBestWorst[cat];

          if (trend === 'positive' && score > cw.bestScore) {
            cw.best = i;
            cw.bestScore = score;
          }
          if (trend === 'negative' && score < cw.worstScore) {
            cw.worst = i;
            cw.worstScore = score;
          }
        }
      }

      // Helper to format hour with fallback for unset values
      const formatHourWithFallback = (cat: CategoryTrendType) => {
        const cw = categoryBestWorst[cat];
        const bestHour = cw.bestScore > -1 ? cw.best : absBestHour;
        const bestScore = cw.bestScore > -1 ? cw.bestScore : absBestScore;
        const worstHour = cw.worstScore < 101 ? cw.worst : absWorstHour;
        const worstScore = cw.worstScore < 101 ? cw.worstScore : absWorstScore;
        return {
          best: `${String(bestHour).padStart(2, '0')}:00 (${bestScore})`,
          worst: `${String(worstHour).padStart(2, '0')}:00 (${worstScore})`
        };
      };

      // Get first hour's categories for overall summary
      const firstPred = predictions[0];
      if (firstPred) {
        const transit = {
          moonLongitude: 0,
          moonNakshatra: firstPred.moon_nakshatra ?? 0,
          moonSign: firstPred.moon_sign ?? 0,
          moonDegree: firstPred.moon_degree ?? 0,
          lagna: firstPred.transit_lagna ?? 0,
          lagnaSign: firstPred.transit_lagna_sign ?? 0,
          venusSign: null,
          jupiterSign: null,
        };
        const dashaPlanet = firstPred.prana_dasha_planet as any;
        const categories = calculateHourlyCategories(transit, dashaPlanet, chart);

        const careerTimes = formatHourWithFallback('career');
        const financeTimes = formatHourWithFallback('finance');
        const healthTimes = formatHourWithFallback('health');
        const relTimes = formatHourWithFallback('relationships');
        const eduTimes = formatHourWithFallback('education');

        console.log(`Career:        ${categories.career}`);
        console.log(`                Best: ${careerTimes.best} | Worst: ${careerTimes.worst}`);

        console.log(`Finance:       ${categories.finance}`);
        console.log(`                Best: ${financeTimes.best} | Worst: ${financeTimes.worst}`);

        console.log(`Health:        ${categories.health}`);
        console.log(`                Best: ${healthTimes.best} | Worst: ${healthTimes.worst}`);

        console.log(`Relationships: ${categories.relationships}`);
        console.log(`                Best: ${relTimes.best} | Worst: ${relTimes.worst}`);

        console.log(`Education:     ${categories.education}`);
        console.log(`                Best: ${eduTimes.best} | Worst: ${eduTimes.worst}`);

        console.log(`${categories.overall}`);
      }
    }
  } else {
    // Show category summary (not hourly)
    console.log('\n--- Category Summary ---');

    // Get chart data for category calculation
    const cache = getCachedCalculation(profile.id);
    let chart: any = null;
    if (cache) {
      try {
        chart = JSON.parse(cache.chart_json);
      } catch (e) {
        // Ignore
      }
    }

    // Calculate categories for each hour and determine best/worst for each category
    type CategoryTrendType = 'career' | 'finance' | 'health' | 'relationships' | 'education';

    const categoryBestWorst: Record<CategoryTrendType, { best: number; worst: number; bestScore: number; worstScore: number }> = {
      career: { best: 0, worst: 0, bestScore: -1, worstScore: 101 },
      finance: { best: 0, worst: 0, bestScore: -1, worstScore: 101 },
      health: { best: 0, worst: 0, bestScore: -1, worstScore: 101 },
      relationships: { best: 0, worst: 0, bestScore: -1, worstScore: 101 },
      education: { best: 0, worst: 0, bestScore: -1, worstScore: 101 },
    };

    // Calculate hourly categories and track best/worst for each
    // Also track absolute best/worst by score as fallback for neutral categories
    let absBestHour = 0;
    let absWorstHour = 0;
    let absBestScore = -1;
    let absWorstScore = 101;

    for (let i = 0; i < predictions.length; i++) {
      const p = predictions[i];
      if (!p) continue;

      const transit = {
        moonLongitude: 0,
        moonNakshatra: p.moon_nakshatra ?? 0,
        moonSign: p.moon_sign ?? 0,
        moonDegree: p.moon_degree ?? 0,
        lagna: p.transit_lagna ?? 0,
        lagnaSign: p.transit_lagna_sign ?? 0,
        venusSign: null,
        jupiterSign: null,
      };
      const dashaPlanet = p.prana_dasha_planet as any;
      const categories = calculateHourlyCategories(transit, dashaPlanet, chart);
      const score = p.hourly_score ?? 50;

      // Track absolute best/worst by score
      if (score > absBestScore) {
        absBestScore = score;
        absBestHour = i;
      }
      if (score < absWorstScore) {
        absWorstScore = score;
        absWorstHour = i;
      }

      for (const cat of ['career', 'finance', 'health', 'relationships', 'education'] as CategoryTrendType[]) {
        const trend = parseCategoryTrend(categories[cat]);
        const cw = categoryBestWorst[cat];

        if (trend === 'positive' && score > cw.bestScore) {
          cw.best = i;
          cw.bestScore = score;
        }
        if (trend === 'negative' && score < cw.worstScore) {
          cw.worst = i;
          cw.worstScore = score;
        }
      }
    }

    // Helper to format hour with fallback for unset values
    const formatHourWithFallback = (cat: CategoryTrendType) => {
      const cw = categoryBestWorst[cat];
      const bestHour = cw.bestScore > -1 ? cw.best : absBestHour;
      const bestScore = cw.bestScore > -1 ? cw.bestScore : absBestScore;
      const worstHour = cw.worstScore < 101 ? cw.worst : absWorstHour;
      const worstScore = cw.worstScore < 101 ? cw.worstScore : absWorstScore;
      return {
        best: `${String(bestHour).padStart(2, '0')}:00 (${bestScore})`,
        worst: `${String(worstHour).padStart(2, '0')}:00 (${worstScore})`
      };
    };

    // Get midday prediction for overall summary text
    const middayPred = predictions[12]; // Use noon as representative
    if (middayPred && chart) {
      const transit = {
        moonLongitude: 0,
        moonNakshatra: middayPred.moon_nakshatra ?? 0,
        moonSign: middayPred.moon_sign ?? 0,
        moonDegree: middayPred.moon_degree ?? 0,
        lagna: middayPred.transit_lagna ?? 0,
        lagnaSign: middayPred.transit_lagna_sign ?? 0,
        venusSign: null,
        jupiterSign: null,
      };
      const dashaPlanet = middayPred.prana_dasha_planet as any;
      const categories = calculateHourlyCategories(transit, dashaPlanet, chart);

      const careerTimes = formatHourWithFallback('career');
      const financeTimes = formatHourWithFallback('finance');
      const healthTimes = formatHourWithFallback('health');
      const relTimes = formatHourWithFallback('relationships');
      const eduTimes = formatHourWithFallback('education');

      console.log(`Career:        ${categories.career}`);
      console.log(`                Best: ${careerTimes.best} | Worst: ${careerTimes.worst}`);

      console.log(`Finance:       ${categories.finance}`);
      console.log(`                Best: ${financeTimes.best} | Worst: ${financeTimes.worst}`);

      console.log(`Health:        ${categories.health}`);
      console.log(`                Best: ${healthTimes.best} | Worst: ${healthTimes.worst}`);

      console.log(`Relationships: ${categories.relationships}`);
      console.log(`                Best: ${relTimes.best} | Worst: ${relTimes.worst}`);

      console.log(`Education:     ${categories.education}`);
      console.log(`                Best: ${eduTimes.best} | Worst: ${eduTimes.worst}`);

      console.log(`${categories.overall}`);
    }
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

interface PredictMonthOptions {
  id: string;
  month: string;
  timezone?: string;
  json?: boolean;
}

async function predictMonthAction(options: PredictMonthOptions) {
  runMigrations(true);

  const profile = getProfile(options.id);
  if (!profile) {
    console.error(`Profile not found: ${options.id}`);
    process.exit(1);
  }

  // Parse month (YYYY-MM format)
  const monthRegex = /^(\d{4})-(\d{2})$/;
  const match = options.month.match(monthRegex);
  if (!match) {
    console.error(`Invalid month format: ${options.month}. Use YYYY-MM (e.g., 2027-01)`);
    process.exit(1);
  }

  const year = parseInt(match[1]!, 10);
  const month = parseInt(match[2]!, 10);

  if (month < 1 || month > 12) {
    console.error(`Invalid month: ${month}. Must be 1-12.`);
    process.exit(1);
  }

  const timezone = options.timezone || profile.timezone;

  // Convert timezone to offset for the given month/year
  const timezoneOffset = getTimezoneOffset(timezone, year, month);

  // Get cached data
  const cache = getCachedCalculation(options.id);
  if (!cache || !cache.chart_json || !cache.dashas_json) {
    console.error(`No calculations found for profile ${options.id}. Run process first.`);
    process.exit(1);
  }

  let chart: any;
  let dashas: any[];
  try {
    chart = JSON.parse(cache.chart_json);
    dashas = JSON.parse(cache.dashas_json);
  } catch (e) {
    console.error(`Failed to parse cached data: ${e}`);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(70));
  console.log(`MONTHLY PREDICTIONS: ${getMonthName(month)} ${year}`);
  console.log(`Profile: ${profile.name}`);
  console.log(`Location: ${profile.place_name || 'Unknown'} (${timezone})`);
  console.log('='.repeat(70));

  // Generate monthly predictions
  console.log('\nGenerating predictions for all days in the month...\n');

  const monthly = generateMonthlyPredictions(
    year,
    month,
    profile.lat,
    profile.lon,
    timezoneOffset,
    chart,
    dashas
  );

  if (options.json) {
    console.log(JSON.stringify({
      profileId: profile.id,
      profileName: profile.name,
      month: options.month,
      predictions: monthly,
    }, null, 2));
    return;
  }

  // Monthly overview
  console.log('━'.repeat(60));
  console.log('MONTHLY OVERVIEW');
  console.log('━'.repeat(60));
  console.log(`Average Score: ${monthly.monthly.avgScore}/100`);
  console.log(`Best Days: ${monthly.monthly.bestDays.join(', ')}`);
  console.log(`Worst Days: ${monthly.monthly.worstDays.join(', ')}`);

  // Weekly summary
  console.log('\n' + '━'.repeat(60));
  console.log('WEEKLY SUMMARY');
  console.log('━'.repeat(60));
  for (const week of monthly.weekly) {
    const scoreEmoji = week.avgScore >= 70 ? '🟢' : week.avgScore >= 50 ? '🟡' : '🔴';
    console.log(`Week ${week.week} (${week.startDate} - ${week.endDate}): ${scoreEmoji} ${week.avgScore} - ${week.highlight}`);
    console.log(`  Best: ${week.bestDay} | Worst: ${week.worstDay}`);
  }

  // Category highlights
  console.log('\n' + '━'.repeat(60));
  console.log('CATEGORY HIGHLIGHTS');
  console.log('━'.repeat(60));

  const catNames: Record<string, string> = {
    career: 'Career',
    finance: 'Finance',
    health: 'Health',
    relationships: 'Relationships',
    education: 'Education',
  };

  for (const [cat, name] of Object.entries(catNames)) {
    const highlights = monthly.monthly.categoryHighlights[cat as keyof typeof monthly.monthly.categoryHighlights];
    if (highlights.positive.length > 0) {
      console.log(`\n${name} - Best Days: ${highlights.positive.join(', ')}`);
    }
    if (highlights.negative.length > 0) {
      console.log(`${name} - Challenging Days: ${highlights.negative.join(', ')}`);
    }
  }

  // Daily breakdown
  console.log('\n' + '━'.repeat(60));
  console.log('DAILY BREAKDOWN');
  console.log('━'.repeat(60));

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (const day of monthly.daily) {
    const scoreEmoji = day.avgScore >= 70 ? '🟢' : day.avgScore >= 50 ? '🟡' : '🔴';
    const dayOfMonth = parseInt(day.date.split('-')[2]!, 10);

    console.log(`\n${monthNames[month - 1]} ${dayOfMonth}: ${scoreEmoji} Score: ${day.avgScore}`);
    console.log(`  Best Hour: ${String(day.bestHour).padStart(2, '0')}:00 (${day.bestScore}) | Worst Hour: ${String(day.worstHour).padStart(2, '0')}:00 (${day.worstScore})`);

    // Show category trends
    const trends: string[] = [];
    for (const [cat, trend] of Object.entries(day.categories)) {
      if (trend === 'positive') trends.push(`↑${cat.charAt(0).toUpperCase()}`);
      else if (trend === 'negative') trends.push(`↓${cat.charAt(0).toUpperCase()}`);
    }
    if (trends.length > 0) {
      console.log(`  Trends: ${trends.join(' ')}`);
    }

    // Show significant events
    if (day.significantEvents.length > 0) {
      for (const event of day.significantEvents) {
        console.log(`  ✦ ${event}`);
      }
    }
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

function getMonthName(month: number): string {
  const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return names[month - 1] || 'Unknown';
}

/**
 * Convert timezone string to offset in hours for a specific date.
 */
function getTimezoneOffset(timezone: string, year: number, month: number): number {
  // Create a date in UTC and get its offset in the target timezone
  const date = new Date(Date.UTC(year, month - 1, 15, 12, 0, 0));
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  const offsetMs = tzDate.getTime() - utcDate.getTime();
  return offsetMs / (1000 * 60 * 60);
}

program
  .command('predict')
  .description('Get daily/hourly predictions for a profile')
  .requiredOption('-i, --id <id>', 'Profile ID')
  .requiredOption('-d, --date <date>', 'Date (YYYY-MM-DD)')
  .option('-t, --timezone <tz>', 'Timezone (default: profile birth timezone)')
  .option('-h, --hourly', 'Show hourly breakdown')
  .option('--json', 'Output JSON')
  .action(predictAction);

program
  .command('predict-month')
  .description('Get monthly predictions with daily/weekly breakdown and category highlights')
  .requiredOption('-i, --id <id>', 'Profile ID')
  .requiredOption('-m, --month <month>', 'Month (YYYY-MM format, e.g., 2027-01)')
  .option('-t, --timezone <tz>', 'Timezone (default: profile birth timezone)')
  .option('--json', 'Output JSON')
  .action(predictMonthAction);

interface DeleteOptions {
  id: string;
  force?: boolean;
}

function deleteAction(options: DeleteOptions) {
  runMigrations(true);

  const profile = getProfile(options.id);
  if (!profile) {
    console.error(`Profile not found: ${options.id}`);
    process.exit(1);
  }

  if (!options.force) {
    console.log(`About to delete profile:`);
    console.log(`  Name: ${profile.name}`);
    console.log(`  DOB: ${profile.dob_utc}`);
    console.log(`  Place: ${profile.place_name}`);
    console.log(`\nThis will also delete all cached calculations, hourly predictions, and journal events.`);
    console.log(`\nRun with --force to confirm deletion.`);
    process.exit(1);
  }

  console.log(`Deleting profile: ${profile.name} (${profile.id})`);
  deleteProfile(profile.id);
  console.log('Profile and all related data deleted successfully.');
}

program
  .command('delete')
  .description('Delete a profile and all its data')
  .requiredOption('-i, --id <id>', 'Profile ID to delete')
  .option('-f, --force', 'Skip confirmation and delete immediately')
  .action(deleteAction);

program
  .command('timezones')
  .description('List valid timezone options')
  .action(() => {
    console.log('\nValid timezone options:\n');
    // Group by region
    const regions: Record<string, string[]> = {
      'Asia': VALID_TIMEZONES.filter(t => t.startsWith('Asia/')),
      'Europe': VALID_TIMEZONES.filter(t => t.startsWith('Europe/')),
      'Americas': VALID_TIMEZONES.filter(t => t.startsWith('America/')),
      'Pacific': VALID_TIMEZONES.filter(t => t.startsWith('Pacific/')),
      'US': VALID_TIMEZONES.filter(t => t.startsWith('US/')),
      'UTC': ['UTC'],
    };
    for (const [region, zones] of Object.entries(regions)) {
      console.log(`${region}:`);
      for (const tz of zones) {
        console.log(`  ${tz}`);
      }
      console.log('');
    }
  });

program.parse(process.argv);
