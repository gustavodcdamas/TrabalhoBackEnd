import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as compression from 'compression';
import helmet from 'helmet';
import { DatabaseInitializer } from './config/db/database.initializer';
import * as cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { SanitizePipe } from './common/sanitize.pipe';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { LoggerService } from './modules/logger/logger.service';
import * as session from 'express-session';
import * as connectRedis from 'connect-redis';
import Redis from 'ioredis';
const csurf = require('csurf'); // Ajuste feito aqui

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('NEST_PORT') || 3333;
  const frontEndUrl = configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';

  // ✅ 1. Cookie Parser
  app.use(cookieParser());

  // ✅ 2. Body parsers
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));

  // ✅ 3. Redis e Session
  const RedisStore = connectRedis(session);
  const redisClient = new Redis({
    host: configService.get<string>('REDIS_HOST') || 'localhost',
    port: configService.get<number>('REDIS_PORT') || 6379,
    password: configService.get<string>('REDIS_PASSWORD'),
    retryStrategy: (times) => Math.min(times * 50, 2000),
  });

  redisClient.on('connect', () => console.log('✅ Redis conectado'));
  redisClient.on('error', (err) => console.error('❌ Redis erro:', err));

  app.use(
    session({
      store: new RedisStore({
        client: redisClient,
        prefix: 'sess:',
        ttl: 86400,
      }),
      secret: configService.get<string>('JWT_SECRET') || 'fallback-secret-key-change-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 86400000,
      },
    }),
  );

  // ✅ Middleware para CSRF
  app.use(
    csurf({
      cookie: true, // CSRF token será armazenado em cookies
    }),
  );

  // ✅ 4. CORS
  app.enableCors({
    origin: [frontEndUrl, 'http://localhost:4200', 'http://localhost:3535', 'http://gustavodcdamas.com.br', 'https://gustavodcdamas.com.br', 'http://agencia-frontend', 'http://agencia-frontend:4200', 'http://agencia-frontend:3535'], // ✅ Adicionar explicitamente
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-Requested-With',
      'Accept',
      'Origin'
    ],
    exposedHeaders: ['Set-Cookie'], // ✅ Expor cookies
  });

  // ✅ 5. Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "http://localhost:3333", "https:"],
          fontSrc: ["'self'", "fonts.gstatic.com", "fonts.googleapis.com"],
          objectSrc: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(compression());

  // ✅ 6. Inicializar banco
  const databaseInitializer = app.get(DatabaseInitializer);
  await databaseInitializer.initialize();

  // ✅ 7. Swagger
  const configSwagger = new DocumentBuilder()
    .setTitle('API Backend Agência Cuei')
    .setDescription('Documentação da API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, configSwagger);
  SwaggerModule.setup('api/docs', app, document);

  // ✅ 8. Logger e interceptors
  const logger = app.get(LoggerService);
  app.useGlobalInterceptors(new LoggingInterceptor(logger));

  // ✅ 9. Pipes globais
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
    new SanitizePipe({
    // ✅ CAMPOS PERMITIDOS PARA USERS
    id: 'uuid', // ✅ ADICIONADO - permite UUIDs
    email: 'email',
    nome: 'name',
    name: 'name',
    firstName: 'text',
    lastName: 'text',
    username: 'text', // ✅ ADICIONADO
    cpf: 'numeric', // ✅ ADICIONADO
    cep: 'numeric', // ✅ ADICIONADO
    logradouro: 'text',
    bairro: 'text',
    cidade: 'text',
    estado: 'text',
    numero: 'text',
    complemento: 'text',

    telefone: 'numeric', // ← ADICIONAR
    status: 'text',  
    
    // ✅ CAMPOS PARA OUTROS MÓDULOS
    descricao: 'text',
    title: 'text',
    titulo: 'text',

    password: 'skip',          
    confirmPassword: 'skip',    
    newPassword: 'skip',        
    oldPassword: 'skip',        
    currentPassword: 'skip',    
    token: 'skip',  
    
    // ✅ CAMPOS PARA ENDEREÇO NESTED
    'address.cep': 'numeric',
    'address.logradouro': 'text',
    'address.bairro': 'text',
    'address.cidade': 'text',
    'address.estado': 'text',
    'address.numero': 'text',
    'address.complemento': 'text',
    }),
  );

  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
}

bootstrap();