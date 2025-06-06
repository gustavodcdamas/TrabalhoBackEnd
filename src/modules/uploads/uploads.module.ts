import { Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { MulterModule } from '@nestjs/platform-express';
import { multerOptions } from './file-upload.utils';
import { LimpezaService } from './limpeza/limpeza.service';
import { LimpezaModule } from './limpeza/limpeza.module';
import { criativosService } from '../criativos/criativos.service';
import { CriativosModule } from '../criativos/criativos.module';

@Module({
  imports: [
    MulterModule.register(multerOptions),
    LimpezaModule,
    CriativosModule,
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
