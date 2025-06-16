import { forwardRef, Module } from '@nestjs/common';
import { LandingService } from './landing.service';
import { LandingController } from './landing.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Landing } from './entities/landing.entity';
import { UploadsModule } from '../uploads/uploads.module';
import { LoggerModule } from '../logger/logger.module';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from 'src/config/redis/redis.module';
import { RedisService } from 'src/config/redis/redis.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Landing]),
    forwardRef(() => UploadsModule),
    LoggerModule,
    RedisModule,
  ],
  controllers: [LandingController],
  providers: [LandingService, RedisService],
  exports: [LandingService],
})
export class LandingModule {
  constructor() {
    console.log('📦 Landing Module inicializado');
  }
}
