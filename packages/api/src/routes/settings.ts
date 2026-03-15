/**
 * settings.ts — Fastify route plugin for application settings
 *
 * Settings are stored as key-value pairs in the `app_settings` SQLite table.
 * Well-known keys with their types and defaults are defined below.
 *
 * Routes (all prefixed with /api via server registration):
 *   GET /settings           list all settings
 *   PUT /settings/:key      upsert a single setting
 */

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getDb } from '../database/db.js';

// ---------------------------------------------------------------------------
// Well-known settings catalogue
// ---------------------------------------------------------------------------

export type SettingKey =
  | 'default_ayanamsa'
  | 'ephemeris_path'
  | 'theme'
  | 'default_chart_style'
  | 'date_format'
  | 'language';

interface SettingMeta {
  key: SettingKey;
  description: string;
  default: string;
  validate: z.ZodType<string>;
}

const AYANAMSA_VALUES = ['Lahiri', 'Raman', 'KP'] as const;
const THEME_VALUES = ['light', 'dark', 'system'] as const;
const CHART_STYLE_VALUES = ['south-indian', 'north-indian', 'east-indian'] as const;
const DATE_FORMAT_VALUES = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as const;

export const SETTINGS_CATALOGUE: SettingMeta[] = [
  {
    key: 'default_ayanamsa',
    description: 'Default ayanamsa system used for new charts',
    default: 'Lahiri',
    validate: z.enum(AYANAMSA_VALUES, {
      errorMap: () => ({ message: `Must be one of: ${AYANAMSA_VALUES.join(', ')}` }),
    }),
  },
  {
    key: 'ephemeris_path',
    description: 'Absolute path to the Swiss Ephemeris data files',
    default: '',
    validate: z.string().max(500),
  },
  {
    key: 'theme',
    description: 'UI colour theme',
    default: 'system',
    validate: z.enum(THEME_VALUES, {
      errorMap: () => ({ message: `Must be one of: ${THEME_VALUES.join(', ')}` }),
    }),
  },
  {
    key: 'default_chart_style',
    description: 'Default chart layout style',
    default: 'south-indian',
    validate: z.enum(CHART_STYLE_VALUES, {
      errorMap: () => ({ message: `Must be one of: ${CHART_STYLE_VALUES.join(', ')}` }),
    }),
  },
  {
    key: 'date_format',
    description: 'Display date format',
    default: 'DD/MM/YYYY',
    validate: z.enum(DATE_FORMAT_VALUES, {
      errorMap: () => ({ message: `Must be one of: ${DATE_FORMAT_VALUES.join(', ')}` }),
    }),
  },
  {
    key: 'language',
    description: 'Display language (ISO 639-1)',
    default: 'en',
    validate: z
      .string()
      .min(2)
      .max(10)
      .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Must be a valid BCP 47 language tag, e.g. "en" or "hi"'),
  },
];

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

interface SettingRow {
  key: string;
  value: string;
  updated_at: string;
}

function ensureSettingsTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}

function getAllSettings(): SettingRow[] {
  ensureSettingsTable();
  const db = getDb();
  const rows = db
    .prepare<[], Record<string, unknown>>('SELECT key, value, updated_at FROM app_settings ORDER BY key ASC')
    .all();

  return rows.map((r) => ({
    key: r['key'] as string,
    value: r['value'] as string,
    updated_at: r['updated_at'] as string,
  }));
}

function upsertSetting(key: string, value: string): SettingRow {
  ensureSettingsTable();
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare<[string, string, string]>(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value      = excluded.value,
      updated_at = excluded.updated_at
  `).run(key, value, now);

  const row = db
    .prepare<[string], Record<string, unknown>>(
      'SELECT key, value, updated_at FROM app_settings WHERE key = ?',
    )
    .get(key);

  if (row === undefined) throw new Error(`Setting not found after upsert (key=${key})`);

  return {
    key: row['key'] as string,
    value: row['value'] as string,
    updated_at: row['updated_at'] as string,
  };
}

// ---------------------------------------------------------------------------
// Merged view: DB values + catalogue defaults + metadata
// ---------------------------------------------------------------------------

interface SettingView {
  key: string;
  value: string;
  description: string;
  default: string;
  updated_at: string | null;
}

function buildSettingsView(): SettingView[] {
  const dbRows = getAllSettings();
  const dbMap = new Map(dbRows.map((r) => [r.key, r]));

  return SETTINGS_CATALOGUE.map((meta) => {
    const row = dbMap.get(meta.key);
    return {
      key: meta.key,
      value: row?.value ?? meta.default,
      description: meta.description,
      default: meta.default,
      updated_at: row?.updated_at ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Zod request schemas
// ---------------------------------------------------------------------------

const ALL_KEYS = SETTINGS_CATALOGUE.map((s) => s.key) as [SettingKey, ...SettingKey[]];

const KeyParamsSchema = z.object({
  key: z.enum(ALL_KEYS, {
    errorMap: () => ({
      message: `Unknown setting key. Valid keys: ${ALL_KEYS.join(', ')}`,
    }),
  }),
});

const UpdateSettingSchema = z.object({
  value: z.string().min(0).max(500),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type KeyParams = { key: string };
type UpdateBody = { value: string };

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

const settingsRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
): Promise<void> => {
  // ── GET /settings ─────────────────────────────────────────────────────
  fastify.get('/settings', async (_request, reply) => {
    const settings = buildSettingsView();
    return reply.send({ data: settings });
  });

  // ── PUT /settings/:key ────────────────────────────────────────────────
  fastify.put<{ Params: KeyParams; Body: UpdateBody }>(
    '/settings/:key',
    async (request, reply) => {
      const paramsParsed = KeyParamsSchema.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.status(400).send({
          error: paramsParsed.error.issues[0]?.message ?? 'Invalid setting key',
        });
      }

      const bodyParsed = UpdateSettingSchema.safeParse(request.body);
      if (!bodyParsed.success) {
        return reply.status(400).send({
          error: bodyParsed.error.issues[0]?.message ?? 'Invalid request body',
        });
      }

      const { key } = paramsParsed.data;
      const { value } = bodyParsed.data;

      // Find the catalogue entry to run value-specific validation
      const meta = SETTINGS_CATALOGUE.find((s) => s.key === key)!;
      const valueValidation = meta.validate.safeParse(value);
      if (!valueValidation.success) {
        return reply.status(400).send({
          error: valueValidation.error.issues[0]?.message ?? 'Invalid value',
          code: 'INVALID_SETTING_VALUE',
        });
      }

      const updated = upsertSetting(key, value);

      const responseData: SettingView = {
        key: updated.key,
        value: updated.value,
        description: meta.description,
        default: meta.default,
        updated_at: updated.updated_at,
      };

      return reply.send({ data: responseData });
    },
  );
};

export default settingsRoutes;
