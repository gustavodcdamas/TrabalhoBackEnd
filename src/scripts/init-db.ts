// src/scripts/init-db.ts
import { NestFactory } from '@nestjs/core';
import { getConnection } from 'typeorm';
import { AppModule } from '../app.module';
import * as dotenv from 'dotenv';

async function bootstrap() {
  dotenv.config();

  // Inicializa a aplicação para carregar as entidades
  const app = await NestFactory.create(AppModule);

  try {
    // Obter conexão TypeORM
    const connection = getConnection();

    // Executar migrações pendentes
    await connection.runMigrations();

    console.log('Banco de dados inicializado com sucesso!');
  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error);
  } finally {
    await app.close();
  }
}

void bootstrap();
