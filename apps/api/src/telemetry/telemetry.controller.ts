import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CreateTelemetryDto } from './dto/create-telemetry.dto';
import { TelemetryService } from './telemetry.service';

@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  // POST /api/telemetry
  @Post()
  @HttpCode(HttpStatus.CREATED)
  record(@Body() dto: CreateTelemetryDto) {
    return this.telemetryService.record(dto);
  }
}
