import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  NotFoundException,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindOptionsWhere, Like } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SearchUserDto } from './dto/search-user.dto';
import { Request } from 'express';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';

@Controller('api/users')
@ApiTags('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ✅ FUNÇÃO AUXILIAR PARA VALIDAR UUID
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  // ✅ FUNÇÃO AUXILIAR PARA LIMPAR UUID (remover caracteres inválidos)
  private cleanUUID(uuid: string): string {
    // Manter apenas caracteres válidos de UUID
    return uuid.replace(/[^0-9a-f-]/gi, '');
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  async getProfile(@Req() req: RequestWithUser) {
    return this.usersService.findOneOrFail({ id: req.user.id });
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  async create(@Body() createUserDto: CreateUserDto) {
    await this.usersService.create(createUserDto);
    return { message: 'User created successfully' };
  }

  @Get('hello')
  getHello(): string {
    return 'Hello Users!';
  }

  @UseGuards(JwtAuthGuard)
  @Get('search')
  @ApiBearerAuth()
  async search(@Query() query: SearchUserDto) {
    const where: FindOptionsWhere<UserEntity> = {};

    if (query.firstName) {
      where.firstName = Like(`%${query.firstName}%`);
    }

    if (query.email) {
      where.email = Like(`%${query.email}%`);
    }

    try {
      const users = await this.usersService.findByCriteria(where);
      if (!users?.length) {
        throw new NotFoundException('No users found matching the criteria');
      }
      return users;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Search failed');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth()
  async findAll() {
    return this.usersService.findAll();
  }

  // ✅ ROTA COMPLETAMENTE REESCRITA - IGNORAR ID DA URL
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiBearerAuth()
  async findOne(
    @Param('id') id: string,
    @Req() req: RequestWithUser
  ) {
    console.log('🔍 [UsersController] Requisição recebida:', {
      urlId: id,
      tokenUserId: req.user.id,
      userEmail: req.user.email
    });

    // ✅ ESTRATÉGIA SIMPLES: SEMPRE USAR O ID DO TOKEN
    try {
      const actualUserId = req.user.id;
      console.log('🔑 [UsersController] Usando ID do token JWT:', actualUserId);

      // Verificar se o ID do token é um UUID válido
      if (!this.isValidUUID(actualUserId)) {
        console.log('❌ [UsersController] ID do token inválido:', actualUserId);
        throw new BadRequestException('Token de autenticação inválido');
      }

      // Buscar usuário pelo ID do token
      const user = await this.usersService.getUserById(actualUserId);
      console.log('✅ [UsersController] Usuário encontrado pelo token');
      return user;

    } catch (error) {
      console.error('❌ [UsersController] Erro ao buscar pelo token ID:', error.message);
      
      // ✅ FALLBACK: Buscar por email
      try {
        console.log('🔄 [UsersController] Fallback: buscando por email...');
        const userByEmail = await this.usersService.findOneByEmail(req.user.email);
        
        if (userByEmail) {
          console.log('✅ [UsersController] Usuário encontrado por email');
          return userByEmail;
        }
      } catch (emailError) {
        console.error('❌ [UsersController] Fallback por email falhou:', emailError.message);
      }

      throw new NotFoundException('Usuário não encontrado');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('email/:email')
  @ApiBearerAuth()
  async findByEmail(@Param('email') email: string) {
    return this.usersService.findOneOrFail({ email });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiBearerAuth()
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto, // ✅ Voltar ao DTO tipado
    @Req() req: RequestWithUser
  ) {
    console.log('🔄 [UsersController] Iniciando atualização:', {
      urlId: id,
      tokenUserId: req.user.id,
      dtoRecebido: updateUserDto
    });

    try {
      // ✅ SEMPRE usar o ID do token para segurança
      const actualUserId = req.user.id;
      
      if (!this.isValidUUID(actualUserId)) {
        throw new BadRequestException('Token de autenticação inválido');
      }

      // ✅ FORÇAR O ID CORRETO NO DTO (GARANTIR QUE SANITIZADOR NÃO REMOVEU)
      updateUserDto.id = actualUserId;
      
      console.log('🔑 [UsersController] DTO após forçar ID:', {
        id: updateUserDto.id,
        hasId: !!updateUserDto.id,
        camposRecebidos: Object.keys(updateUserDto).filter(key => updateUserDto[key] !== undefined)
      });

      // Verificar se o usuário existe
      const targetUser = await this.usersService.getUserById(actualUserId);
      console.log('✅ [UsersController] Usuário encontrado para atualização');

      // ✅ VALIDAÇÕES OPCIONAIS
      
      // CPF já foi transformado pelo DTO (@Transform)
      if (updateUserDto.cpf && updateUserDto.cpf.length !== 11) {
        throw new BadRequestException('CPF deve ter 11 dígitos');
      }

      // ✅ VALIDAÇÃO DE CEP
      if (updateUserDto.address?.cep) {
        console.log('🔍 [UsersController] Validando endereço...');
        
        const cep = updateUserDto.address.cep.replace(/\D/g, '');
        if (cep.length !== 8) {
          throw new BadRequestException('CEP deve ter 8 dígitos');
        }
        
        // Validar com API dos Correios se dados completos
        if (updateUserDto.address.logradouro && 
            updateUserDto.address.bairro && 
            updateUserDto.address.cidade && 
            updateUserDto.address.estado) {
          
          try {
            const cepValido = await this.usersService.validarCepComApiCorreios(
              cep,
              updateUserDto.address
            );

            if (!cepValido) {
              console.log('⚠️ [UsersController] CEP não confere com dados informados');
            } else {
              console.log('✅ [UsersController] CEP validado com sucesso');
            }
          } catch (cepError) {
            console.log('⚠️ [UsersController] Erro na validação de CEP, continuando...');
          }
        }
      }

      // ✅ LOG DOS DADOS FINAIS
      console.log('📝 [UsersController] Dados finais para atualização:', {
        id: updateUserDto.id,
        hasFirstName: !!updateUserDto.firstName,
        hasLastName: !!updateUserDto.lastName,
        hasUsername: !!updateUserDto.username,
        hasCpf: !!updateUserDto.cpf,
        hasAddress: !!updateUserDto.address
      });

      // ✅ EXECUTAR ATUALIZAÇÃO
      const updatedUser = await this.usersService.updateUser(updateUserDto);
      console.log('✅ [UsersController] Atualização concluída com sucesso');
      
      return {
        message: 'Usuário atualizado com sucesso',
        user: updatedUser
      };

    } catch (error) {
      console.error('❌ [UsersController] Erro na atualização:', error.message);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(`Erro ao atualizar usuário: ${error.message}`);
    }
  }
  @UseGuards(JwtAuthGuard)
  @Delete(':email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  async remove(@Param('email') email: string) {
    await this.usersService.destroy(email);
  }
  
}