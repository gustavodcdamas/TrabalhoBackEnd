import { Controller, Get } from '@nestjs/common';
import { 
  HealthCheckService,
  HealthCheck,
  HealthCheckResult,
  HealthIndicatorStatus,
  HealthIndicatorResult
} from '@nestjs/terminus';
import { EmailService } from '../modules/email/email.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly emailService: EmailService,
    private readonly health: HealthCheckService
  ) {}

  @Get('email')
  @HealthCheck()
  async checkEmailHealth(): Promise<HealthCheckResult> {
    const isHealthy = await this.emailService.testConnection();
    
    const result: HealthIndicatorResult = {
      emailService: {
        status: isHealthy ? 'up' : 'down' as HealthIndicatorStatus,
        details: {
          status: isHealthy ? 'operational' : 'unavailable'
        }
      }
    };

    return this.health.check([
      () => Promise.resolve(result)
    ]);
  }
}