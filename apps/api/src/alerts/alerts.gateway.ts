import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import type { Alert } from './entities/alert.entity';

@WebSocketGateway({ cors: { origin: '*' } })
export class AlertsGateway {
  @WebSocketServer()
  private server!: Server;

  broadcast(alert: Alert): void {
    this.server.emit('alert:new', {
      id: alert.id,
      vehicleId: alert.vehicle.id,
      type: alert.type,
      message: alert.message,
      isRead: alert.isRead,
      createdAt:
        alert.createdAt instanceof Date
          ? alert.createdAt.toISOString()
          : String(alert.createdAt),
    });
  }
}
