import { BadRequestException, Get, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserEntity } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { MailService } from '../email/mail.service';
import { ConfigService } from '@nestjs/config';
import { LoginResponseDto } from './dto/login-response.dto';
import { UserRole } from '../users/enums/user-role.enum';

@Injectable()
export class AuthService {
  private deletionTokens = new Map<string, { email: string; expires: number }>();

  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async requestAccountDeletion(email: string) {
    const user = await this.userService.findOneByEmail(email);
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 1000 * 60 * 30; // 30 minutos
    this.deletionTokens.set(token, { email, expires });

    const baseUrl = this.configService.get<string>('BASE_URL') || 'http://localhost:3000';
    const confirmationUrl = `${baseUrl}/api/auth/confirm-account-deletion?token=${token}`;

    await this.mailService.sendMail({
      to: email,
      subject: 'Confirmação de exclusão de conta',
      html: `
        <h1>Confirmação de Exclusão de Conta</h1>
        <p>Clique no link abaixo para confirmar a exclusão da sua conta:</p>
        <a href="${confirmationUrl}">Confirmar exclusão</a>
        <p>Se você não solicitou isso, por favor ignore este email.</p>
      `,
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

  async validateUser(email: string, pass: string): Promise<UserEntity | null> {
    console.log(`[AuthService] Validando usuário: ${email}`);
    const user = await this.userService.findOneByEmail(email, true);
    
    if (!user) {
      console.log('[AuthService] Usuário não encontrado');
      await this.simulateDelay();
      return null;
    }

    console.log('[AuthService] Comparando senhas...');
    console.log(`[AuthService] Senha fornecida: ${pass}`);
    console.log(`[AuthService] Hash armazenado: ${user.password}`);

    const isPasswordValid = await bcrypt.compare(pass, user.password);
    
    if (!isPasswordValid) {
      console.log('[AuthService] Senha inválida - Comparação falhou');
      await this.simulateDelay();
      return null;
    }

    console.log('[AuthService] Credenciais válidas');
    return user;
  }

  private async simulateDelay(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async login(user: UserEntity): Promise<LoginResponseDto> {
    console.log(`[AuthService] Login para usuário: ${user.email}`);
    
    if (!user.isEmailVerified) {
      console.log('[AuthService] E-mail não verificado');
      throw new BadRequestException('E-mail não verificado');
    }

    try {
      const payload = {
        email: user.email,
        sub: user.id,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin,
        isAdmin: user.isAdmin,
        isClient: user.isClient
      };

      console.log('[AuthService] Criando JWT...');
      const token = this.jwtService.sign(payload);
      console.log('[AuthService] JWT criado com sucesso');

      return {
        access_token: token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isSuperAdmin: user.isSuperAdmin,
          isAdmin: user.isAdmin,
          isClient: user.isClient
        }
      };
    } catch (error) {
      console.error('[AuthService] Erro ao gerar JWT:', error);
      throw new InternalServerErrorException('Erro durante o login');
    }
  }

  async requestPasswordReset(email: string) {
    const user = await this.userService.findOneByEmail(email);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const plainToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

    await this.userService.update(user.id, {
      resetPasswordTokenHash: await bcrypt.hash(plainToken, 10),
      resetPasswordExpires: expires,
    });

    await this.mailService.sendPasswordResetEmail(user.email, plainToken);

    return { message: 'E-mail de redefinição enviado' };
  }

  async resetPassword(token: string, newPassword: string) {
    const users = await this.userService.findByResetPasswordExpiresGreaterThan(new Date());
    
    let user: UserEntity | null = null;
    
    for (const u of users) {
      if (u.resetPasswordTokenHash && 
          await bcrypt.compare(token, u.resetPasswordTokenHash)) {
        user = u;
        break;
      }
    }

    if (!user) {
      throw new BadRequestException('Token inválido ou expirado');
    }

    await this.userService.update(user.id, {
      password: await bcrypt.hash(newPassword, 10),
      resetPasswordTokenHash: null,
      resetPasswordExpires: null,
    });

    return { message: 'Senha redefinida com sucesso' };
  }

  async register(registerDto: RegisterDto) {
    const user = await this.userService.create(registerDto);
    user.email = registerDto.email;
    user.firstName = registerDto.firstName;
    user.lastName = registerDto.lastName;
    user.password = registerDto.password;
    user.role = UserRole.CLIENT;

    if (!user.emailVerificationToken) {
      throw new InternalServerErrorException('Erro ao gerar token de verificação');
    }

    try {
      await this.mailService.sendVerificationEmail(
        user.email, 
        user.emailVerificationToken
      );
      
      const { password, emailVerificationToken, ...result } = user;
      return result;
    } catch (error) {
      await this.userService.removeByEmail(user.email);
      throw new BadRequestException('Falha ao enviar email de verificação');
    }
  }

  async registerAdmin(registerDto: RegisterDto) {
    const user = await this.userService.create(registerDto);
    user.email = registerDto.email;
    user.firstName = registerDto.firstName;
    user.lastName = registerDto.lastName;
    user.password = registerDto.password;
    user.role = UserRole.ADMIN;

    if (!user.emailVerificationToken) {
      throw new InternalServerErrorException('Erro ao gerar token de verificação');
    }

    try {
      await this.mailService.sendVerificationEmail(
        user.email, 
        user.emailVerificationToken
      );
      
      const { password, emailVerificationToken, ...result } = user;
      return result;
    } catch (error) {
      await this.userService.removeByEmail(user.email);
      throw new BadRequestException('Falha ao enviar email de verificação');
    }
  }

  async verifyEmail(token: string): Promise<boolean> {
    return this.userService.verifyEmail(token);
  }
}
