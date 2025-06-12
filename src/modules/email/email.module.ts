import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Module({
  imports: [ConfigModule ],

  controllers: [EmailController],
  providers: [
    {
      provide: 'SMTP_TRANSPORTER',
      useFactory: async (configService: ConfigService) => {
        return nodemailer.createTransport({
          host: configService.get<string>('MAILCOW_SMTP_HOST'),
          port: configService.get<number>('MAILCOW_SMTP_PORT'),
          secure: configService.get<boolean>('MAILCOW_SMTP_SECURE', false),
          auth: {
            user: configService.get<string>('MAILCOW_SMTP_USER'),
            pass: configService.get<string>('MAILCOW_SMTP_PASS'),
          },
        });
      },
      inject: [ConfigService],
    },
    EmailService,
  ],
  exports: [EmailService],
})

export class EmailModule {
  constructor() {
    console.log('📦 Email Module inicializado');
  }
}
