import { Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { MulterModule } from '@nestjs/platform-express';
import { multerOptions } from './file-upload.utils';
import { LimpezaService } from './limpeza/limpeza.service';
import { LimpezaModule } from './limpeza/limpeza.module';

@Module({
  imports: [
    MulterModule.register(multerOptions),
    LimpezaModule,
  ],
  controllers: [UploadsController],
  providers: [UploadsService, LimpezaService],
  exports: [UploadsService],
})
export class UploadsModule {}
