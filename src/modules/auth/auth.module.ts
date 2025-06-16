import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { UserEntity } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { UsersModule } from '../users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import * as nodemailer from 'nodemailer';
import { MailService } from '../email/mail.service';
import { HttpModule } from '@nestjs/axios';
import { RedisService } from 'src/config/redis/redis.service';
import { RedisModule } from 'src/config/redis/redis.module';

require('dotenv').config();

const jwtSecret = process.env.JWT_SECRET;

@Module({
  imports: [
    ConfigModule.forRoot(),
    HttpModule,
    RedisModule,
    forwardRef(() => UsersModule),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' }, // Tempo mais razoável
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UsersService, LocalStrategy, JwtStrategy, MailService, RedisService ],
  exports: [AuthService],
})
export class AuthModule {
  constructor() {
    console.log('📦 Auth Module inicializado');
  }
}
