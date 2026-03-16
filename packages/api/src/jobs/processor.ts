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
      vargas_json: null,
      shadbala_json: JSON.stringify(shadbala),
      ashtakavarga_json: JSON.stringify({
        bav: Array.from(ashtakavarga.bav.entries()),
        sav: ashtakavarga.sav,
        planetBav: Array.from(ashtakavarga.planetBav.entries()),
      }),
      dashas_json: JSON.stringify(dashas),
      yogas_json: JSON.stringify(yogas),
      predictions_json: null,
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
  const row = db.prepare<[string], { id: string }>(
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