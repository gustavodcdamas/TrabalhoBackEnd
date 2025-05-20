import { Module } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { Cache } from 'cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Servicos } from './entities/service.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Servicos]),
  ],
  controllers: [ServicesController],
  providers: [ServicesService],
})
export class ServicesModule {}
