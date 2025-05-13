import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './config/db/db.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ServicesModule } from './modules/services/services.module';
import { CriativosModule } from './modules/criativos/criativos.module';
import { IdvModule } from './modules/idv/idv.module';
import { LandingModule } from './modules/landing/landing.module';
import { InstitucionalModule } from './modules/institucional/institucional.module';
import { EmailModule } from './modules/email/email.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { DatabaseInitializer } from './config/db/database.initializer';
import { UserEntity } from './modules/users/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

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
    TypeOrmModule.forFeature([UserEntity]),
  ],
  controllers: [AppController],
  providers: [AppService, DatabaseInitializer],
})
export class AppModule {}
