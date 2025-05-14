import { MailerModule, MailerService } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { AuthController } from 'src/modules/auth/auth.controller';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';

@Module({
    imports: [
        ConfigModule,
        MailerService,
        MailerModule.forRoot({
                transport: {
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS,
                    },
                },
                defaults: {
                    from: '"Seu App" <user>',
                },
                template: {
                    dir: path.join(__dirname, 'templates'),
                    options: {
                        strict: true,
                    },
                },
            
        }),
    ],
    controllers: [AuthController],
    providers: [
        MailerModule,
        MailerService,
    ],
    exports: [MailService],
})

export class MailService {}