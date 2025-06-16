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
import { MonitoringModule } from './modules/monitoramento/monitoramento.module';
import { MonitoringService } from './modules/monitoramento/monitoramento.service';
import { getRedisConfig } from './config/redis/redis.config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { DebugController } from './modules/debug.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: getRedisConfig,
      inject: [ConfigService],
    }),

    RedisModule,

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),

    // ✅ THROTTLER
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    
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
    MonitoringModule
  ],
  controllers: [AppController, CsrfController, DebugController],
  providers: [AppService, DatabaseInitializer, AuditService, LimpezaService, LoggerService, RedisService, MonitoringService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
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