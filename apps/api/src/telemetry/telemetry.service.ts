import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertsService } from '../alerts/alerts.service';
import { CreateTelemetryDto } from './dto/create-telemetry.dto';
import { TelemetryEntry } from './entities/telemetry-entry.entity';
import { TelemetryGateway } from './telemetry.gateway';

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);

  constructor(
    @InjectRepository(TelemetryEntry)
    private readonly telemetryRepo: Repository<TelemetryEntry>,
    private readonly gateway: TelemetryGateway,
    private readonly alertsService: AlertsService,
  ) {}

  async record(dto: CreateTelemetryDto): Promise<TelemetryEntry> {
    const entry = this.telemetryRepo.create({
      vehicle: { id: dto.vehicleId },
      latitude: dto.latitude,
      longitude: dto.longitude,
      speed: dto.speed,
      fuel: dto.fuel,
      ignition: dto.ignition,
      recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
    });

    try {
      const saved = await this.telemetryRepo.save(entry);
      this.gateway.broadcast(saved);
      this.alertsService
        .check(saved)
        .catch((e: unknown) => this.logger.error(`Alert check failed: ${(e as Error).message}`));
      return saved;
    } catch (err: unknown) {
      // FK violation – the vehicleId does not exist
      const pg = err as { code?: string };
      if (pg.code === '23503') {
        throw new NotFoundException(`Vehicle #${dto.vehicleId} not found`);
      }
      throw err;
    }
  }

  findLastPoint(vehicleId: string): Promise<TelemetryEntry | null> {
    return this.telemetryRepo.findOne({
      where: { vehicle: { id: vehicleId } },
      order: { recordedAt: 'DESC' },
    });
  }
}
