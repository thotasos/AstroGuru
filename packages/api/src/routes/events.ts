/**
 * events.ts — Fastify route plugin for the life events journal
 *
 * Routes (all prefixed with /api via server registration):
 *   GET    /events/:profile_id                       all events for a profile
 *   GET    /events/:profile_id/range?from=&to=        events in a date range
 *   POST   /events/:profile_id                       create an event
 *   PUT    /events/:id                                update an event
 *   DELETE /events/:id                                delete an event
 */

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { getProfile } from '../database/profiles.js';
import {
  createEvent,
  getEventsForProfile,
  getEventsInDateRange,
  updateEvent,
  deleteEvent,
  type CreateEventInput,
  type EventCategory,
  type EventSentiment,
} from '../database/events.js';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const EVENT_CATEGORIES: [EventCategory, ...EventCategory[]] = [
  'Career',
  'Relationship',
  'Health',
  'Finance',
  'Travel',
  'Education',
  'Other',
];

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

const CreateEventSchema = z.object({
  event_date: isoDate,
  category: z.enum(EVENT_CATEGORIES),
  title: z.string().min(1, 'Title is required').max(300),
  description: z.string().max(2000).nullable().optional(),
  sentiment: z
    .union([z.literal(-1), z.literal(0), z.literal(1)])
    .nullable()
    .optional(),
});

const UpdateEventSchema = CreateEventSchema.partial();

const ProfileIdParamsSchema = z.object({
  profile_id: z.string().uuid('profile_id must be a UUID'),
});

const EventIdParamsSchema = z.object({
  id: z.string().uuid('Event ID must be a UUID'),
});

const DateRangeQuerySchema = z
  .object({
    from: isoDate,
    to: isoDate,
  })
  .refine((d) => d.from <= d.to, {
    message: '"from" must be on or before "to"',
    path: ['from'],
  });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProfileIdParams = { profile_id: string };
type EventIdParams = { id: string };
type DateRangeQuery = { from: string; to: string };
type CreateBody = z.infer<typeof CreateEventSchema>;
type UpdateBody = z.infer<typeof UpdateEventSchema>;

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

const eventRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
): Promise<void> => {
  // ── GET /events/:profile_id/range ─────────────────────────────────────
  // Register before /:profile_id to avoid "range" being eaten as a separate param.
  fastify.get<{ Params: ProfileIdParams; Querystring: DateRangeQuery }>(
    '/events/:profile_id/range',
    async (request, reply) => {
      const paramsParsed = ProfileIdParamsSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({ error: 'Invalid profile_id format' });
      }

      const queryParsed = DateRangeQuerySchema.safeParse(request.query);
      if (!queryParsed.success) {
        return reply.status(400).send({
          error: queryParsed.error.issues[0]?.message ?? 'Invalid date range',
          details: queryParsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        });
      }

      const { profile_id } = paramsParsed.data;

      if (getProfile(profile_id) === undefined) {
        return reply.status(404).send({ error: 'Profile not found' });
      }

      const events = getEventsInDateRange(
        profile_id,
        queryParsed.data.from,
        queryParsed.data.to,
      );

      return reply.send({ data: events });
    },
  );

  // ── GET /events/:profile_id ───────────────────────────────────────────
  fastify.get<{ Params: ProfileIdParams }>(
    '/events/:profile_id',
    async (request, reply) => {
      const parsed = ProfileIdParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid profile_id format' });
      }

      const { profile_id } = parsed.data;

      if (getProfile(profile_id) === undefined) {
        return reply.status(404).send({ error: 'Profile not found' });
      }

      const events = getEventsForProfile(profile_id);
      return reply.send({ data: events });
    },
  );

  // ── POST /events/:profile_id ──────────────────────────────────────────
  fastify.post<{ Params: ProfileIdParams; Body: CreateBody }>(
    '/events/:profile_id',
    async (request, reply) => {
      const paramsParsed = ProfileIdParamsSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({ error: 'Invalid profile_id format' });
      }

      const bodyParsed = CreateEventSchema.safeParse(request.body);
      if (!bodyParsed.success) {
        throw bodyParsed.error;
      }

      const { profile_id } = paramsParsed.data;

      if (getProfile(profile_id) === undefined) {
        return reply.status(404).send({ error: 'Profile not found' });
      }

      const input: CreateEventInput = {
        profile_id,
        event_date: bodyParsed.data.event_date,
        category: bodyParsed.data.category,
        title: bodyParsed.data.title,
        description: bodyParsed.data.description ?? null,
        sentiment: (bodyParsed.data.sentiment ?? null) as EventSentiment | null,
      };

      const event = createEvent(input);
      return reply.status(201).send({ data: event });
    },
  );

  // ── PUT /events/:id ───────────────────────────────────────────────────
  fastify.put<{ Params: EventIdParams; Body: UpdateBody }>(
    '/events/:id',
    async (request, reply) => {
      const paramsParsed = EventIdParamsSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({ error: 'Invalid event ID format' });
      }

      const bodyParsed = UpdateEventSchema.safeParse(request.body);
      if (!bodyParsed.success) {
        throw bodyParsed.error;
      }

      const { id } = paramsParsed.data;

      // Build the update patch — only include keys that were actually sent.
      // With exactOptionalPropertyTypes we cannot pass `string | undefined`
      // where a Partial key's type is just `string`, so we strip undefined.
      const patch: Partial<Omit<CreateEventInput, 'profile_id'>> = {};
      if (bodyParsed.data.event_date !== undefined) patch.event_date = bodyParsed.data.event_date;
      if (bodyParsed.data.category !== undefined) patch.category = bodyParsed.data.category;
      if (bodyParsed.data.title !== undefined) patch.title = bodyParsed.data.title;
      if ('description' in bodyParsed.data) patch.description = bodyParsed.data.description ?? null;
      if ('sentiment' in bodyParsed.data) {
        patch.sentiment = (bodyParsed.data.sentiment ?? null) as EventSentiment | null;
      }

      // updateEvent throws if not found — convert to 404
      let event;
      try {
        event = updateEvent(id, patch);
      } catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
          return reply.status(404).send({ error: 'Event not found' });
        }
        throw err;
      }

      return reply.send({ data: event });
    },
  );

  // ── DELETE /events/:id ────────────────────────────────────────────────
  fastify.delete<{ Params: EventIdParams }>(
    '/events/:id',
    async (request, reply) => {
      const parsed = EventIdParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid event ID format' });
      }

      deleteEvent(parsed.data.id);
      return reply.status(204).send();
    },
  );
};

export default eventRoutes;
