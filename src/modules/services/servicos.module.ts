import { forwardRef, Module } from '@nestjs/common';
import { ServicosService } from './servicos.service';
import { ServicosController } from './servicos.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Servicos } from './entities/servicos.entity';
import { UploadsModule } from '../uploads/uploads.module';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from 'src/config/redis/redis.module';
import { LoggerModule } from '../logger/logger.module';
import { RedisService } from 'src/config/redis/redis.service';

@Module({
  imports: [
    RedisModule,
    AuthModule,
    TypeOrmModule.forFeature([Servicos]),
    forwardRef(() => UploadsModule),
    LoggerModule,
  ],
  controllers: [ServicosController],
  providers: [ServicosService, RedisService],
  exports: [ServicosService],
})
export class ServicesModule {
    constructor() {
    console.log('📦 ServicosModule inicializado');
  }
}
