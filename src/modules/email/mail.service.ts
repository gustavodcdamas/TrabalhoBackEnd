import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { RedisService } from 'src/config/redis/redis.service';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService, private readonly redisService: RedisService,) {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('SMTP_HOST'),
        port: this.configService.get<number>('SMTP_PORT'),
        secure: this.configService.get<boolean>('SMTP_SECURE'),
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
        from: this.configService.get<string>('SMTP_FROM') || '"Agência Cuei" <no-reply@cuei.com.br>'
      });
      this.logger.log('Mail transporter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize mail transporter', error.stack);
      throw new Error('Failed to initialize mail service');
    }
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
      const appUrl = this.configService.get<string>('BASE_URL') || 'http://localhost:3000';
      const verificationUrl = `${appUrl}/api/auth/verify-email?token=${token}`;
      const from = this.configService.get<string>('SMTP_FROM') || '"Agência Cuei" <no-reply@cuei.com.br>';

      try {
          await this.transporter.sendMail({
              from,
              to,
              subject: 'Verifique seu email',
              html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #2563eb;">Bem-vindo ao Nosso App!</h1>
                  <p>Por favor, clique no botão abaixo para verificar seu endereço de email:</p>
                  
                  <a href="${verificationUrl}" 
                  style="display: inline-block; padding: 12px 24px; background-color: #2563eb; 
                          color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
                  Verificar Email
                  </a>
                  
                  <p style="margin-top: 20px;">Se você não criou uma conta, por favor ignore este email.</p>
                  
                  <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">
                  Se o botão não funcionar, copie e cole este link no seu navegador:<br>
                  ${verificationUrl}
                  </p>
              </div>
              `,
              text: `Por favor, verifique seu email acessando este link: ${verificationUrl}`,
          });
          this.logger.log(`Verification email sent to ${to}`);
      } catch (error) {
          this.logger.error(`Failed to send verification email to ${to}`, error.stack);
          throw new Error('Falha ao enviar email de verificação');
      }
  }

  async sendMail(options: { to: string; subject: string; html: string; text?: string }): Promise<void> {
      try {
          await this.transporter.sendMail({
          from: this.configService.get<string>('SMTP_FROM') || '"Agência Cuei" <levetudo464@gmail.com>',
          ...options
          });
      } catch (error) {
          console.error('Erro ao enviar email:', error);
          throw new Error('Falha ao enviar email');
      }
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    // ✅ CORRIGIDO: Usar apenas FRONTEND_URL e rota correta do Angular
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;
    const from = this.configService.get<string>('SMTP_FROM') || '"Agência Cuei" <no-reply@cuei.com.br>';

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: 'Redefinição de Senha',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">Redefinição de Senha</h1>
            <p>Você solicitou a redefinição de senha. Clique no link abaixo para continuar:</p>
            
            <a href="${resetUrl}"
              style="display: inline-block; padding: 12px 24px; background-color: #dc2626; 
                      color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Redefinir Senha
            </a>
            
            <p style="margin-top: 20px;">Este link expirará em 30 minutos.</p>
            
            <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">
              Se você não solicitou isso, por favor ignore este email.<br>
              Se o botão não funcionar, copie e cole este link: ${resetUrl}
            </p>
          </div>
        `,
        text: `Redefina sua senha acessando este link: ${resetUrl}`,
      });
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}`, error.stack);
      throw new Error('Falha ao enviar email de redefinição de senha');
    }
  }

  private async sendWhatsAppMessage(to: string, message: string): Promise<void> {
    try {
      const formattedNumber = to.replace(/\D/g, '');
      
      await axios.post(
        `${this.configService.get('WHATSAPP_API_URL')}/message/text`,
        {
          number: formattedNumber,
          message: message,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.configService.get('WHATSAPP_API_KEY'),
          },
        },
      );
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
    }
  }

  
}
