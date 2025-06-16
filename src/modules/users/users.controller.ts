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

  // ==================== ROTAS ESPECÍFICAS (SEM PARÂMETROS) ====================

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  async getProfile(@Req() req: RequestWithUser) {
    return this.usersService.findOneOrFail({ id: req.user.id });
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

  // ==================== ROTAS DE CLIENTES ====================

  /**
   * GET /api/users/clients - Listar todos os clientes
   */
  @UseGuards(JwtAuthGuard)
  @Get('clients')
  @ApiOperation({ summary: 'Get all clients (Admin/Super Admin only)' })
  @ApiBearerAuth()
  async getClients(@Req() req: RequestWithUser) {
    console.log('📋 [UsersController] Buscando clientes...');
    console.log('👤 [UsersController] Usuário atual:', req.user.email, 'Role:', req.user.role);
    
    // Verificar permissões - apenas admins podem ver lista de clientes
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPER_ADMIN) {
      console.error('❌ [UsersController] Acesso negado. Role:', req.user.role);
      throw new ForbiddenException('Only administrators can view clients list');
    }

    try {
      console.log('🔍 [UsersController] Chamando findAllClientsSimple...');
      const clients = await this.usersService.findAllClientsSimple();
      console.log('✅ [UsersController] Clientes encontrados:', clients.length);
      return clients;
    } catch (error) {
      console.error('❌ [UsersController] Erro ao buscar clientes:', error);
      throw new InternalServerErrorException('Error fetching clients');
    }
  }

  /**
   * GET /api/users/clients/search - Buscar clientes com filtros
   */
  @UseGuards(JwtAuthGuard)
  @Get('clients/search')
  @ApiOperation({ summary: 'Search clients (Admin/Super Admin only)' })
  @ApiBearerAuth()
  async searchClients(@Query() query: SearchUserDto, @Req() req: RequestWithUser) {
    console.log('🔍 [UsersController] Buscando clientes com filtros...');
    console.log('📝 [UsersController] Filtros:', JSON.stringify(query, null, 2));
    
    // Verificar permissões
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only administrators can search clients');
    }

    try {
      const where: any = { 
        role: UserRole.CLIENT 
      };

      // Adicionar filtros se fornecidos
      if (query.firstName) {
        where.firstName = Like(`%${query.firstName}%`);
      }

      if (query.email) {
        where.email = Like(`%${query.email}%`);
      }

      const clients = await this.usersService.findByCriteria(where);
      
      if (!clients?.length) {
        throw new NotFoundException('No clients found matching the criteria');
      }
      return clients;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Search failed');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('client')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new client (Admin/Super Admin only)' })
  @ApiBearerAuth()
  async createClient(
    @Body() createClientDto: CreateUserDto,
    @Req() req: RequestWithUser
  ) {
    console.log('🚀 [UsersController] ==================== INÍCIO createClient ====================');
    console.log('📝 [UsersController] Dados BRUTOS recebidos:', JSON.stringify(createClientDto, null, 2));
    console.log('📝 [UsersController] Tipo de cada campo:');
    
    // ✅ DEBUG DETALHADO DE CADA CAMPO
    Object.keys(createClientDto).forEach(key => {
      const value = (createClientDto as any)[key];
      console.log(`   ${key}: "${value}" (${typeof value}) [length: ${value?.length || 'N/A'}]`);
    });
    
    console.log('👤 [UsersController] Usuário atual:', req.user.email, 'Role:', req.user.role);

    // Verificar permissões - apenas admins podem criar clientes
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPER_ADMIN) {
      console.error('❌ [UsersController] Acesso negado. Role:', req.user.role);
      throw new ForbiddenException('Only administrators can create clients');
    }
    console.log('✅ [UsersController] Permissões verificadas');

    try {
      // ✅ VALIDAÇÃO MANUAL DOS CAMPOS OBRIGATÓRIOS - CORRIGIDO
      const requiredFields: (keyof CreateUserDto)[] = ['firstName', 'lastName', 'email', 'password'];
      const missingFields: string[] = [];
      
      requiredFields.forEach((field) => {
        const fieldValue = createClientDto[field];
        if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
          missingFields.push(field as string);
        }
      });
      
      if (missingFields.length > 0) {
        console.error('❌ [UsersController] Campos obrigatórios ausentes:', missingFields);
        throw new BadRequestException(`Missing required fields: ${missingFields.join(', ')}`);
      }
      console.log('✅ [UsersController] Todos os campos obrigatórios presentes');

      // ✅ VALIDAÇÃO DO EMAIL
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(createClientDto.email)) {
        console.error('❌ [UsersController] Email inválido:', createClientDto.email);
        throw new BadRequestException('Invalid email format');
      }
      console.log('✅ [UsersController] Email válido');

      // ✅ VALIDAÇÃO DA SENHA
      if (createClientDto.password.length < 8) {
        console.error('❌ [UsersController] Senha muito curta:', createClientDto.password.length);
        throw new BadRequestException('Password must be at least 8 characters long');
      }
      console.log('✅ [UsersController] Senha válida');

      // ✅ VALIDAÇÃO DO TELEFONE (se fornecido)
      if (createClientDto.telefone && createClientDto.telefone.trim()) {
        const telefoneRegex = /^\(\d{2}\) \d{5}-\d{4}$/;
        if (!telefoneRegex.test(createClientDto.telefone.trim())) {
          console.error('❌ [UsersController] Telefone inválido:', createClientDto.telefone);
          throw new BadRequestException('Formato de telefone inválido. Use: (00) 00000-0000');
        }
        console.log('✅ [UsersController] Telefone válido');
      }

      // Verificar se já existe usuário com este email
      console.log('🔍 [UsersController] Verificando se email existe:', createClientDto.email);
      const existingUser = await this.usersService.findOneByEmail(createClientDto.email);
      if (existingUser) {
        console.error('❌ [UsersController] Email já existe:', createClientDto.email);
        throw new ConflictException('User with this email already exists');
      }
      console.log('✅ [UsersController] Email disponível');

      // ✅ LIMPAR E PREPARAR DADOS - USANDO INTERFACE ESPECÍFICA
      const cleanedData: Partial<CreateUserDto> & {
        role: UserRole;
        isClient: boolean;
        isAdmin: boolean;
        isSuperAdmin: boolean;
      } = {
        firstName: createClientDto.firstName?.trim(),
        lastName: createClientDto.lastName?.trim(),
        email: createClientDto.email?.trim().toLowerCase(),
        password: createClientDto.password?.trim(),
        role: UserRole.CLIENT,
        isClient: true,
        isAdmin: false,
        isSuperAdmin: false
      };

      // ✅ TELEFONE: só incluir se válido
      if (createClientDto.telefone && createClientDto.telefone.trim()) {
        const telefone = createClientDto.telefone.trim();
        const telefoneRegex = /^\(\d{2}\) \d{5}-\d{4}$/;
        if (telefoneRegex.test(telefone)) {
          cleanedData.telefone = telefone;
          console.log('📱 [UsersController] Telefone incluído:', telefone);
        }
      }

      console.log('📤 [UsersController] Dados LIMPOS para criação:', JSON.stringify({
        ...cleanedData,
        password: '[HIDDEN]'
      }, null, 2));

      // Criar cliente
      console.log('🔄 [UsersController] Chamando usersService.create...');
      const createdUser = await this.usersService.create(cleanedData as CreateUserDto);
      
      console.log('✅ [UsersController] Cliente criado com sucesso:', {
        id: createdUser.id,
        email: createdUser.email,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName
      });
      
      console.log('🏁 [UsersController] ==================== FIM createClient ====================');
      return { message: 'Client created successfully', clientId: createdUser.id };
      
    } catch (error) {
      console.error('💥 [UsersController] ==================== ERRO createClient ====================');
      console.error('💥 [UsersController] Erro completo:', error);
      console.error('💥 [UsersController] Message:', error.message);
      console.error('💥 [UsersController] Stack:', error.stack);
      
      // ✅ Se o erro for de validação do DTO, mostrar detalhes
      if (error.message?.includes('validation failed')) {
        console.error('💥 [UsersController] Erro de validação DTO:', error.response);
      }
      
      if (error instanceof ConflictException || 
          error instanceof BadRequestException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Error creating client');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch('client/:id')
  @ApiOperation({ summary: 'Update client (Admin/Super Admin only)' })
  @ApiBearerAuth()
  async updateClient(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: RequestWithUser
  ) {
    console.log('🚀 [UsersController] Atualizando cliente...');
    console.log('📝 [UsersController] ID:', id);
    console.log('📝 [UsersController] Dados:', JSON.stringify(updateUserDto, null, 2));

    // Verificar permissões
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only administrators can update clients');
    }

    // Validar UUID
    if (!this.isValidUUID(id)) {
      throw new BadRequestException('Invalid ID - must be a valid UUID');
    }

    try {
      // Buscar cliente
      const targetUser = await this.usersService.findOneOrFail({ id });
      
      // Verificar se é realmente um cliente
      if (targetUser.role !== UserRole.CLIENT) {
        throw new BadRequestException('User is not a client');
      }

      // Não permitir alteração de role via este endpoint
      if (updateUserDto.role || updateUserDto.hasOwnProperty('isAdmin') || updateUserDto.hasOwnProperty('isSuperAdmin')) {
        throw new BadRequestException('Cannot change user role via client endpoint');
      }

      // Atualizar cliente
      const updatedUser = await this.usersService.update(id, updateUserDto);
      
      // Retornar dados limpos
      const safeUser = {
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        telefone: updatedUser.telefone,
        role: updatedUser.role,
        isEmailVerified: updatedUser.isEmailVerified,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at,
        username: updatedUser.username,
        isClient: updatedUser.isClient,
        isAdmin: updatedUser.isAdmin,
        isSuperAdmin: updatedUser.isSuperAdmin
      };
      
      return safeUser;
    } catch (error) {
      console.error('❌ [UsersController] Erro ao atualizar cliente:', error);
      
      if (error instanceof BadRequestException || 
          error instanceof ForbiddenException || 
          error instanceof NotFoundException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Error updating client');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete('client/:email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete client (Admin/Super Admin only)' })
  @ApiBearerAuth()
  async removeClient(@Param('email') email: string, @Req() req: RequestWithUser) {
    console.log('🗑️ [UsersController] Deletando cliente:', email);

    // Verificar permissões
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only administrators can delete clients');
    }

    try {
      const targetUser = await this.usersService.findOneOrFail({ email });

      // Verificar se é realmente um cliente
      if (targetUser.role !== UserRole.CLIENT) {
        throw new BadRequestException('User is not a client');
      }

      // Não permitir que admin delete a si mesmo
      if (req.user.email === email) {
        throw new BadRequestException('Cannot delete your own account');
      }

      await this.usersService.destroy(email);
      console.log('✅ [UsersController] Cliente deletado:', email);
    } catch (error) {
      console.error('❌ [UsersController] Erro ao deletar cliente:', error);
      
      if (error instanceof BadRequestException || 
          error instanceof ForbiddenException || 
          error instanceof NotFoundException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Error deleting client');
    }
  }

  // ==================== ROTAS DE ADMINISTRADORES ====================

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

  // ==================== ROTAS GENÉRICAS (COM PARÂMETROS) - DEVEM VIR POR ÚLTIMO ====================

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  async create(@Body() createUserDto: CreateUserDto) {
    await this.usersService.create(createUserDto);
    return { message: 'User created successfully' };
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

  // ✅ IMPORTANTE: Esta rota deve vir POR ÚLTIMO porque captura qualquer string como ID
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

  // ==================== MÉTODOS AUXILIARES ====================

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
}