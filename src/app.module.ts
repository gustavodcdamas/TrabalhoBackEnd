import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController, CsrfTokenController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './config/db/db.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ServicesModule } from './modules/services/servicos.module';
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
import { LimpezaModule } from './modules/uploads/limpeza/limpeza.module';
import { LoggerModule } from './modules/logger/logger.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AuditLog } from './modules/audit/entities/audit-log.entity';
import { AuditService } from './modules/audit/audit.service';
import { LimpezaService } from './modules/uploads/limpeza/limpeza.service';
import { LoggerService } from './modules/logger/logger.service';
import { WppModule } from './modules/wpp/wpp.module';
import { LoggingMiddleware } from './common/middlewares/logging.middleware';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as csurf from 'csurf';
import * as redis from 'redis';
import { CsrfMiddleware } from './common/middlewares/csrf.middleware';


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
    EmailModule,
    ServicesModule,
    CriativosModule,
    IdvModule,
    LandingModule,
    InstitucionalModule,
    EmailModule,
    UploadsModule,
    TypeOrmModule.forFeature([UserEntity]),
    LimpezaModule,
    LoggerModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([AuditLog]),
  ],
  controllers: [AppController, CsrfTokenController],
  providers: [AppService, DatabaseInitializer, AuditService, LimpezaService, LoggerService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggingMiddleware, csurf({ cookie: true }), CsrfMiddleware)
      .forRoutes('*'); // Aplica a todas as rotas
  }
}
