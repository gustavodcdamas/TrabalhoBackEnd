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
  ForbiddenException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindOptionsWhere, Like } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SearchUserDto } from './dto/search-user.dto';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UserRole } from '../../enums/user-role.enum';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Controller('api/users')
@ApiTags('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private isValidUUID(uuid: string): boolean {
    // ✅ CORRIGIDO: Aceitar UUID com ou sem hífens
    const uuidRegex = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[1-5][0-9a-f]{3}-?[89ab][0-9a-f]{3}-?[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  // ✅ MÉTODO ADICIONAL: Normalizar UUID
  private normalizeUUID(uuid: string): string {
    // Remove hífens e reinsere no formato correto
    const cleanUuid = uuid.replace(/-/g, '');
    
    if (cleanUuid.length !== 32) {
      throw new BadRequestException('UUID deve ter 32 caracteres');
    }
    
    return [
      cleanUuid.slice(0, 8),
      cleanUuid.slice(8, 12),
      cleanUuid.slice(12, 16),
      cleanUuid.slice(16, 20),
      cleanUuid.slice(20, 32)
    ].join('-');
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  async getProfile(@Req() req: RequestWithUser) {
    return this.usersService.findOneOrFail({ id: req.user.id });
  }

  // ✅ CORRIGIDO: Removida duplicação e importação correta
  @Get('administrators')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all administrators (Super Admin only)' })
  @ApiBearerAuth()
  async getAdministrators(@Req() req: RequestWithUser) {
    // Verificar se o usuário tem permissão (super_admin)
    if (req.user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Administrators can view administrators list');
    }
    
    return this.usersService.findAllAdministrators();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  async create(@Body() createUserDto: CreateUserDto) {
    await this.usersService.create(createUserDto);
    return { message: 'User created successfully' };
  }

  // ✅ ENDPOINT CORRETO PARA CRIAR ADMINISTRADORES
  @UseGuards(JwtAuthGuard)
  @Post('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new administrator (Super Admin only)' })
  @ApiBearerAuth()
  async createAdmin(
    @Body() createAdminDto: CreateAdminDto,
    @Req() req: RequestWithUser
  ) {
    // Verificar se o usuário atual é super admin
    if (req.user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Administrators can create new administrators');
    }

    // Verificar se já existe um usuário com este email
    const existingUser = await this.usersService.findOneByEmail(createAdminDto.email);
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Criar o administrador
    await this.usersService.createAdmin(createAdminDto);
    return { message: 'Administrator created successfully' };
  }

  @Get('hello')
  getHello(): string {
    return 'Hello Users!';
  }

  @UseGuards(JwtAuthGuard)
  @Get('search')
  @ApiBearerAuth()
  async search(@Query() query: SearchUserDto, @Req() req: RequestWithUser) {
    // Verificar permissões
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Access denied');
    }

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

  // ✅ ENDPOINT PARA BUSCAR ADMINISTRADORES COM FILTROS
  @UseGuards(JwtAuthGuard)
  @Get('search/administrators')
  @ApiOperation({ summary: 'Search administrators (Super Admin only)' })
  @ApiBearerAuth()
  async searchAdministrators(@Query() query: SearchUserDto, @Req() req: RequestWithUser) {
    if (req.user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Administrators can search administrators');
    }

    const criteria: any = {};

    if (query.firstName) {
      criteria.firstName = query.firstName;
    }

    if (query.email) {
      criteria.email = query.email;
    }

    try {
      const admins = await this.usersService.searchAdministrators(criteria);
      if (!admins?.length) {
        throw new NotFoundException('No administrators found matching the criteria');
      }
      return admins;
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
  async findAll(@Req() req: RequestWithUser) {
    // Verificar permissões
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Access denied');
    }

    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiBearerAuth()
  async findOne(
    @Param('id') id: string,
    @Req() req: RequestWithUser
  ) {
    // Usuário pode ver seus próprios dados ou admins podem ver dados de outros
    if (req.user.id !== id && 
        req.user.role !== UserRole.ADMIN && 
        req.user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Access denied');
    }

    return this.usersService.findOneOrFail({ id });
  }

  @UseGuards(JwtAuthGuard)
  @Get('email/:email')
  @ApiBearerAuth()
  async findByEmail(@Param('email') email: string, @Req() req: RequestWithUser) {
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Access denied');
    }

    return this.usersService.findOneOrFail({ email });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiBearerAuth()
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: RequestWithUser
  ) {
    const targetUser = await this.usersService.findOneOrFail({ id });

    // Verificar permissões para atualização
    const canUpdate = this.canUpdateUser(req.user, targetUser);
    if (!canUpdate.allowed) {
      throw new ForbiddenException(canUpdate.reason);
    }

    // Se estiver tentando atualizar papel/permissões, verificar se tem autorização
    if (updateUserDto.role || updateUserDto.hasOwnProperty('isAdmin')) {
      if (req.user.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Only Super Administrators can change user roles');
      }
    }

    return this.usersService.update(id, updateUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  async remove(@Param('email') email: string, @Req() req: RequestWithUser) {
    const targetUser = await this.usersService.findOneOrFail({ email });

    // Verificar permissões para exclusão
    const canDelete = this.canDeleteUser(req.user, targetUser);
    if (!canDelete.allowed) {
      throw new ForbiddenException(canDelete.reason);
    }

    await this.usersService.destroy(email);
  }

  // Métodos auxiliares para verificação de permissões
  private canUpdateUser(currentUser: any, targetUser: UserEntity): { allowed: boolean; reason?: string } {
    // Usuário pode editar a si mesmo
    if (currentUser.id === targetUser.id) {
      return { allowed: true };
    }

    // Super Admin pode editar qualquer um
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return { allowed: true };
    }

    // Admin pode editar usuários comuns, mas não outros admins
    if (currentUser.role === UserRole.ADMIN) {
      if (targetUser.role === UserRole.CLIENT) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Administrators cannot edit other administrators' };
    }

    return { allowed: false, reason: 'Insufficient permissions' };
  }

  private canDeleteUser(currentUser: any, targetUser: UserEntity): { allowed: boolean; reason?: string } {
    // Ninguém pode deletar a si mesmo
    if (currentUser.id === targetUser.id) {
      return { allowed: false, reason: 'Cannot delete your own account' };
    }

    // Apenas Super Admin pode deletar usuários
    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      return { allowed: false, reason: 'Only Super Administrators can delete users' };
    }

    // Super Admin não pode deletar outro Super Admin
    if (targetUser.role === UserRole.SUPER_ADMIN) {
      return { allowed: false, reason: 'Cannot delete another Super Administrator' };
    }

    return { allowed: true };
  }

  // ✅ VERSÃO COM LOGS DETALHADOS - users.controller.ts
  @UseGuards(JwtAuthGuard)
  @Patch('admin/:id')
  @ApiOperation({ summary: 'Update administrator (Super Admin only)' })
  @ApiBearerAuth()
  async updateAdmin(
    @Param('id') id: string,
    @Body() updateAdminDto: UpdateAdminDto,
    @Req() req: RequestWithUser
  ) {
    console.log('🚀 [UsersController] ==================== INÍCIO updateAdmin ====================');
    console.log('📝 [UsersController] ID recebido:', id);
    console.log('📝 [UsersController] Dados recebidos:', JSON.stringify(updateAdminDto, null, 2));
    console.log('👤 [UsersController] Usuário atual:', req.user.email, 'Role:', req.user.role);
    
    // Validar UUID
    if (!this.isValidUUID(id)) {
      console.error('❌ ID inválido:', id);
      throw new BadRequestException('ID inválido - deve ser um UUID válido');
    }
    console.log('✅ [UsersController] UUID válido');

    // Verificar se o usuário atual é super admin
    if (req.user.role !== UserRole.SUPER_ADMIN) {
      console.error('❌ Permissão negada. Role atual:', req.user.role);
      throw new ForbiddenException('Only Super Administrators can update administrators');
    }
    console.log('✅ [UsersController] Permissão verificada');

    try {
      // Buscar administrador alvo
      console.log('🔍 [UsersController] Buscando usuário com ID:', id);
      const targetAdmin = await this.usersService.findOneOrFail({ id });
      console.log('👤 [UsersController] Usuário encontrado:', {
        id: targetAdmin.id,
        email: targetAdmin.email,
        role: targetAdmin.role,
        firstName: targetAdmin.firstName,
        lastName: targetAdmin.lastName
      });

      // Verificar se é realmente um administrador
      if (targetAdmin.role !== UserRole.ADMIN && targetAdmin.role !== UserRole.SUPER_ADMIN) {
        console.error('❌ Usuário não é administrador. Role:', targetAdmin.role);
        throw new BadRequestException('User is not an administrator');
      }
      console.log('✅ [UsersController] Usuário é administrador');

      // Preparar dados para atualização
      const updateUserDto: UpdateUserDto = {};

      if (updateAdminDto.firstName !== undefined) {
        updateUserDto.firstName = updateAdminDto.firstName;
        console.log('📝 [UsersController] firstName será atualizado para:', updateAdminDto.firstName);
      }
      
      if (updateAdminDto.lastName !== undefined) {
        updateUserDto.lastName = updateAdminDto.lastName;
        console.log('📝 [UsersController] lastName será atualizado para:', updateAdminDto.lastName);
      }
      
      if (updateAdminDto.email !== undefined) {
        updateUserDto.email = updateAdminDto.email;
        console.log('📝 [UsersController] email será atualizado para:', updateAdminDto.email);
      }
      
      if (updateAdminDto.password !== undefined && updateAdminDto.password?.trim()) {
        updateUserDto.password = updateAdminDto.password;
        console.log('📝 [UsersController] senha será atualizada');
      }
      
      if (updateAdminDto.role !== undefined) {
        updateUserDto.role = updateAdminDto.role as string;
        console.log('📝 [UsersController] role será atualizado para:', updateAdminDto.role);
      }

      console.log('📋 [UsersController] Dados finais para atualização:', JSON.stringify(updateUserDto, null, 2));

      // Executar atualização
      console.log('🔄 [UsersController] Chamando usersService.update...');
      const updatedUser = await this.usersService.update(id, updateUserDto);
      console.log('✅ [UsersController] Usuário atualizado com sucesso:', {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName
      });
      
      // Retornar dados limpos
      const { password, resetPasswordTokenHash, emailVerificationToken, ...safeUser } = updatedUser;
      console.log('📤 [UsersController] Retornando dados:', JSON.stringify(safeUser, null, 2));
      console.log('🏁 [UsersController] ==================== FIM updateAdmin ====================');
      
      return safeUser;
    } catch (error) {
      console.error('💥 [UsersController] ERRO em updateAdmin:', error.message);
      console.error('💥 [UsersController] Stack trace:', error.stack);
      
      if (error instanceof BadRequestException || 
          error instanceof ForbiddenException || 
          error instanceof NotFoundException ||
          error instanceof ConflictException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Erro interno do servidor');
    }
  }
}