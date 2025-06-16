// src/config/redis/redis.config.ts - VERSÃO CORRIGIDA PARA IOREDIS
import { CacheModuleOptions } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';

export const getRedisConfig = async (
  configService: ConfigService,
): Promise<CacheModuleOptions> => {
  try {
    console.log('🔧 Configurando Redis Cache com ioredis...');
    
    const redisHost = configService.get('REDIS_HOST') || 'localhost';
    const redisPort = configService.get<number>('REDIS_PORT') || 6379;
    const redisPassword = configService.get<string>('REDIS_PASSWORD');
    
    console.log('🔍 Configurações Redis:', {
      host: redisHost,
      port: redisPort,
      hasPassword: !!redisPassword,
    });

    // ✅ CONFIGURAÇÃO CORRIGIDA PARA IOREDIS
    const config: CacheModuleOptions = {
      store: redisStore,
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      db: 0,
      ttl: 60 * 60 * 24, // 24 horas em segundos
      max: 1000,
      keyPrefix: 'app-cache:', // ✅ UNIFICADO
      // ✅ CONFIGURAÇÕES ESPECÍFICAS DO IOREDIS
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      retryStrategy: (times: number) => {
        console.log(`🔄 Redis retry attempt ${times}`);
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err: Error) => {
        console.error('🔄 Redis reconnect on error:', err.message);
        return true;
      },
    };

    console.log('✅ Redis Cache configurado com ioredis');
    return config;
    
  } catch (error) {
    console.error('❌ Erro na configuração Redis Cache:', error);
    
    // ✅ FALLBACK: Cache em memória se Redis falhar
    console.log('🔄 Usando cache em memória como fallback');
    return {
      ttl: 60 * 60 * 24,
      max: 100,
    };
  }
};