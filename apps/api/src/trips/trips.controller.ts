import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { VehiclesService } from '../vehicles/vehicles.service';
import { RangeQueryDto } from './dto/range-query.dto';
import { TripsService } from './trips.service';

@ApiTags('trips')
@Controller('vehicles')
export class TripsController {
  constructor(
    private readonly tripsService: TripsService,
    private readonly vehiclesService: VehiclesService,
  ) {}

  // GET /api/vehicles/:id/trips?from&to  (range ≤ 31 days)
  @Get(':id/trips')
  @ApiOkResponse({ description: 'Trips (ignition-on periods) overlapping the range, with stats' })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  async findTrips(@Param('id', ParseUUIDPipe) id: string, @Query() q: RangeQueryDto) {
    await this.vehiclesService.findOne(id);
    return this.tripsService.findTrips(id, q.from, q.to);
  }

  // GET /api/vehicles/:id/track?from&to  (range ≤ 1 day)
  @Get(':id/track')
  @ApiOkResponse({ description: 'All telemetry points in the range, oldest first' })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  async findTrack(@Param('id', ParseUUIDPipe) id: string, @Query() q: RangeQueryDto) {
    await this.vehiclesService.findOne(id);
    return this.tripsService.findTrack(id, q.from, q.to);
  }
}
