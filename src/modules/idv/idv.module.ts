import { Module } from '@nestjs/common';
import { IdvService } from './idv.service';
import { IdvController } from './idv.controller';

@Module({
  controllers: [IdvController],
  providers: [IdvService],
})
export class IdvModule {
  
}
