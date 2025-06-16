import { config } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as path from 'path';

config();

const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [path.join(__dirname, './migrations/*.{js, ts}')],
  synchronize: false,
  migrationsRun: true,
  logging: true,
};

export default new DataSource(dataSourceOptions);
