import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';

@ApiTags('alerts')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @ApiOperation({ summary: 'Get last 100 alerts (newest first)' })
  findAll() {
    return this.alertsService.findAll();
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark alert as read' })
  async markRead(@Param('id', ParseUUIDPipe) id: string) {
    const alert = await this.alertsService.markRead(id);
    if (!alert) throw new NotFoundException(`Alert #${id} not found`);
    return alert;
  }
}
