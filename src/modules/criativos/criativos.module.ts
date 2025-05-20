import { Module } from '@nestjs/common';
import { criativosService } from './criativos.service';
import { CriativosController } from './criativos.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { criativo } from './entities/criativo.entity';

@Module({
    imports: [
      TypeOrmModule.forFeature([criativo]),
    ],
  controllers: [CriativosController],
  providers: [criativosService],
})
export class CriativosModule {
  
}
