// src/config/redis/redis.service.ts
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redisClient: Redis;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.createRedisConnection();
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.logger.log('🔴 Conexão Redis encerrada');
    }
  }

  private async createRedisConnection(): Promise<void> {
    try {
      const redisConfig = {
        host: this.configService.get('REDIS_HOST') || 'localhost',
        port: this.configService.get<number>('REDIS_PORT') || 6379,
        password: this.configService.get<string>('REDIS_PASSWORD'),
        db: 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        reconnectOnError: (err) => {
          this.logger.error('🔄 Redis reconnect on error:', err.message);
          return true;
        },
      };

      this.logger.log('🔧 Conectando ao Redis...', {
        host: redisConfig.host,
        port: redisConfig.port,
        hasPassword: !!redisConfig.password,
      });

      this.redisClient = new Redis(redisConfig);

      // Event listeners
      this.redisClient.on('connect', () => {
        this.logger.log('🟢 Redis conectado com sucesso!');
      });

      this.redisClient.on('ready', () => {
        this.logger.log('🚀 Redis pronto para uso!');
      });

      this.redisClient.on('error', (err) => {
        this.logger.error('❌ Erro de conexão Redis:', err.message);
      });

      this.redisClient.on('close', () => {
        this.logger.warn('🔴 Conexão Redis fechada');
      });

      this.redisClient.on('reconnecting', (ms) => {
        this.logger.log(`🔄 Reconectando ao Redis em ${ms}ms...`);
      });

      // Testar conexão
      await this.redisClient.connect();
      await this.testConnection();

    } catch (error) {
      this.logger.error('❌ Falha ao conectar no Redis:', error.message);
      throw error;
    }
  }

  private async testConnection(): Promise<void> {
    try {
      const result = await this.redisClient.ping();
      if (result === 'PONG') {
        this.logger.log('✅ Teste de conexão Redis: SUCESSO');
        
        // Teste adicional - definir e buscar uma chave
        await this.redisClient.set('test:connection', 'OK', 'EX', 60);
        const testValue = await this.redisClient.get('test:connection');
        this.logger.log(`✅ Teste de escrita/leitura Redis: ${testValue}`);
        
        // Limpar chave de teste
        await this.redisClient.del('test:connection');
      }
    } catch (error) {
      this.logger.error('❌ Teste de conexão Redis falhou:', error.message);
      throw error;
    }
  }

  // ✅ MÉTODOS PÚBLICOS PARA USO NOS SERVICES
  
  /**
   * Definir um valor no cache
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<'OK'> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttlSeconds) {
        return await this.redisClient.set(key, serializedValue, 'EX', ttlSeconds);
      }
      return await this.redisClient.set(key, serializedValue);
    } catch (error) {
      this.logger.error(`Erro ao definir cache ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * Buscar um valor do cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redisClient.get(key);
      if (value === null) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Erro ao buscar cache ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Deletar uma chave do cache
   */
  async del(key: string): Promise<number> {
    try {
      return await this.redisClient.del(key);
    } catch (error) {
      this.logger.error(`Erro ao deletar cache ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * Verificar se uma chave existe
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redisClient.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Erro ao verificar existência de ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Definir TTL para uma chave existente
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.redisClient.expire(key, seconds);
      return result === 1;
    } catch (error) {
      this.logger.error(`Erro ao definir TTL para ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Buscar chaves por padrão
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.redisClient.keys(pattern);
    } catch (error) {
      this.logger.error(`Erro ao buscar chaves com padrão ${pattern}:`, error.message);
      return [];
    }
  }

  /**
   * Limpar cache por padrão
   */
  async clearByPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      return await this.redisClient.del(...keys);
    } catch (error) {
      this.logger.error(`Erro ao limpar cache com padrão ${pattern}:`, error.message);
      return 0;
    }
  }

  /**
   * Flush completo do banco Redis
   */
  async flushAll(): Promise<'OK'> {
    try {
      const result = await this.redisClient.flushall();
      this.logger.log('🗑️ Cache Redis limpo completamente');
      return result;
    } catch (error) {
      this.logger.error('Erro ao limpar todo o cache:', error.message);
      throw error;
    }
  }

  /**
   * Obter informações do Redis
   */
  async getInfo(): Promise<string> {
    try {
      return await this.redisClient.info();
    } catch (error) {
      this.logger.error('Erro ao obter informações do Redis:', error.message);
      throw error;
    }
  }

  /**
   * Ping do Redis
   */
  async ping(): Promise<string> {
    try {
      return await this.redisClient.ping();
    } catch (error) {
      this.logger.error('Erro no ping Redis:', error.message);
      throw error;
    }
  }

  /**
   * Obter cliente Redis diretamente (use com cuidado)
   */
  getClient(): Redis {
    return this.redisClient;
  }

  /**
   * Métodos para cache com padrão de chave
   */
  private getCacheKey(prefix: string, id: string | number): string {
    return `${prefix}:${id}`;
  }

  async cacheUser(userId: string, user: any, ttlSeconds = 3600): Promise<void> {
    const key = this.getCacheKey('user', userId);
    await this.set(key, user, ttlSeconds);
    this.logger.debug(`👤 Usuário ${userId} armazenado em cache`);
  }

  async getCachedUser(userId: string): Promise<any | null> {
    const key = this.getCacheKey('user', userId);
    const user = await this.get(key);
    if (user) {
      this.logger.debug(`👤 Usuário ${userId} recuperado do cache`);
    }
    return user;
  }

  async invalidateUserCache(userId: string): Promise<void> {
    const key = this.getCacheKey('user', userId);
    await this.del(key);
    this.logger.debug(`🗑️ Cache do usuário ${userId} invalidado`);
  }
}