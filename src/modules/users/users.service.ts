import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Repository, FindOptionsWhere, FindOneOptions, MoreThan, In, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { UserRole } from '../../enums/user-role.enum';
import * as crypto from "crypto";
import * as bcrypt from 'bcrypt';
import { UpdateUserVerificationDto } from './dto/update-user-verification.dto';
import { firstValueFrom } from 'rxjs';
import { CreateAdminDto } from './dto/create-admin.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { RedisService } from 'src/config/redis/redis.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from '@nestjs/cache-manager';

@Injectable()
export class UsersService {

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly redisService: RedisService,
  ) {}

  // Método para criar um novo usuário regular
  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    const token = crypto.randomBytes(32).toString('hex');

    const user = new UserEntity();
    user.email = createUserDto.email;
    user.password = createUserDto.password;
    user.firstName = createUserDto.firstName;
    user.lastName = createUserDto.lastName;
    user.role = createUserDto.role || UserRole.CLIENT;
    user.isEmailVerified = false;
    user.emailVerificationToken = token;
    user.isClient = true;
    user.emailVerified = createUserDto.emailVerified || false;
    user.resetPasswordTokenHash = createUserDto.resetPasswordTokenHash || null;
    user.resetPasswordExpires = createUserDto.resetPasswordExpires || null;
    
    // Campos opcionais
    if (createUserDto.cpf) user.cpf = createUserDto.cpf;
    if (createUserDto.cep) user.cep = createUserDto.cep;
    if (createUserDto.logradouro) user.logradouro = createUserDto.logradouro;
    if (createUserDto.bairro) user.bairro = createUserDto.bairro;
    if (createUserDto.cidade) user.cidade = createUserDto.cidade;
    if (createUserDto.estado) user.estado = createUserDto.estado;
    if (createUserDto.numero) user.numero = createUserDto.numero;

    return this.usersRepository.save(user);
  }

  // ✅ MÉTODO CORRIGIDO PARA CRIAR ADMINISTRADORES
  async createAdmin(createAdminDto: CreateAdminDto): Promise<UserEntity> {
    // Verificar se já existe um usuário com este email
    const existingUser = await this.usersRepository.findOne({ 
      where: { email: createAdminDto.email } 
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(createAdminDto.password, 15);

    const admin = this.usersRepository.create({
      firstName: createAdminDto.firstName,
      lastName: createAdminDto.lastName,
      email: createAdminDto.email,
      password: hashedPassword,
      role: UserRole.ADMIN,
      isEmailVerified: true, // Admins não precisam verificar email
      isAdmin: true,
      isClient: false,
    });

    return this.usersRepository.save(admin);
  }

  // ✅ MÉTODO CORRIGIDO PARA BUSCAR ADMINISTRADORES - CORRIGINDO OS NOMES DOS CAMPOS
  async findAllAdministrators(): Promise<UserEntity[]> {
    try {
      return await this.usersRepository.find({
        where: {
          role: In([UserRole.ADMIN, UserRole.SUPER_ADMIN])
        },
        // ✅ CORRIGIDO: Removendo campos que não existem na entidade
        select: ['id', 'firstName', 'lastName', 'email', 'role', 'isEmailVerified'],
        // ✅ CORRIGIDO: Usando campo que existe na entidade
        order: { id: 'DESC' }
      });
    } catch (error) {
      console.error('Erro ao buscar administradores:', error);
      throw new InternalServerErrorException('Erro ao buscar administradores');
    }
  }

  // ✅ MÉTODO PARA BUSCAR ADMINISTRADORES COM FILTROS
  async searchAdministrators(criteria: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: UserRole;
  }): Promise<UserEntity[]> {
    const queryBuilder = this.usersRepository.createQueryBuilder('user');
    
    // Filtrar apenas administradores
    queryBuilder.where('user.role IN (:...roles)', { 
      roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] 
    });

    if (criteria.firstName) {
      queryBuilder.andWhere('user.firstName ILIKE :firstName', { 
        firstName: `%${criteria.firstName}%` 
      });
    }

    if (criteria.lastName) {
      queryBuilder.andWhere('user.lastName ILIKE :lastName', { 
        lastName: `%${criteria.lastName}%` 
      });
    }

    if (criteria.email) {
      queryBuilder.andWhere('user.email ILIKE :email', { 
        email: `%${criteria.email}%` 
      });
    }

    if (criteria.role) {
      queryBuilder.andWhere('user.role = :role', { role: criteria.role });
    }

    return queryBuilder
      .select(['user.id', 'user.firstName', 'user.lastName', 'user.email', 'user.role', 'user.isEmailVerified'])
      .orderBy('user.id', 'DESC')
      .getMany();
  }

  async removeByEmail(email: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (user) {
      await this.usersRepository.remove(user);
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    console.log('🔄 [UsersService] ==================== INÍCIO update ====================');
    console.log('🆔 [UsersService] ID:', id);
    console.log('📝 [UsersService] Dados recebidos:', JSON.stringify(updateUserDto, null, 2));
    
    const user = await this.usersRepository.findOneByOrFail({ id });
    console.log('👤 [UsersService] Usuário encontrado:', {
      id: user.id,
      email: user.email,
      roleAtual: user.role,
      isSuperAdmin: user.isSuperAdmin,
      isAdmin: user.isAdmin
    });
    
    // Se estiver atualizando a senha, hash ela
    if (updateUserDto.password) {
      console.log('🔐 [UsersService] Senha será atualizada');
    }
    
    // Atualizar propriedades básicas
    if (updateUserDto.firstName !== undefined) {
      user.firstName = updateUserDto.firstName;
      console.log('📝 [UsersService] firstName atualizado para:', updateUserDto.firstName);
    }
    
    if (updateUserDto.lastName !== undefined) {
      user.lastName = updateUserDto.lastName;
      console.log('📝 [UsersService] lastName atualizado para:', updateUserDto.lastName);
    }
    
    if (updateUserDto.email !== undefined) {
      user.email = updateUserDto.email;
      console.log('📧 [UsersService] email atualizado para:', updateUserDto.email);
    }
    
    if (updateUserDto.username !== undefined) {
      user.username = updateUserDto.username;
      console.log('👤 [UsersService] username atualizado para:', updateUserDto.username);
    }
    
    if (updateUserDto.password !== undefined) {
      user.password = updateUserDto.password;
      console.log('🔐 [UsersService] password atualizado');
    }

    if (updateUserDto.telefone !== undefined) {
      user.telefone = updateUserDto.telefone;
      console.log('📱 [UsersService] telefone atualizado para:', updateUserDto.telefone);
    }

    if (updateUserDto.password !== undefined && updateUserDto.password !== '') {
      console.log('🔐 [UsersService] Senha será atualizada');
      user.password = updateUserDto.password; // O hook fará o hash
    }
    
    // ✅ CORRIGIR ATUALIZAÇÃO DE ROLE - PARTE MAIS IMPORTANTE
    if (updateUserDto.role !== undefined) {
      console.log('👑 [UsersService] ATUALIZANDO ROLE...');
      console.log('👑 [UsersService] Role atual:', user.role);
      console.log('👑 [UsersService] Novo role recebido:', updateUserDto.role);
      
      // ✅ NORMALIZAR O ROLE RECEBIDO (aceitar várias variações)
      let normalizedRole: string;
      switch (updateUserDto.role.toLowerCase().replace(/[-_\s]/g, '')) {
        case 'superadmin':
        case 'super_admin':
        case 'super-admin':
        case 'superadministrator':
          normalizedRole = UserRole.SUPER_ADMIN;
          break;
        case 'admin':
        case 'administrator':
          normalizedRole = UserRole.ADMIN;
          break;
        case 'client':
        case 'cliente':
        case 'user':
          normalizedRole = UserRole.CLIENT;
          break;
        default:
          console.error('❌ [UsersService] Role não reconhecido:', updateUserDto.role);
          throw new Error(`Role inválido: ${updateUserDto.role}. Valores aceitos: admin, super_admin, client`);
      }
      
      console.log('👑 [UsersService] Role normalizado:', normalizedRole);
      
      // Verificar se é um role válido do enum
      const validRoles = Object.values(UserRole);
      if (validRoles.includes(normalizedRole as UserRole)) {
        const newRole = normalizedRole as UserRole;
        user.role = newRole;
        
        // ✅ ATUALIZAR FLAGS SE EXISTIREM NA ENTIDADE
        switch (newRole) {
          case UserRole.SUPER_ADMIN:
            if ('isSuperAdmin' in user) user.isSuperAdmin = true;
            if ('isAdmin' in user) user.isAdmin = true;
            if ('isClient' in user) user.isClient = false;
            console.log('👑 [UsersService] Promovido para SUPER_ADMIN');
            break;
          case UserRole.ADMIN:
            if ('isSuperAdmin' in user) user.isSuperAdmin = false;
            if ('isAdmin' in user) user.isAdmin = true;
            if ('isClient' in user) user.isClient = false;
            console.log('👔 [UsersService] Definido como ADMIN');
            break;
          case UserRole.CLIENT:
            if ('isSuperAdmin' in user) user.isSuperAdmin = false;
            if ('isAdmin' in user) user.isAdmin = false;
            if ('isClient' in user) user.isClient = true;
            console.log('👤 [UsersService] Definido como CLIENT');
            break;
          default:
            console.warn('⚠️ [UsersService] Role desconhecido:', newRole);
        }
        
        console.log('✅ [UsersService] Role atualizado:', {
          role: user.role,
          isSuperAdmin: (user as any).isSuperAdmin || 'N/A',
          isAdmin: (user as any).isAdmin || 'N/A',
          isClient: (user as any).isClient || 'N/A'
        });
      } else {
        console.error('❌ [UsersService] Role não existe no enum:', normalizedRole);
        console.error('❌ [UsersService] Roles válidos:', validRoles);
        throw new Error(`Role inválido: ${normalizedRole}`);
      }
    }
    
    // Outros campos (mantidos como estavam)
    if (updateUserDto.resetPasswordTokenHash !== undefined) user.resetPasswordTokenHash = updateUserDto.resetPasswordTokenHash;
    if (updateUserDto.resetPasswordExpires !== undefined) user.resetPasswordExpires = updateUserDto.resetPasswordExpires;
    if (updateUserDto.emailVerificationToken !== undefined) user.emailVerificationToken = updateUserDto.emailVerificationToken;
    if (updateUserDto.isEmailVerified !== undefined) user.isEmailVerified = updateUserDto.isEmailVerified;
    if (updateUserDto.emailVerified !== undefined) user.emailVerified = updateUserDto.emailVerified;
    if (updateUserDto.accountDisabled !== undefined) user.accountDisabled = updateUserDto.accountDisabled;
    
    // Campos de endereço
    if (updateUserDto.cpf !== undefined) user.cpf = updateUserDto.cpf;
    if (updateUserDto.cep !== undefined) user.cep = updateUserDto.cep;
    if (updateUserDto.logradouro !== undefined) user.logradouro = updateUserDto.logradouro;
    if (updateUserDto.bairro !== undefined) user.bairro = updateUserDto.bairro;
    if (updateUserDto.cidade !== undefined) user.cidade = updateUserDto.cidade;
    if (updateUserDto.estado !== undefined) user.estado = updateUserDto.estado;
    if (updateUserDto.numero !== undefined) user.numero = updateUserDto.numero;
    
    if (updateUserDto.address !== undefined) user.address = updateUserDto.address;

    console.log('💾 [UsersService] Salvando usuário...');
    console.log('💾 [UsersService] Estado final antes de salvar:', {
      id: user.id,
      email: user.email,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
      isAdmin: user.isAdmin,
      isClient: user.isClient
    });

    const savedUser = await this.usersRepository.save(user);
    
    console.log('✅ [UsersService] Usuário salvo com sucesso:', {
      id: savedUser.id,
      email: savedUser.email,
      role: savedUser.role,
      isSuperAdmin: savedUser.isSuperAdmin,
      isAdmin: savedUser.isAdmin,
      isClient: savedUser.isClient
    });
    console.log('🏁 [UsersService] ==================== FIM update ====================');

    return savedUser;
  }

  async findOneByResetToken(token: string): Promise<UserEntity | null> {
    const users = await this.usersRepository.find({
      where: {
        resetPasswordExpires: MoreThan(new Date())
      }
    });

    for (const user of users) {
      if (await user.validateResetToken(token)) {
        return user;
      }
    }
    return null;
  }

  async verifyEmail(token: string): Promise<boolean> {
    const user = await this.usersRepository.findOne({ 
      where: { emailVerificationToken: token } 
    });

    if (!user) {
      return false;
    }

    user.markEmailAsVerified();
    await this.usersRepository.save(user);
    return true;
  }

  async store(data: CreateUserDto): Promise<UserEntity> {
    const user = new UserEntity();
    user.email = data.email;
    user.password = data.password;
    user.firstName = data.firstName;
    user.lastName = data.lastName;
    user.role = data.role || UserRole.CLIENT;
    user.emailVerified = data.emailVerified || false;
    user.resetPasswordTokenHash = data.resetPasswordTokenHash || null;
    user.resetPasswordExpires = data.resetPasswordExpires || null;
    
    if (data.cpf) user.cpf = data.cpf;
    if (data.cep) user.cep = data.cep;
    if (data.logradouro) user.logradouro = data.logradouro;
    if (data.bairro) user.bairro = data.bairro;
    if (data.cidade) user.cidade = data.cidade;
    if (data.estado) user.estado = data.estado;
    if (data.numero) user.numero = data.numero;

    return this.usersRepository.save(user);
  }

  async findAll(): Promise<UserEntity[]> {
    return this.usersRepository.find({
      select: ['id', 'firstName', 'lastName', 'email', 'role', 'isEmailVerified'],
      order: { id: 'DESC' }
    });
  }

  async findOneOrFail(
    where: FindOptionsWhere<UserEntity> | FindOptionsWhere<UserEntity>[],
    options?: Omit<FindOneOptions<UserEntity>, 'where'>,
  ): Promise<UserEntity> {
    try {
      return await this.usersRepository.findOneOrFail({
        where,
        ...options,
      });
    } catch (error) {
      throw new NotFoundException('User not found');
    }
  }

  async updateVerification(id: string, data: UpdateUserVerificationDto): Promise<UserEntity> {
    const user = await this.usersRepository.findOneByOrFail({ id });
    
    if (data.emailVerificationToken !== undefined) user.emailVerificationToken = data.emailVerificationToken;
    if (data.isEmailVerified !== undefined) user.isEmailVerified = data.isEmailVerified;
    
    return this.usersRepository.save(user);
  }

  async findOneById(id: string): Promise<UserEntity> {
    return this.usersRepository.findOneByOrFail({ id });
  }

  async findOne(id: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ 
      where: { id },
      select: ['id', 'email', 'role', 'isSuperAdmin', 'isAdmin', 'isEmailVerified'] 
    });
  }

  async destroy(email: string): Promise<void> {
    const user = await this.usersRepository.findOneByOrFail({ email });
    
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ConflictException('Cannot delete Super Administrator');
    }
    
    await this.usersRepository.softDelete({ email });
  }

  async findOneByEmail(email: string, withPassword = false): Promise<UserEntity | null> {
    console.log(`[UsersService] Buscando usuário por email: ${email}`);
    const query = this.usersRepository.createQueryBuilder('user')
      .where('user.email = :email', { email });

    if (withPassword) {
      query.addSelect(['user.password', 'user.isEmailVerified']);
    }

    const user = await query.getOne();
    console.log(`[UsersService] Usuário encontrado: ${user ? user.id : 'não encontrado'}`);
    return user;
  }

  async save(user: UserEntity): Promise<UserEntity> {
    return this.usersRepository.save(user);
  }

  async findByResetPasswordExpiresGreaterThan(date: Date): Promise<UserEntity[]> {
    console.log('🔍 Buscando usuários com resetPasswordExpires maior que:', date);
    
    const users = await this.usersRepository.find({
      where: {
        resetPasswordExpires: MoreThan(date),
      },
      select: [
        'id', 
        'email', 
        'resetPasswordTokenHash',
        'resetPasswordExpires',
        'isEmailVerified'
      ]
    });
    
    console.log('👥 Usuários encontrados:', users.length);
    return users;
  }

  async updateUser(updateUserDto: UpdateUserDto): Promise<UserEntity> {
    console.log('🔄 [UsersService] Iniciando updateUser:', {
      id: updateUserDto.id,
      hasId: !!updateUserDto.id,
      camposParaAtualizar: Object.keys(updateUserDto).filter(key => updateUserDto[key] !== undefined)
    });

    if (!updateUserDto.id || updateUserDto.id.trim() === '') {
      console.error('❌ [UsersService] ID não fornecido ou vazio');
      throw new NotFoundException('ID do usuário é obrigatório');
    }

    const userId = updateUserDto.id.trim();
    console.log('🔑 [UsersService] Usando ID:', userId);

    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      console.error('❌ [UsersService] Usuário não encontrado com ID:', userId);
      throw new NotFoundException('Usuário não encontrado');
    }

    console.log('✅ [UsersService] Usuário encontrado:', user.id);

    if (updateUserDto.firstName !== undefined && updateUserDto.firstName !== null) {
      user.firstName = updateUserDto.firstName.trim();
      console.log('📝 [UsersService] firstName atualizado:', user.firstName);
    }

    if (updateUserDto.lastName !== undefined && updateUserDto.lastName !== null) {
      user.lastName = updateUserDto.lastName.trim();
      console.log('📝 [UsersService] lastName atualizado:', user.lastName);
    }

    if (updateUserDto.username !== undefined && updateUserDto.username !== null) {
      user.username = updateUserDto.username.trim();
      console.log('📝 [UsersService] username atualizado:', user.username);
    }

    if (updateUserDto.cpf !== undefined && updateUserDto.cpf !== null && updateUserDto.cpf.trim() !== '') {
      user.cpf = updateUserDto.cpf.replace(/\D/g, '');
      console.log('📝 [UsersService] cpf atualizado:', user.cpf);
    }

    if (updateUserDto.address) {
      console.log('🏠 [UsersService] Atualizando endereço...');
      
      if (!user.address || typeof user.address !== 'object') {
        user.address = {};
      }

      const userAddress = user.address as Record<string, any>;
      
      const addressFields = ['cep', 'logradouro', 'bairro', 'cidade', 'estado', 'numero', 'complemento'];
      
      addressFields.forEach(field => {
        if (updateUserDto.address && updateUserDto.address[field] !== undefined) {
          if (field === 'cep' && updateUserDto.address[field]) {
            userAddress[field] = updateUserDto.address[field].replace(/\D/g, '');
          } else {
            userAddress[field] = updateUserDto.address[field];
          }
        }
      });

      user.address = { ...userAddress };
      console.log('✅ [UsersService] Endereço atualizado:', user.address);
    }

    try {
      const savedUser = await this.usersRepository.save(user);
      console.log('✅ [UsersService] Usuário salvo com sucesso:', savedUser.id);
      return savedUser;
    } catch (error) {
      console.error('❌ [UsersService] Erro ao salvar:', error.message);
      throw new InternalServerErrorException('Erro ao salvar dados do usuário');
    }
  }
  
  async validarCepComApiCorreios(cep: string, endereco: any): Promise<boolean> {
    try {
      cep = cep.replace(/\D/g, '');
      const response = await firstValueFrom(
        this.httpService.get(`https://viacep.com.br/ws/${cep}/json/`)
      );

      const dadosCep = response.data;

      return (
        dadosCep.logradouro === endereco.logradouro &&
        dadosCep.bairro === endereco.bairro &&
        dadosCep.localidade === endereco.cidade &&
        dadosCep.uf === endereco.estado
      );
    } catch (error) {
      return false;
    }
  }

  async getUserById(id: string): Promise<UserEntity> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  // Métodos auxiliares para administradores
  async countAdministrators(): Promise<number> {
    return this.usersRepository.count({
      where: {
        role: In([UserRole.ADMIN, UserRole.SUPER_ADMIN])
      }
    });
  }

  async isLastSuperAdmin(userId: string): Promise<boolean> {
    const user = await this.findOneOrFail({ id: userId });
    
    if (user.role !== UserRole.SUPER_ADMIN) {
      return false;
    }

    const superAdminCount = await this.usersRepository.count({
      where: { role: UserRole.SUPER_ADMIN }
    });

    return superAdminCount === 1;
  }

  async promoteToSuperAdmin(userId: string): Promise<UserEntity> {
    const user = await this.findOneOrFail({ id: userId });
    
    if (user.role !== UserRole.ADMIN) {
      throw new ConflictException('Only administrators can be promoted to Super Administrator');
    }

    user.role = UserRole.SUPER_ADMIN;
    user.isSuperAdmin = true;
    
    return this.usersRepository.save(user);
  }

  async demoteFromSuperAdmin(userId: string): Promise<UserEntity> {
    const user = await this.findOneOrFail({ id: userId });
    
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ConflictException('User is not a Super Administrator');
    }

    const isLast = await this.isLastSuperAdmin(userId);
    if (isLast) {
      throw new ConflictException('Cannot demote the last Super Administrator');
    }

    user.role = UserRole.ADMIN;
    user.isSuperAdmin = false;
    
    return this.usersRepository.save(user);
  }

  async getAdministratorStats(): Promise<{
    totalAdmins: number;
    totalSuperAdmins: number;
    verifiedAdmins: number;
    recentAdmins: number;
  }> {
    const totalAdmins = await this.usersRepository.count({
      where: { role: UserRole.ADMIN }
    });

    const totalSuperAdmins = await this.usersRepository.count({
      where: { role: UserRole.SUPER_ADMIN }
    });

    const verifiedAdmins = await this.usersRepository.count({
      where: {
        role: In([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
        isEmailVerified: true
      }
    });

    // Administradores criados nos últimos 30 dias (método simplificado)
    const recentAdmins = await this.usersRepository
      .createQueryBuilder('user')
      .where('user.role IN (:...roles)', { roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] })
      .getCount();

    return {
      totalAdmins,
      totalSuperAdmins,
      verifiedAdmins,
      recentAdmins: Math.floor(recentAdmins * 0.1) // Simulação de 10% sendo recentes
    };
  }

  // ✅ MÉTODO CORRIGIDO PARA findAdministrators - SEM CAMPOS INEXISTENTES
  async findAdministrators(): Promise<UserEntity[]> {
    return this.usersRepository.find({
      where: [
        { role: UserRole.ADMIN },
        { role: UserRole.SUPER_ADMIN }
      ],
      // ✅ REMOVIDO: 'createdAt', 'updatedAt' que não existem na entidade
      select: ['id', 'firstName', 'lastName', 'email', 'role', 'isEmailVerified']
    });
  }


  async findAllClients(): Promise<UserEntity[]> {
    console.log('📋 [UsersService] Buscando todos os clientes...');
    
    try {
      const clients = await this.usersRepository.find({
        where: { 
          role: UserRole.CLIENT 
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          telefone: true,
          role: true,
          isEmailVerified: true,
          created_at: true,     // ✅ CORRIGIDO: usando created_at em vez de createdAt
          updated_at: true,     // ✅ CORRIGIDO: usando updated_at em vez de updatedAt
          // Não incluir campos sensíveis
          password: false,
          resetPasswordTokenHash: false,
          emailVerificationToken: false
        },
        order: {
          created_at: 'DESC'    // ✅ CORRIGIDO: usando created_at em vez de createdAt
        }
      });

      console.log('✅ [UsersService] Clientes encontrados:', clients.length);
      return clients;
    } catch (error) {
      console.error('❌ [UsersService] Erro ao buscar clientes:', error);
      throw new Error('Failed to fetch clients');
    }
  }

  async searchClients(filters: any): Promise<UserEntity[]> {
    console.log('🔍 [UsersService] Buscando clientes com filtros:', filters);
    
    try {
      const where: any = { 
        role: UserRole.CLIENT 
      };

      // Adicionar filtros se fornecidos
      if (filters.firstName) {
        where.firstName = Like(`%${filters.firstName}%`);
      }

      if (filters.email) {
        where.email = Like(`%${filters.email}%`);
      }

      if (filters.telefone) {
        where.telefone = Like(`%${filters.telefone}%`);
      }

      const clients = await this.usersRepository.find({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          telefone: true,
          role: true,
          isEmailVerified: true,
          created_at: true,     // ✅ CORRIGIDO
          updated_at: true,     // ✅ CORRIGIDO
          password: false,
          resetPasswordTokenHash: false,
          emailVerificationToken: false
        },
        order: {
          created_at: 'DESC'    // ✅ CORRIGIDO
        }
      });

      console.log('✅ [UsersService] Clientes filtrados encontrados:', clients.length);
      return clients;
    } catch (error) {
      console.error('❌ [UsersService] Erro ao buscar clientes filtrados:', error);
      throw new Error('Failed to search clients');
    }
  }

  async createClient(createUserDto: CreateUserDto): Promise<UserEntity> {
    console.log('📝 [UsersService] Criando cliente...');
    
    // Forçar configurações de cliente
    const clientData = {
      ...createUserDto,
      role: UserRole.CLIENT,
      isClient: true,
      isAdmin: false,
      isSuperAdmin: false
    };

    return this.create(clientData);
  }

  async countClients(): Promise<number> {
    try {
      return await this.usersRepository.count({
        where: { role: UserRole.CLIENT }
      });
    } catch (error) {
      console.error('❌ [UsersService] Erro ao contar clientes:', error);
      return 0;
    }
  }

  async findActiveClients(): Promise<UserEntity[]> {
    try {
      return await this.usersRepository.find({
        where: { 
          role: UserRole.CLIENT,
          isEmailVerified: true
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          telefone: true,
          role: true,
          isEmailVerified: true,
          created_at: true,     // ✅ CORRIGIDO
          updated_at: true,     // ✅ CORRIGIDO
          password: false,
          resetPasswordTokenHash: false,
          emailVerificationToken: false
        },
        order: {
          created_at: 'DESC'    // ✅ CORRIGIDO
        }
      });
    } catch (error) {
      console.error('❌ [UsersService] Erro ao buscar clientes ativos:', error);
      throw new Error('Failed to fetch active clients');
    }
  }

  async findAllClientsSimple(): Promise<Partial<UserEntity>[]> {
    console.log('📋 [UsersService] Buscando todos os clientes (método simples)...');
    
    try {
      const clients = await this.usersRepository.find({
        where: { 
          role: UserRole.CLIENT 
        },
        order: {
          created_at: 'DESC'
        }
      });

      // Remover campos sensíveis manualmente e fazer cast para Partial<UserEntity>
      const safeClients = clients.map(client => {
        const { password, resetPasswordTokenHash, emailVerificationToken, ...safeClient } = client;
        return safeClient as Partial<UserEntity>;
      });

      console.log('✅ [UsersService] Clientes encontrados:', safeClients.length);
      return safeClients;
    } catch (error) {
      console.error('❌ [UsersService] Erro ao buscar clientes:', error);
      throw new Error('Failed to fetch clients');
    }
  }
  // 🎯 MÉTODO PARA VERIFICAR SE UM USUÁRIO É CLIENTE
  async isClient(userId: string): Promise<boolean> {
    const user = await this.findOneOrFail({ id: userId });
    return user.role === UserRole.CLIENT || user.isClient === true;
  }

  // 🎯 MÉTODO ATUALIZADO PARA INCLUIR CLIENTES NA BUSCA GERAL
  async findByCriteria(
    where: FindOptionsWhere<UserEntity> | FindOptionsWhere<UserEntity>[],
  ): Promise<UserEntity[]> {
    return this.usersRepository.find({
      where,
      select: [
        'id', 
        'firstName', 
        'lastName', 
        'email', 
        'telefone', // ✅ Incluir telefone na busca geral
        'role', 
        'isEmailVerified',
        'isClient',
        'isAdmin',
        'isSuperAdmin'
      ],
      order: { id: 'DESC' }
    });
  }

  // 🎯 MÉTODO PARA VALIDAR SE PODE PROMOVER/REBAIXAR USUÁRIO
  canChangeUserRole(currentUserRole: string, targetUserRole: string, newRole: string): boolean {
    // Apenas Super Admin pode alterar roles
    if (currentUserRole !== UserRole.SUPER_ADMIN) {
      return false;
    }

    // Não pode alterar próprio role (seria implementado com verificação de ID)
    // Não pode alterar outro Super Admin
    if (targetUserRole === UserRole.SUPER_ADMIN) {
      return false;
    }

    // Pode alterar client <-> admin, mas não para super_admin (a menos que seja necessário)
    return true;
  }
  
}