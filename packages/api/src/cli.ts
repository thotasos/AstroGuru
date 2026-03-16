#!/usr/bin/env node

import { Command } from 'commander';
import { createProfile, getAllProfiles, getProfile } from './database/profiles.js';
import { runMigrations } from './database/migrate.js';
import { getCachedCalculation } from './database/cache.js';
import { runProcessor, processProfile } from './jobs/processor.js';

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

  const timeParts = options.time.split(':').map(Number);
  if (timeParts.length !== 2 || timeParts.some(isNaN)) {
    console.error('Error: Invalid time format. Use HH:MM');
    process.exit(1);
  }

  const hours = timeParts[0] as number;
  const minutes = timeParts[1] as number;
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
  console.log(`\nRun 'npx tsx src/cli.ts process -i "${profile.id}"' to process this profile.`);
}

interface ProcessOptions {
  id?: string;
}

async function processAction(options: ProcessOptions) {
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

function listAction() {
  runMigrations();

  const profiles = getAllProfiles();

  if (profiles.length === 0) {
    console.log('No profiles found.');
    return;
  }

  console.log(`\nFound ${profiles.length} profile(s):\n`);
  console.log('ID'.padEnd(38) + 'Name'.padEnd(20) + 'DOB'.padEnd(25) + 'Place'.padEnd(25) + 'Status');
  console.log('-'.repeat(108));

  for (const p of profiles) {
    const id = p.id.substring(0, 36);
    const name = p.name.substring(0, 18);
    const dob = p.dob_utc.substring(0, 23);
    const place = (p.place_name || 'Unknown').substring(0, 23);
    const status = p.status;

    console.log(`${id}  ${name.padEnd(20)} ${dob.padEnd(25)} ${place.padEnd(25)} ${status}`);
  }
  console.log('');
}

interface ReportOptions {
  id: string;
}

function reportAction(options: ReportOptions) {
  runMigrations();

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
  console.log(`Vargas:         ${hasVargas ? '✓' : '✗'} (not yet calculated)`);
  console.log(`Dashas:         ${hasDashas ? '✓' : '✗'}`);
  console.log(`Yogas:          ${hasYogas ? '✓' : '✗'}`);
  console.log(`Shadbala:       ${hasShadbala ? '✓' : '✗'}`);
  console.log(`Ashtakavarga:   ${hasAshtakavarga ? '✓' : '✗'}`);
  console.log(`Predictions:    ${hasPredictions ? '✓' : '✗'} (not yet generated)`);
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
  if (hasYogas) {
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

  // Parse and display shadbala
  if (hasShadbala) {
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
  if (hasDashas) {
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
  if (hasDashas && hasChart) {
    console.log('\n--- Past Mahadasha Periods ---');
    const dashas = JSON.parse(cache.dashas_json);
    const planetNames = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
    const now = new Date();

    // Get unique mahadasha periods (first level only)
    const mahadashas = dashas.filter((d: { antardasha: null }) => d.antardasha === null);
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
  .description('Process profiles (run without args for continuous processing)')
  .option('-i, --id <id>', 'Process specific profile ID')
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

program.parse(process.argv);
