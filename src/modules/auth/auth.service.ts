import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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
import { UserRole } from '../../enums/user-role.enum';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { CreateAdminDto } from '../users/dto/create-admin.dto';
import { BehaviorSubject, Observable } from 'rxjs';
import { RedisService } from 'src/config/redis/redis.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from '@nestjs/cache-manager';

// ✅ INTERFACE PARA O USUÁRIO ATUAL
interface CurrentUser {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  isSuperAdmin?: boolean;
  isAdmin?: boolean;
  isClient?: boolean;
}

@Injectable()
export class AuthService {
  private deletionTokens = new Map<string, { email: string; expires: number }>();
  
  // ✅ ADICIONANDO SUPORTE AO getCurrentUser()
  private currentUserSubject = new BehaviorSubject<CurrentUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly redisService: RedisService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}

  // ✅ PROPRIEDADE PARA COMPATIBILIDADE
  get currentUser(): CurrentUser | null {
    return this.currentUserSubject.value;
  }

  // ✅ MÉTODO PARA OBTER USUÁRIO ATUAL
  getCurrentUser(): Observable<CurrentUser | null> {
    return this.currentUser$;
  }

  // ✅ MÉTODO PARA DEFINIR USUÁRIO ATUAL
  setCurrentUser(user: CurrentUser | null): void {
    this.currentUserSubject.next(user);
  }

  async requestAccountDeletion(email: string) {
    const user = await this.userService.findOneByEmail(email);
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 1000 * 60 * 30; // 30 minutos
    this.deletionTokens.set(token, { email, expires });

    const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
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
    console.log(`Validando usuário: ${email}`);
    const user = await this.userService.findOneByEmail(email, true);

      const passTrimmed = pass.trim();
      const isMatch = await bcrypt.compare(passTrimmed, user?.password);
    
    if (!user) {
      console.log('Usuário não encontrado');
      return null;
    }

    console.log('Comparando senhas...');
    console.log('Senha fornecida:', pass);
    console.log('Senha armazenada (hash):', user.password);
    
    const isPasswordValid = await bcrypt.compare(pass, user.password);
    console.log('Resultado da comparação:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('Senha inválida - Comparação falhou');
      return null;
    }

    console.log('Credenciais válidas');
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

      // ✅ DEFINIR USUÁRIO ATUAL APÓS LOGIN
      const currentUser: CurrentUser = {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        isSuperAdmin: user.isSuperAdmin,
        isAdmin: user.isAdmin,
        isClient: user.isClient
      };
      this.setCurrentUser(currentUser);

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

  // ✅ MÉTODO PARA LOGOUT
  logout(): void {
    this.setCurrentUser(null);
  }

  // ✅ MÉTODO PARA VERIFICAR SE ESTÁ LOGADO
  isLoggedIn(): boolean {
    return this.currentUser !== null;
  }

  // ✅ MÉTODO PARA VERIFICAR ROLE
  hasRole(role: string): boolean {
    return this.currentUser?.role === role;
  }

  async validateToken(token: string): Promise<UserEntity | null> {
    try {
      const payload = this.jwtService.verify(token);
      console.log('[AuthService] Token JWT válido:', payload);

      const user = await this.userService.findOneByEmail(payload.email);
      if (!user) {
        console.error('[AuthService] Usuário não encontrado para o token:', payload.email);
        return null;
      }

      // ✅ ATUALIZAR USUÁRIO ATUAL AO VALIDAR TOKEN
      const currentUser: CurrentUser = {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        isSuperAdmin: user.isSuperAdmin,
        isAdmin: user.isAdmin,
        isClient: user.isClient
      };
      this.setCurrentUser(currentUser);

      return user;
    } catch (error) {
      console.error('[AuthService] Erro ao validar token:', error.message);
      return null;
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
      resetPasswordTokenHash: await bcrypt.hash(plainToken, 15),
      resetPasswordExpires: expires,
      emailVerified: user.emailVerified
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

    console.log('Senha recebida no reset:', newPassword);

    // Envia a senha em plain-text para ser hasheada pelo hook da entidade
    await this.userService.update(user.id, {
      password: newPassword, // ← Removido o hash aqui
      resetPasswordTokenHash: null,
      resetPasswordExpires: null,
      emailVerified: user.emailVerified
    });

    return { message: 'Senha redefinida com sucesso' };
  }

  async register(registerDto: RegisterDto) {
    // Criando CreateUserDto completo
    const createUserDto: CreateUserDto = {
      ...registerDto,
      resetPasswordTokenHash: null,
      resetPasswordExpires: null,
      emailVerified: false
    };

    const user = await this.userService.create(createUserDto);

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

  // ✅ MÉTODO CORRIGIDO PARA REGISTRAR ADMINISTRADORES
  async registerAdmin(createAdminDto: CreateAdminDto) {
    try {
      // Usar o método específico para criar administradores
      const admin = await this.userService.createAdmin(createAdminDto);
      
      // Administradores são criados já verificados, não precisam de email de verificação
      const { password, ...result } = admin;
      return result;
    } catch (error) {
      console.error('[AuthService] Erro ao registrar administrador:', error);
      throw new BadRequestException('Falha ao criar administrador: ' + error.message);
    }
  }

  async verifyEmail(token: string): Promise<boolean> {
    return this.userService.verifyEmail(token);
  }
}