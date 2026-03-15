/**
 * geocode.ts — Offline-capable location lookup with a 55-city static dataset
 *
 * Routes (all prefixed with /api via server registration):
 *   GET /geocode/search?q=<city>
 *     Returns ranked matches: [{ place_name, lat, lon, timezone, utc_offset_hours }]
 *
 *   GET /geocode/timezone?lat=&lon=
 *     Returns: { timezone, utc_offset_hours, dst_active }
 *
 * No external API calls are made — the whole dataset is embedded here.
 * Matching uses case-insensitive prefix and substring scoring.
 */

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Static dataset
// ---------------------------------------------------------------------------

export interface CityRecord {
  place_name: string;
  lat: number;
  lon: number;
  timezone: string;
  utc_offset_hours: number;
  /** Bounding box for timezone reverse-lookup: [minLat, maxLat, minLon, maxLon] */
  bbox: [number, number, number, number];
  /** Lowercase aliases for fuzzy matching */
  aliases: string[];
}

// Bounding boxes are approximate — sufficient for a single-server personal app.
const CITIES: CityRecord[] = [
  // ── India ──────────────────────────────────────────────────────────────
  {
    place_name: 'Bangalore, India',
    lat: 12.9716, lon: 77.5946,
    timezone: 'Asia/Kolkata', utc_offset_hours: 5.5,
    bbox: [12.8, 13.1, 77.4, 77.8],
    aliases: ['bangalore', 'bengaluru'],
  },
  {
    place_name: 'Mumbai, India',
    lat: 19.0760, lon: 72.8777,
    timezone: 'Asia/Kolkata', utc_offset_hours: 5.5,
    bbox: [18.9, 19.3, 72.7, 73.0],
    aliases: ['mumbai', 'bombay'],
  },
  {
    place_name: 'Delhi, India',
    lat: 28.6139, lon: 77.2090,
    timezone: 'Asia/Kolkata', utc_offset_hours: 5.5,
    bbox: [28.4, 28.9, 76.8, 77.5],
    aliases: ['delhi', 'new delhi'],
  },
  {
    place_name: 'Chennai, India',
    lat: 13.0827, lon: 80.2707,
    timezone: 'Asia/Kolkata', utc_offset_hours: 5.5,
    bbox: [12.9, 13.2, 80.1, 80.4],
    aliases: ['chennai', 'madras'],
  },
  {
    place_name: 'Kolkata, India',
    lat: 22.5726, lon: 88.3639,
    timezone: 'Asia/Kolkata', utc_offset_hours: 5.5,
    bbox: [22.4, 22.7, 88.2, 88.6],
    aliases: ['kolkata', 'calcutta'],
  },
  {
    place_name: 'Hyderabad, India',
    lat: 17.3850, lon: 78.4867,
    timezone: 'Asia/Kolkata', utc_offset_hours: 5.5,
    bbox: [17.2, 17.6, 78.3, 78.7],
    aliases: ['hyderabad'],
  },
  {
    place_name: 'Pune, India',
    lat: 18.5204, lon: 73.8567,
    timezone: 'Asia/Kolkata', utc_offset_hours: 5.5,
    bbox: [18.4, 18.7, 73.7, 74.0],
    aliases: ['pune', 'poona'],
  },
  {
    place_name: 'Ahmedabad, India',
    lat: 23.0225, lon: 72.5714,
    timezone: 'Asia/Kolkata', utc_offset_hours: 5.5,
    bbox: [22.9, 23.2, 72.4, 72.7],
    aliases: ['ahmedabad'],
  },
  {
    place_name: 'Jaipur, India',
    lat: 26.9124, lon: 75.7873,
    timezone: 'Asia/Kolkata', utc_offset_hours: 5.5,
    bbox: [26.7, 27.1, 75.6, 76.0],
    aliases: ['jaipur'],
  },
  {
    place_name: 'Lucknow, India',
    lat: 26.8467, lon: 80.9462,
    timezone: 'Asia/Kolkata', utc_offset_hours: 5.5,
    bbox: [26.7, 27.0, 80.8, 81.1],
    aliases: ['lucknow'],
  },
  // ── Rest of Asia ───────────────────────────────────────────────────────
  {
    place_name: 'Kathmandu, Nepal',
    lat: 27.7172, lon: 85.3240,
    timezone: 'Asia/Kathmandu', utc_offset_hours: 5.75,
    bbox: [27.6, 27.8, 85.2, 85.5],
    aliases: ['kathmandu'],
  },
  {
    place_name: 'Dhaka, Bangladesh',
    lat: 23.8103, lon: 90.4125,
    timezone: 'Asia/Dhaka', utc_offset_hours: 6,
    bbox: [23.7, 23.9, 90.3, 90.6],
    aliases: ['dhaka'],
  },
  {
    place_name: 'Colombo, Sri Lanka',
    lat: 6.9271, lon: 79.8612,
    timezone: 'Asia/Colombo', utc_offset_hours: 5.5,
    bbox: [6.8, 7.1, 79.8, 80.0],
    aliases: ['colombo'],
  },
  {
    place_name: 'Karachi, Pakistan',
    lat: 24.8607, lon: 67.0011,
    timezone: 'Asia/Karachi', utc_offset_hours: 5,
    bbox: [24.7, 25.0, 66.9, 67.2],
    aliases: ['karachi'],
  },
  {
    place_name: 'Lahore, Pakistan',
    lat: 31.5204, lon: 74.3587,
    timezone: 'Asia/Karachi', utc_offset_hours: 5,
    bbox: [31.4, 31.7, 74.2, 74.5],
    aliases: ['lahore'],
  },
  {
    place_name: 'Tehran, Iran',
    lat: 35.6892, lon: 51.3890,
    timezone: 'Asia/Tehran', utc_offset_hours: 3.5,
    bbox: [35.6, 35.8, 51.3, 51.6],
    aliases: ['tehran'],
  },
  {
    place_name: 'Baghdad, Iraq',
    lat: 33.3128, lon: 44.3615,
    timezone: 'Asia/Baghdad', utc_offset_hours: 3,
    bbox: [33.2, 33.5, 44.2, 44.5],
    aliases: ['baghdad'],
  },
  {
    place_name: 'Dubai, UAE',
    lat: 25.2048, lon: 55.2708,
    timezone: 'Asia/Dubai', utc_offset_hours: 4,
    bbox: [24.9, 25.4, 55.0, 55.6],
    aliases: ['dubai'],
  },
  {
    place_name: 'Bangkok, Thailand',
    lat: 13.7563, lon: 100.5018,
    timezone: 'Asia/Bangkok', utc_offset_hours: 7,
    bbox: [13.5, 14.0, 100.3, 100.8],
    aliases: ['bangkok'],
  },
  {
    place_name: 'Singapore, Singapore',
    lat: 1.3521, lon: 103.8198,
    timezone: 'Asia/Singapore', utc_offset_hours: 8,
    bbox: [1.2, 1.5, 103.6, 104.0],
    aliases: ['singapore'],
  },
  {
    place_name: 'Kuala Lumpur, Malaysia',
    lat: 3.1390, lon: 101.6869,
    timezone: 'Asia/Kuala_Lumpur', utc_offset_hours: 8,
    bbox: [3.0, 3.3, 101.5, 101.9],
    aliases: ['kuala lumpur', 'kl'],
  },
  {
    place_name: 'Jakarta, Indonesia',
    lat: -6.2088, lon: 106.8456,
    timezone: 'Asia/Jakarta', utc_offset_hours: 7,
    bbox: [-6.4, -6.0, 106.7, 107.0],
    aliases: ['jakarta'],
  },
  {
    place_name: 'Manila, Philippines',
    lat: 14.5995, lon: 120.9842,
    timezone: 'Asia/Manila', utc_offset_hours: 8,
    bbox: [14.5, 14.7, 120.9, 121.1],
    aliases: ['manila'],
  },
  {
    place_name: 'Hong Kong, China',
    lat: 22.3193, lon: 114.1694,
    timezone: 'Asia/Hong_Kong', utc_offset_hours: 8,
    bbox: [22.2, 22.5, 114.0, 114.4],
    aliases: ['hong kong', 'hongkong'],
  },
  {
    place_name: 'Beijing, China',
    lat: 39.9042, lon: 116.4074,
    timezone: 'Asia/Shanghai', utc_offset_hours: 8,
    bbox: [39.7, 40.2, 116.2, 116.7],
    aliases: ['beijing', 'peking'],
  },
  {
    place_name: 'Shanghai, China',
    lat: 31.2304, lon: 121.4737,
    timezone: 'Asia/Shanghai', utc_offset_hours: 8,
    bbox: [31.0, 31.5, 121.3, 121.7],
    aliases: ['shanghai'],
  },
  {
    place_name: 'Taipei, Taiwan',
    lat: 25.0330, lon: 121.5654,
    timezone: 'Asia/Taipei', utc_offset_hours: 8,
    bbox: [24.9, 25.2, 121.4, 121.7],
    aliases: ['taipei'],
  },
  {
    place_name: 'Tokyo, Japan',
    lat: 35.6762, lon: 139.6503,
    timezone: 'Asia/Tokyo', utc_offset_hours: 9,
    bbox: [35.5, 35.9, 139.4, 139.9],
    aliases: ['tokyo'],
  },
  {
    place_name: 'Osaka, Japan',
    lat: 34.6937, lon: 135.5023,
    timezone: 'Asia/Tokyo', utc_offset_hours: 9,
    bbox: [34.5, 34.9, 135.3, 135.7],
    aliases: ['osaka'],
  },
  {
    place_name: 'Seoul, South Korea',
    lat: 37.5665, lon: 126.9780,
    timezone: 'Asia/Seoul', utc_offset_hours: 9,
    bbox: [37.4, 37.7, 126.8, 127.2],
    aliases: ['seoul'],
  },
  // ── Europe ─────────────────────────────────────────────────────────────
  {
    place_name: 'London, UK',
    lat: 51.5074, lon: -0.1278,
    timezone: 'Europe/London', utc_offset_hours: 0,
    bbox: [51.3, 51.7, -0.5, 0.3],
    aliases: ['london'],
  },
  {
    place_name: 'Paris, France',
    lat: 48.8566, lon: 2.3522,
    timezone: 'Europe/Paris', utc_offset_hours: 1,
    bbox: [48.7, 49.0, 2.2, 2.5],
    aliases: ['paris'],
  },
  {
    place_name: 'Berlin, Germany',
    lat: 52.5200, lon: 13.4050,
    timezone: 'Europe/Berlin', utc_offset_hours: 1,
    bbox: [52.4, 52.7, 13.2, 13.6],
    aliases: ['berlin'],
  },
  {
    place_name: 'Amsterdam, Netherlands',
    lat: 52.3676, lon: 4.9041,
    timezone: 'Europe/Amsterdam', utc_offset_hours: 1,
    bbox: [52.3, 52.5, 4.7, 5.1],
    aliases: ['amsterdam'],
  },
  {
    place_name: 'Geneva, Switzerland',
    lat: 46.2044, lon: 6.1432,
    timezone: 'Europe/Zurich', utc_offset_hours: 1,
    bbox: [46.1, 46.3, 6.0, 6.3],
    aliases: ['geneva', 'geneve'],
  },
  {
    place_name: 'Zurich, Switzerland',
    lat: 47.3769, lon: 8.5417,
    timezone: 'Europe/Zurich', utc_offset_hours: 1,
    bbox: [47.3, 47.5, 8.4, 8.7],
    aliases: ['zurich', 'zürich'],
  },
  {
    place_name: 'Vienna, Austria',
    lat: 48.2082, lon: 16.3738,
    timezone: 'Europe/Vienna', utc_offset_hours: 1,
    bbox: [48.1, 48.3, 16.2, 16.6],
    aliases: ['vienna', 'wien'],
  },
  {
    place_name: 'Rome, Italy',
    lat: 41.9028, lon: 12.4964,
    timezone: 'Europe/Rome', utc_offset_hours: 1,
    bbox: [41.8, 42.0, 12.3, 12.6],
    aliases: ['rome', 'roma'],
  },
  {
    place_name: 'Istanbul, Turkey',
    lat: 41.0082, lon: 28.9784,
    timezone: 'Europe/Istanbul', utc_offset_hours: 3,
    bbox: [40.9, 41.2, 28.7, 29.2],
    aliases: ['istanbul'],
  },
  // ── Africa / Middle East ───────────────────────────────────────────────
  {
    place_name: 'Cairo, Egypt',
    lat: 30.0444, lon: 31.2357,
    timezone: 'Africa/Cairo', utc_offset_hours: 2,
    bbox: [29.9, 30.2, 31.1, 31.4],
    aliases: ['cairo'],
  },
  {
    place_name: 'Nairobi, Kenya',
    lat: -1.2921, lon: 36.8219,
    timezone: 'Africa/Nairobi', utc_offset_hours: 3,
    bbox: [-1.4, -1.1, 36.7, 37.0],
    aliases: ['nairobi'],
  },
  // ── Americas ───────────────────────────────────────────────────────────
  {
    place_name: 'New York, USA',
    lat: 40.7128, lon: -74.0060,
    timezone: 'America/New_York', utc_offset_hours: -5,
    bbox: [40.5, 40.9, -74.3, -73.7],
    aliases: ['new york', 'nyc'],
  },
  {
    place_name: 'Chicago, USA',
    lat: 41.8781, lon: -87.6298,
    timezone: 'America/Chicago', utc_offset_hours: -6,
    bbox: [41.6, 42.1, -87.9, -87.5],
    aliases: ['chicago'],
  },
  {
    place_name: 'Houston, USA',
    lat: 29.7604, lon: -95.3698,
    timezone: 'America/Chicago', utc_offset_hours: -6,
    bbox: [29.6, 30.0, -95.6, -95.1],
    aliases: ['houston'],
  },
  {
    place_name: 'Los Angeles, USA',
    lat: 34.0522, lon: -118.2437,
    timezone: 'America/Los_Angeles', utc_offset_hours: -8,
    bbox: [33.7, 34.4, -118.7, -118.0],
    aliases: ['los angeles', 'la'],
  },
  {
    place_name: 'San Francisco, USA',
    lat: 37.7749, lon: -122.4194,
    timezone: 'America/Los_Angeles', utc_offset_hours: -8,
    bbox: [37.6, 38.0, -122.6, -122.3],
    aliases: ['san francisco', 'sf'],
  },
  {
    place_name: 'Toronto, Canada',
    lat: 43.6510, lon: -79.3470,
    timezone: 'America/Toronto', utc_offset_hours: -5,
    bbox: [43.5, 43.9, -79.7, -79.1],
    aliases: ['toronto'],
  },
  {
    place_name: 'São Paulo, Brazil',
    lat: -23.5505, lon: -46.6333,
    timezone: 'America/Sao_Paulo', utc_offset_hours: -3,
    bbox: [-23.8, -23.4, -46.9, -46.4],
    aliases: ['sao paulo', 'são paulo'],
  },
  {
    place_name: 'Mexico City, Mexico',
    lat: 19.4326, lon: -99.1332,
    timezone: 'America/Mexico_City', utc_offset_hours: -6,
    bbox: [19.2, 19.7, -99.4, -99.0],
    aliases: ['mexico city', 'ciudad de mexico'],
  },
  // ── Oceania ────────────────────────────────────────────────────────────
  {
    place_name: 'Sydney, Australia',
    lat: -33.8688, lon: 151.2093,
    timezone: 'Australia/Sydney', utc_offset_hours: 11,
    bbox: [-34.2, -33.5, 150.9, 151.5],
    aliases: ['sydney'],
  },
  {
    place_name: 'Melbourne, Australia',
    lat: -37.8136, lon: 144.9631,
    timezone: 'Australia/Melbourne', utc_offset_hours: 11,
    bbox: [-38.1, -37.6, 144.7, 145.3],
    aliases: ['melbourne'],
  },
];

// ---------------------------------------------------------------------------
// Search helpers
// ---------------------------------------------------------------------------

export interface GeocodeResult {
  place_name: string;
  lat: number;
  lon: number;
  timezone: string;
  utc_offset_hours: number;
}

/**
 * Scores a city record against the query.
 * - 3 points for exact match on an alias
 * - 2 points for prefix match
 * - 1 point for substring match
 * - 0 = no match → exclude
 */
function scoreCity(city: CityRecord, query: string): number {
  const q = query.toLowerCase().trim();
  for (const alias of city.aliases) {
    if (alias === q) return 3;
    if (alias.startsWith(q)) return 2;
    if (alias.includes(q)) return 1;
  }
  // Also check place_name (handles "London, UK" style queries)
  const pn = city.place_name.toLowerCase();
  if (pn === q) return 3;
  if (pn.startsWith(q)) return 2;
  if (pn.includes(q)) return 1;
  return 0;
}

export function searchCities(query: string, limit = 10): GeocodeResult[] {
  const scored = CITIES.map((city) => ({
    city,
    score: scoreCity(city, query),
  }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ city }) => ({
    place_name: city.place_name,
    lat: city.lat,
    lon: city.lon,
    timezone: city.timezone,
    utc_offset_hours: city.utc_offset_hours,
  }));
}

// ---------------------------------------------------------------------------
// Timezone reverse-lookup
// ---------------------------------------------------------------------------

export interface TimezoneResult {
  timezone: string;
  utc_offset_hours: number;
  /** Always false — static data; DST detection requires a live rule engine */
  dst_active: false;
}

export function lookupTimezone(lat: number, lon: number): TimezoneResult | undefined {
  // Find the city whose bounding box contains the point.
  // If multiple match, prefer the one whose centre is closest.
  const candidates = CITIES.filter(
    (c) =>
      lat >= c.bbox[0] &&
      lat <= c.bbox[1] &&
      lon >= c.bbox[2] &&
      lon <= c.bbox[3],
  );

  if (candidates.length === 0) {
    // Fallback: find the globally closest city centre
    let best: CityRecord | undefined;
    let bestDist = Infinity;
    for (const c of CITIES) {
      const d = Math.hypot(lat - c.lat, lon - c.lon);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    if (best === undefined) return undefined;
    return { timezone: best.timezone, utc_offset_hours: best.utc_offset_hours, dst_active: false };
  }

  const best = candidates.reduce((a, b) => {
    const da = Math.hypot(lat - a.lat, lon - a.lon);
    const db = Math.hypot(lat - b.lat, lon - b.lon);
    return da <= db ? a : b;
  });

  return { timezone: best.timezone, utc_offset_hours: best.utc_offset_hours, dst_active: false };
}

// ---------------------------------------------------------------------------
// Zod query schemas
// ---------------------------------------------------------------------------

const SearchQuerySchema = z.object({
  q: z.string().min(1, 'q must not be empty').max(200),
});

const TimezoneQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

type SearchQuery = { q: string };
type TimezoneQuery = { lat: number; lon: number };

const geocodeRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
): Promise<void> => {
  // ── GET /geocode/search ──────────────────────────────────────────────
  fastify.get<{ Querystring: SearchQuery }>(
    '/geocode/search',
    async (request, reply) => {
      const parsed = SearchQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: parsed.error.issues[0]?.message ?? 'Invalid search query',
        });
      }

      const results = searchCities(parsed.data.q);
      return reply.send({ data: results });
    },
  );

  // ── GET /geocode/timezone ────────────────────────────────────────────
  fastify.get<{ Querystring: TimezoneQuery }>(
    '/geocode/timezone',
    async (request, reply) => {
      const parsed = TimezoneQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'lat and lon must be valid decimal degree numbers',
          details: parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        });
      }

      const { lat, lon } = parsed.data;
      const result = lookupTimezone(lat, lon);

      if (result === undefined) {
        return reply.status(404).send({ error: 'Timezone could not be determined for the given coordinates' });
      }

      return reply.send({ data: result });
    },
  );
};

export default geocodeRoutes;
