import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelemetryEntry } from './entities/telemetry-entry.entity';
import { TelemetryController } from './telemetry.controller';
import { TelemetryGateway } from './telemetry.gateway';
import { TelemetryService } from './telemetry.service';

@Module({
  imports: [TypeOrmModule.forFeature([TelemetryEntry])],
  controllers: [TelemetryController],
  providers: [TelemetryGateway, TelemetryService],
  exports: [TelemetryService],
})
export class TelemetryModule {}
