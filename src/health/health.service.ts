import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';

export interface HealthCheck {
  status: 'ok' | 'error';
  checks: {
    database: {
      status: 'ok' | 'error';
      message?: string;
      responseTime?: number;
    };
    redis: {
      status: 'ok' | 'error';
      message?: string;
      responseTime?: number;
    };
    memory: {
      status: 'ok' | 'warning' | 'error';
      usage: NodeJS.MemoryUsage;
      usagePercent?: number;
      message?: string; // ✅ Adicionada propriedade message
    };
    disk?: {
      status: 'ok' | 'warning' | 'error';
      usage?: any;
      message?: string; // ✅ Adicionada propriedade message
    };
  };
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
}

@Injectable()
export class HealthService {
  private redisClient: Redis;

  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {
    // Configurar Redis client para health check
    this.redisClient = new Redis({
      host: this.configService.get<string>('REDIS_HOST') || 'redis',
      port: this.configService.get<number>('REDIS_PORT') || 6379,
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined, // ✅ Corrigido tipo
      retryStrategy: () => null, // Não retry para health check
      connectTimeout: 5000,
      commandTimeout: 3000,
      lazyConnect: true,
    });
  }

  async checkHealth(): Promise<HealthCheck> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMemory(),
    ]);

    const [databaseResult, redisResult, memoryResult] = checks;

    const healthCheck: HealthCheck = {
      status: 'ok',
      checks: {
        database: databaseResult.status === 'fulfilled' 
          ? databaseResult.value 
          : { status: 'error', message: 'Database check failed' },
        redis: redisResult.status === 'fulfilled' 
          ? redisResult.value 
          : { status: 'error', message: 'Redis check failed' },
        memory: memoryResult.status === 'fulfilled' 
          ? memoryResult.value 
          : { 
              status: 'error', 
              usage: process.memoryUsage(), 
              message: 'Memory check failed' 
            }, // ✅ Agora está tipado corretamente
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    };

    // Determinar status geral
    const hasErrors = Object.values(healthCheck.checks).some(
      check => check.status === 'error'
    );

    if (hasErrors) {
      healthCheck.status = 'error';
    }

    return healthCheck;
  }

  private async checkDatabase(): Promise<HealthCheck['checks']['database']> {
    const startTime = Date.now();
    
    try {
      if (!this.dataSource.isInitialized) {
        return {
          status: 'error',
          message: 'Database not initialized',
        };
      }

      // Executa uma query simples
      await this.dataSource.query('SELECT 1');
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'ok',
        responseTime,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown database error',
        responseTime: Date.now() - startTime,
      };
    }
  }

  private async checkRedis(): Promise<HealthCheck['checks']['redis']> {
    const startTime = Date.now();
    
    try {
      // Tenta conectar se não estiver conectado
      if (this.redisClient.status !== 'ready') {
        await this.redisClient.connect();
      }

      // Executa um ping
      const pong = await this.redisClient.ping();
      
      if (pong !== 'PONG') {
        throw new Error('Redis ping failed');
      }

      const responseTime = Date.now() - startTime;
      
      return {
        status: 'ok',
        responseTime,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown Redis error',
        responseTime: Date.now() - startTime,
      };
    }
  }

  private async checkMemory(): Promise<HealthCheck['checks']['memory']> {
    try {
      const usage = process.memoryUsage();
      const totalMemory = usage.heapTotal + usage.external;
      const usedMemory = usage.heapUsed;
      const usagePercent = (usedMemory / totalMemory) * 100;

      let status: 'ok' | 'warning' | 'error' = 'ok';
      
      if (usagePercent > 90) {
        status = 'error';
      } else if (usagePercent > 75) {
        status = 'warning';
      }

      return {
        status,
        usage,
        usagePercent: Math.round(usagePercent * 100) / 100,
      };
    } catch (error) {
      // ✅ Agora retorna com a interface correta
      return {
        status: 'error',
        usage: process.memoryUsage(),
        message: error instanceof Error ? error.message : 'Memory check failed',
      };
    }
  }

  // Método simples para health check endpoint
  async getSimpleHealth(): Promise<{ status: string; timestamp: string }> {
    try {
      const health = await this.checkHealth();
      return {
        status: health.status,
        timestamp: health.timestamp,
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Cleanup
  onModuleDestroy() {
    if (this.redisClient) {
      this.redisClient.disconnect();
    }
  }
}