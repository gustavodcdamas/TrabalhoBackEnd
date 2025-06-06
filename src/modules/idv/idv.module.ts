import { forwardRef, Module } from '@nestjs/common';
import { IdvService } from './idv.service';
import { IdvController } from './idv.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '../logger/logger.module';
import { UploadsModule } from '../uploads/uploads.module';
import { Idv } from './entities/idv.entity';
import { LoggerService } from '../logger/logger.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Idv]),
    forwardRef(() => UploadsModule),
    LoggerModule,
  ],
  controllers: [IdvController],
  providers: [IdvService],
  exports: [IdvService],
})
export class IdvModule {
  
}
