import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import type { LastPosition, TelemetryUpdatePayload, Vehicle } from '@roadpulse/shared';
import { WS_EVENTS } from '@roadpulse/shared';
import { API_BASE, WS_URL } from '../config';

export interface CarState {
  vehicle: Vehicle;
  lat: number;
  lng: number;
  speed: number;
  fuel: number;
  ignition: boolean;
  hasPosition: boolean;
  lastUpdate: Date | null;
}

export type Fleet = Map<string, CarState>;

export function useFleet() {
  const [fleet, setFleet] = useState<Fleet>(new Map());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const knownIds = new Set<string>();

    // ── 1. Load vehicles from REST, then fetch their last positions ──────────
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/vehicles`);
        const vehicles = (await res.json()) as Vehicle[];
        if (cancelled) return;

        // Seed the fleet with vehicle metadata (no position yet)
        const initial = new Map<string, CarState>();
        for (const v of vehicles) {
          knownIds.add(v.id);
          initial.set(v.id, {
            vehicle: v,
            lat: 0,
            lng: 0,
            speed: 0,
            fuel: 100,
            ignition: false,
            hasPosition: false,
            lastUpdate: null,
          });
        }
        setFleet(initial);

        // Fetch last known position for each vehicle (best-effort)
        await Promise.allSettled(
          vehicles.map(async (v) => {
            try {
              const r = await fetch(`${API_BASE}/vehicles/${v.id}/last-position`);
              if (!r.ok) return;
              const pos = (await r.json()) as LastPosition;
              if (cancelled) return;
              setFleet((prev) => {
                const car = prev.get(v.id);
                if (!car) return prev;
                return new Map(prev).set(v.id, {
                  ...car,
                  lat: Number(pos.latitude),
                  lng: Number(pos.longitude),
                  speed: Number(pos.speed),
                  fuel: Number(pos.fuel),
                  ignition: pos.ignition,
                  hasPosition: true,
                  lastUpdate: new Date(pos.recordedAt),
                });
              });
            } catch {
              // No telemetry yet for this vehicle — that's fine
            }
          }),
        );
      } catch (err) {
        console.error('[useFleet] Failed to load vehicles:', err);
      }
    })();

    // ── 2. WebSocket — live telemetry updates ────────────────────────────────
    // autoConnect: false + deferred connect survives React StrictMode's
    // double-invoke: if cleanup fires before the timeout the connect never opens,
    // avoiding the "WebSocket closed before connection established" warning.
    const socket = io(WS_URL, { transports: ['websocket'], autoConnect: false });

    socket.on('connect', () => {
      if (!cancelled) setConnected(true);
    });
    socket.on('disconnect', () => {
      if (!cancelled) setConnected(false);
    });

    const applyUpdate = (data: TelemetryUpdatePayload, vehicle?: Vehicle) => {
      setFleet((prev) => {
        const car = prev.get(data.vehicleId);
        const base = car?.vehicle ?? vehicle;
        if (!base) return prev;
        return new Map(prev).set(data.vehicleId, {
          vehicle: base,
          lat: data.latitude,
          lng: data.longitude,
          speed: data.speed,
          fuel: data.fuel,
          ignition: data.ignition,
          hasPosition: true,
          lastUpdate: new Date(data.recordedAt),
        });
      });
    };

    // Vehicles registered after page load (e.g. simulator restart) are fetched on first sight.
    const pending = new Set<string>();

    socket.on(WS_EVENTS.TELEMETRY_UPDATE, (data: TelemetryUpdatePayload) => {
      if (cancelled) return;
      if (knownIds.has(data.vehicleId)) {
        applyUpdate(data);
        return;
      }
      if (pending.has(data.vehicleId)) return;
      pending.add(data.vehicleId);
      void fetch(`${API_BASE}/vehicles/${data.vehicleId}`)
        .then((r) => (r.ok ? (r.json() as Promise<Vehicle>) : null))
        .then((v) => {
          if (cancelled || !v) return;
          knownIds.add(v.id);
          applyUpdate(data, v);
        })
        .catch(() => {})
        .finally(() => pending.delete(data.vehicleId));
    });

    const connectTimer = setTimeout(() => socket.connect(), 0);

    return () => {
      cancelled = true;
      clearTimeout(connectTimer);
      socket.disconnect();
    };
  }, []);

  return { fleet, connected };
}
