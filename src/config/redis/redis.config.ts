// src/config/redis/redis.config.ts - VERSÃO CORRIGIDA
import { CacheModuleOptions } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';

export const getRedisConfig = async (
  configService: ConfigService,
): Promise<CacheModuleOptions> => {
  try {
    console.log('🔧 Configurando Redis...');
    
    // ✅ CONFIGURAÇÃO SIMPLES PARA VERSÕES COMPATÍVEIS
    const config = {
      store: require('cache-manager-redis-store'),
      host: configService.get('REDIS_HOST') || 'localhost',
      port: configService.get<number>('REDIS_PORT') || 6379,
      password: configService.get<string>('REDIS_PASSWORD'), // ✅ Aqui está correto
      ttl: 60 * 60 * 24, // 24 horas
      max: 1000,
      db: 0,
      keyPrefix: 'nest-cache:',
    };

    console.log('✅ Redis configurado:', {
      host: config.host,
      port: config.port,
      hasPassword: !!config.password
    });

    return config;
  } catch (error) {
    console.error('❌ Erro na configuração Redis:', error);
    // Fallback para cache em memória
    return {
      ttl: 60 * 60 * 24,
      max: 100,
    };
  }
};