import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { TelemetryEntry } from '../telemetry/entities/telemetry-entry.entity';
import { AlertsGateway } from './alerts.gateway';
import { Alert, AlertType } from './entities/alert.entity';

const KYIV_LAT_MIN = 50.1;
const KYIV_LAT_MAX = 50.7;
const KYIV_LNG_MIN = 30.1;
const KYIV_LNG_MAX = 30.9;

const SPEED_LIMIT = Number(process.env['SPEED_LIMIT_KMH'] ?? 90);
const LOW_FUEL_PCT = 15;
const IDLE_ENGINE_MS = 5 * 60_000;

@Injectable()
export class AlertsService {
  // key: `${vehicleId}:${alertType}` → ms of last fire
  private readonly cooldowns = new Map<string, number>();
  // vehicleId → ms of last time speed > 2 km/h with ignition on
  private readonly lastMovement = new Map<string, number>();

  constructor(
    @InjectRepository(Alert)
    private readonly alertRepo: Repository<Alert>,
    private readonly gateway: AlertsGateway,
  ) {}

  private canFire(vehicleId: string, type: AlertType, cooldownMs: number): boolean {
    const key = `${vehicleId}:${type}`;
    const last = this.cooldowns.get(key) ?? 0;
    if (Date.now() - last < cooldownMs) return false;
    this.cooldowns.set(key, Date.now());
    return true;
  }

  private async fire(vehicleId: string, type: AlertType, message: string): Promise<void> {
    const alert = this.alertRepo.create({ vehicle: { id: vehicleId }, type, message });
    const saved = await this.alertRepo.save(alert);
    this.gateway.broadcast(saved);
  }

  async check(entry: TelemetryEntry): Promise<void> {
    const vehicleId = entry.vehicle.id;
    const speed = Number(entry.speed);
    const fuel = Number(entry.fuel);
    const lat = Number(entry.latitude);
    const lng = Number(entry.longitude);
    const now = Date.now();

    if (speed > SPEED_LIMIT && this.canFire(vehicleId, AlertType.SPEEDING, 60_000)) {
      await this.fire(vehicleId, AlertType.SPEEDING, `Speed ${speed.toFixed(0)} km/h exceeds limit of ${SPEED_LIMIT} km/h`);
    }

    if (fuel < LOW_FUEL_PCT && this.canFire(vehicleId, AlertType.LOW_FUEL, 10 * 60_000)) {
      await this.fire(vehicleId, AlertType.LOW_FUEL, `Fuel level ${fuel.toFixed(0)}% is critically low`);
    }

    if (
      (lat < KYIV_LAT_MIN || lat > KYIV_LAT_MAX || lng < KYIV_LNG_MIN || lng > KYIV_LNG_MAX) &&
      this.canFire(vehicleId, AlertType.GEOFENCE, 5 * 60_000)
    ) {
      await this.fire(vehicleId, AlertType.GEOFENCE, `Vehicle left Kyiv boundary (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    }

    if (entry.ignition) {
      if (speed > 2) {
        this.lastMovement.set(vehicleId, now);
      } else {
        const lastMoved = this.lastMovement.get(vehicleId);
        if (lastMoved === undefined) {
          this.lastMovement.set(vehicleId, now);
        } else if (now - lastMoved > IDLE_ENGINE_MS && this.canFire(vehicleId, AlertType.IDLE_ENGINE, IDLE_ENGINE_MS)) {
          await this.fire(vehicleId, AlertType.IDLE_ENGINE, `Engine running with no movement for over 5 minutes`);
        }
      }
    } else {
      this.lastMovement.delete(vehicleId);
    }
  }

  findAll(): Promise<Alert[]> {
    return this.alertRepo.find({ order: { createdAt: 'DESC' }, take: 100 });
  }

  async markRead(id: string): Promise<Alert | null> {
    const alert = await this.alertRepo.findOne({ where: { id } });
    if (!alert) return null;
    alert.isRead = true;
    return this.alertRepo.save(alert);
  }
}
