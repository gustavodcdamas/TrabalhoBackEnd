import { Controller, Get, UseGuards, Query, Param } from '@nestjs/common';
import { MonitoringService } from './monitoramento.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RolesGuard } from 'src/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Monitoring')
@Controller('api/monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  // ✅ ENDPOINT PÚBLICO PARA DOCKER HEALTHCHECK
  @Get('health/public')
  @ApiOperation({ summary: 'Health check público para Docker' })
  async getPublicHealthCheck() {
    // Versão simplificada sem dados sensíveis
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV
    };
  }

  // 🔒 ENDPOINTS PROTEGIDOS (mantém como estavam)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('health')
  @ApiOperation({ summary: 'Health check completo do sistema' })
  async getHealthCheck() {
    return await this.monitoringService.getCompleteHealthCheck();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('ping')
  @ApiOperation({ summary: 'Ping individual dos serviços' })
  async getPingStatus() {
    return await this.monitoringService.getPingStatus();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
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

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('system-info')
  @ApiOperation({ summary: 'Informações do sistema' })
  async getSystemInfo() {
    return await this.monitoringService.getSystemInfo();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('metrics')
  @ApiOperation({ summary: 'Métricas do sistema' })
  async getMetrics() {
    return await this.monitoringService.getMetrics();
  }
}