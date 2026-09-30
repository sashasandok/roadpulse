import { config } from './config';
import type { Coord } from './kyiv';

interface OsrmRoute {
  geometry: {
    coordinates: Array<[number, number]>; // [lng, lat] GeoJSON order
  };
}

interface OsrmResponse {
  code: string;
  routes: OsrmRoute[];
}

/**
 * Fetch a driving route between two points via OSRM.
 * Returns waypoints in [lat, lng] order.
 */
export async function fetchRoute(from: Coord, to: Coord): Promise<Coord[]> {
  const url =
    `${config.osrmUrl}/route/v1/driving/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}` +
    `?overview=full&geometries=geojson`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    headers: { 'User-Agent': 'RoadPulse-Simulator/1.0' },
  });

  if (!res.ok) {
    throw new Error(`OSRM HTTP ${res.status}`);
  }

  const data = (await res.json()) as OsrmResponse;

  if (data.code !== 'Ok') {
    throw new Error(`OSRM code: ${data.code}`);
  }

  const route = data.routes[0];
  if (!route || route.geometry.coordinates.length < 2) {
    throw new Error('OSRM returned empty route');
  }

  // GeoJSON is [lng, lat] — convert to { lat, lng }
  return route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
}
