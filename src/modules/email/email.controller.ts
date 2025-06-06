import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EmailService } from './email.service';
import { CreateEmailDto } from './dto/create-email.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send-email')
  async sendEmail() {
    await this.emailService.sendMail({
      to: 'destinatario@example.com',
      subject: 'Assunto do E-mail',
      html: '<h1>Olá!</h1><p>Este é um e-mail de teste.</p>',
    });
    return { message: 'E-mail enviado com sucesso' };
  }
}
