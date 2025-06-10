// redis.config.ts - VERSÃO CORRIGIDA
import { CacheModuleOptions } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';

export const getRedisConfig = async (
  configService: ConfigService,
): Promise<CacheModuleOptions> => {
  try {
    const store = await redisStore({
      socket: {
        host: configService.get('REDIS_HOST') || 'localhost',
        port: configService.get<number>('REDIS_PORT') || 6379,
        password: configService.get<string>('REDIS_PASSWORD'),
      },
      ttl: 60 * 60 * 24, // 24 horas
    });

    return {
      store,
      ttl: 60 * 60 * 24,
      max: 1000, // máximo de itens no cache
    };
  } catch (error) {
    console.error('❌ Erro na configuração Redis:', error);
    // Fallback para cache em memória
    return {
      ttl: 60 * 60 * 24,
      max: 100,
    };
  }
};