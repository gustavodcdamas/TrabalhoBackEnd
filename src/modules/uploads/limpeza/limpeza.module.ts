import { forwardRef, Module } from '@nestjs/common';
import { ServicesModule } from '../../services/servicos.module';
import { CriativosModule } from '../../criativos/criativos.module';
import { LimpezaService } from './limpeza.service';
import { LoggerService } from 'src/modules/logger/logger.service';
import { LoggerModule } from 'src/modules/logger/logger.module';

@Module({
  imports: [forwardRef(() => CriativosModule), forwardRef(() => ServicesModule), LoggerModule],
  providers: [LimpezaService],
  exports: [LimpezaService],
})
export class LimpezaModule {}