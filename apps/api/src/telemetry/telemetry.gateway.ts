import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import type { TelemetryEntry } from './entities/telemetry-entry.entity';

/** Matches TelemetryUpdatePayload in packages/shared */
interface TelemetryUpdatePayload {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number;
  fuel: number;
  ignition: boolean;
  recordedAt: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
})
export class TelemetryGateway {
  @WebSocketServer()
  private server!: Server;

  /**
   * Broadcast a freshly persisted telemetry point to all connected clients.
   * TypeORM returns decimal columns as strings from PostgreSQL,
   * so we coerce them back to numbers here.
   */
  broadcast(entry: TelemetryEntry): void {
    const payload: TelemetryUpdatePayload = {
      vehicleId: entry.vehicle.id,
      latitude: Number(entry.latitude),
      longitude: Number(entry.longitude),
      speed: Number(entry.speed),
      fuel: Number(entry.fuel),
      ignition: entry.ignition,
      recordedAt:
        entry.recordedAt instanceof Date
          ? entry.recordedAt.toISOString()
          : String(entry.recordedAt),
    };
    this.server.emit('telemetry:update', payload);
  }
}
