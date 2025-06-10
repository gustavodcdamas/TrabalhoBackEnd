// src/config/cache/redis.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.client = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: 0,
      keyPrefix: 'app-cache:',
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    this.client.on('connect', () => console.log('✅ Redis conectado'));
    this.client.on('error', (err) => console.error('❌ Redis erro:', err));
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('❌ Erro ao obter do Redis:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 86400): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.client.setex(key, ttlSeconds, serialized);
      console.log('✅ Salvo no Redis:', key);
    } catch (error) {
      console.error('❌ Erro ao salvar no Redis:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
      console.log('🗑️ Removido do Redis:', key);
    } catch (error) {
      console.error('❌ Erro ao remover do Redis:', error);
    }
  }

  async keys(pattern: string = '*'): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error('❌ Erro ao listar chaves:', error);
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      await this.client.flushdb();
      console.log('🧹 Cache Redis limpo');
    } catch (error) {
      console.error('❌ Erro ao limpar Redis:', error);
    }
  }

  async ping(): Promise<string> {
    return await this.client.ping();
  }
}