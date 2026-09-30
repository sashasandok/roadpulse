import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TelemetryEntry } from '../telemetry/entities/telemetry-entry.entity';
import { TelemetryService } from '../telemetry/telemetry.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle } from './entities/vehicle.entity';
import { VehiclesService } from './vehicles.service';

@ApiTags('vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly telemetryService: TelemetryService,
  ) {}

  // POST /api/vehicles
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: Vehicle })
  create(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(dto);
  }

  // GET /api/vehicles
  @Get()
  @ApiOkResponse({ type: [Vehicle] })
  findAll() {
    return this.vehiclesService.findAll();
  }

  // GET /api/vehicles/:id
  @Get(':id')
  @ApiOkResponse({ type: Vehicle })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.findOne(id);
  }

  // GET /api/vehicles/:id/last-position
  @Get(':id/last-position')
  @ApiOkResponse({ type: TelemetryEntry })
  @ApiNotFoundResponse()
  async getLastPosition(@Param('id', ParseUUIDPipe) id: string) {
    await this.vehiclesService.findOne(id); // 404 if vehicle missing
    const point = await this.telemetryService.findLastPoint(id);
    if (!point) {
      throw new NotFoundException(`No telemetry found for vehicle #${id}`);
    }
    return point;
  }

  // PATCH /api/vehicles/:id
  @Patch(':id')
  @ApiOkResponse({ type: Vehicle })
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(id, dto);
  }

  // DELETE /api/vehicles/:id
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.remove(id);
  }
}
