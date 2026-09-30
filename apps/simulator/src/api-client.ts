import { config } from './config';

export interface VehicleRecord {
  id: string;
  number: string;
  model: string;
  driver: string;
}

export interface TelemetryPayload {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number;
  fuel: number;
  ignition: boolean;
  recordedAt: string;
}

export async function registerVehicle(
  number: string,
  model: string,
  driver: string,
): Promise<VehicleRecord> {
  const res = await fetch(`${config.apiUrl}/vehicles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ number, model, driver }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Register vehicle failed [${res.status}]: ${body}`);
  }

  return res.json() as Promise<VehicleRecord>;
}

export async function postTelemetry(payload: TelemetryPayload): Promise<void> {
  const res = await fetch(`${config.apiUrl}/telemetry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`POST telemetry failed [${res.status}]: ${body}`);
  }
}
