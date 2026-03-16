/**
 * predictions.ts — Fastify route plugin for astrological predictions
 *
 * Provides plain English predictions based on Vimshottari Dasha.
 *
 * Routes:
 *   POST /calculations/predictions — Get prediction periods
 */

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import {
  AstrologyEngine,
  Ayanamsa,
  type BirthData,
  type ChartData,
  type DashaPeriod,
  type YogaResult,
  type ShadbalaResult,
  type AshtakavargaResult,
  type PredictionPeriod,
  generatePredictions,
} from '@parashari/core';

import { getProfile } from '../database/profiles.js';
import {
  getCachedCalculation,
  saveCachedCalculation,
  isCacheValid,
} from '../database/cache.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const engineCache = new Map<Ayanamsa, AstrologyEngine>();

function getEngine(ayanamsa: Ayanamsa = Ayanamsa.Lahiri): AstrologyEngine {
  const cached = engineCache.get(ayanamsa);
  if (cached !== undefined) return cached;
  const engine = new AstrologyEngine(ayanamsa);
  engineCache.set(ayanamsa, engine);
  return engine;
}

function ayanamsaFromId(id: number): Ayanamsa {
  switch (id) {
    case 1: return Ayanamsa.Lahiri;
    case 2: return Ayanamsa.Raman;
    case 3: return Ayanamsa.KP;
    default: return Ayanamsa.Lahiri;
  }
}

function serializeMap<K, V>(map: Map<K, V>): Array<[K, V]> {
  return Array.from(map.entries());
}

function deserializeMap<K, V>(entries: Array<[K, V]>): Map<K, V> {
  return new Map(entries);
}

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const PredictionsBodySchema = z.object({
  profile_id: z.string().uuid().optional(),
  birth_data: z.object({
    name: z.string().min(1),
    dateOfBirth: z.string().datetime({ offset: true }),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    timezone: z.number().min(-14).max(14),
    ayanamsaId: z.nativeEnum(Ayanamsa).optional(),
  }).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
});

type PredictionsBody = z.infer<typeof PredictionsBodySchema>;

// ---------------------------------------------------------------------------
// Prediction Response Types
// ---------------------------------------------------------------------------

interface PredictionResponseData {
  periods: PredictionPeriod[];
  startDate: string;
  endDate: string;
  level: number;
}

// ---------------------------------------------------------------------------
// Route Plugin
// ---------------------------------------------------------------------------

const predictionRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
): Promise<void> => {

  // ── POST /calculations/predictions ─────────────────────────────────────────
  fastify.post<{ Body: PredictionsBody }>(
    '/calculations/predictions',
    async (request, reply) => {
      const parsed = PredictionsBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.message });
      }

      const { profile_id, birth_data, start_date, end_date, level } = parsed.data;

      // Resolve birth data
      let birthData: BirthData;
      let ayanamsa: Ayanamsa;
      let profileId: string | undefined;

      if (profile_id !== undefined) {
        const profile = getProfile(profile_id);
        if (profile === undefined) {
          return reply.status(404).send({ error: 'Profile not found' });
        }
        ayanamsa = ayanamsaFromId(profile.ayanamsa_id);
        birthData = {
          name: profile.name,
          dateOfBirth: profile.dob_utc,
          latitude: profile.lat,
          longitude: profile.lon,
          timezone: profile.utc_offset_hours,
          ayanamsaId: ayanamsa,
        };
        profileId = profile_id;
      } else if (birth_data !== undefined) {
        ayanamsa = birth_data.ayanamsaId ?? Ayanamsa.Lahiri;
        birthData = {
          name: birth_data.name,
          dateOfBirth: birth_data.dateOfBirth,
          latitude: birth_data.latitude,
          longitude: birth_data.longitude,
          timezone: birth_data.timezone,
          ayanamsaId: ayanamsa,
        };
      } else {
        return reply.status(400).send({ error: 'Either profile_id or birth_data must be provided' });
      }

      const engine = getEngine(ayanamsa);

      // Load or compute chart data
      let chart: ChartData;
      let dashas: DashaPeriod[];
      let yogas: YogaResult[];
      let shadbala: ShadbalaResult[];
      let ashtakavarga: AshtakavargaResult;

      if (profileId !== undefined && isCacheValid(profileId)) {
        const cached = getCachedCalculation(profileId);
        if (cached !== undefined) {
          try {
            chart = JSON.parse(cached.chart_json!);
            dashas = JSON.parse(cached.dashas_json!);
            yogas = JSON.parse(cached.yogas_json!);
            shadbala = JSON.parse(cached.shadbala_json!);

            const avRaw = JSON.parse(cached.ashtakavarga_json!);
            ashtakavarga = {
              bav: new Map(avRaw.bav),
              sav: avRaw.sav,
              planetBav: new Map(avRaw.planetBav),
            };

            // Convert cached date strings back to Date objects for dashas
            dashas = dashas.map(d => ({
              mahadasha: {
                ...d.mahadasha,
                startDate: new Date(d.mahadasha.startDate),
                endDate: new Date(d.mahadasha.endDate),
              },
              antardasha: {
                ...d.antardasha,
                startDate: new Date(d.antardasha.startDate),
                endDate: new Date(d.antardasha.endDate),
              },
              pratyantardasha: {
                ...d.pratyantardasha,
                startDate: new Date(d.pratyantardasha.startDate),
                endDate: new Date(d.pratyantardasha.endDate),
              },
              sookshma: {
                ...d.sookshma,
                startDate: new Date(d.sookshma.startDate),
                endDate: new Date(d.sookshma.endDate),
              },
              prana: {
                ...d.prana,
                startDate: new Date(d.prana.startDate),
                endDate: new Date(d.prana.endDate),
              },
            }));
          } catch {
            // Cache miss due to corruption - compute fresh
            chart = await engine.calculateChart(birthData);
            const results = await Promise.all([
              engine.calculateDashas(chart),
              engine.detectYogas(chart),
              engine.calculateShadbala(chart),
              engine.calculateAshtakavarga(chart),
            ]);
            dashas = results[0];
            yogas = results[1];
            shadbala = results[2];
            ashtakavarga = results[3];
          }
        } else {
          chart = await engine.calculateChart(birthData);
          const results = await Promise.all([
            engine.calculateDashas(chart),
            engine.detectYogas(chart),
            engine.calculateShadbala(chart),
            engine.calculateAshtakavarga(chart),
          ]);
          dashas = results[0];
          yogas = results[1];
          shadbala = results[2];
          ashtakavarga = results[3];
        }
      } else {
        chart = await engine.calculateChart(birthData);
        const results = await Promise.all([
          engine.calculateDashas(chart),
          engine.detectYogas(chart),
          engine.calculateShadbala(chart),
          engine.calculateAshtakavarga(chart),
        ]);
        dashas = results[0];
        yogas = results[1];
        shadbala = results[2];
        ashtakavarga = results[3];
      }

      // Parse dates
      const startDate = start_date ? new Date(start_date + 'T00:00:00Z') : undefined;
      const endDate = end_date ? new Date(end_date + 'T23:59:59Z') : undefined;
      const dashaLevel = level ?? 1;

      // Generate predictions - only include date params if they exist
      const predRequest: {
        chart: typeof chart;
        dashas: typeof dashas;
        yogas: typeof yogas;
        shadbala: typeof shadbala;
        ashtakavarga: typeof ashtakavarga;
        level: 1 | 2 | 3 | 4 | 5;
        startDate?: Date;
        endDate?: Date;
      } = {
        chart,
        dashas,
        yogas,
        shadbala,
        ashtakavarga,
        level: dashaLevel as 1 | 2 | 3 | 4 | 5,
      };
      if (startDate) predRequest.startDate = startDate;
      if (endDate) predRequest.endDate = endDate;

      const result = generatePredictions(predRequest);

      const responseData: PredictionResponseData = {
        periods: result.periods,
        startDate: start_date ?? dashas[0]?.mahadasha.startDate.toISOString().split('T')[0] ?? '',
        endDate: end_date ?? dashas[dashas.length - 1]?.mahadasha.endDate.toISOString().split('T')[0] ?? '',
        level: dashaLevel,
      };

      return reply.send({ data: responseData });
    },
  );
};

export default predictionRoutes;
