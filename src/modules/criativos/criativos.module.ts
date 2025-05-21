import { Module } from '@nestjs/common';
import { criativosService } from './criativos.service';
import { CriativosController } from './criativos.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { criativo } from './entities/criativo.entity';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
    imports: [
      TypeOrmModule.forFeature([criativo]),
      UploadsModule,
    ],
  controllers: [CriativosController],
  providers: [criativosService],
  exports: [criativosService],
})
export class CriativosModule {
  
}
