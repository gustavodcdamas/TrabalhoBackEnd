import { forwardRef, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { HttpModule } from '@nestjs/axios';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { SyncController } from '../sync/sync-user-data.controller';
import { SyncUserDataService } from '../sync/sync-user-data.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from '../logger/logger.module';
import { RedisModule } from 'src/config/redis/redis.module';
import { RedisService } from 'src/config/redis/redis.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity]),
  LoggerModule,
  RedisModule,
  HttpModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  forwardRef(() => AuthModule)],
  controllers: [UsersController, SyncController  ],
  providers: [UsersService, SyncUserDataService, RedisService  ],
  exports: [UsersService, TypeOrmModule, SyncUserDataService  ],
})
export class UsersModule {
  constructor() {
    console.log('📦 Users Module inicializado');
  }
}
