import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ClienteEntity } from './entity/cliente.entity';
import { ClientesController } from './cliente.controller';
import { ClientesService } from './cliente.service';
import { LoggerModule } from '../logger/logger.module';
import { RedisModule } from 'src/config/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClienteEntity]),
    LoggerModule,
    RedisModule,
    forwardRef(() => AuthModule)
  ],
  controllers: [ClientesController],
  providers: [ClientesService],
  exports: [ClientesService, TypeOrmModule],
})
export class ClientesModule {
    constructor() {
        console.log('📦 Clientes Module inicializado');
    }
}