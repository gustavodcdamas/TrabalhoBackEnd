import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Importar módulos necessários para os guards
import { AuthModule } from '../auth/auth.module'; // Ajuste o caminho conforme sua estrutura
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MonitoringController } from './monitotamento.controller';
import { MonitoringService } from './monitoramento.service';

@Module({
  imports: [
    // Módulos necessários para o MonitoringService
    ConfigModule,
    
    // Módulos necessários para os Guards de Autenticação
    AuthModule, // ⭐ IMPORTANTE: Importar o AuthModule
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback-secret',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [MonitoringController],
  providers: [MonitoringService],
  exports: [MonitoringService]
})
export class MonitoringModule {}