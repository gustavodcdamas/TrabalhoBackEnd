import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query, HttpException, HttpStatus, UseInterceptors, ConflictException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateAdminDto, RegisterDto } from './dto/register.dto';
import { UserEntity } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthGuard } from '@nestjs/passport';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { RequestResetPasswordDto, ResetPasswordDto } from './dto/request-reset-password.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { LoginResponseInterceptor } from 'src/common/interceptors/login.interceptor';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@Controller('api/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UsersService
  ) {}
  
  @Post('login')
  @UseInterceptors(LoginResponseInterceptor)
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new HttpException('Credenciais inválidas', HttpStatus.UNAUTHORIZED);
    }

    // Obter o usuário COMPLETO do banco de dados
    const fullUser = await this.userService.findOneByEmail(user.email);
    if (!fullUser?.isEmailVerified) {
      throw new HttpException('E-mail não verificado', HttpStatus.FORBIDDEN);
    }

    // Passar o usuário completo para o authService.login
    return this.authService.login(fullUser);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    try {
      const user = await this.authService.register(registerDto);
      return {
        message: 'Registro realizado com sucesso! Verifique seu e-mail.',
        userId: user.id
      };
    } catch (error) {
      if (error.message.includes('já está cadastrado')) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post('register-admin')
  async registerAdmin(@Body() createAdminDto: CreateAdminDto) {
    const admin = await this.authService.registerAdmin(createAdminDto);
    return {
      message: 'Administrador cadastrado com sucesso',
      userId: admin.id
    };
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    const success = await this.authService.verifyEmail(token);
    return { success, message: success ? 'E-mail verificado com sucesso' : 'Token inválido ou expirado' };
  }

  @Post('request-account-deletion')
    async requestAccountDeletion(@Body() body: DeleteAccountDto) {
    return this.authService.requestAccountDeletion(body.email);
  }

  @Get('confirm-account-deletion')
    async confirmAccountDeletion(@Query('token') token: string) {
    const success = await this.authService.confirmAccountDeletion(token);
    return {
      success,
      message: success ? 'Conta deletada com sucesso.' : 'Token inválido ou expirado.',
    };
  }

  async getFullUser(email: string) {
    return this.userService.findOneByEmail(email);
  }

  @Post('request-reset-password')
  async requestReset(@Body() dto: RequestResetPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

}
