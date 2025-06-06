import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Req, Res, Get, Controller, Catch, ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'
import * as compression from 'compression';
import helmet from 'helmet';
import { DatabaseInitializer } from './config/db/database.initializer';
import * as cookieParser from 'cookie-parser';
import * as csurf from 'csurf';
import { Request, Response } from 'express';
import { SanitizePipe } from './common/sanitize.pipe';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { LoggerService } from './modules/logger/logger.service';
//import * as session from 'express-session';
import * as session from 'express-session';
import * as connectRedis from 'connect-redis';
import Redis from 'ioredis';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //inicializando o configservice
  const configService = app.get(ConfigService);

  //customizando porta de start do nest
  const port = configService.get<number>('NEST_PORT') || 3333;

  app.use(cookieParser());

  //inicializando o banco
  const databaseInitializer = app.get(DatabaseInitializer);
  await databaseInitializer.initialize();

  //inicializando documentacao no swagger
  const configSwagger = new DocumentBuilder()
    .setTitle('API Backend Agência Cuei')
    .setDescription('Documentação da API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, configSwagger);
  SwaggerModule.setup('api/docs', app, document);

  //inicializando logegr service
  const logger = app.get(LoggerService);

  //inicializando interceptador global
  app.useGlobalInterceptors(new LoggingInterceptor(logger));

  //inicializando sanitizador globalmente
  const sanitizeConfig = {
    email: 'email',
    nome: 'name',
    name: 'name',
    descricao: 'text',
    title: 'text',
    lastName: 'text',
    firstName: 'text',
    titulo: 'text',
  };

  const frontEndUrl = configService.get<string>('FRONTEND_URL') || 'http://localhost:4200' ;

  // Cria a store do Redis com express-session
  const RedisStore = connectRedis(session);

  // Cria o cliente ioredis com base nas variáveis de ambiente
  const redisClient = new Redis({
    host: configService.get<string>('REDIS_HOST'),
    port: configService.get<number>('REDIS_PORT'),
    password: configService.get<string>('REDIS_PASSWORD'),
    retryStrategy: (times) => {
      console.log(`Tentativa ${times} de conexão com Redis`);
      return Math.min(times * 50, 2000);
    }
  });

  redisClient.on('connect', () => {
    console.log('✅ Conectado ao Redis com sucesso!');
  });

  redisClient.on('ready', () => {
    console.log('✅ Redis pronto para operar');
  });

  redisClient.on('error', (err) => {
    console.error('❌ Erro na conexão Redis:', err);
  });

  redisClient.on('end', () => {
    console.log('🔌 Conexão com Redis encerrada');
  });

  // Configura express-session com a Redis Store
  app.use(
    session({
      store: new RedisStore({
        client: redisClient,
        prefix: 'sess:',
        ttl: configService.get<number>('REDIS_TTL') || 86400, // segundos
        disableTouch: false
      }),
      secret: configService.get<string>('JWT_SECRET') || 'fallback-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * (configService.get<number>('REDIS_TTL') || 86400), // milissegundos
      },
    })
  );

  // CORS
  app.enableCors({
    origin: frontEndUrl,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-CSRF-TOKEN']
  });

  // Configuração do CSRF
  const csrfProtection = csurf({
    cookie: {
      key: '_csrf',
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600 // 1 hora
    }
  });

  app.use('/api', csrfProtection);

  @Controller()
  class CsrfController {
    @Get('api/csrf-token')
    getCsrfToken(@Req() req: Request) {
      return { csrfToken: req.csrfToken() };
    }
  }
  app.useGlobalFilters(new CsrfExceptionFilter());
  //app.setGlobalPrefix('api');

  app.use(
    helmet.hidePoweredBy(),  // Hides the X-Powered-By header
    helmet.frameguard({ action: 'sameorigin' }),  // Allows framing only from the same origin
    helmet.noSniff(),  // Prevents browsers from following the declared MIME types
  );

  //contra xss
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "trusted-cdn.com"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          //imgSrc: ["'self'", "data:", "cdn.example.com"],
          //connectSrc: ["'self'", "api.example.com"],
          fontSrc: ["'self'", "fonts.gstatic.com", "fonts.googleapis.com"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: true, // Melhora segurança contra ataques Spectre
      crossOriginResourcePolicy: { policy: "same-site" }, // Evita carregamento cruzado não autorizado
      crossOriginOpenerPolicy: { policy: "same-origin" }, // Protege contra vazamentos de dados
      referrerPolicy: { policy: "no-referrer-when-downgrade" }, // Controla vazamento de URLs
      strictTransportSecurity: { maxAge: 63072000, includeSubDomains: true }, // HSTS (HTTPS obrigatório)
      xFrameOptions: { action: "deny" }, // Evita clickjacking
      xXssProtection: false, // Substituído pelo CSP moderno
      xContentTypeOptions: true, // Evita MIME-sniffing
      xPoweredBy: false, // Remove header "X-Powered-By" (reduz info vazada)
    })
  );

  //inicializando protecao ocntra csrf
  app.use(helmet({
    contentSecurityPolicy: true,
    frameguard: {
      action: 'deny'
    },
    referrerPolicy: {
      policy: 'no-referrer',
    },
  }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
    new SanitizePipe(sanitizeConfig),
  );

  app.use(compression());

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

@Catch()
class CsrfExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    if (exception.code === 'EBADCSRFTOKEN') {
      response.status(403).json({
        statusCode: 403,
        message: 'Invalid CSRF token'
      });
      return;
    }
    
    response.status(500).json({
      statusCode: 500,
      message: 'Internal server error'
    });
  }
}

bootstrap();