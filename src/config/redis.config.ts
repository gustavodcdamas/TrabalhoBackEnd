import { CacheModuleOptions } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';

export const getRedisConfig = async (
  configService: ConfigService,
): Promise<CacheModuleOptions> => {
  const store = await redisStore({
    socket: {
      host: configService.get('REDIS_HOST'),
      port: configService.get<number>('REDIS_PORT'),
    },
    ttl: 60 * 60 * 24,
  });

  return {
    store,
  };
};
