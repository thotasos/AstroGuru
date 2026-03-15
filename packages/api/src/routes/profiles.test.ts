// ============================================================
// Profiles API Route Tests — Parashari Precision
// ============================================================
// Integration tests using a real SQLite temp DB.
// Tests the full HTTP request/response cycle via Fastify inject.
// ============================================================

import Fastify, { type FastifyInstance } from 'fastify';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let testDbPath: string;

/** Resolve the DB path and apply migrations for the isolated test DB. */
async function setupTestDb(): Promise<void> {
  testDbPath = path.join(os.tmpdir(), `parashari_profiles_test_${Date.now()}_${process.pid}.sqlite`);
  process.env['DB_PATH'] = testDbPath;
  process.env['NODE_ENV'] = 'test';

  // Reset the DB singleton so it picks up the new path
  const { closeDb } = await import('../database/db.js');
  closeDb();

  const { runMigrations } = await import('../database/migrate.js');
  runMigrations();
}

async function teardownTestDb(): Promise<void> {
  const { closeDb } = await import('../database/db.js');
  closeDb();
  if (testDbPath && fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
}

/** Build a minimal Fastify test instance with profile routes. */
async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  const { default: profileRoutes } = await import('./profiles.js');
  const { errorHandler } = await import('../middleware/errorHandler.js');

  app.setErrorHandler(errorHandler);
  await app.register(profileRoutes, { prefix: '/api' });
  await app.ready();
  return app;
}

// ---------------------------------------------------------------------------
// Valid profile payload
// ---------------------------------------------------------------------------

const validProfile = {
  name: 'TC-01 Test Profile',
  dob_utc: '1974-09-20T06:30:00Z',
  lat: 12.9716,
  lon: 77.5946,
  timezone: 'Asia/Kolkata',
  utc_offset_hours: 5.5,
  place_name: 'Bangalore, India',
  ayanamsa_id: 1,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/profiles', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await setupTestDb();
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDb();
  });

  test('Creates a profile and returns 201 with id', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/profiles',
      payload: validProfile,
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body) as { data: { id: string; name: string } };
    expect(body.data).toBeDefined();
    expect(typeof body.data.id).toBe('string');
    expect(body.data.id.length).toBeGreaterThan(0);
    expect(body.data.name).toBe(validProfile.name);
  });

  test('Returns 400 when name is missing', async () => {
    const { name: _, ...withoutName } = validProfile;
    const response = await app.inject({
      method: 'POST',
      url: '/api/profiles',
      payload: withoutName,
    });
    expect(response.statusCode).toBe(400);
  });

  test('Returns 400 when dob_utc is not a valid ISO datetime', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/profiles',
      payload: { ...validProfile, dob_utc: 'not-a-date' },
    });
    expect(response.statusCode).toBe(400);
  });

  test('Returns 400 when lat is out of range (>90)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/profiles',
      payload: { ...validProfile, lat: 91 },
    });
    expect(response.statusCode).toBe(400);
  });

  test('Returns 400 when lon is out of range (<-180)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/profiles',
      payload: { ...validProfile, lon: -181 },
    });
    expect(response.statusCode).toBe(400);
  });

  test('Returns 400 when utc_offset_hours is out of range', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/profiles',
      payload: { ...validProfile, utc_offset_hours: 15 },  // max is 14
    });
    expect(response.statusCode).toBe(400);
  });

  test('Returns 400 with validation error details', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/profiles',
      payload: { lat: 'not-a-number', lon: 'also-wrong' },
    });
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as { error: string; details?: unknown[] };
    expect(body.error).toBeDefined();
  });

  test('Accepts optional fields (notes, place_name)', async () => {
    const payload = {
      ...validProfile,
      notes: 'Test notes',
      name: 'Profile with notes',
    };
    const response = await app.inject({
      method: 'POST',
      url: '/api/profiles',
      payload,
    });
    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body) as { data: { notes: string } };
    expect(body.data.notes).toBe('Test notes');
  });

  test('Omits optional ayanamsa_id and defaults to 1', async () => {
    const { ayanamsa_id: _, ...withoutAyanamsa } = validProfile;
    const response = await app.inject({
      method: 'POST',
      url: '/api/profiles',
      payload: withoutAyanamsa,
    });
    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body) as { data: { ayanamsa_id: number } };
    expect(body.data.ayanamsa_id).toBe(1);
  });
});

describe('GET /api/profiles', () => {
  let app: FastifyInstance;
  let createdProfileId: string;

  beforeAll(async () => {
    await setupTestDb();
    app = await buildTestApp();

    // Create a profile to test with
    const response = await app.inject({
      method: 'POST',
      url: '/api/profiles',
      payload: validProfile,
    });
    const body = JSON.parse(response.body) as { data: { id: string } };
    createdProfileId = body.data.id;
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDb();
  });

  test('Returns 200 with an array', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/profiles' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('Returned array contains the created profile', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/profiles' });
    const body = JSON.parse(response.body) as { data: Array<{ id: string }> };
    const found = body.data.find((p) => p.id === createdProfileId);
    expect(found).toBeDefined();
  });

  test('GET /api/profiles/:id returns single profile', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/profiles/${createdProfileId}`,
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: { id: string; name: string } };
    expect(body.data.id).toBe(createdProfileId);
    expect(body.data.name).toBe(validProfile.name);
  });

  test('GET /api/profiles/:id returns 404 for nonexistent UUID', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/profiles/00000000-0000-0000-0000-000000000000',
    });
    expect(response.statusCode).toBe(404);
  });

  test('GET /api/profiles/:id returns 400 for non-UUID id', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/profiles/not-a-uuid',
    });
    expect(response.statusCode).toBe(400);
  });
});

describe('GET /api/profiles/search', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await setupTestDb();
    app = await buildTestApp();

    // Create a searchable profile
    await app.inject({
      method: 'POST',
      url: '/api/profiles',
      payload: { ...validProfile, name: 'Searchable User Alpha', place_name: 'Mumbai, India' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/profiles',
      payload: { ...validProfile, name: 'Another User Beta' },
    });
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDb();
  });

  test('Returns matching profiles for name search', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/profiles/search?q=Searchable',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: Array<{ name: string }> };
    expect(body.data.some((p) => p.name.includes('Searchable'))).toBe(true);
  });

  test('Returns profiles matching place name', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/profiles/search?q=Mumbai',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: Array<{ place_name: string | null }> };
    expect(body.data.some((p) => p.place_name?.includes('Mumbai'))).toBe(true);
  });

  test('Returns 400 when q is missing', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/profiles/search',
    });
    expect(response.statusCode).toBe(400);
  });

  test('Returns empty array for no matches', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/profiles/search?q=ZZZNOMATCHES999XYZ',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: unknown[] };
    expect(body.data).toHaveLength(0);
  });
});

describe('PUT /api/profiles/:id', () => {
  let app: FastifyInstance;
  let profileId: string;

  beforeAll(async () => {
    await setupTestDb();
    app = await buildTestApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/profiles',
      payload: validProfile,
    });
    const body = JSON.parse(response.body) as { data: { id: string } };
    profileId = body.data.id;
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDb();
  });

  test('Updates name and returns updated profile', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: `/api/profiles/${profileId}`,
      payload: { name: 'Updated Name' },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: { name: string } };
    expect(body.data.name).toBe('Updated Name');
  });

  test('Returns 404 for nonexistent profile', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/profiles/00000000-0000-0000-0000-000000000000',
      payload: { name: 'New Name' },
    });
    expect(response.statusCode).toBe(404);
  });

  test('Returns 400 for invalid UUID', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/profiles/not-valid-uuid',
      payload: { name: 'Name' },
    });
    expect(response.statusCode).toBe(400);
  });

  test('Partial update leaves other fields unchanged', async () => {
    // First get the current state
    const getResponse = await app.inject({
      method: 'GET',
      url: `/api/profiles/${profileId}`,
    });
    const originalBody = JSON.parse(getResponse.body) as { data: { lat: number } };
    const originalLat = originalBody.data.lat;

    // Update only the name
    await app.inject({
      method: 'PUT',
      url: `/api/profiles/${profileId}`,
      payload: { name: 'Name Only Update' },
    });

    // Verify lat is unchanged
    const afterResponse = await app.inject({
      method: 'GET',
      url: `/api/profiles/${profileId}`,
    });
    const afterBody = JSON.parse(afterResponse.body) as { data: { lat: number } };
    expect(afterBody.data.lat).toBe(originalLat);
  });
});

describe('DELETE /api/profiles/:id', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await setupTestDb();
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDb();
  });

  test('Deletes a profile and returns 204', async () => {
    // Create then delete
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/profiles',
      payload: { ...validProfile, name: 'To Be Deleted' },
    });
    const { data: { id } } = JSON.parse(createResponse.body) as { data: { id: string } };

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/api/profiles/${id}`,
    });
    expect(deleteResponse.statusCode).toBe(204);
  });

  test('Deleted profile no longer accessible (404)', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/profiles',
      payload: { ...validProfile, name: 'To Be Deleted 2' },
    });
    const { data: { id } } = JSON.parse(createResponse.body) as { data: { id: string } };

    await app.inject({ method: 'DELETE', url: `/api/profiles/${id}` });

    const getResponse = await app.inject({
      method: 'GET',
      url: `/api/profiles/${id}`,
    });
    expect(getResponse.statusCode).toBe(404);
  });

  test('Returns 404 when deleting nonexistent profile', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/profiles/00000000-0000-0000-0000-000000000000',
    });
    expect(response.statusCode).toBe(404);
  });

  test('Returns 400 for non-UUID id', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/profiles/not-a-uuid',
    });
    expect(response.statusCode).toBe(400);
  });
});

describe('Profile data integrity', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await setupTestDb();
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDb();
  });

  test('Created profile preserves all submitted fields', async () => {
    const payload = {
      ...validProfile,
      name: 'Data Integrity Test',
      lat: 28.6139,
      lon: 77.2090,
      timezone: 'Asia/Kolkata',
      utc_offset_hours: 5.5,
      place_name: 'New Delhi, India',
      notes: 'Test notes for integrity',
    };

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/profiles',
      payload,
    });
    const { data: { id } } = JSON.parse(createResponse.body) as { data: { id: string } };

    const getResponse = await app.inject({
      method: 'GET',
      url: `/api/profiles/${id}`,
    });
    const { data } = JSON.parse(getResponse.body) as { data: Record<string, unknown> };

    expect(data['name']).toBe(payload.name);
    expect(data['lat']).toBe(payload.lat);
    expect(data['lon']).toBe(payload.lon);
    expect(data['timezone']).toBe(payload.timezone);
    expect(data['utc_offset_hours']).toBe(payload.utc_offset_hours);
    expect(data['place_name']).toBe(payload.place_name);
    expect(data['notes']).toBe(payload.notes);
  });

  test('Profile has created_at and updated_at timestamps', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/profiles',
      payload: { ...validProfile, name: 'Timestamp Test' },
    });
    const { data } = JSON.parse(createResponse.body) as { data: Record<string, unknown> };
    expect(typeof data['created_at']).toBe('string');
    expect(typeof data['updated_at']).toBe('string');
    expect(new Date(data['created_at'] as string).getTime()).not.toBeNaN();
  });

  test('Profile ID is a valid UUID v4 format', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/profiles',
      payload: { ...validProfile, name: 'UUID Format Test' },
    });
    const { data: { id } } = JSON.parse(response.body) as { data: { id: string } };
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidV4Regex.test(id)).toBe(true);
  });
});
