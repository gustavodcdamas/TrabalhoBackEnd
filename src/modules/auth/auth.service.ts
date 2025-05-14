import { Injectable, Module, NotFoundException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserEntity } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module'
import { UsersService } from '../users/users.service';
import { compareSync } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import * as nodemailer from 'nodemailer';
import * as crypto from "crypto";
import * as dotenv from 'dotenv';
//import { MailService } from 'src/common/mail/mail.module';
import { compare } from 'bcrypt';
import { MailerService } from '@nestjs-modules/mailer';

dotenv.config();

@Injectable()
export class AuthService {
  private transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    }
  });

  private deletionTokens = new Map<string, { email: string; expires: number }>();

  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
    private mailerService: MailerService,
  ) {}

  async requestAccountDeletion(email: string) {
    const user = await this.userService.findOneByEmail(email);
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 1000 * 60 * 30; // 30 minutos
    this.deletionTokens.set(token, { email, expires });

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const confirmationUrl = `${baseUrl}/api/auth/confirm-account-deletion?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Confirmação de exclusão de conta',
      text: `Clique no link para confirmar a exclusão da sua conta: ${confirmationUrl}`,
    });

    return { message: 'E-mail de confirmação enviado' };
  }

  async confirmAccountDeletion(token: string): Promise<boolean> {
    const data = this.deletionTokens.get(token);
    if (!data || Date.now() > data.expires) return false;

    const user = await this.userService.findOneByEmail(data.email);
    if (!user) return false;

    await this.userService.removeByEmail(data.email);
    this.deletionTokens.delete(token);
    return true;
  }

  async validateUser(email: string, pass: string): Promise<{ id: string; email: string } | null> {
    const user = await this.userService.findOneByEmail(email);
    if (user && await compare(pass, user.password)) {
      return {
        id: user.id,
        email: user.email,
      };
    }
    return null;
  }

  async login(user: { email: string; id: string }) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(registerDto: RegisterDto) {
  const user = await this.userService.create(registerDto);
  
  const updatedUser = await this.userService.updateVerification(user.id, {
    emailVerificationToken: crypto.randomBytes(32).toString('hex'),
    isEmailVerified: false
  });

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${updatedUser.emailVerificationToken}`;

  // Envie e-mail de verificação
  await this.transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: updatedUser.email,
    subject: 'Verifique seu e-mail',
    text: `Link: ${verifyUrl}`,
    html: `<a href="${verifyUrl}">Verificar</a>`
  });
  
  const { password, emailVerificationToken, ...result } = updatedUser;
  return result;
  }

  async verifyEmail(token: string): Promise<boolean> {
    return this.userService.verifyEmail(token);
  }
}
