import { forwardRef, Module } from '@nestjs/common';
import { IdvService } from './idv.service';
import { IdvController } from './idv.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '../logger/logger.module';
import { UploadsModule } from '../uploads/uploads.module';
import { Idv } from './entities/idv.entity';
import { LoggerService } from '../logger/logger.service';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from 'src/config/redis/redis.module';
import { RedisService } from 'src/config/redis/redis.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Idv]),
    forwardRef(() => UploadsModule),
    LoggerModule,
    RedisModule
  ],
  controllers: [IdvController],
  providers: [IdvService, RedisService],
  exports: [IdvService],
})
export class IdvModule {
  constructor() {
    console.log('📦 IdvModule inicializado');
  }
}
