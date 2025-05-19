import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './config/db/db.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ServicesModule } from './modules/services/services.module';
import { CriativosModule } from './modules/criativos/criativos.module';
import { IdvModule } from './modules/idv/idv.module';
import { LandingModule } from './modules/landing/landing.module';
import { InstitucionalModule } from './modules/institucional/institucional.module';
import { EmailModule } from './modules/email/email.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { DatabaseInitializer } from './config/db/database.initializer';
import { UserEntity } from './modules/users/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { MulterModule } from '@nestjs/platform-express';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { databaseConfig } from './config/db/database.config';
import { getRedisConfig } from './config/redis/redis.config';
import { multerOptions } from './modules/uploads/file-upload.utils';
import { Cache } from 'cache-manager';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        ...getRedisConfig(configService),
        ttl: 60 * 60 * 24, // 24 hours
      }),
    }),
    MulterModule.register(multerOptions),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
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
    UploadsModule,
    TypeOrmModule.forFeature([UserEntity]),
  ],
  controllers: [AppController],
  providers: [AppService, DatabaseInitializer],
})
export class AppModule {}
