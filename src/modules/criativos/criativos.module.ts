import { forwardRef, Module } from '@nestjs/common';
import { CriativosService } from './criativos.service';
import { CriativosController } from './criativos.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Criativo } from './entities/criativo.entity';
import { UploadsModule } from '../uploads/uploads.module';
import { LoggerModule } from '../logger/logger.module';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from 'src/config/redis/redis.module';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Criativo]),
    forwardRef(() => UploadsModule),
    LoggerModule,
    RedisModule
  ],
  controllers: [CriativosController],
  providers: [CriativosService],
  exports: [CriativosService],
})
export class CriativosModule {
  constructor() {
    console.log('📦 CriativosModule inicializado');
  }
}