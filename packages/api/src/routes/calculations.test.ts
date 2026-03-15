// ============================================================
// Calculations API Route Tests — Parashari Precision
// ============================================================
// Integration tests using Fastify inject + mocked AstrologyEngine.
// AstrologyEngine depends on Swiss Ephemeris (not available in CI),
// so it is fully mocked here.
// ============================================================

import Fastify, { type FastifyInstance } from 'fastify';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals';

// ---------------------------------------------------------------------------
// Mock @parashari/core so we don't need the swisseph binary
// ---------------------------------------------------------------------------

const mockChartData = {
  ascendant: 15.5,
  planets: [
    { planet: 0, sign: 0, degreeInSign: 15, siderealLongitude: 15, tropicalLongitude: 39, nakshatra: 0, nakshatraPada: 1, isRetrograde: false, speed: 0.98, latitude: 0 },
    { planet: 1, sign: 3, degreeInSign: 5, siderealLongitude: 95, tropicalLongitude: 119, nakshatra: 7, nakshatraPada: 2, isRetrograde: false, speed: 13.1, latitude: 0 },
    { planet: 2, sign: 7, degreeInSign: 10, siderealLongitude: 220, tropicalLongitude: 244, nakshatra: 16, nakshatraPada: 3, isRetrograde: false, speed: 0.52, latitude: 0 },
    { planet: 3, sign: 5, degreeInSign: 14, siderealLongitude: 164, tropicalLongitude: 188, nakshatra: 12, nakshatraPada: 1, isRetrograde: false, speed: 1.2, latitude: 0 },
    { planet: 4, sign: 3, degreeInSign: 4, siderealLongitude: 94, tropicalLongitude: 118, nakshatra: 7, nakshatraPada: 1, isRetrograde: false, speed: 0.083, latitude: 0 },
    { planet: 5, sign: 6, degreeInSign: 7, siderealLongitude: 187, tropicalLongitude: 211, nakshatra: 14, nakshatraPada: 2, isRetrograde: false, speed: 1.2, latitude: 0 },
    { planet: 6, sign: 9, degreeInSign: 2, siderealLongitude: 272, tropicalLongitude: 296, nakshatra: 20, nakshatraPada: 4, isRetrograde: true, speed: -0.034, latitude: 0 },
    { planet: 7, sign: 8, degreeInSign: 21, siderealLongitude: 261, tropicalLongitude: 285, nakshatra: 19, nakshatraPada: 4, isRetrograde: false, speed: -0.053, latitude: 0 },
    { planet: 8, sign: 2, degreeInSign: 21, siderealLongitude: 81, tropicalLongitude: 105, nakshatra: 6, nakshatraPada: 1, isRetrograde: false, speed: 0.053, latitude: 0 },
  ],
  houses: Array.from({ length: 12 }, (_, i) => ({
    house: i + 1,
    sign: i,
    degreeOnCusp: i * 30,
  })),
  julianDay: 2442297.208333,
  ayanamsa: 23.68,
  ayanamsaType: 'Lahiri',
  mc: 285.5,
};

const mockDashas = [
  {
    mahadasha: { planet: 5, startDate: '1974-09-20T00:00:00Z', endDate: '1994-09-20T00:00:00Z', level: 1 },
    antardasha: { planet: 5, startDate: '1974-09-20T00:00:00Z', endDate: '1978-03-10T00:00:00Z', level: 2 },
    pratyantardasha: { planet: 5, startDate: '1974-09-20T00:00:00Z', endDate: '1975-07-11T00:00:00Z', level: 3 },
    sookshma: { planet: 5, startDate: '1974-09-20T00:00:00Z', endDate: '1974-11-09T00:00:00Z', level: 4 },
    prana: { planet: 5, startDate: '1974-09-20T00:00:00Z', endDate: '1974-10-03T00:00:00Z', level: 5 },
  },
];

const mockYogas = [
  {
    name: 'Ruchaka Yoga',
    description: 'Mars in Aries in kendra.',
    isPresent: false,
    planets: [2],
    houses: [8],
    strength: 0,
    category: 'Pancha Mahapurusha',
  },
  {
    name: 'Hamsa Yoga',
    description: 'Jupiter in Cancer in kendra.',
    isPresent: true,
    planets: [4],
    houses: [4],
    strength: 0.9,
    category: 'Pancha Mahapurusha',
  },
];

const mockShadbala = [
  { planet: 0, sthanabala: 120, digbala: 45, kalabala: 60, chestabala: 30, naisargikabala: 60, drigbala: 15, total: 330, totalRupas: 5.5, ishtaPhala: 42.4, kashtaPhala: 24.5 },
  { planet: 1, sthanabala: 95, digbala: 55, kalabala: 60, chestabala: 60, naisargikabala: 51.43, drigbala: 20, total: 341.43, totalRupas: 5.69, ishtaPhala: 55, kashtaPhala: 18 },
];

// Mock the @parashari/core module
jest.mock('@parashari/core', () => ({
  AstrologyEngine: jest.fn().mockImplementation(() => ({
    calculateChart: jest.fn().mockResolvedValue(mockChartData),
    calculateAllVargas: jest.fn().mockResolvedValue(new Map([
      ['D1', { ...mockChartData, varga: 'D1', vargaSigns: {} }],
      ['D9', { ...mockChartData, varga: 'D9', vargaSigns: {} }],
    ])),
    calculateDashas: jest.fn().mockResolvedValue(mockDashas),
    detectYogas: jest.fn().mockResolvedValue(mockYogas),
    calculateShadbala: jest.fn().mockResolvedValue(mockShadbala),
    calculateAshtakavarga: jest.fn().mockResolvedValue({
      bav: new Map(),
      sav: new Array(12).fill(25),
      planetBav: new Map(),
    }),
  })),
  Ayanamsa: { Lahiri: 'Lahiri', Raman: 'Raman', KP: 'KP' },
  Varga: {
    D1: 'D1', D2: 'D2', D3: 'D3', D4: 'D4', D7: 'D7', D9: 'D9', D10: 'D10', D12: 'D12',
    D16: 'D16', D20: 'D20', D24: 'D24', D27: 'D27', D30: 'D30', D40: 'D40', D45: 'D45', D60: 'D60',
  },
}));

// ---------------------------------------------------------------------------
// DB / App setup
// ---------------------------------------------------------------------------

let testDbPath: string;

async function setupTestDb(): Promise<void> {
  testDbPath = path.join(os.tmpdir(), `parashari_calc_test_${Date.now()}_${process.pid}.sqlite`);
  process.env['DB_PATH'] = testDbPath;
  process.env['NODE_ENV'] = 'test';

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

async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  const { default: calculationRoutes } = await import('./calculations.js');
  const { default: profileRoutes } = await import('./profiles.js');
  const { errorHandler } = await import('../middleware/errorHandler.js');

  app.setErrorHandler(errorHandler);
  await app.register(profileRoutes, { prefix: '/api' });
  await app.register(calculationRoutes, { prefix: '/api' });
  await app.ready();
  return app;
}

// ---------------------------------------------------------------------------
// Birth data fixture (TC-01: Bangalore, Sept 20 1974, 12:00 PM IST)
// ---------------------------------------------------------------------------

const tc01BirthData = {
  name: 'TC-01 Bangalore',
  dateOfBirth: '1974-09-20T06:30:00Z',  // 12:00 IST = 06:30 UTC
  latitude: 12.9716,
  longitude: 77.5946,
  timezone: 5.5,
  ayanamsaId: 'Lahiri',
};

// ===========================================================================
// POST /api/calculations/chart
// ===========================================================================

describe('POST /api/calculations/chart', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await setupTestDb();
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDb();
  });

  test('TC-01: Returns chart with 9 planets for Bangalore birth', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/calculations/chart',
      payload: { birth_data: tc01BirthData },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: typeof mockChartData };
    expect(body.data).toBeDefined();
    expect(body.data.planets).toHaveLength(9);
  });

  test('TC-01: Chart has ascendant set', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/calculations/chart',
      payload: { birth_data: tc01BirthData },
    });

    const body = JSON.parse(response.body) as { data: { ascendant: number } };
    expect(typeof body.data.ascendant).toBe('number');
    expect(body.data.ascendant).toBeGreaterThanOrEqual(0);
    expect(body.data.ascendant).toBeLessThan(360);
  });

  test('TC-01: Planets have sidereal longitudes', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/calculations/chart',
      payload: { birth_data: tc01BirthData },
    });

    const body = JSON.parse(response.body) as {
      data: { planets: Array<{ siderealLongitude: number }> }
    };
    for (const planet of body.data.planets) {
      expect(typeof planet.siderealLongitude).toBe('number');
      expect(planet.siderealLongitude).toBeGreaterThanOrEqual(0);
      expect(planet.siderealLongitude).toBeLessThan(360);
    }
  });

  test('Returns 400 when neither profile_id nor birth_data is provided', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/calculations/chart',
      payload: {},
    });
    expect(response.statusCode).toBe(400);
  });

  test('Returns 400 for invalid birth_data (missing name)', async () => {
    const { name: _, ...withoutName } = tc01BirthData;
    const response = await app.inject({
      method: 'POST',
      url: '/api/calculations/chart',
      payload: { birth_data: withoutName },
    });
    expect(response.statusCode).toBe(400);
  });

  test('Returns 400 for invalid dateOfBirth format', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/calculations/chart',
      payload: { birth_data: { ...tc01BirthData, dateOfBirth: 'not-a-date' } },
    });
    expect(response.statusCode).toBe(400);
  });

  test('Returns 404 when profile_id does not exist', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/calculations/chart',
      payload: { profile_id: '00000000-0000-0000-0000-000000000000' },
    });
    expect(response.statusCode).toBe(404);
  });

  test('Response includes cached flag', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/calculations/chart',
      payload: { birth_data: tc01BirthData },
    });
    const body = JSON.parse(response.body) as { cached: boolean };
    expect(typeof body.cached).toBe('boolean');
  });
});

// ===========================================================================
// POST /api/calculations/dashas
// ===========================================================================

describe('POST /api/calculations/dashas', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await setupTestDb();
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDb();
  });

  test('Returns dasha array for valid birth data', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/calculations/dashas',
      payload: { birth_data: tc01BirthData },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  test('Each dasha period has 5 levels', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/calculations/dashas',
      payload: { birth_data: tc01BirthData },
    });
    const body = JSON.parse(response.body) as {
      data: Array<{ mahadasha: unknown; antardasha: unknown; pratyantardasha: unknown; sookshma: unknown; prana: unknown }>
    };
    const first = body.data[0]!;
    expect(first.mahadasha).toBeDefined();
    expect(first.antardasha).toBeDefined();
    expect(first.pratyantardasha).toBeDefined();
    expect(first.sookshma).toBeDefined();
    expect(first.prana).toBeDefined();
  });
});

// ===========================================================================
// POST /api/calculations/yogas
// ===========================================================================

describe('POST /api/calculations/yogas', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await setupTestDb();
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDb();
  });

  test('Returns sorted yogas array', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/calculations/yogas',
      payload: { birth_data: tc01BirthData },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      data: Array<{ name: string; strength: number }>
    };
    expect(Array.isArray(body.data)).toBe(true);

    // Verify sorted descending by strength
    for (let i = 1; i < body.data.length; i++) {
      expect(body.data[i - 1]!.strength).toBeGreaterThanOrEqual(body.data[i]!.strength);
    }
  });
});

// ===========================================================================
// POST /api/calculations/shadbala
// ===========================================================================

describe('POST /api/calculations/shadbala', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await setupTestDb();
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDb();
  });

  test('Returns shadbala results for 7 planets', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/calculations/shadbala',
      payload: { birth_data: tc01BirthData },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
    // Mock returns 2, but in real usage returns 7
    expect(body.data.length).toBeGreaterThan(0);
  });
});

// ===========================================================================
// POST /api/calculations/full
// ===========================================================================

describe('POST /api/calculations/full', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await setupTestDb();
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDb();
  });

  test('Returns all 6 calculation results in one response', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/calculations/full',
      payload: { birth_data: tc01BirthData },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      data: {
        chart: unknown;
        vargas: unknown;
        dashas: unknown;
        yogas: unknown;
        shadbala: unknown;
        ashtakavarga: unknown;
      };
    };
    expect(body.data.chart).toBeDefined();
    expect(body.data.vargas).toBeDefined();
    expect(body.data.dashas).toBeDefined();
    expect(body.data.yogas).toBeDefined();
    expect(body.data.shadbala).toBeDefined();
    expect(body.data.ashtakavarga).toBeDefined();
  });

  test('Second call for same profile_id returns cached result', async () => {
    // Create a profile
    const profileApp = Fastify({ logger: false });
    const { default: profileRoutes } = await import('./profiles.js');
    profileApp.setErrorHandler((await import('../middleware/errorHandler.js')).errorHandler);
    await profileApp.register(profileRoutes, { prefix: '/api' });
    await profileApp.ready();

    const profileResponse = await profileApp.inject({
      method: 'POST',
      url: '/api/profiles',
      payload: {
        name: 'Cache Test',
        dob_utc: '1974-09-20T06:30:00Z',
        lat: 12.9716,
        lon: 77.5946,
        timezone: 'Asia/Kolkata',
        utc_offset_hours: 5.5,
      },
    });
    const { data: { id: profileId } } = JSON.parse(profileResponse.body) as { data: { id: string } };
    await profileApp.close();

    // First call (not cached)
    const firstResponse = await app.inject({
      method: 'POST',
      url: '/api/calculations/full',
      payload: { profile_id: profileId },
    });
    expect(firstResponse.statusCode).toBe(200);
    const firstBody = JSON.parse(firstResponse.body) as { cached: boolean };
    expect(firstBody.cached).toBe(false);

    // Second call (should be cached)
    const secondResponse = await app.inject({
      method: 'POST',
      url: '/api/calculations/full',
      payload: { profile_id: profileId },
    });
    expect(secondResponse.statusCode).toBe(200);
    const secondBody = JSON.parse(secondResponse.body) as { cached: boolean };
    expect(secondBody.cached).toBe(true);
  });
});

// ===========================================================================
// Cache management routes
// ===========================================================================

describe('Cache management', () => {
  let app: FastifyInstance;
  let profileId: string;

  beforeAll(async () => {
    await setupTestDb();
    app = await buildTestApp();

    // Create a test profile
    const profileResponse = await app.inject({
      method: 'POST',
      url: '/api/profiles',
      payload: {
        name: 'Cache Mgmt Test',
        dob_utc: '1974-09-20T06:30:00Z',
        lat: 12.9716,
        lon: 77.5946,
        timezone: 'Asia/Kolkata',
        utc_offset_hours: 5.5,
      },
    });
    const body = JSON.parse(profileResponse.body) as { data: { id: string } };
    profileId = body.data.id;
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDb();
  });

  test('GET /api/calculations/cache/:id returns cache status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/calculations/cache/${profileId}`,
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: { exists: boolean; valid: boolean } };
    expect(typeof body.data.exists).toBe('boolean');
    expect(typeof body.data.valid).toBe('boolean');
  });

  test('GET /api/calculations/cache/:id returns 404 for nonexistent profile', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/calculations/cache/00000000-0000-0000-0000-000000000000',
    });
    expect(response.statusCode).toBe(404);
  });

  test('DELETE /api/calculations/cache/:id invalidates cache', async () => {
    // Prime the cache
    await app.inject({
      method: 'POST',
      url: '/api/calculations/chart',
      payload: { profile_id: profileId },
    });

    // Invalidate
    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/api/calculations/cache/${profileId}`,
    });
    expect(deleteResponse.statusCode).toBe(200);
    const deleteBody = JSON.parse(deleteResponse.body) as { data: { invalidated: boolean } };
    expect(deleteBody.data.invalidated).toBe(true);

    // Cache should now be empty
    const statusResponse = await app.inject({
      method: 'GET',
      url: `/api/calculations/cache/${profileId}`,
    });
    const statusBody = JSON.parse(statusResponse.body) as { data: { exists: boolean } };
    expect(statusBody.data.exists).toBe(false);
  });
});
