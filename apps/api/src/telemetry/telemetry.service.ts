import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTelemetryDto } from './dto/create-telemetry.dto';
import { TelemetryEntry } from './entities/telemetry-entry.entity';

@Injectable()
export class TelemetryService {
  constructor(
    @InjectRepository(TelemetryEntry)
    private readonly telemetryRepo: Repository<TelemetryEntry>,
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
      return await this.telemetryRepo.save(entry);
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
