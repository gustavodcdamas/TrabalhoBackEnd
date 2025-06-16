import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SentMessageInfo } from 'nodemailer';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { Retry } from '../../common/decorators/retry.decorator';
import { RedisService } from 'src/config/redis/redis.service';

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
  }>;
}

class EmailOptionsDto {
  to: string | string[] | undefined;
  subject: string | undefined;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
  }>;
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | undefined;
  private readonly smtpTimeout = 10000;

  constructor(private configService: ConfigService, private readonly redisService: RedisService,) {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.getConfigValue('SMTP_HOST'),
        port: this.getConfigValue('SMTP_PORT', 587),
        secure: this.getConfigValue('SMTP_SECURE', false),
        auth: {
          user: this.getConfigValue('SMTP_USER'),
          pass: this.getConfigValue('SMTP_PASS'),
        },
        connectionTimeout: this.smtpTimeout,
        greetingTimeout: this.smtpTimeout,
        socketTimeout: this.smtpTimeout,
      });
    } catch (error) {
      this.logger.error('Failed to initialize transporter', error instanceof Error ? error.stack : String(error));
      throw new Error('Failed to initialize email transporter');
    }
  }

  private getConfigValue<T>(key: string, defaultValue?: T): T {
    const value = this.configService.get<T>(key);
    if (value === undefined && defaultValue === undefined) {
      throw new Error(`Configuration ${key} not found`);
    }
    return value ?? defaultValue!;
  }

  @Retry(3, 5000)
  public async sendMail(options: EmailOptions): Promise<EmailResponse> {
    try {
      await this.validateEmailOptions(options);
      
      const from = this.getConfigValue<string>('SMTP_FROM_EMAIL');
      const mailOptions: nodemailer.SendMailOptions = {
        from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      };

      const info = await this.transporter?.sendMail(mailOptions);
      
      this.logger.log(`Email sent successfully: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      const errorMessage = this.sanitizeError(error);
      this.logger.error(`Failed to send email: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private async validateEmailOptions(options: EmailOptions): Promise<void> {
    const optionsDto = plainToClass(EmailOptionsDto, options);
    const errors = await validate(optionsDto);

    if (errors.length > 0) {
      const errorMessages = errors
        .flatMap(error => Object.values(error.constraints ?? {}))
        .join(', ');
      throw new Error(`Invalid email options: ${errorMessages}`);
    }
  }

  private sanitizeError(error: unknown): string {
    if (error instanceof Error) {
      return this.sanitizeErrorMessage(error);
    }
    return 'Unknown error occurred';
  }

  private sanitizeErrorMessage(error: Error): string {
    let message = error.message;
    const sensitiveKeys = ['user', 'pass', 'auth', 'credentials'];

    for (const key of sensitiveKeys) {
      const value = this.configService.get<string>(`SMTP_${key.toUpperCase()}`);
      if (value) {
        message = message.replace(new RegExp(value, 'g'), '[REDACTED]');
      }
    }

    return message;
  }

  public async testConnection(): Promise<boolean> {
    try {
      const isVerified = await this.transporter?.verify();
      this.logger.log('SMTP connection verified successfully');
      return! isVerified;
    } catch (error) {
      this.logger.error('Failed to verify SMTP connection', error instanceof Error ? error.stack : String(error));
      return false;
    }
  }
}