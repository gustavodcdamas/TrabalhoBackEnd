import { forwardRef, Module } from '@nestjs/common';
import { InstitucionalService } from './institucional.service';
import { InstitucionalController } from './institucional.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Institucional } from './entities/institucional.entity';
import { UploadsModule } from '../uploads/uploads.module';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Institucional]),
    forwardRef(() => UploadsModule),
    LoggerModule,
  ],
  controllers: [InstitucionalController],
  providers: [InstitucionalService],
  exports: [InstitucionalService],
})
export class InstitucionalModule {}
