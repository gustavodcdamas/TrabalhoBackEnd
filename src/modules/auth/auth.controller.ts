import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Req, 
  Query, 
  HttpException, 
  HttpStatus, 
  UseInterceptors, 
  ConflictException, 
  BadRequestException, 
  UnauthorizedException, 
  InternalServerErrorException, 
  Put 
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateAdminDto, RegisterDto } from './dto/register.dto';
import { UserEntity } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthGuard } from '@nestjs/passport';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { RequestResetPasswordDto, ResetPasswordDto } from './dto/request-reset-password.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { LoginResponseInterceptor } from 'src/common/interceptors/login.interceptor';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '../../enums/user-role.enum';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import * as bcrypt from 'bcrypt';

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
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.authService.login(user);
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

  @Post('validate-reset-token')
  async validateResetToken(@Body() body: { token: string }) {
    console.log('🔍 Validando token de reset:', body.token);
    
    const users = await this.userService.findByResetPasswordExpiresGreaterThan(new Date());
    console.log('👥 Usuários com token válido encontrados:', users.length);
    
    for (const user of users) {
      console.log('🔐 Verificando usuário:', {
        email: user.email,
        hasTokenHash: !!user.resetPasswordTokenHash,
        expires: user.resetPasswordExpires
      });
      
      if (user.resetPasswordTokenHash) {
        const isValid = await bcrypt.compare(body.token, user.resetPasswordTokenHash);
        console.log('✅ Token válido para', user.email, ':', isValid);
        
        if (isValid) {
          console.log('🎉 Token validado com sucesso!');
          return true;
        }
      }
    }
    
    console.log('❌ Token não encontrado ou inválido');
    return false;
  }

  @Get('check-email')
  async checkEmail(@Query('email') email: string) {
    try {
      const user = await this.userService.findOneByEmail(email);
      return { exists: !!user };
    } catch (error) {
      throw new InternalServerErrorException('Erro ao verificar e-mail');
    }
  }

  @Post('is-reset-token-used')
  async isResetTokenUsed(@Body() body: { token: string }): Promise<boolean> {
    const user = await this.userService.findOneByResetToken(body.token);
    return !user || user.resetPasswordTokenHash === null;
  }

  @Patch('update/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto, 
    @Req() req
  ) {
    // Verificar se o usuário está tentando atualizar seus próprios dados
    if (id !== req.user.id) {
      throw new BadRequestException('Você só pode atualizar seus próprios dados');
    }

    // Validar CEP se endereço foi fornecido
    if (updateUserDto.address && updateUserDto.address.cep) {
      const cepValido = await this.userService.validarCepComApiCorreios(
        updateUserDto.address.cep,
        updateUserDto.address
      );

      if (!cepValido) {
        throw new BadRequestException('Os dados do endereço não correspondem ao CEP informado');
      }
    }

    // Preparar dados para atualização - corrigindo os tipos
    const userUpdateData: UpdateUserDto = {
      id: id,
      firstName: updateUserDto.firstName,
      lastName: updateUserDto.lastName,
      username: updateUserDto.username,
      emailVerified: req.user.emailVerified,
      cpf: updateUserDto.cpf ? updateUserDto.cpf.toString().replace(/\D/g, '') : undefined,
    };

    // Tratar address separadamente para garantir tipos corretos
    if (updateUserDto.address) {
      userUpdateData.address = {
        cep: updateUserDto.address.cep ? updateUserDto.address.cep.replace(/\D/g, '') : undefined,
        logradouro: updateUserDto.address.logradouro,
        bairro: updateUserDto.address.bairro,
        cidade: updateUserDto.address.cidade,
        estado: updateUserDto.address.estado,
        numero: updateUserDto.address.numero,
        complemento: updateUserDto.address.complemento
      };
    }

    try {
      const updatedUser = await this.userService.updateUser(userUpdateData);
      return {
        message: 'Usuário atualizado com sucesso',
        user: updatedUser
      };
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      throw new InternalServerErrorException('Erro interno do servidor ao atualizar usuário');
    }
  }

  // Endpoint específico para o frontend Angular
  @Put('update')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async update(@Body() updateUserDto: any, @Req() req) {
    if (updateUserDto.id !== req.user.id) {
      throw new BadRequestException('Você só pode atualizar seus próprios dados');
    }

    // Validar CEP se endereço foi fornecido
    if (updateUserDto.address && updateUserDto.address.cep) {
      const cepValido = await this.userService.validarCepComApiCorreios(
        updateUserDto.address.cep,
        updateUserDto.address
      );

      if (!cepValido) {
        throw new BadRequestException('Os dados do endereço não correspondem ao CEP informado');
      }
    }

    // Preparar dados com tipos corretos
    const userUpdateData: UpdateUserDto = {
      id: updateUserDto.id,
      firstName: updateUserDto.firstName,
      lastName: updateUserDto.lastName,
      username: updateUserDto.username,
      emailVerified: req.user.emailVerified,
      cpf: updateUserDto.cpf ? updateUserDto.cpf.toString().replace(/\D/g, '') : undefined,
    };

    // Tratar address separadamente para garantir tipos corretos
    if (updateUserDto.address) {
      userUpdateData.address = {
        cep: updateUserDto.address.cep ? updateUserDto.address.cep.replace(/\D/g, '') : undefined,
        logradouro: updateUserDto.address.logradouro,
        bairro: updateUserDto.address.bairro,
        cidade: updateUserDto.address.cidade,
        estado: updateUserDto.address.estado,
        numero: updateUserDto.address.numero,
        complemento: updateUserDto.address.complemento
      };
    }

    return this.userService.updateUser(userUpdateData);
  }
}