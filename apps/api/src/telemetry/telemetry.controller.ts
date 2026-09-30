import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiNotFoundResponse, ApiTags } from '@nestjs/swagger';
import { TelemetryEntry } from './entities/telemetry-entry.entity';
import { CreateTelemetryDto } from './dto/create-telemetry.dto';
import { TelemetryService } from './telemetry.service';

@ApiTags('telemetry')
@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  // POST /api/telemetry
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: TelemetryEntry })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  record(@Body() dto: CreateTelemetryDto) {
    return this.telemetryService.record(dto);
  }
}
