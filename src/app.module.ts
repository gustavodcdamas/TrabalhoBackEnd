import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ServicesModule } from './services/services.module';
import { CriativosModule } from './criativos/criativos.module';
import { IdvModule } from './idv/idv.module';
import { LandingModule } from './landing/landing.module';
import { InstitucionalModule } from './institucional/institucional.module';
import { EmailModule } from './email/email.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DbModule,
    UsersModule,
    AuthModule,
    ServicesModule,
    CriativosModule,
    IdvModule,
    LandingModule,
    InstitucionalModule,
    EmailModule,
    WhatsappModule,
    UploadsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
