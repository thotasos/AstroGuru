/**
 * jest.config.js — Jest configuration for @parashari/api
 *
 * Uses ts-jest in ESM mode (--experimental-vm-modules) to match the
 * package's "type": "module" setting.
 *
 * Usage:
 *   npm test
 *   # which runs: node --experimental-vm-modules node_modules/.bin/jest --config jest.config.js
 */

/** @type {import('jest').Config} */
const config = {
  // ── Test discovery ──────────────────────────────────────────────────────
  testMatch: [
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/tests/**/*.test.ts',
  ],

  // ── ESM + TypeScript transform ──────────────────────────────────────────
  extensionsToTreatAsEsm: ['.ts'],

  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          // Relax some constraints for tests (e.g. allow non-null assertions)
          strict: true,
          esModuleInterop: true,
          // Point to the package's own tsconfig so paths resolve correctly
        },
      },
    ],
  },

  // ── Module name resolution ───────────────────────────────────────────────
  moduleNameMapper: {
    // Rewrite .js → actual .ts source so Jest can find the file at test time.
    // This is required because TypeScript ESM emits .js imports but the source
    // files have .ts extensions.
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // ── Test environment ─────────────────────────────────────────────────────
  testEnvironment: 'node',

  // ── Coverage ─────────────────────────────────────────────────────────────
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/database/seed.ts',       // seeder is not production logic
    '!src/database/migrate.ts',    // migration runner tested implicitly
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],

  // ── Setup ─────────────────────────────────────────────────────────────────
  // Run migrations once before any test suite so the DB schema is present.
  globalSetup: '<rootDir>/tests/setup/globalSetup.ts',

  // ── Timeout ─────────────────────────────────────────────────────────────
  // Astrology calculations can be slow; give tests up to 30 seconds.
  testTimeout: 30_000,

  // ── Misc ──────────────────────────────────────────────────────────────────
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
};

export default config;
