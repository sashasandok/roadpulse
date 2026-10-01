import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelemetryEntry } from '../telemetry/entities/telemetry-entry.entity';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

@Module({
  imports: [TypeOrmModule.forFeature([TelemetryEntry]), VehiclesModule],
  controllers: [TripsController],
  providers: [TripsService],
})
export class TripsModule {}
