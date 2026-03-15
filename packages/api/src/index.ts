/**
 * index.ts — Parashari Precision API server entry point
 *
 * Creates a Fastify instance with:
 *   - JSON logging in production, pretty-print in development
 *   - Trust proxy for local networking (Tauri shell, Electron, or Docker bridge)
 *   - CORS allowing localhost:3000 (Next.js web app) and Tauri origins
 *   - Helmet for baseline security headers
 *   - All route plugins under /api
 *   - Health check: GET /health
 *   - DB migrations run on startup
 *   - Graceful shutdown on SIGTERM / SIGINT
 *
 * Exports `app` for integration testing.
 */

import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

import { runMigrations } from './database/migrate.js';
import { closeDb, getDbPath } from './database/db.js';
import { errorHandler } from './middleware/errorHandler.js';

import profileRoutes from './routes/profiles.js';
import calculationRoutes from './routes/calculations.js';
import predictionRoutes from './routes/predictions.js';
import eventRoutes from './routes/events.js';
import geocodeRoutes from './routes/geocode.js';
import settingsRoutes from './routes/settings.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env['PORT'] ?? '3001', 10);
const HOST = process.env['HOST'] ?? '127.0.0.1';
const IS_PRODUCTION = process.env['NODE_ENV'] === 'production';
const VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Fastify instance
// ---------------------------------------------------------------------------

const app: FastifyInstance = Fastify({
  logger: IS_PRODUCTION
    ? { level: 'info' }
    : {
        level: 'debug',
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      },
  trustProxy: true,
  // Increase default body limit to 256 KB (birth data payloads are small)
  bodyLimit: 262_144,
});

// ---------------------------------------------------------------------------
// Plugins
// ---------------------------------------------------------------------------

await app.register(helmet, {
  // Content-Security-Policy is managed by the Next.js frontend; disable here
  // so the local API does not interfere with the desktop app's own CSP.
  contentSecurityPolicy: false,
});

await app.register(cors, {
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    // Tauri development origin
    'http://localhost:1420',
    'http://127.0.0.1:1420',
    // tauri:// custom protocol used by Tauri v2
    /^tauri:\/\/.*/,
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
});

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------

app.setErrorHandler(errorHandler);

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/health', async (_request, reply) => {
  return reply.send({
    status: 'ok',
    version: VERSION,
    dbPath: getDbPath(),
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Route registration (all under /api prefix)
// ---------------------------------------------------------------------------

await app.register(profileRoutes, { prefix: '/api' });
await app.register(calculationRoutes, { prefix: '/api' });
await app.register(predictionRoutes, { prefix: '/api' });
await app.register(eventRoutes, { prefix: '/api' });
await app.register(geocodeRoutes, { prefix: '/api' });
await app.register(settingsRoutes, { prefix: '/api' });

// ---------------------------------------------------------------------------
// 404 catch-all
// ---------------------------------------------------------------------------

app.setNotFoundHandler((_request, reply) => {
  void reply.status(404).send({ error: 'Route not found' });
});

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

async function start(): Promise<void> {
  try {
    // Run DB migrations before accepting traffic
    app.log.info('[startup] Running database migrations…');
    runMigrations();
    app.log.info('[startup] Migrations complete.');

    await app.listen({ port: PORT, host: HOST });
    app.log.info(`[startup] Server listening on http://${HOST}:${PORT}`);
    app.log.info(`[startup] Health: http://${HOST}:${PORT}/health`);
  } catch (err) {
    app.log.error({ err }, '[startup] Fatal error during startup');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

function shutdown(signal: NodeJS.Signals): void {
  app.log.info(`[shutdown] Received ${signal} — shutting down gracefully…`);

  void app.close().then(() => {
    closeDb();
    app.log.info('[shutdown] Server and database closed. Goodbye.');
    process.exit(0);
  });

  // Force exit after 10 s if graceful shutdown hangs
  setTimeout(() => {
    app.log.error('[shutdown] Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ---------------------------------------------------------------------------
// CLI entry-point guard — only start the server when run directly
// ---------------------------------------------------------------------------

const isMain =
  typeof process.argv[1] === 'string' &&
  (process.argv[1].endsWith('index.ts') ||
    process.argv[1].endsWith('index.js'));

if (isMain) {
  await start();
}

export { app };
