/**
 * profiles.ts — Fastify route plugin for birth profile CRUD
 *
 * Routes (all prefixed with /api via server registration):
 *   GET    /profiles            list all profiles
 *   GET    /profiles/search?q=  full-text search by name / place
 *   GET    /profiles/:id        single profile
 *   POST   /profiles            create profile
 *   PUT    /profiles/:id        update profile
 *   DELETE /profiles/:id        delete profile + cascaded cache/events
 */

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import {
  getAllProfiles,
  getProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  searchProfiles,
  type CreateProfileInput,
} from '../database/profiles.js';
import { invalidateCache } from '../database/cache.js';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

/**
 * ISO 8601 UTC datetime string  "YYYY-MM-DDTHH:MM:SSZ"
 * Accept the full ISO form; allow any Z-suffix or numeric offset.
 */
const isoDatetime = z
  .string()
  .datetime({ offset: true, message: 'Must be a valid ISO 8601 UTC datetime' });

/** IANA timezone identifier, e.g. "Asia/Kolkata" */
const ianaTimezone = z
  .string()
  .min(1)
  .regex(/^[A-Za-z]+\/[A-Za-z_]+$|^UTC$|^GMT$/, {
    message: 'Must be a valid IANA timezone string (e.g. Asia/Kolkata)',
  });

const CreateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  /** UTC-normalised birth datetime; caller must already convert from local */
  dob_utc: isoDatetime,
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  timezone: ianaTimezone,
  utc_offset_hours: z.number().min(-14).max(14),
  place_name: z.string().max(300).nullable().optional(),
  ayanamsa_id: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

const UpdateProfileSchema = CreateProfileSchema.partial();

const IdParamsSchema = z.object({
  id: z.string().uuid('Profile ID must be a UUID'),
});

const SearchQuerySchema = z.object({
  q: z.string().min(1, 'Search query must not be empty').max(200),
});

// ---------------------------------------------------------------------------
// Type aliases
// ---------------------------------------------------------------------------

type IdParams = { id: string };
type SearchQuery = { q: string };
type CreateBody = z.infer<typeof CreateProfileSchema>;
type UpdateBody = z.infer<typeof UpdateProfileSchema>;

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

const profileRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
): Promise<void> => {
  // ── GET /profiles/search ───────────────────────────────────────────────
  // MUST be registered before /:id to prevent the literal "search"
  // being swallowed as a UUID parameter.
  fastify.get<{ Querystring: SearchQuery }>(
    '/profiles/search',
    async (request, reply) => {
      const parsed = SearchQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? 'Invalid query' });
      }

      const profiles = searchProfiles(parsed.data.q);
      return reply.send({ data: profiles });
    },
  );

  // ── GET /profiles ──────────────────────────────────────────────────────
  fastify.get('/profiles', async (_request, reply) => {
    const profiles = getAllProfiles();
    return reply.send({ data: profiles });
  });

  // ── GET /profiles/:id ──────────────────────────────────────────────────
  fastify.get<{ Params: IdParams }>('/profiles/:id', async (request, reply) => {
    const parsed = IdParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid profile ID format' });
    }

    const profile = getProfile(parsed.data.id);
    if (profile === undefined) {
      return reply.status(404).send({ error: 'Profile not found' });
    }

    return reply.send({ data: profile });
  });

  // ── POST /profiles ─────────────────────────────────────────────────────
  fastify.post<{ Body: CreateBody }>('/profiles', async (request, reply) => {
    const parsed = CreateProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      throw parsed.error; // caught by errorHandler → 400 with field details
    }

    const input: CreateProfileInput = {
      name: parsed.data.name,
      dob_utc: parsed.data.dob_utc,
      lat: parsed.data.lat,
      lon: parsed.data.lon,
      timezone: parsed.data.timezone,
      utc_offset_hours: parsed.data.utc_offset_hours,
      place_name: parsed.data.place_name ?? null,
      ...(parsed.data.ayanamsa_id !== undefined && { ayanamsa_id: parsed.data.ayanamsa_id }),
      notes: parsed.data.notes ?? null,
    };

    const profile = createProfile(input);
    return reply.status(201).send({ data: profile });
  });

  // ── PUT /profiles/:id ──────────────────────────────────────────────────
  fastify.put<{ Params: IdParams; Body: UpdateBody }>(
    '/profiles/:id',
    async (request, reply) => {
      const paramsParsed = IdParamsSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({ error: 'Invalid profile ID format' });
      }

      const bodyParsed = UpdateProfileSchema.safeParse(request.body);
      if (!bodyParsed.success) {
        throw bodyParsed.error;
      }

      const { id } = paramsParsed.data;

      // Verify existence before updating so we return 404 not 500
      if (getProfile(id) === undefined) {
        return reply.status(404).send({ error: 'Profile not found' });
      }

      // If birth data changes, the cache must be invalidated
      const birthDataFields: Array<keyof UpdateBody> = [
        'dob_utc',
        'lat',
        'lon',
        'timezone',
        'utc_offset_hours',
        'ayanamsa_id',
      ];
      const hasBirthDataChange = birthDataFields.some(
        (k) => k in bodyParsed.data,
      );
      if (hasBirthDataChange) {
        invalidateCache(id);
      }

      // Filter out undefined values to match Partial<CreateProfileInput>
      const updateData: Partial<CreateProfileInput> = {};
      if (bodyParsed.data.name !== undefined) updateData.name = bodyParsed.data.name;
      if (bodyParsed.data.dob_utc !== undefined) updateData.dob_utc = bodyParsed.data.dob_utc;
      if (bodyParsed.data.lat !== undefined) updateData.lat = bodyParsed.data.lat;
      if (bodyParsed.data.lon !== undefined) updateData.lon = bodyParsed.data.lon;
      if (bodyParsed.data.timezone !== undefined) updateData.timezone = bodyParsed.data.timezone;
      if (bodyParsed.data.utc_offset_hours !== undefined) updateData.utc_offset_hours = bodyParsed.data.utc_offset_hours;
      if (bodyParsed.data.place_name !== undefined) updateData.place_name = bodyParsed.data.place_name;
      if (bodyParsed.data.ayanamsa_id !== undefined) updateData.ayanamsa_id = bodyParsed.data.ayanamsa_id;
      if (bodyParsed.data.notes !== undefined) updateData.notes = bodyParsed.data.notes;

      const updated = updateProfile(id, updateData);
      return reply.send({ data: updated });
    },
  );

  // ── DELETE /profiles/:id ───────────────────────────────────────────────
  fastify.delete<{ Params: IdParams }>(
    '/profiles/:id',
    async (request, reply) => {
      const parsed = IdParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid profile ID format' });
      }

      const { id } = parsed.data;

      if (getProfile(id) === undefined) {
        return reply.status(404).send({ error: 'Profile not found' });
      }

      // ON DELETE CASCADE in SQLite handles cache + events rows automatically.
      // Call invalidateCache defensively first in case FK cascades are delayed.
      invalidateCache(id);
      deleteProfile(id);

      return reply.status(204).send();
    },
  );
};

export default profileRoutes;
