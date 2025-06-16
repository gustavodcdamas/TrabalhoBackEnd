import { Controller, Get, UseGuards, Query, Param } from '@nestjs/common';
import { MonitoringService } from './monitoramento.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RolesGuard } from 'src/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Monitoring')
@ApiBearerAuth()
@Controller('api/monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check completo do sistema' })
  async getHealthCheck() {
    return await this.monitoringService.getCompleteHealthCheck();
  }

  @Get('ping')
  @ApiOperation({ summary: 'Ping individual dos serviços' })
  async getPingStatus() {
    return await this.monitoringService.getPingStatus();
  }

  @Get('logs')
  @ApiOperation({ summary: 'Logs do sistema' })
  async getLogs(
    @Query('limit') limit?: number,
    @Query('level') level?: string,
    @Query('service') service?: string,
    @Query('date') date?: string
  ) {
    return await this.monitoringService.getLogs({
      limit: limit || 100,
      level,
      service,
      date
    });
  }

  @Get('system-info')
  @ApiOperation({ summary: 'Informações do sistema' })
  async getSystemInfo() {
    return await this.monitoringService.getSystemInfo();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Métricas do sistema' })
  async getMetrics() {
    return await this.monitoringService.getMetrics();
  }
}