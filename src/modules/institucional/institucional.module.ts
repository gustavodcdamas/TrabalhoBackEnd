import { forwardRef, Module } from '@nestjs/common';
import { InstitucionalService } from './institucional.service';
import { InstitucionalController } from './institucional.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Institucional } from './entities/institucional.entity';
import { UploadsModule } from '../uploads/uploads.module';
import { LoggerModule } from '../logger/logger.module';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from 'src/config/redis/redis.module';


@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Institucional]),
    forwardRef(() => UploadsModule),
    LoggerModule,
    RedisModule, // ✅ ADICIONAR
  ],
  controllers: [InstitucionalController],
  providers: [InstitucionalService],
  exports: [InstitucionalService],
})
export class InstitucionalModule {
  constructor() {
    console.log('📦 Institucional Module inicializado');
  }
}
