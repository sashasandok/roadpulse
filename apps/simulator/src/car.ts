import type { TelemetryPayload } from './api-client';
import { distanceKm, randomKyivPoint, type Coord } from './kyiv';
import { fetchRoute } from './osrm';

type CarStatus = 'moving' | 'parked' | 'fetching';

const MIN_SPEED = 20;  // km/h
const MAX_SPEED = 90;  // km/h
const FUEL_PER_KM = 0.07;         // % per km (city driving ~14 L/100km equivalent)
const PARK_MIN_SEC = 10;
const PARK_MAX_SEC = 60;
const ROUTE_RETRY_DELAY_MS = 3_000;
const ROUTE_MAX_RETRIES = 5;

export class Car {
  readonly vehicleId: string;

  private status: CarStatus = 'fetching';
  private route: Coord[] = [];
  private routeIndex = 0;
  private lat = 0;
  private lng = 0;
  private speed = 0;     // km/h
  private fuel: number;  // 0–100 %
  private ignition = false;
  private parkUntil = 0;
  private tag: string;   // short id for logs

  constructor(vehicleId: string) {
    this.vehicleId = vehicleId;
    this.tag = vehicleId.slice(0, 8);
    this.fuel = 80 + Math.random() * 20; // start 80–100 %
    void this.fetchNewRoute();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public API

  /** Advance car by one simulation tick. Call every TICK_INTERVAL ms. */
  tick(intervalMs: number): void {
    if (this.status !== 'moving') return;

    const tickSec = intervalMs / 1000;
    let distToTravel = (this.speed / 3600) * tickSec; // km
    const distStarted = distToTravel;

    while (distToTravel > 0 && this.routeIndex < this.route.length - 1) {
      const curr = this.route[this.routeIndex]!;
      const next = this.route[this.routeIndex + 1]!;
      const segKm = distanceKm(curr, next);

      if (segKm <= distToTravel) {
        distToTravel -= segKm;
        this.routeIndex++;
        this.lat = next.lat;
        this.lng = next.lng;
      } else {
        // Interpolate within segment
        const t = segKm > 0 ? distToTravel / segKm : 0;
        this.lat = curr.lat + (next.lat - curr.lat) * t;
        this.lng = curr.lng + (next.lng - curr.lng) * t;
        distToTravel = 0;
      }
    }

    // Gradual fuel burn
    const traveled = distStarted - distToTravel;
    this.fuel = Math.max(0, this.fuel - traveled * FUEL_PER_KM);

    // Speed variation: ±5 km/h each tick (traffic, lights, etc.)
    this.speed = clamp(this.speed + (Math.random() - 0.5) * 10, MIN_SPEED, MAX_SPEED);

    if (this.routeIndex >= this.route.length - 1) {
      this.arrive();
    }
  }

  /** Check whether park timer has expired; if so, kick off next route fetch. */
  checkParking(): void {
    if (this.status === 'parked' && Date.now() >= this.parkUntil) {
      void this.fetchNewRoute();
    }
  }

  /** Whether this car has been positioned at least once (ready to emit telemetry). */
  get isPositioned(): boolean {
    return this.lat !== 0 && this.lng !== 0;
  }

  /** Build the telemetry payload to POST to the API. */
  telemetry(): TelemetryPayload {
    return {
      vehicleId: this.vehicleId,
      latitude: round6(this.lat),
      longitude: round6(this.lng),
      speed: this.status === 'moving' ? round1(this.speed) : 0,
      fuel: round1(this.fuel),
      ignition: this.ignition,
      recordedAt: new Date().toISOString(),
    };
  }

  toString(): string {
    return (
      `Car[${this.tag}] ` +
      `status=${this.status} ` +
      `pos=(${round6(this.lat)},${round6(this.lng)}) ` +
      `speed=${round1(this.speed)}km/h ` +
      `fuel=${round1(this.fuel)}%`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private

  private async fetchNewRoute(): Promise<void> {
    this.status = 'fetching';
    this.ignition = false;
    this.speed = 0;

    for (let attempt = 0; attempt < ROUTE_MAX_RETRIES; attempt++) {
      try {
        const from: Coord = this.isPositioned
          ? { lat: this.lat, lng: this.lng }
          : randomKyivPoint();
        const to = randomKyivPoint();

        const route = await fetchRoute(from, to);
        if (route.length < 2) throw new Error('Route too short');

        this.route = route;
        this.routeIndex = 0;
        this.lat = route[0]!.lat;
        this.lng = route[0]!.lng;
        this.speed = MIN_SPEED + Math.random() * 30; // start 20–50 km/h
        this.ignition = true;
        this.status = 'moving';
        return;
      } catch (err) {
        const delay = ROUTE_RETRY_DELAY_MS * (attempt + 1);
        console.warn(
          `[${this.tag}] Route fetch failed (attempt ${attempt + 1}/${ROUTE_MAX_RETRIES}),` +
            ` retry in ${delay / 1000}s: ${(err as Error).message}`,
        );
        await sleep(delay);
      }
    }

    // Give up — park and try again after 30s
    console.error(`[${this.tag}] Could not fetch route after ${ROUTE_MAX_RETRIES} attempts, parking 30s`);
    this.status = 'parked';
    this.parkUntil = Date.now() + 30_000;
  }

  private arrive(): void {
    const parkSec = PARK_MIN_SEC + Math.random() * (PARK_MAX_SEC - PARK_MIN_SEC);
    this.status = 'parked';
    this.ignition = false;
    this.speed = 0;
    this.parkUntil = Date.now() + parkSec * 1_000;
    console.log(`[${this.tag}] Arrived. Parking ${Math.round(parkSec)}s`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function round6(v: number): number {
  return Math.round(v * 1_000_000) / 1_000_000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
