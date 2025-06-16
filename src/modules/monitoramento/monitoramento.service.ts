import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface PingStatus {
  backend: {
    status: 'pong' | 'not_pong';
    responseTime: number;
    timestamp: string;
  };
  redis: {
    status: 'pong' | 'not_pong';
    responseTime: number;
    timestamp: string;
    error?: string;
  };
  database: {
    status: 'pong' | 'not_pong';
    responseTime: number;
    timestamp: string;
    error?: string;
  };
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: PingStatus;
  uptime: number;
  timestamp: string;
  version: string;
  environment: string;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private redisClient: Redis;

  constructor(
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {
    this.initializeRedisClient();
  }

  private initializeRedisClient() {
    this.redisClient = new Redis({
      host: this.configService.get<string>('REDIS_HOST') || 'redis',
      port: this.configService.get<number>('REDIS_PORT') || 6379,
      password: this.configService.get<string>('REDIS_PASSWORD'),
      retryStrategy: () => null, // Não retry para monitoring
      connectTimeout: 5000,
      commandTimeout: 3000,
      lazyConnect: true,
    });
  }

  // ✅ PING STATUS - Testa cada serviço individualmente
  async getPingStatus(): Promise<PingStatus> {
    const [backendResult, redisResult, databaseResult] = await Promise.allSettled([
      this.pingBackend(),
      this.pingRedis(),
      this.pingDatabase()
    ]);

    return {
      backend: backendResult.status === 'fulfilled' 
        ? backendResult.value 
        : { status: 'not_pong', responseTime: 0, timestamp: new Date().toISOString() },
      
      redis: redisResult.status === 'fulfilled' 
        ? redisResult.value 
        : { status: 'not_pong', responseTime: 0, timestamp: new Date().toISOString(), error: 'Connection failed' },
      
      database: databaseResult.status === 'fulfilled' 
        ? databaseResult.value 
        : { status: 'not_pong', responseTime: 0, timestamp: new Date().toISOString(), error: 'Connection failed' }
    };
  }

  // ✅ PING BACKEND
  private async pingBackend(): Promise<PingStatus['backend']> {
    const startTime = Date.now();
    
    try {
      // Teste simples - se chegou aqui, backend está funcionando
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'pong',
        responseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'not_pong',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  // ✅ PING REDIS
  private async pingRedis(): Promise<PingStatus['redis']> {
    const startTime = Date.now();
    
    try {
      if (this.redisClient.status !== 'ready') {
        await this.redisClient.connect();
      }
      
      const response = await this.redisClient.ping();
      const responseTime = Date.now() - startTime;
      
      if (response === 'PONG') {
        return {
          status: 'pong',
          responseTime,
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error('Invalid ping response');
      }
    } catch (error: any) {
      return {
        status: 'not_pong',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error?.message || 'Unknown error'
      };
    }
  }

  // ✅ PING DATABASE
  private async pingDatabase(): Promise<PingStatus['database']> {
    const startTime = Date.now();
    
    try {
      if (!this.dataSource.isInitialized) {
        throw new Error('Database not initialized');
      }
      
      // Query simples para testar conexão
      await this.dataSource.query('SELECT 1');
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'pong',
        responseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        status: 'not_pong',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error?.message || 'Unknown error'
      };
    }
  }

  // ✅ HEALTH CHECK COMPLETO
  async getCompleteHealthCheck(): Promise<HealthCheck> {
    const pingStatus = await this.getPingStatus();
    
    // Determinar status geral
    const allServices = [pingStatus.backend, pingStatus.redis, pingStatus.database];
    const healthyServices = allServices.filter(service => service.status === 'pong').length;
    
    let overallStatus: HealthCheck['status'];
    if (healthyServices === allServices.length) {
      overallStatus = 'healthy';
    } else if (healthyServices > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    return {
      status: overallStatus,
      checks: pingStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
  }

  // ✅ LOGS DO SISTEMA - CORRIGIDO
  async getLogs(filters: {
    limit: number;
    level?: string;
    service?: string;
    date?: string;
  }) {
    try {
      // Implementação simples - ler logs de arquivo
      const logDir = process.env.LOG_FILE_PATH || './logs';
      const logFile = path.join(logDir, 'application.log');
      
      if (!fs.existsSync(logFile)) {
        return {
          logs: [],
          total: 0,
          message: 'Log file not found'
        };
      }

      const logContent = fs.readFileSync(logFile, 'utf8');
      const logLines = logContent.split('\n').filter(line => line.trim());
      
      // Filtrar logs - CORRIGIDO
      let filteredLogs = logLines;
      
      // Verificar se level existe antes de usar
      if (filters.level && filters.level.trim()) {
        filteredLogs = filteredLogs.filter(line => 
          line.toLowerCase().includes(filters.level!.toLowerCase())
        );
      }
      
      // Verificar se service existe antes de usar
      if (filters.service && filters.service.trim()) {
        filteredLogs = filteredLogs.filter(line => 
          line.toLowerCase().includes(filters.service!.toLowerCase())
        );
      }
      
      // Verificar se date existe antes de usar
      if (filters.date && filters.date.trim()) {
        filteredLogs = filteredLogs.filter(line => 
          line.includes(filters.date!)
        );
      }
      
      // Limitar resultados
      const limitedLogs = filteredLogs.slice(-filters.limit);
      
      return {
        logs: limitedLogs.map((log, index) => ({
          id: index,
          content: log,
          timestamp: this.extractTimestampFromLog(log)
        })),
        total: filteredLogs.length,
        filtered: limitedLogs.length
      };
    } catch (error) {
      this.logger.error('Error reading logs:', error);
      return {
        logs: [],
        total: 0,
        error: 'Failed to read logs'
      };
    }
  }

  // ✅ INFORMAÇÕES DO SISTEMA
  async getSystemInfo() {
    const memoryUsage = process.memoryUsage();
    
    return {
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime()
      },
      memory: {
        rss: this.formatBytes(memoryUsage.rss),
        heapTotal: this.formatBytes(memoryUsage.heapTotal),
        heapUsed: this.formatBytes(memoryUsage.heapUsed),
        external: this.formatBytes(memoryUsage.external),
        usagePercent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: process.env.PORT || process.env.NEST_PORT || '3000',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      docker: {
        isDocker: this.isRunningInDocker(),
        hostname: process.env.HOSTNAME || 'unknown'
      }
    };
  }

  // ✅ MÉTRICAS DO SISTEMA
  async getMetrics() {
    try {
      // Métricas básicas - você pode expandir com Prometheus, etc.
      const [userCount, adminCount] = await Promise.all([
        this.dataSource.query('SELECT COUNT(*) as count FROM "user" WHERE "isClient" = true'),
        this.dataSource.query('SELECT COUNT(*) as count FROM "user" WHERE "isAdmin" = true OR "isSuperAdmin" = true')
      ]);

      return {
        users: {
          total: parseInt(userCount[0]?.count || '0'),
          admins: parseInt(adminCount[0]?.count || '0')
        },
        requests: {
          // Estas métricas precisariam ser coletadas via interceptor
          total: 0,
          errors: 0,
          avgResponseTime: 0
        },
        system: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage().heapUsed,
          cpuUsage: process.cpuUsage()
        }
      };
    } catch (error) {
      this.logger.error('Error getting metrics:', error);
      return {
        users: { total: 0, admins: 0 },
        requests: { total: 0, errors: 0, avgResponseTime: 0 },
        system: { uptime: process.uptime(), memoryUsage: 0, cpuUsage: { user: 0, system: 0 } }
      };
    }
  }

  // ✅ UTILITIES
  private extractTimestampFromLog(log: string): string {
    // Tentar extrair timestamp do log (formato pode variar)
    const timestampMatch = log.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    return timestampMatch ? timestampMatch[0] : new Date().toISOString();
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  private isRunningInDocker(): boolean {
    return fs.existsSync('/.dockerenv') || process.env.DOCKER_CONTAINER === 'true';
  }
}