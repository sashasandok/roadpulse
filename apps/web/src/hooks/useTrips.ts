import { useEffect, useState } from 'react';
import type { TrackPoint, Trip } from '@roadpulse/shared';

import { API_BASE } from '../config';

/** Local-time day boundaries for a YYYY-MM-DD date string. */
export function dayRange(date: string): { from: string; to: string } {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

interface FetchState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

function useFetch<T>(url: string | null, empty: T): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({ data: empty, loading: false, error: null });

  useEffect(() => {
    if (url == null) {
      setState({ data: empty, loading: false, error: null });
      return;
    }
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    fetch(url, { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`);
        return (await r.json()) as T;
      })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err: Error) => {
        if (err.name !== 'AbortError')
          setState({ data: empty, loading: false, error: err.message });
      });
    return () => ctrl.abort();
  }, [url, empty]);

  return state;
}

const NO_TRIPS: Trip[] = [];
const NO_POINTS: TrackPoint[] = [];

export function useTrips(vehicleId: string | null, date: string) {
  const { from, to } = dayRange(date);
  const url = vehicleId
    ? `${API_BASE}/vehicles/${vehicleId}/trips?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    : null;
  return useFetch(url, NO_TRIPS);
}

export function useTrack(trip: Trip | null) {
  const url = trip
    ? `${API_BASE}/vehicles/${trip.vehicleId}/track?from=${encodeURIComponent(trip.startedAt)}&to=${encodeURIComponent(trip.endedAt)}`
    : null;
  return useFetch(url, NO_POINTS);
}
