import { forwardRef, Module } from '@nestjs/common';
import { criativosService } from './criativos.service';
import { CriativosController } from './criativos.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Criativo } from './entities/criativo.entity';
import { UploadsModule } from '../uploads/uploads.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Criativo]),
    forwardRef(() => UploadsModule)
  ],
  controllers: [CriativosController],
  providers: [ criativosService ],
  exports: [criativosService],
})
export class CriativosModule {
  
}
