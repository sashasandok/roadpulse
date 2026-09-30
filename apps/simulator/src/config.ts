import 'dotenv/config';

export const config = {
  apiUrl: process.env['API_URL'] ?? 'http://localhost:3000/api',
  carCount: Math.max(1, parseInt(process.env['CAR_COUNT'] ?? '5', 10)),
  tickIntervalMs: Math.max(500, parseInt(process.env['TICK_INTERVAL_MS'] ?? '1500', 10)),
  osrmUrl: process.env['OSRM_URL'] ?? 'http://router.project-osrm.org',
} as const;
