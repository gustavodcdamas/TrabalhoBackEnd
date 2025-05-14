import { Injectable, Module } from '@nestjs/common';
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

@Injectable()
export class AuthService {
  private transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    }
  });

  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<{ id: string; email: string } | null> {
    const user = await this.userService.findOneByEmail(email);
    if (user && compareSync(pass, user.password)) {
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
  
  // Envie e-mail de verificação
  await this.transporter.sendMail({
    from: 'levetudo464@gmail.com',
    to: updatedUser.email,
    subject: 'Verifique seu e-mail',
    text: `Link: http://seusite.com/auth/verify-email?token=${updatedUser.emailVerificationToken}`,
    html: `<a href="http://seusite.com/auth/verify-email?token=${updatedUser.emailVerificationToken}">Verificar</a>`
  });
  
  const { password, emailVerificationToken, ...result } = updatedUser;
  return result;
  }

  async verifyEmail(token: string): Promise<boolean> {
    return this.userService.verifyEmail(token);
  }
}
