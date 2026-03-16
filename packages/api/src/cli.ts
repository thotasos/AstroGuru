#!/usr/bin/env node

import { Command } from 'commander';
import { createProfile } from './database/profiles.js';
import { runMigrations } from './database/migrate.js';
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

program.parse(process.argv);
