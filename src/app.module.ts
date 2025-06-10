// app.module.ts - VERSÃO CORRIGIDA
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
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
import { MulterModule } from '@nestjs/platform-express';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { LimpezaModule } from './modules/uploads/limpeza/limpeza.module';
import { LoggerModule } from './modules/logger/logger.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AuditLog } from './modules/audit/entities/audit-log.entity';
import { AuditService } from './modules/audit/audit.service';
import { LimpezaService } from './modules/uploads/limpeza/limpeza.service';
import { LoggerService } from './modules/logger/logger.service';
import { WppModule } from './modules/wpp/wpp.module';
import { LoggingMiddleware } from './common/middlewares/logging.middleware';
import { CsrfMiddleware } from './common/middlewares/csrf.middleware';
import { CsrfController } from './csrf.controller';
import { RedisService } from 'src/config/redis/redis.service';
import { RedisModule } from 'src/config/redis/redis.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    CacheModule.register({
      isGlobal: true,
      ttl: 60 * 60 * 24 * 1000,
      max: 1000,
    }),

    RedisModule,
    
    MulterModule.register({
      dest: './uploads',
    }),
    
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false,
        maxAge: '1h',
        setHeaders: (res, path) => {
          res.setHeader('Cache-Control', 'public, max-age=3600');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        },
      },
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
    UploadsModule,
    TypeOrmModule.forFeature([UserEntity]),
    LimpezaModule,
    LoggerModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([AuditLog]),
    WppModule,
  ],
  controllers: [AppController, CsrfController],
  providers: [AppService, DatabaseInitializer, AuditService, LimpezaService, LoggerService, RedisService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggingMiddleware)
      .forRoutes('*');
      
    consumer
      .apply(CsrfMiddleware)
      .exclude(
        { path: 'api/csrf-token', method: RequestMethod.GET },
        { path: 'uploads/(.*)', method: RequestMethod.ALL },
        { path: 'api/docs/(.*)', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}