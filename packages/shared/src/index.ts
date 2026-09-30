// ── REST shapes ──────────────────────────────────────────────────────────────

/** Vehicle as returned by GET /api/vehicles */
export interface Vehicle {
  id: string;
  number: string;
  model: string;
  driver: string;
  createdAt: string;
  updatedAt: string;
}

/** Last-position entry as returned by GET /api/vehicles/:id/last-position */
export interface LastPosition {
  id: string;
  latitude: number;
  longitude: number;
  speed: number;
  fuel: number;
  ignition: boolean;
  recordedAt: string;
  createdAt: string;
}

// ── WebSocket shapes ──────────────────────────────────────────────────────────

/** Payload pushed on every `telemetry:update` Socket.IO event */
export interface TelemetryUpdatePayload {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number;
  fuel: number;
  ignition: boolean;
  recordedAt: string;
}

// ── Alert shapes ─────────────────────────────────────────────────────────────

export type AlertType = 'SPEEDING' | 'GEOFENCE' | 'IDLE_ENGINE' | 'LOW_FUEL';

/** Payload pushed on every `alert:new` Socket.IO event, and returned by GET /api/alerts */
export interface AlertPayload {
  id: string;
  vehicleId: string;
  type: AlertType;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

export const WS_EVENTS = {
  TELEMETRY_UPDATE: 'telemetry:update',
  ALERT_NEW: 'alert:new',
} as const;
