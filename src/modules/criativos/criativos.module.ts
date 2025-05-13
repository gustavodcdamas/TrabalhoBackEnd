import { Module } from '@nestjs/common';
import { CriativosService } from './criativos.service';
import { CriativosController } from './criativos.controller';

@Module({
  controllers: [CriativosController],
  providers: [CriativosService],
})
export class CriativosModule {}
