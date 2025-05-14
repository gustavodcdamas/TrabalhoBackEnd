import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserEntity } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UsersService
  ) {}
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
  const user = await this.authService.validateUser(loginDto.email, loginDto.password);
  if (!user) {
    return { message: 'Credenciais inválidas' };
  }
  
  // Verifique se o e-mail está verificado
  const fullUser = await this.userService.findOneByEmail(user.email);
  if (!fullUser?.isEmailVerified) {
    return { message: 'E-mail não verificado' };
  }
  
  return this.authService.login(user);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    const success = await this.authService.verifyEmail(token);
    return { success, message: success ? 'E-mail verificado com sucesso' : 'Token inválido' };
  }
}
