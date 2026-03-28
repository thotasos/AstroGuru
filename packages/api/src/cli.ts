#!/usr/bin/env node

import { Command } from 'commander';
import { createProfile, getAllProfiles, getProfile, deleteProfile } from './database/profiles.js';
import { runMigrations } from './database/migrate.js';
import { getCachedCalculation, saveHourlyPredictions, getHourlyPredictions, deleteOldPredictions, deletePredictionsForProfile, getReadyProfiles } from './database/cache.js';
import { runProcessor, processProfile, processAllNewProfiles } from './jobs/processor.js';
import { calculateTransit, calculateHourlyScore, calculateHourlyCategories, parseCategoryTrend, getDashaAtDate, generateImmediatePredictions, generateMonthlyPredictions } from '@parashari/core';
import { checkOllamaAvailable, generateAISummary, parseAIResponse, type OllamaSummaryData } from './services/ollamaService.js';

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
  remedies?: boolean;
}

async function reportAction(options: ReportOptions) {
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

  // Display remedies if requested
  if (options.remedies && hasChart && hasDashas && cache.chart_json && cache.dashas_json) {
    const { calculateRemediations } = await import('@parashari/core');
    const transit = calculateTransit(
      new Date(),
      profile.lat,
      profile.lon,
      profile.ayanamsa_id,
    );
    const dashas = JSON.parse(cache.dashas_json);
    const chart = JSON.parse(cache.chart_json);
    const report = calculateRemediations(chart, dashas, transit, { includeLifetime: true, maxResults: 5 });
    displayRemediationReport(report);
  }
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

interface NaturalLanguageSummary {
  career: string;
  finance: string;
  health: string;
  relationships: string;
  education: string;
}

/**
 * Print template-based summary (used as fallback or when --ai-summary not specified)
 */
function printTemplateSummary(summary: NaturalLanguageSummary): void {
  console.log(`Career: ${summary.career}`);
  console.log();
  console.log(`Finance: ${summary.finance}`);
  console.log();
  console.log(`Health: ${summary.health}`);
  console.log();
  console.log(`Relationships: ${summary.relationships}`);
  console.log();
  console.log(`Education: ${summary.education}`);
}

/**
 * Display a remediation report in the CLI output format
 */
function displayRemediationReport(report: {
  immediate: { periodDescription: string; stressedPlanets: any[]; remedies: any[] };
  lifetime: { stressedPlanets: any[]; remedies: any[] };
}): void {
  console.log('\n=== REMEDIATIONS ===\n');

  // Immediate (dasha-triggered) stresses
  if (report.immediate.stressedPlanets.length > 0) {
    console.log(`IMMEDIATE (${report.immediate.periodDescription}):`);
    for (const remedy of report.immediate.remedies) {
      const typeLabel = remedy.type.toUpperCase().replace('_', ' ');
      console.log(`  [${typeLabel}] ${remedy.name} — ${remedy.description}`);
    }
    console.log();
  }

  // Lifetime chart stresses
  if (report.lifetime.stressedPlanets.length > 0) {
    console.log('LIFETIME CHART STRESSES:');
    for (const remedy of report.lifetime.remedies) {
      const typeLabel = remedy.type.toUpperCase().replace('_', ' ');
      console.log(`  [${typeLabel}] ${remedy.name} — ${remedy.description}`);
    }
  } else {
    console.log('No significant planetary stresses detected.');
  }
}

/**
 * Build Ollama summary data from predictions and chart
 */
function buildOllamaSummaryData(
  predictions: HourlyPredictionInput[],
  chart: any,
  profile: any,
  date: string,
  timezone: string,
  dashas?: any[]
): OllamaSummaryData {
  const SIGN_NAMES = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const PLANET_NAMES = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

  const natalLagnaSign = chart ? Math.floor(chart.ascendant / 30) : 0;
  const natalMoon = chart?.planets?.find((p: any) => p.planet === 1);
  const natalMoonNakshatra = natalMoon?.nakshatra ?? 15;

  // Get birth chart summary
  const birthChartSummary = chart ? buildBirthChartSummary(chart, SIGN_NAMES, PLANET_NAMES) : 'Birth chart data not available';

  // Calculate current dasha from the dasha tree
  let currentMahadasha = 'Venus';
  let currentAntardasha = 'Venus';
  if (dashas && dashas.length > 0) {
    try {
      const targetDate = new Date(date + 'T12:00:00Z');
      const dashaResult = getDashaAtDate(dashas, targetDate);
      if (dashaResult) {
        currentMahadasha = PLANET_NAMES[dashaResult.mahadasha.planet] ?? 'Unknown';
        currentAntardasha = PLANET_NAMES[dashaResult.antardasha.planet] ?? 'Unknown';
      }
    } catch (e) {
      // Fall back to defaults if dasha calculation fails
    }
  }

  const predictionData = predictions.map(p => ({
    hour: p.hour,
    pranaDashaPlanet: PLANET_NAMES[p.prana_dasha_planet ?? 0] ?? 'Unknown',
    sookshmaDashaPlanet: PLANET_NAMES[p.sookshma_dasha_planet ?? 0] ?? 'Unknown',
    moonNakshatra: p.moon_nakshatra ?? 0,
    moonSign: p.moon_sign ?? 0,
    transitLagnaSign: p.transit_lagna_sign ?? 0,
    hourlyScore: p.hourly_score ?? 50,
  }));

  return {
    profileName: profile.name,
    date,
    timezone,
    natalLagnaSign,
    natalMoonNakshatra,
    currentMahadasha,
    currentAntardasha,
    birthChartSummary,
    predictions: predictionData,
  };
}

/**
 * Build a summary of the birth chart for Ollama prompt
 */
function buildBirthChartSummary(chart: any, signs: string[], planets: string[]): string {
  const lines: string[] = [];

  // Ascendant
  lines.push(`Ascendant: ${signs[Math.floor(chart.ascendant / 30)]} (${chart.ascendant.toFixed(1)}°)`);

  // Key planets
  if (chart.planets) {
    const keyPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const;
    const planetMap: Record<string, number> = { Sun: 0, Moon: 1, Mars: 2, Mercury: 3, Jupiter: 4, Venus: 5, Saturn: 6 };

    for (const name of keyPlanets) {
      const p = chart.planets.find((x: any) => x.planet === planetMap[name]);
      if (p) {
        lines.push(`${name}: ${signs[p.sign]} ${p.degreeInSign.toFixed(1)}° in ${p.nakshatra} nakshatra`);
      }
    }
  }

  return lines.join(' | ');
}

/**
 * Build summary data for monthly predictions
 */
function buildMonthlySummaryData(
  monthly: any,
  profile: any,
  month: string,
  timezone: string,
  chart?: any,
  dashas?: any[]
): OllamaSummaryData {
  const SIGN_NAMES = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const PLANET_NAMES = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

  // Get natal chart info from chart data
  const natalLagnaSign = chart ? Math.floor(chart.ascendant / 30) : 0;
  const natalMoon = chart?.planets?.find((p: any) => p.planet === 1);
  const natalMoonNakshatra = natalMoon?.nakshatra ?? 15;

  // Calculate current Mahadasha/Antardasha for the month
  let currentMahadasha = 'Venus';
  let currentAntardasha = 'Venus';
  if (dashas && dashas.length > 0) {
    try {
      // Use middle of the month for dasha calculation
      const [year, mon] = month.split('-').map(Number);
      const midMonthDate = new Date(Date.UTC(year, mon - 1, 15, 12, 0, 0));
      const dashaResult = getDashaAtDate(dashas, midMonthDate);
      if (dashaResult) {
        currentMahadasha = PLANET_NAMES[dashaResult.mahadasha.planet] ?? 'Unknown';
        currentAntardasha = PLANET_NAMES[dashaResult.antardasha.planet] ?? 'Unknown';
      }
    } catch (e) {
      // Fall back to defaults if dasha calculation fails
    }
  }

  // Build monthly overview
  const monthlyOverview = `Month: ${month} | Average Score: ${monthly.monthly.avgScore}/100 | Best Days: ${monthly.monthly.bestDays.join(', ')} | Worst Days: ${monthly.monthly.worstDays.join(', ')}`;

  // Build weekly summary
  const weeklySummary = monthly.weekly.map((w: any) =>
    `Week ${w.week}: ${w.startDate}-${w.endDate} Score: ${w.avgScore} - ${w.highlight}`
  ).join('\n');

  // Build top positive and negative days
  const topPositiveDays = monthly.daily
    .filter((d: any) => d.avgScore >= 70)
    .slice(0, 5)
    .map((d: any) => `${d.date} (${d.avgScore})`)
    .join(', ');

  const topNegativeDays = monthly.daily
    .filter((d: any) => d.avgScore < 50)
    .slice(0, 5)
    .map((d: any) => `${d.date} (${d.avgScore})`)
    .join(', ');

  // Build category analysis
  const catNames: Record<string, string> = { career: 'Career', finance: 'Finance', health: 'Health', relationships: 'Relationships', education: 'Education' };
  let categoryAnalysis = '';
  for (const [cat, name] of Object.entries(catNames)) {
    const highlights = monthly.monthly.categoryHighlights[cat as keyof typeof monthly.monthly.categoryHighlights];
    if (highlights.positive.length > 0) {
      categoryAnalysis += `${name} Best Days: ${highlights.positive.join(', ')}. `;
    }
    if (highlights.negative.length > 0) {
      categoryAnalysis += `${name} Challenging Days: ${highlights.negative.join(', ')}. `;
    }
  }

  const predictionData = monthly.daily.slice(0, 10).map((d: any) => ({
    hour: d.bestHour,
    // Get dasha planet from daily data if available, otherwise calculate
    pranaDashaPlanet: d.pranaDashaPlanet !== undefined ? PLANET_NAMES[d.pranaDashaPlanet] ?? 'Unknown' : currentMahadasha,
    sookshmaDashaPlanet: d.sookshmaDashaPlanet !== undefined ? PLANET_NAMES[d.sookshmaDashaPlanet] ?? 'Unknown' : currentAntardasha,
    moonNakshatra: d.moonNakshatra ?? natalMoonNakshatra,
    moonSign: d.moonSign ?? 0,
    transitLagnaSign: d.transitLagna ?? 0,
    hourlyScore: d.avgScore,
  }));

  return {
    profileName: profile.name,
    date: month,
    timezone,
    natalLagnaSign,
    natalMoonNakshatra,
    currentMahadasha,
    currentAntardasha,
    birthChartSummary: `Monthly overview: ${monthlyOverview}. Weekly: ${weeklySummary}. Top positive days: ${topPositiveDays || 'None'}. Top challenging days: ${topNegativeDays || 'None'}. Categories: ${categoryAnalysis}`,
    predictions: predictionData,
  };
}

/**
 * Generate a detailed natural language summary for each category.
 * Analyzes hourly patterns to provide 2-3 sentence explanations.
 */
function generateNaturalLanguageSummary(
  predictions: HourlyPredictionInput[],
  chart: any,
  categoryBestWorst: Record<string, { best: number; worst: number; bestScore: number; worstScore: number }>
): NaturalLanguageSummary {
  const SIGN_NAMES = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const PLANET_NAMES = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

  // Get natal Lagna sign from chart
  const natalLagnaSign = chart ? Math.floor(chart.ascendant / 30) : 0;

  // Get natal Moon nakshatra for friendship analysis
  const natalMoon = chart?.planets?.find((p: any) => p.planet === 1);
  const natalMoonNakshatra = natalMoon?.nakshatra ?? 15;

  // Calculate Kendra positions dynamically
  const isKendra = (transitLagna: number) => {
    const houseFromLagna = (transitLagna - natalLagnaSign + 12) % 12;
    return houseFromLagna === 0 || houseFromLagna === 3 || houseFromLagna === 6 || houseFromLagna === 9;
  };

  // Analyze actual career hours from predictions
  const careerPositiveHours = predictions.filter(p => {
    const lagna = p.transit_lagna_sign ?? 0;
    return isKendra(lagna);
  });

  // Get best/worst from categoryBestWorst
  const careerBest = predictions[categoryBestWorst.career?.best ?? 0];
  const careerWorst = predictions[categoryBestWorst.career?.worst ?? 0];
  const careerBestScore = careerBest?.hourly_score ?? 50;
  const careerBestHour = categoryBestWorst.career?.best ?? 5;
  const careerWorstHour = categoryBestWorst.career?.worst ?? 13;

  // Analyze finance
  const financePositiveCount = predictions.filter(p => (p.hourly_score ?? 50) >= 70).length;
  const financeNegativeCount = predictions.filter(p => (p.hourly_score ?? 50) < 50).length;
  const financeBestHour = predictions[categoryBestWorst.finance?.best ?? 5];
  const financeWorstHour = predictions[categoryBestWorst.finance?.worst ?? 13];

  // Analyze health - Mars(4) and Rahu(7) prana dasha are challenging
  const challengingHealthHours = predictions.filter(p =>
    p.prana_dasha_planet === 4 || p.prana_dasha_planet === 7
  );

  // Analyze relationships
  const relBestHour = predictions[categoryBestWorst.relationships?.best ?? 5];
  const relWorstHour = predictions[categoryBestWorst.relationships?.worst ?? 13];

  // Analyze education
  const eduBestHour = predictions[categoryBestWorst.education?.best ?? 5];

  // Build summaries using ACTUAL data
  const career = buildCareerSummaryV2(
    predictions, careerBestHour, careerWorstHour, careerBestScore,
    natalLagnaSign, SIGN_NAMES, careerPositiveHours.length
  );
  const finance = buildFinanceSummaryV2(
    predictions, financeBestHour, financeWorstHour,
    financePositiveCount, financeNegativeCount, natalLagnaSign, SIGN_NAMES
  );
  const health = buildHealthSummaryV2(
    predictions, challengingHealthHours.length, natalLagnaSign, SIGN_NAMES
  );
  const relationships = buildRelationshipsSummaryV2(
    predictions, relBestHour, relWorstHour, natalMoonNakshatra, SIGN_NAMES, PLANET_NAMES
  );
  const education = buildEducationSummaryV2(
    predictions, eduBestHour, natalLagnaSign, SIGN_NAMES, PLANET_NAMES
  );

  return { career, finance, health, relationships, education };
}

function buildCareerSummaryV2(
  predictions: HourlyPredictionInput[],
  bestHour: number,
  worstHour: number,
  bestScore: number,
  lagnaSign: number,
  signs: string[],
  positiveKendraHours: number
): string {
  const bestPred = predictions[bestHour];
  const worstPred = predictions[worstHour];
  const bestLagna = bestPred?.transit_lagna_sign ?? 0;
  const worstLagna = worstPred?.transit_lagna_sign ?? 0;

  let summary = '';

  if (positiveKendraHours >= 18) {
    summary = `Career energy remains strongly positive for most of the day with ${positiveKendraHours} hours showing Transit Lagna in Kendra positions from your natal Scorpio Lagna. `;
  } else if (positiveKendraHours >= 12) {
    summary = `Career prospects are favorable during ${positiveKendraHours} hours today when Transit Lagna aligns well with your natal chart. `;
  } else if (positiveKendraHours >= 6) {
    summary = `Career energy fluctuates today with ${positiveKendraHours} hours showing supportive Lagna positions. `;
  } else {
    summary = `Career energy is challenging today with limited hours showing supportive Lagna positions. `;
  }

  if (bestScore >= 90) {
    summary += `The peak career window occurs at ${String(bestHour).padStart(2, '0')}:00 when Transit Lagna is in ${signs[bestLagna]} - excellent for workplace decisions, meetings, and professional activities. `;
  } else if (bestScore >= 70) {
    summary += `Best career hours are around ${String(bestHour).padStart(2, '0')}:00 (Lagna in ${signs[bestLagna]}) - favorable for workplace decisions. `;
  } else if (bestScore >= 50) {
    summary += `Career hours around ${String(bestHour).padStart(2, '0')}:00 offer moderate opportunities. `;
  } else {
    summary += `Not ideal for major career moves. The most challenging period is around ${String(worstHour).padStart(2, '0')}:00. `;
  }

  summary += bestScore >= 70
    ? `Consider scheduling important meetings or decisions during these peak hours.`
    : `Maintain routines and avoid risky career moves today.`;

  return summary;
}

function buildFinanceSummaryV2(
  predictions: HourlyPredictionInput[],
  bestHour: number,
  worstHour: number,
  positiveCount: number,
  negativeCount: number,
  lagnaSign: number,
  signs: string[]
): string {
  const bestPred = predictions[bestHour];
  const dashaPlanet = bestPred?.prana_dasha_planet ?? 0;
  const moonSign = bestPred?.moon_sign ?? 0;

  let summary = '';

  // Venus=5, Jupiter=6 in PLANET_NAMES, but prana_dasha_planet uses Planet enum where Venus=5, Jupiter=6
  const isVenusDasha = dashaPlanet === 5;
  const isJupiterDasha = dashaPlanet === 6;

  if (positiveCount >= 18 && negativeCount <= 4) {
    summary = `Finance sector shows excellent conditions today with ${positiveCount} favorable hours. `;
  } else if (positiveCount >= 12 && negativeCount <= 8) {
    summary = `Financial prospects are good today with moderately positive indicators in ${positiveCount} hours. `;
  } else if (negativeCount >= 12) {
    summary = `Financial caution is advised today with ${negativeCount} hours showing challenging conditions. `;
  } else {
    summary = `Financial prospects remain balanced today - neither strongly favorable nor unfavorable. `;
  }

  if (isVenusDasha) {
    summary += `Venus dasha influence at ${String(bestHour).padStart(2, '0')}:00 supports financial planning and wealth growth. `;
  } else if (isJupiterDasha) {
    summary += `Jupiter dasha at ${String(bestHour).padStart(2, '0')}:00 favors investments and monetary gains. `;
  } else if (moonSign === 1 || moonSign === 4 || moonSign === 10) {
    summary += `Moon transiting ${signs[moonSign]} around ${String(bestHour).padStart(2, '0')}:00 enhances financial intuition. `;
  } else {
    summary += `Current planetary positions favor maintaining steady financial practices. `;
  }

  if (negativeCount >= 12) {
    summary += `Avoid speculative investments and major purchases during the challenging hours (${String(worstHour).padStart(2, '0')}:00).`;
  } else if (positiveCount >= 18) {
    summary += `Favorable for investments, wealth accumulation, and financial planning.`;
  } else {
    summary += `Proceed with balanced approach - good for routine financial planning.`;
  }

  return summary;
}

function buildHealthSummaryV2(
  predictions: HourlyPredictionInput[],
  challengingCount: number,
  lagnaSign: number,
  planets: string[]
): string {
  const bestHour = predictions.reduce((best, p, i, arr) =>
    ((p.hourly_score ?? 50) > (arr[best]?.hourly_score ?? 0)) ? i : best, 0);
  const bestPred = predictions[bestHour];
  const bestMoonSign = bestPred?.moon_sign ?? 0;
  const bestPrana = bestPred?.prana_dasha_planet ?? 0;

  let summary = '';

  if (challengingCount === 0) {
    summary = `Health indicators are excellent throughout the day with no challenging Mars or Rahu dasha periods. `;
  } else if (challengingCount <= 4) {
    summary = `Health remains generally good with minor caution during ${challengingCount} hours when Mars or Rahu dasha periods are active. `;
  } else if (challengingCount <= 8) {
    summary = `Health caution is advised during ${challengingCount} hours today when Mars or Rahu dasha influence is stronger. `;
  } else {
    summary = `Health challenges may arise during multiple periods today - a total of ${challengingCount} hours show Mars/Rahu dasha influence. `;
  }

  // Mars=4, Rahu=7 in Planet enum
  if (bestPrana === 4) {
    summary += `Mars dasha at ${String(bestHour).padStart(2, '0')}:00 brings energy and drive but requires careful handling. `;
  } else if (bestPrana === 7) {
    summary += `Rahu dasha at ${String(bestHour).padStart(2, '0')}:00 requires patience and wisdom. `;
  } else if (bestMoonSign === 3 || bestMoonSign === 6) {
    summary += `Moon in ${signs[bestMoonSign]} at ${String(bestHour).padStart(2, '0')}:00 supports emotional balance and mental peace. `;
  } else {
    summary += `The planetary positions support overall well-being today. `;
  }

  summary += challengingCount === 0
    ? `Excellent day for exercise, health routines, and maintaining energy levels.`
    : challengingCount <= 4
      ? `Take normal precautions during challenging hours.`
      : `Consider light activities and avoid strenuous exercise during challenging periods.`;

  return summary;
}

function buildRelationshipsSummaryV2(
  predictions: HourlyPredictionInput[],
  bestHour: number,
  worstHour: number,
  natalMoonNakshatra: number,
  signs: string[],
  planets: string[]
): string {
  const bestPred = predictions[bestHour];
  const worstPred = predictions[worstHour];
  const dashaPlanet = bestPred?.prana_dasha_planet ?? 5;
  const moonNakshatra = bestPred?.moon_nakshatra ?? 0;
  const worstDasha = worstPred?.prana_dasha_planet ?? 0;

  // Venus=5, Mars=4, Jupiter=6 in Planet enum
  const isVenusDasha = dashaPlanet === 5;
  const isMarsDasha = dashaPlanet === 4 || worstDasha === 4;

  // Friendly nakshatra check
  const friendlyOffsets = [1, 7, 9, 13, 19, 21, 25];
  const nakshatraOffset = (moonNakshatra - natalMoonNakshatra + 27) % 27;
  const isFriendlyNakshatra = friendlyOffsets.includes(nakshatraOffset);

  let summary = '';

  if (isVenusDasha) {
    summary = `Venus dasha influence today strongly supports relationships, partnerships, and social harmony. `;
  } else if (isMarsDasha) {
    summary = `Mars dasha influence may create some tensions in relationships today - patience is advised. `;
  } else {
    summary = `Relationship energy remains steady but neutral today. `;
  }

  if (isFriendlyNakshatra && moonNakshatra !== natalMoonNakshatra) {
    summary += `Moon transiting a friendly nakshatra from your birth star around ${String(bestHour).padStart(2, '0')}:00 supports emotional connections and harmonious interactions. `;
  } else if (moonNakshatra === natalMoonNakshatra) {
    summary += `Moon returns to your birth nakshatra around ${String(bestHour).padStart(2, '0')}:00 - a significant emotional day for relationships. `;
  } else {
    summary += `Not particularly strong for forming new connections, but existing relationships can be nurtured. `;
  }

  summary += isVenusDasha
    ? `Excellent day for social activities, romantic pursuits, and strengthening bonds with loved ones.`
    : isMarsDasha
      ? `Good for maintaining existing relationships - avoid confrontations during challenging hours.`
      : `Good day for routine social interactions and strengthening existing bonds.`;

  return summary;
}

function buildEducationSummaryV2(
  predictions: HourlyPredictionInput[],
  bestHour: number,
  lagnaSign: number,
  signs: string[],
  planets: string[]
): string {
  const bestPred = predictions[bestHour];
  const dashaPlanet = bestPred?.prana_dasha_planet ?? 6;
  const moonSign = bestPred?.moon_sign ?? 0;

  // Jupiter=6, Mercury=3 in Planet enum
  const isJupiterDasha = dashaPlanet === 6;
  const isMercuryDasha = dashaPlanet === 3;

  // Calculate 4th house lord position
  const fourthHouseLord = (3 + lagnaSign) % 12;
  const fifthHouseLord = (4 + lagnaSign) % 12;
  const isFourthLordKendra = [0, 3, 6, 9].includes(fourthHouseLord);
  const isFifthLordKendra = [0, 3, 6, 9].includes(fifthHouseLord);

  let summary = '';

  if (isJupiterDasha) {
    summary = `Jupiter dasha strongly favors educational pursuits, wisdom development, and spiritual growth today. `;
  } else if (isMercuryDasha) {
    summary = `Mercury dasha supports intellectual activities, communication, and learning today. `;
  } else {
    summary = `Education sector receives moderate support from current planetary positions. `;
  }

  if (isFourthLordKendra) {
    summary += `Your 4th house lord (${signs[fourthHouseLord]}) in Kendra position strongly supports educational pursuits. `;
  } else if (isFifthLordKendra) {
    summary += `Your 5th house lord (${signs[fifthHouseLord]}) in Kendra favors creative learning and wisdom. `;
  } else if (moonSign === 2 || moonSign === 8) {
    summary += `Moon in ${signs[moonSign]} at ${String(bestHour).padStart(2, '0')}:00 enhances learning and mental clarity. `;
  } else {
    summary += `Normal learning activities are well-supported today. `;
  }

  summary += isJupiterDasha
    ? `Excellent day for studying, teaching, learning new skills, pursuing knowledge, or spiritual practices.`
    : isMercuryDasha
      ? `Excellent day for communication studies, writing, presentations, and intellectual discussions.`
      : `A good day for routine studies and intellectual activities.`;

  return summary;
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
        dashaAtTime?.prana?.planet ?? null,
        chart,
      );

      predictions.push({
        id: `${profileId}-${dateStr}-${hour}`,
        profile_id: profileId,
        date: dateStr,
        hour,
        timezone,
        sookshma_dasha_planet: dashaAtTime?.sookshma?.planet ?? null,
        sookshma_dasha_start: toISOString(dashaAtTime?.sookshma?.startDate) ?? null,
        sookshma_dasha_end: toISOString(dashaAtTime?.sookshma?.endDate) ?? null,
        prana_dasha_planet: dashaAtTime?.prana?.planet ?? null,
        prana_dasha_start: toISOString(dashaAtTime?.prana?.startDate) ?? null,
        prana_dasha_end: toISOString(dashaAtTime?.prana?.endDate) ?? null,
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
      pratyantardasha: d.pratyantardasha ? {
        ...d.pratyantardasha,
        startDate: new Date(d.pratyantardasha.startDate),
        endDate: new Date(d.pratyantardasha.endDate),
      } : null,
      sookshma: d.sookshma ? {
        ...d.sookshma,
        startDate: new Date(d.sookshma.startDate),
        endDate: new Date(d.sookshma.endDate),
      } : null,
      prana: d.prana ? {
        ...d.prana,
        startDate: new Date(d.prana.startDate),
        endDate: new Date(d.prana.endDate),
      } : null,
    }));
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
      dashaAtTime?.prana?.planet ?? null,
      chart,
    );

    predictions.push({
      id: `${profileId}-${dateStr}-${hour}`,
      profile_id: profileId,
      date: dateStr,
      hour,
      timezone,
      sookshma_dasha_planet: dashaAtTime?.sookshma?.planet ?? null,
      sookshma_dasha_start: toISOString(dashaAtTime?.sookshma?.startDate),
      sookshma_dasha_end: toISOString(dashaAtTime?.sookshma?.endDate),
      prana_dasha_planet: dashaAtTime?.prana?.planet ?? null,
      prana_dasha_start: toISOString(dashaAtTime?.prana?.startDate),
      prana_dasha_end: toISOString(dashaAtTime?.prana?.endDate),
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
  .description(`
Parashari Precision CLI — Vedic astrology predictions, dasha analysis, and remedies.

Quick start:
  parashari create -n "John Doe" -d 1990-05-15 -t 14:30 -p nalgonda-india
  parashari list
  parashari process
  parashari predict -i <id> -d 2026-03-27
  parashari report -i <id> --remedies

All commands:
  parashari create    Create a new birth profile
  parashari process   Calculate chart, dashas, Ashtakavarga for profiles
  parashari list      List all profiles
  parashari report    Detailed natal report with career/finance/health/relationships/education
  parashari predict   Daily or hourly predictions (use --hourly for 24h breakdown)
  parashari predict-month   Monthly predictions with daily/weekly breakdown
  parashari predict-cache    Pre-generate 30-day hourly cache (for cron)
  parashari delete    Delete a profile and all its data
  parashari timezones List all valid timezone options
  parashari --help    Show this help
`)
  .version('1.0.0');

program
  .command('create')
  .description('Create a new profile')
  .requiredOption('-n, --name <name>', 'Name of the person')
  .requiredOption('-d, --dob <date>', 'Date of birth (YYYY-MM-DD, e.g. 1990-05-15)')
  .requiredOption('-t, --time <time>', 'Time of birth (HH:MM in 24h format, e.g. 14:30)')
  .requiredOption('-p, --place <place>', 'Place of birth. Predefined: nalgonda-india, houston-texas, sunnyvale-california')
  .action(createProfileAction);

program
  .command('process')
  .description('Process profiles — calculate chart, dashas, and Ashtakavarga')
  .option('-i, --id <id>', 'Process specific profile ID')
  .option('-f, --force', 'Force reprocess even if already processed')
  .action(processAction);

program
  .command('list')
  .description('List all profiles with their status')
  .action(listAction);

program
  .command('report')
  .description('Generate a detailed report for a profile (career, finance, health, relationships, education)')
  .requiredOption('-i, --id <id>', 'Profile ID (see: parashari list)')
  .option('--remedies', 'Show gemstone, mantra, and color remedies for stressed planets')
  .action(reportAction);

program
  .command('predict-cache')
  .description('Pre-generate 30-day hourly prediction cache (run daily via cron)')
  .option('-i, --id <id>', 'Specific profile ID (default: all ready profiles)')
  .option('-t, --timezone <tz>', 'Timezone for predictions (see: parashari timezones)')
  .option('-f, --force', 'Force regeneration even if cache exists')
  .action(predictCacheAction);

interface PredictOptions {
  id: string;
  date: string;
  timezone?: string;
  hourly?: boolean;
  aiSummary?: boolean;
  json?: boolean;
  remedies?: boolean;
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
    let dashas: any[] = [];
    if (cache) {
      try {
        chart = JSON.parse(cache.chart_json);
        // Parse dashas with date conversion for dasha calculations
        const rawDashas = JSON.parse(cache.dashas_json || '[]');
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
          else trends.push(`→${trendMap[cat]}`); // neutral
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

        // Generate and display natural language summary
        if (chart) {
          // Check if AI summary is requested and available
          if (options.aiSummary) {
            console.log('\n--- Natural Language Summary (AI) ---');
            console.log('Generating AI-powered analysis...');

            // Check Ollama availability
            const ollamaAvailable = await checkOllamaAvailable();
            if (!ollamaAvailable) {
              console.log('Ollama not available. Falling back to template summary.\n');
              const summary = generateNaturalLanguageSummary(predictions as HourlyPredictionInput[], chart, categoryBestWorst);
              printTemplateSummary(summary);
            } else {
              // Generate AI summary
              const data = buildOllamaSummaryData(predictions, chart, profile, date, timezone, dashas);
              const aiResponse = await generateAISummary(data);
              if (aiResponse) {
                console.log(aiResponse);
              } else {
                console.log('AI generation failed. Falling back to template summary.\n');
                const summary = generateNaturalLanguageSummary(predictions as HourlyPredictionInput[], chart, categoryBestWorst);
                printTemplateSummary(summary);
              }
            }
          } else {
            // Use template-based summary
            console.log('\n--- Natural Language Summary ---');
            const summary = generateNaturalLanguageSummary(predictions as HourlyPredictionInput[], chart, categoryBestWorst);
            printTemplateSummary(summary);
          }
        }
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

  // Display remedies if requested
  if (options.remedies) {
    const cache = getCachedCalculation(profile.id);
    if (!cache) {
      console.log('\nNo cached calculations found. Run "process" first to generate chart data.');
    } else {
      let chart: any = null;
      let dashas: any[] = [];
      try {
        chart = JSON.parse(cache.chart_json);
        const rawDashas = JSON.parse(cache.dashas_json || '[]');
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
      } catch (e) {
        // Ignore parse errors
      }

      if (chart && dashas.length > 0) {
        const { calculateRemediations } = await import('@parashari/core');
        const transit = calculateTransit(
          new Date(),
          profile.lat,
          profile.lon,
          profile.ayanamsa_id,
        );
        const report = calculateRemediations(chart, dashas, transit, { includeLifetime: true, maxResults: 5 });
        displayRemediationReport(report);
      }
    }
  }
}

interface PredictMonthOptions {
  id: string;
  month: string;
  timezone?: string;
  aiSummary?: boolean;
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
    const rawDashas = JSON.parse(cache.dashas_json);
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
      pratyantardasha: d.pratyantardasha ? {
        ...d.pratyantardasha,
        startDate: new Date(d.pratyantardasha.startDate),
        endDate: new Date(d.pratyantardasha.endDate),
      } : null,
      sookshma: d.sookshma ? {
        ...d.sookshma,
        startDate: new Date(d.sookshma.startDate),
        endDate: new Date(d.sookshma.endDate),
      } : null,
      prana: d.prana ? {
        ...d.prana,
        startDate: new Date(d.prana.startDate),
        endDate: new Date(d.prana.endDate),
      } : null,
    }));
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

  // AI Monthly Summary
  if (options.aiSummary && monthly.daily.length > 0) {
    console.log('\n' + '━'.repeat(60));
    console.log('AI MONTHLY SUMMARY');
    console.log('━'.repeat(60));
    console.log('Generating AI-powered monthly analysis...\n');

    const ollamaAvailable = await checkOllamaAvailable();
    if (!ollamaAvailable) {
      console.log('Ollama not available. Skipping AI summary.\n');
    } else {
      // Build summary data for the month
      const monthlyData = buildMonthlySummaryData(monthly, profile, options.month, timezone, chart, dashas);
      const aiResponse = await generateAISummary(monthlyData);
      if (aiResponse) {
        console.log(aiResponse);
      } else {
        console.log('AI generation failed. Skipping monthly summary.\n');
      }
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
  .description('Get daily or hourly predictions for a profile')
  .requiredOption('-i, --id <id>', 'Profile ID (see: parashari list)')
  .requiredOption('-d, --date <date>', 'Date (YYYY-MM-DD format, e.g. 2026-03-27)')
  .option('-t, --timezone <tz>', 'Timezone override (see: parashari timezones for all valid values)')
  .option('-h, --hourly', 'Show 24 hourly predictions instead of 4 daily summaries')
  .option('--ai-summary', 'Generate AI natural language summary via Ollama (requires Ollama running)')
  .option('--json', 'Output machine-readable JSON')
  .option('--remedies', 'Show gemstone, mantra, and color remedies for stressed planets')
  .action(predictAction);

program
  .command('predict-month')
  .description('Get monthly predictions with daily/weekly breakdown and category highlights')
  .requiredOption('-i, --id <id>', 'Profile ID (see: parashari list)')
  .requiredOption('-m, --month <month>', 'Month in YYYY-MM format (e.g., 2026-03 for March 2026)')
  .option('-t, --timezone <tz>', 'Timezone override (see: parashari timezones for all valid values)')
  .option('--ai-summary', 'Generate AI natural language summary via Ollama (requires Ollama running)')
  .option('--json', 'Output machine-readable JSON')
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
  .description('Delete a profile and all its data (cached predictions, journal, etc.)')
  .requiredOption('-i, --id <id>', 'Profile ID to delete (see: parashari list)')
  .option('-f, --force', 'Skip confirmation and delete immediately')
  .action(deleteAction);

program
  .command('timezones')
  .description('List all valid IANA timezone options grouped by region')
  .action(() => {
    console.log('\nValid IANA timezone options:\n');
    console.log('Use any of these with -t, --timezone option:\n');
    // Group by region
    const regions: Record<string, string[]> = {
      'Asia': VALID_TIMEZONES.filter(t => t.startsWith('Asia/')),
      'Europe': VALID_TIMEZONES.filter(t => t.startsWith('Europe/')),
      'Americas': VALID_TIMEZONES.filter(t => t.startsWith('America/')),
      'Pacific': VALID_TIMEZONES.filter(t => t.startsWith('Pacific/')),
      'UTC': ['UTC'],
    };
    for (const [region, zones] of Object.entries(regions)) {
      console.log(`${region}:`);
      for (const tz of zones) {
        console.log(`  ${tz}`);
      }
      console.log('');
    }
    console.log('Examples: Asia/Kolkata, America/New_York, Europe/London');
  });

program.parse(process.argv);
