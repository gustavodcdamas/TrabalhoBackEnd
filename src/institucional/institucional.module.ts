import { Module } from '@nestjs/common';
import { InstitucionalService } from './institucional.service';
import { InstitucionalController } from './institucional.controller';

@Module({
  controllers: [InstitucionalController],
  providers: [InstitucionalService],
})
export class InstitucionalModule {}
