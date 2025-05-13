import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'seu_usuario',
  password: 'sua_senha',
  database: 'nome_do_banco',
  entities: [__dirname + '/../**/*.entity.{js,ts}'],
  synchronize: false,
};
