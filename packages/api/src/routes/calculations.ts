/**
 * calculations.ts — Fastify route plugin for Vedic astrology computations
 *
 * All heavy work is delegated to `@parashari/core`'s AstrologyEngine.
 * Results are cached per-profile in SQLite for 7 days.
 *
 * Routes (all prefixed with /api via server registration):
 *   POST /calculations/chart        — D1 natal chart
 *   POST /calculations/vargas       — all 16 divisional charts
 *   POST /calculations/dashas       — full 120-year Vimshottari dasha tree
 *   POST /calculations/yogas        — yoga detection (sorted by strength)
 *   POST /calculations/shadbala     — six-fold planetary strength
 *   POST /calculations/ashtakavarga — Ashtakavarga (BAV + SAV)
 *   POST /calculations/full         — ALL of the above in one response
 *   GET  /calculations/dasha-at-date/:profile_id?date=YYYY-MM-DD
 *   GET  /calculations/cache/:profile_id  — cache status
 *   DELETE /calculations/cache/:profile_id — invalidate cache
 */

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import {
  AstrologyEngine,
  Ayanamsa,
  Varga,
  type BirthData,
  type ChartData,
  type DashaPeriod,
  type YogaResult,
  type ShadbalaResult,
  type AshtakavargaResult,
  type VargaChart,
} from '@parashari/core';

import { getProfile } from '../database/profiles.js';
import {
  getCachedCalculation,
  saveCachedCalculation,
  isCacheValid,
  invalidateCache,
} from '../database/cache.js';

// ---------------------------------------------------------------------------
// Helpers — engine factory (one per ayanamsa, memoised)
// ---------------------------------------------------------------------------

const engineCache = new Map<Ayanamsa, AstrologyEngine>();

function getEngine(ayanamsa: Ayanamsa = Ayanamsa.Lahiri): AstrologyEngine {
  const cached = engineCache.get(ayanamsa);
  if (cached !== undefined) return cached;
  const engine = new AstrologyEngine(ayanamsa);
  engineCache.set(ayanamsa, engine);
  return engine;
}

/** Map numeric ayanamsa_id (DB) → Ayanamsa enum */
function ayanamsaFromId(id: number): Ayanamsa {
  switch (id) {
    case 1: return Ayanamsa.Lahiri;
    case 2: return Ayanamsa.Raman;
    case 3: return Ayanamsa.KP;
    default: return Ayanamsa.Lahiri;
  }
}

// ---------------------------------------------------------------------------
// Helpers — Map serialisation (Map<K,V> ↔ [K,V][] for JSON)
// ---------------------------------------------------------------------------

function serializeMap<K, V>(map: Map<K, V>): Array<[K, V]> {
  return Array.from(map.entries());
}

function deserializeMap<K, V>(entries: Array<[K, V]>): Map<K, V> {
  return new Map(entries);
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const BirthDataSchema = z.object({
  name: z.string().min(1),
  /** ISO 8601 UTC datetime */
  dateOfBirth: z
    .string()
    .datetime({ offset: true, message: 'dateOfBirth must be ISO 8601 UTC' }),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  /** UTC offset in hours */
  timezone: z.number().min(-14).max(14),
  ayanamsaId: z.nativeEnum(Ayanamsa).optional(),
});

const CalcBodySchema = z
  .object({
    profile_id: z.string().uuid().optional(),
    birth_data: BirthDataSchema.optional(),
  })
  .refine((d) => d.profile_id !== undefined || d.birth_data !== undefined, {
    message: 'Either profile_id or birth_data must be provided',
  });

const ProfileIdParamsSchema = z.object({
  profile_id: z.string().uuid('profile_id must be a UUID'),
});

const DateQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CalcBody = z.infer<typeof CalcBodySchema>;
type ProfileIdParams = { profile_id: string };
type DateQuery = { date: string };

interface FullCalcResult {
  chart: ChartData;
  vargas: Array<[Varga, VargaChart]>;
  dashas: DashaPeriod[];
  yogas: YogaResult[];
  shadbala: ShadbalaResult[];
  ashtakavarga: Array<unknown>; // serialised Map entries
  cached: boolean;
  computed_at: string;
}

// ---------------------------------------------------------------------------
// Core resolution — load BirthData from profile_id or inline birth_data
// ---------------------------------------------------------------------------

async function resolveBirthData(body: CalcBody): Promise<{
  birthData: BirthData;
  profileId: string | undefined;
  ayanamsa: Ayanamsa;
}> {
  if (body.profile_id !== undefined) {
    const profile = getProfile(body.profile_id);
    if (profile === undefined) {
      throw Object.assign(new Error('Profile not found'), { statusCode: 404 });
    }
    const ayanamsa = ayanamsaFromId(profile.ayanamsa_id);
    const birthData: BirthData = {
      name: profile.name,
      dateOfBirth: profile.dob_utc,
      latitude: profile.lat,
      longitude: profile.lon,
      timezone: profile.utc_offset_hours,
      ayanamsaId: ayanamsa,
    };
    return { birthData, profileId: body.profile_id, ayanamsa };
  }

  // Must have birth_data (enforced by Zod refine above)
  const bd = body.birth_data!;
  const ayanamsa = bd.ayanamsaId ?? Ayanamsa.Lahiri;
  const birthData: BirthData = {
    name: bd.name,
    dateOfBirth: bd.dateOfBirth,
    latitude: bd.latitude,
    longitude: bd.longitude,
    timezone: bd.timezone,
    ayanamsaId: ayanamsa,
  };
  return { birthData, profileId: undefined, ayanamsa };
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

interface CachedFull {
  chart: ChartData;
  vargas: Map<Varga, VargaChart>;
  dashas: DashaPeriod[];
  yogas: YogaResult[];
  shadbala: ShadbalaResult[];
  ashtakavarga: AshtakavargaResult;
  computed_at: string;
}

function tryLoadFullCache(profileId: string): CachedFull | undefined {
  if (!isCacheValid(profileId)) return undefined;

  const row = getCachedCalculation(profileId);
  if (row === undefined) return undefined;

  // All JSON columns must be present for a full cache hit
  if (
    row.vargas_json === null ||
    row.dashas_json === null ||
    row.yogas_json === null ||
    row.shadbala_json === null ||
    row.ashtakavarga_json === null
  ) {
    return undefined;
  }

  try {
    const chart = JSON.parse(row.chart_json) as ChartData;
    const vargasEntries = JSON.parse(row.vargas_json) as Array<[Varga, VargaChart]>;
    const vargas = deserializeMap(vargasEntries);
    const dashas = JSON.parse(row.dashas_json) as DashaPeriod[];
    const yogas = JSON.parse(row.yogas_json) as YogaResult[];
    const shadbala = JSON.parse(row.shadbala_json) as ShadbalaResult[];
    const avRaw = JSON.parse(row.ashtakavarga_json) as {
      bav: Array<[unknown, number[]]>;
      sav: number[];
      planetBav: Array<[unknown, number[]]>;
    };
    const ashtakavarga: AshtakavargaResult = {
      bav: new Map(avRaw.bav as Array<[Parameters<AshtakavargaResult['bav']['get']>[0], number[]]>),
      sav: avRaw.sav,
      planetBav: new Map(avRaw.planetBav as Array<[Parameters<AshtakavargaResult['planetBav']['get']>[0], number[]]>),
    };

    return { chart, vargas, dashas, yogas, shadbala, ashtakavarga, computed_at: row.computed_at };
  } catch {
    // Corrupt cache — treat as miss
    return undefined;
  }
}

function persistFullCache(
  profileId: string,
  chart: ChartData,
  vargas: Map<Varga, VargaChart>,
  dashas: DashaPeriod[],
  yogas: YogaResult[],
  shadbala: ShadbalaResult[],
  ashtakavarga: AshtakavargaResult,
): void {
  try {
    const avSerializable = {
      bav: serializeMap(ashtakavarga.bav),
      sav: ashtakavarga.sav,
      planetBav: serializeMap(ashtakavarga.planetBav),
    };

    saveCachedCalculation(profileId, {
      julian_day: chart.julianDay,
      ayanamsa_value: chart.ayanamsa,
      chart_json: JSON.stringify(chart),
      vargas_json: JSON.stringify(serializeMap(vargas)),
      dashas_json: JSON.stringify(dashas),
      yogas_json: JSON.stringify(yogas),
      shadbala_json: JSON.stringify(shadbala),
      ashtakavarga_json: JSON.stringify(avSerializable),
      predictions_json: null,
    });
  } catch (err) {
    // Cache write failure is non-fatal — log and continue
    console.error('[calculations] cache write failed', err);
  }
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

const calculationRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
): Promise<void> => {

  // ── POST /calculations/chart ─────────────────────────────────────────────
  fastify.post<{ Body: CalcBody }>(
    '/calculations/chart',
    async (request, reply) => {
      const parsed = CalcBodySchema.safeParse(request.body);
      if (!parsed.success) throw parsed.error;

      const { birthData, profileId, ayanamsa } = await resolveBirthData(parsed.data);

      // Check partial cache (chart only)
      if (profileId !== undefined && isCacheValid(profileId)) {
        const row = getCachedCalculation(profileId);
        if (row !== undefined) {
          try {
            const chart = JSON.parse(row.chart_json) as ChartData;
            return reply.send({ data: chart, cached: true, computed_at: row.computed_at });
          } catch {
            /* corrupt — fall through to recalculate */
          }
        }
      }

      const engine = getEngine(ayanamsa);
      const chart = await engine.calculateChart(birthData);

      if (profileId !== undefined) {
        try {
          saveCachedCalculation(profileId, {
            julian_day: chart.julianDay,
            ayanamsa_value: chart.ayanamsa,
            chart_json: JSON.stringify(chart),
            vargas_json: null,
            dashas_json: null,
            yogas_json: null,
            shadbala_json: null,
            ashtakavarga_json: null,
            predictions_json: null,
          });
        } catch (err) {
          console.error('[calculations/chart] cache write failed', err);
        }
      }

      return reply.send({ data: chart, cached: false, computed_at: new Date().toISOString() });
    },
  );

  // ── POST /calculations/vargas ────────────────────────────────────────────
  fastify.post<{ Body: CalcBody }>(
    '/calculations/vargas',
    async (request, reply) => {
      const parsed = CalcBodySchema.safeParse(request.body);
      if (!parsed.success) throw parsed.error;

      const { birthData, profileId, ayanamsa } = await resolveBirthData(parsed.data);

      if (profileId !== undefined && isCacheValid(profileId)) {
        const row = getCachedCalculation(profileId);
        if (row?.vargas_json !== null && row !== undefined) {
          try {
            const entries = JSON.parse(row.vargas_json!) as Array<[Varga, VargaChart]>;
            return reply.send({
              data: entries,
              cached: true,
              computed_at: row.computed_at,
            });
          } catch { /* corrupt */ }
        }
      }

      const engine = getEngine(ayanamsa);
      const chart = await engine.calculateChart(birthData);
      const vargas = await engine.calculateAllVargas(chart);
      const entries = serializeMap(vargas);

      if (profileId !== undefined) {
        try {
          const existing = getCachedCalculation(profileId);
          saveCachedCalculation(profileId, {
            julian_day: chart.julianDay,
            ayanamsa_value: chart.ayanamsa,
            chart_json: existing?.chart_json ?? JSON.stringify(chart),
            vargas_json: JSON.stringify(entries),
            dashas_json: existing?.dashas_json ?? null,
            yogas_json: existing?.yogas_json ?? null,
            shadbala_json: existing?.shadbala_json ?? null,
            ashtakavarga_json: existing?.ashtakavarga_json ?? null,
            predictions_json: existing?.predictions_json ?? null,
          });
        } catch (err) {
          console.error('[calculations/vargas] cache write failed', err);
        }
      }

      return reply.send({ data: entries, cached: false, computed_at: new Date().toISOString() });
    },
  );

  // ── POST /calculations/dashas ────────────────────────────────────────────
  fastify.post<{ Body: CalcBody }>(
    '/calculations/dashas',
    async (request, reply) => {
      const parsed = CalcBodySchema.safeParse(request.body);
      if (!parsed.success) throw parsed.error;

      const { birthData, profileId, ayanamsa } = await resolveBirthData(parsed.data);

      if (profileId !== undefined && isCacheValid(profileId)) {
        const row = getCachedCalculation(profileId);
        if (row?.dashas_json !== null && row !== undefined) {
          try {
            const dashas = JSON.parse(row.dashas_json!) as DashaPeriod[];
            return reply.send({ data: dashas, cached: true, computed_at: row.computed_at });
          } catch { /* corrupt */ }
        }
      }

      const engine = getEngine(ayanamsa);
      const chart = await engine.calculateChart(birthData);
      const dashas = await engine.calculateDashas(chart);

      if (profileId !== undefined) {
        try {
          const existing = getCachedCalculation(profileId);
          saveCachedCalculation(profileId, {
            julian_day: chart.julianDay,
            ayanamsa_value: chart.ayanamsa,
            chart_json: existing?.chart_json ?? JSON.stringify(chart),
            vargas_json: existing?.vargas_json ?? null,
            dashas_json: JSON.stringify(dashas),
            yogas_json: existing?.yogas_json ?? null,
            shadbala_json: existing?.shadbala_json ?? null,
            ashtakavarga_json: existing?.ashtakavarga_json ?? null,
            predictions_json: existing?.predictions_json ?? null,
          });
        } catch (err) {
          console.error('[calculations/dashas] cache write failed', err);
        }
      }

      return reply.send({ data: dashas, cached: false, computed_at: new Date().toISOString() });
    },
  );

  // ── POST /calculations/yogas ─────────────────────────────────────────────
  fastify.post<{ Body: CalcBody }>(
    '/calculations/yogas',
    async (request, reply) => {
      const parsed = CalcBodySchema.safeParse(request.body);
      if (!parsed.success) throw parsed.error;

      const { birthData, profileId, ayanamsa } = await resolveBirthData(parsed.data);

      if (profileId !== undefined && isCacheValid(profileId)) {
        const row = getCachedCalculation(profileId);
        if (row?.yogas_json !== null && row !== undefined) {
          try {
            const yogas = JSON.parse(row.yogas_json!) as YogaResult[];
            const sorted = yogas.sort((a, b) => b.strength - a.strength);
            return reply.send({ data: sorted, cached: true, computed_at: row.computed_at });
          } catch { /* corrupt */ }
        }
      }

      const engine = getEngine(ayanamsa);
      const chart = await engine.calculateChart(birthData);
      const yogas = await engine.detectYogas(chart);
      const sorted = [...yogas].sort((a, b) => b.strength - a.strength);

      if (profileId !== undefined) {
        try {
          const existing = getCachedCalculation(profileId);
          saveCachedCalculation(profileId, {
            julian_day: chart.julianDay,
            ayanamsa_value: chart.ayanamsa,
            chart_json: existing?.chart_json ?? JSON.stringify(chart),
            vargas_json: existing?.vargas_json ?? null,
            dashas_json: existing?.dashas_json ?? null,
            yogas_json: JSON.stringify(sorted),
            shadbala_json: existing?.shadbala_json ?? null,
            ashtakavarga_json: existing?.ashtakavarga_json ?? null,
            predictions_json: existing?.predictions_json ?? null,
          });
        } catch (err) {
          console.error('[calculations/yogas] cache write failed', err);
        }
      }

      return reply.send({ data: sorted, cached: false, computed_at: new Date().toISOString() });
    },
  );

  // ── POST /calculations/shadbala ──────────────────────────────────────────
  fastify.post<{ Body: CalcBody }>(
    '/calculations/shadbala',
    async (request, reply) => {
      const parsed = CalcBodySchema.safeParse(request.body);
      if (!parsed.success) throw parsed.error;

      const { birthData, profileId, ayanamsa } = await resolveBirthData(parsed.data);

      if (profileId !== undefined && isCacheValid(profileId)) {
        const row = getCachedCalculation(profileId);
        if (row?.shadbala_json !== null && row !== undefined) {
          try {
            const shadbala = JSON.parse(row.shadbala_json!) as ShadbalaResult[];
            return reply.send({ data: shadbala, cached: true, computed_at: row.computed_at });
          } catch { /* corrupt */ }
        }
      }

      const engine = getEngine(ayanamsa);
      const chart = await engine.calculateChart(birthData);
      const shadbala = await engine.calculateShadbala(chart);

      if (profileId !== undefined) {
        try {
          const existing = getCachedCalculation(profileId);
          saveCachedCalculation(profileId, {
            julian_day: chart.julianDay,
            ayanamsa_value: chart.ayanamsa,
            chart_json: existing?.chart_json ?? JSON.stringify(chart),
            vargas_json: existing?.vargas_json ?? null,
            dashas_json: existing?.dashas_json ?? null,
            yogas_json: existing?.yogas_json ?? null,
            shadbala_json: JSON.stringify(shadbala),
            ashtakavarga_json: existing?.ashtakavarga_json ?? null,
            predictions_json: existing?.predictions_json ?? null,
          });
        } catch (err) {
          console.error('[calculations/shadbala] cache write failed', err);
        }
      }

      return reply.send({ data: shadbala, cached: false, computed_at: new Date().toISOString() });
    },
  );

  // ── POST /calculations/ashtakavarga ─────────────────────────────────────
  fastify.post<{ Body: CalcBody }>(
    '/calculations/ashtakavarga',
    async (request, reply) => {
      const parsed = CalcBodySchema.safeParse(request.body);
      if (!parsed.success) throw parsed.error;

      const { birthData, profileId, ayanamsa } = await resolveBirthData(parsed.data);

      if (profileId !== undefined && isCacheValid(profileId)) {
        const row = getCachedCalculation(profileId);
        if (row?.ashtakavarga_json !== null && row !== undefined) {
          try {
            const raw = JSON.parse(row.ashtakavarga_json!) as {
              bav: Array<[unknown, number[]]>;
              sav: number[];
              planetBav: Array<[unknown, number[]]>;
            };
            return reply.send({
              data: raw,
              cached: true,
              computed_at: row.computed_at,
            });
          } catch { /* corrupt */ }
        }
      }

      const engine = getEngine(ayanamsa);
      const chart = await engine.calculateChart(birthData);
      const av = await engine.calculateAshtakavarga(chart);

      const avSerializable = {
        bav: serializeMap(av.bav),
        sav: av.sav,
        planetBav: serializeMap(av.planetBav),
      };

      if (profileId !== undefined) {
        try {
          const existing = getCachedCalculation(profileId);
          saveCachedCalculation(profileId, {
            julian_day: chart.julianDay,
            ayanamsa_value: chart.ayanamsa,
            chart_json: existing?.chart_json ?? JSON.stringify(chart),
            vargas_json: existing?.vargas_json ?? null,
            dashas_json: existing?.dashas_json ?? null,
            yogas_json: existing?.yogas_json ?? null,
            shadbala_json: existing?.shadbala_json ?? null,
            ashtakavarga_json: JSON.stringify(avSerializable),
            predictions_json: existing?.predictions_json ?? null,
          });
        } catch (err) {
          console.error('[calculations/ashtakavarga] cache write failed', err);
        }
      }

      return reply.send({ data: avSerializable, cached: false, computed_at: new Date().toISOString() });
    },
  );

  // ── POST /calculations/full ──────────────────────────────────────────────
  fastify.post<{ Body: CalcBody }>(
    '/calculations/full',
    async (request, reply) => {
      const parsed = CalcBodySchema.safeParse(request.body);
      if (!parsed.success) throw parsed.error;

      const { birthData, profileId, ayanamsa } = await resolveBirthData(parsed.data);

      // Aggressive full cache check
      if (profileId !== undefined) {
        const fullCached = tryLoadFullCache(profileId);
        if (fullCached !== undefined) {
          const result: FullCalcResult = {
            chart: fullCached.chart,
            vargas: serializeMap(fullCached.vargas),
            dashas: fullCached.dashas,
            yogas: [...fullCached.yogas].sort((a, b) => b.strength - a.strength),
            shadbala: fullCached.shadbala,
            ashtakavarga: [
              serializeMap(fullCached.ashtakavarga.bav),
              fullCached.ashtakavarga.sav,
              serializeMap(fullCached.ashtakavarga.planetBav),
            ],
            cached: true,
            computed_at: fullCached.computed_at,
          };
          return reply.send({ data: result });
        }
      }

      // Calculate all in parallel where possible
      const engine = getEngine(ayanamsa);
      const chart = await engine.calculateChart(birthData);

      const [vargas, dashas, yogas, shadbala, av] = await Promise.all([
        engine.calculateAllVargas(chart),
        engine.calculateDashas(chart),
        engine.detectYogas(chart),
        engine.calculateShadbala(chart),
        engine.calculateAshtakavarga(chart),
      ]);

      const sortedYogas = [...yogas].sort((a, b) => b.strength - a.strength);

      if (profileId !== undefined) {
        persistFullCache(profileId, chart, vargas, dashas, sortedYogas, shadbala, av);
      }

      const now = new Date().toISOString();
      const result: FullCalcResult = {
        chart,
        vargas: serializeMap(vargas),
        dashas,
        yogas: sortedYogas,
        shadbala,
        ashtakavarga: [
          serializeMap(av.bav),
          av.sav,
          serializeMap(av.planetBav),
        ],
        cached: false,
        computed_at: now,
      };

      return reply.send({ data: result });
    },
  );

  // ── GET /calculations/dasha-at-date/:profile_id ─────────────────────────
  fastify.get<{ Params: ProfileIdParams; Querystring: DateQuery }>(
    '/calculations/dasha-at-date/:profile_id',
    async (request, reply) => {
      const paramsParsed = ProfileIdParamsSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({ error: 'Invalid profile_id format' });
      }

      const queryParsed = DateQuerySchema.safeParse(request.query);
      if (!queryParsed.success) {
        return reply.status(400).send({
          error: queryParsed.error.issues[0]?.message ?? 'Invalid date query',
        });
      }

      const { profile_id } = paramsParsed.data;
      const { date } = queryParsed.data;

      const profile = getProfile(profile_id);
      if (profile === undefined) {
        return reply.status(404).send({ error: 'Profile not found' });
      }

      const targetDate = new Date(date + 'T00:00:00Z');
      if (isNaN(targetDate.getTime())) {
        return reply.status(400).send({ error: 'Invalid date value' });
      }

      // Load or calculate dashas
      let dashas: DashaPeriod[];

      const cachedRow = isCacheValid(profile_id) ? getCachedCalculation(profile_id) : undefined;
      if (cachedRow?.dashas_json !== null && cachedRow !== undefined) {
        try {
          dashas = JSON.parse(cachedRow.dashas_json!) as DashaPeriod[];
        } catch {
          dashas = await computeDashas(profile, getEngine(ayanamsaFromId(profile.ayanamsa_id)));
        }
      } else {
        const engine = getEngine(ayanamsaFromId(profile.ayanamsa_id));
        dashas = await computeDashas(profile, engine);
      }

      // Find the dasha period containing the target date
      const match = dashas.find((d) => {
        const start = new Date(d.mahadasha.startDate).getTime();
        const end = new Date(d.mahadasha.endDate).getTime();
        const target = targetDate.getTime();
        return target >= start && target <= end;
      });

      if (match === undefined) {
        return reply.status(404).send({
          error: `No dasha period found for date ${date}`,
        });
      }

      return reply.send({ data: match, date });
    },
  );

  // ── GET /calculations/cache/:profile_id ─────────────────────────────────
  fastify.get<{ Params: ProfileIdParams }>(
    '/calculations/cache/:profile_id',
    async (request, reply) => {
      const parsed = ProfileIdParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid profile_id format' });
      }

      const { profile_id } = parsed.data;

      if (getProfile(profile_id) === undefined) {
        return reply.status(404).send({ error: 'Profile not found' });
      }

      const row = getCachedCalculation(profile_id);
      const valid = isCacheValid(profile_id);

      if (row === undefined) {
        return reply.send({
          data: {
            exists: false,
            valid: false,
            profile_id,
          },
        });
      }

      return reply.send({
        data: {
          exists: true,
          valid,
          profile_id,
          computed_at: row.computed_at,
          cache_version: row.cache_version,
          has_chart: row.chart_json !== null,
          has_vargas: row.vargas_json !== null,
          has_dashas: row.dashas_json !== null,
          has_yogas: row.yogas_json !== null,
          has_shadbala: row.shadbala_json !== null,
          has_ashtakavarga: row.ashtakavarga_json !== null,
        },
      });
    },
  );

  // ── DELETE /calculations/cache/:profile_id ───────────────────────────────
  fastify.delete<{ Params: ProfileIdParams }>(
    '/calculations/cache/:profile_id',
    async (request, reply) => {
      const parsed = ProfileIdParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid profile_id format' });
      }

      const { profile_id } = parsed.data;

      if (getProfile(profile_id) === undefined) {
        return reply.status(404).send({ error: 'Profile not found' });
      }

      invalidateCache(profile_id);

      return reply.send({ data: { invalidated: true, profile_id } });
    },
  );
};

// ---------------------------------------------------------------------------
// Internal helper — compute dashas for a profile record
// ---------------------------------------------------------------------------

async function computeDashas(
  profile: Awaited<ReturnType<typeof getProfile>> & object,
  engine: AstrologyEngine,
): Promise<DashaPeriod[]> {
  const birthData: BirthData = {
    name: profile.name,
    dateOfBirth: profile.dob_utc,
    latitude: profile.lat,
    longitude: profile.lon,
    timezone: profile.utc_offset_hours,
    ayanamsaId: ayanamsaFromId(profile.ayanamsa_id),
  };
  const chart = await engine.calculateChart(birthData);
  return engine.calculateDashas(chart);
}

export default calculationRoutes;
