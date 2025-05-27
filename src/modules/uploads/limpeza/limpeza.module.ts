import { forwardRef, Module } from '@nestjs/common';
import { ServicesModule } from '../../services/servicos.module';
import { CriativosModule } from '../../criativos/criativos.module';
import { LimpezaService } from './limpeza.service';

@Module({
  imports: [forwardRef(() => CriativosModule), forwardRef(() => ServicesModule)],
  providers: [LimpezaService],
  exports: [LimpezaService],
})
export class LimpezaModule {}