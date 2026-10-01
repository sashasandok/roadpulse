import { useEffect, useState } from 'react';
import type { CarState } from './hooks/useFleet';

/** A car with no telemetry for this long is considered offline (simulator ticks every 1.5s). */
export const STALE_MS = 30_000;

export type CarStatus = 'moving' | 'parked' | 'offline' | 'no-signal';

export const STATUS_LABEL: Record<CarStatus, string> = {
  moving: 'Moving',
  parked: 'Parked',
  offline: 'Offline',
  'no-signal': 'No signal',
};

export function getStatus(car: CarState, now: number): CarStatus {
  if (!car.hasPosition || car.lastUpdate == null) return 'no-signal';
  if (now - car.lastUpdate.getTime() > STALE_MS) return 'offline';
  return car.ignition ? 'moving' : 'parked';
}

export function formatAgo(date: Date, now: number): string {
  const sec = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

/** Current time, refreshed periodically so staleness is re-evaluated without new telemetry. */
export function useNow(intervalMs = 5_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
