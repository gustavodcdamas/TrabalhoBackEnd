import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'
import * as compression from 'compression';
import helmet from 'helmet';
import { DatabaseInitializer } from './config/db/database.initializer';
import * as csurf from 'csurf';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const port = configService.get<number>('NEST_PORT') || 3333;

  const databaseInitializer = app.get(DatabaseInitializer);
  await databaseInitializer.initialize();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  //app.use(compression());
  //app.use(helmet());
  //app.use(csurf());
  
  // CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  
  //app.setGlobalPrefix('api');

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
