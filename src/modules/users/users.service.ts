import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Repository, FindOptionsWhere, FindOneOptions, MoreThan } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { UserRole } from '../../enums/user-role.enum';
import * as crypto from "crypto";
import * as bcrypt from 'bcrypt';
import { UpdateUserVerificationDto } from './dto/update-user-verification.dto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class UsersService {

  //construtor que injeta a entidade usuarios
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly httpService: HttpService,
  ) {}

  //metodo para criar um novo usuario admin
  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    const token = crypto.randomBytes(32).toString('hex');

    // Usar uma nova instância de UserEntity
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

  //metodo para encontrar um usuario pelo email
  async removeByEmail(email: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (user) {
      await this.usersRepository.remove(user);
    }
  }

  //metodo para encontrar um usuario pelo id
  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.usersRepository.findOneByOrFail({ id });
    
    // Atualizar diretamente as propriedades do objeto user
    if (updateUserDto.firstName !== undefined) user.firstName = updateUserDto.firstName;
    if (updateUserDto.lastName !== undefined) user.lastName = updateUserDto.lastName;
    if (updateUserDto.username !== undefined) user.username = updateUserDto.username;
    if (updateUserDto.password !== undefined) user.password = updateUserDto.password;
    
    // Corrigir a verificação de tipo para role
    if (updateUserDto.role !== undefined) {
      // Verificar se é um valor válido do enum UserRole
      if (Object.values(UserRole).includes(updateUserDto.role as UserRole)) {
        user.role = updateUserDto.role as UserRole;
      }
    }
    
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
    
    // Atualizar address se fornecido
    if (updateUserDto.address !== undefined) user.address = updateUserDto.address;

    return this.usersRepository.save(user);
  }

  //metodo para encontrar um usuario pelo token de recuperacao de senha
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

  //metodo para verificar email
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

  //metodo para armazenar usuario no banco
  async store(data: CreateUserDto): Promise<UserEntity> {
    // Usar uma nova instância de UserEntity
    const user = new UserEntity();
    user.email = data.email;
    user.password = data.password;
    user.firstName = data.firstName;
    user.lastName = data.lastName;
    user.role = data.role || UserRole.CLIENT;
    user.emailVerified = data.emailVerified || false;
    user.resetPasswordTokenHash = data.resetPasswordTokenHash || null;
    user.resetPasswordExpires = data.resetPasswordExpires || null;
    
    // Campos opcionais
    if (data.cpf) user.cpf = data.cpf;
    if (data.cep) user.cep = data.cep;
    if (data.logradouro) user.logradouro = data.logradouro;
    if (data.bairro) user.bairro = data.bairro;
    if (data.cidade) user.cidade = data.cidade;
    if (data.estado) user.estado = data.estado;
    if (data.numero) user.numero = data.numero;

    return this.usersRepository.save(user);
  }

  //metodo para buscar todos os usuarios do banco
  async findAll(): Promise<UserEntity[]> {
    return this.usersRepository.find({
      select: ['id', 'firstName', 'lastName', 'email'],
    });
  }

  //metodo se a busca falhar
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

  //metodo para verificar atualizacao no usuario
  async updateVerification(id: string, data: UpdateUserVerificationDto): Promise<UserEntity> {
    const user = await this.usersRepository.findOneByOrFail({ id });
    
    // Atualizar diretamente as propriedades
    if (data.emailVerificationToken !== undefined) user.emailVerificationToken = data.emailVerificationToken;
    if (data.isEmailVerified !== undefined) user.isEmailVerified = data.isEmailVerified;
    
    return this.usersRepository.save(user);
  }

  //metodo para buscar usuario pelo id
  async findOneById(id: string): Promise<UserEntity> {
    return this.usersRepository.findOneByOrFail({ id });
  }

  async findOne(id: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ 
      where: { id },
      select: ['id', 'email', 'role', 'isSuperAdmin', 'isAdmin', 'isEmailVerified'] 
    });
  }

  //metodo para desetruir usuario
  async destroy(email: string): Promise<void> {
    await this.usersRepository.findOneByOrFail({ email });
    await this.usersRepository.softDelete({ email });
  }

  //metodo para buscar usuario com algum criterio
  async findByCriteria(
    where: FindOptionsWhere<UserEntity> | FindOptionsWhere<UserEntity>[],
  ): Promise<UserEntity[]> {
    return this.usersRepository.find({
      where,
      select: ['id', 'firstName', 'email'],
    });
  }

  //metodo para buscar usuario por email
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

  //metodo para salvar usuario no banco
  async save(user: UserEntity): Promise<UserEntity> {
    return this.usersRepository.save(user);
  }

  async findByResetPasswordExpiresGreaterThan(date: Date): Promise<UserEntity[]> {
    return this.usersRepository.find({
      where: {
        resetPasswordExpires: MoreThan(date)
      }
    });
  }

  async updateUser(updateUserDto: UpdateUserDto): Promise<UserEntity> {
    console.log('🔄 [UsersService] Iniciando updateUser:', {
      id: updateUserDto.id,
      hasId: !!updateUserDto.id,
      camposParaAtualizar: Object.keys(updateUserDto).filter(key => updateUserDto[key] !== undefined)
    });

    // ✅ VERIFICAÇÃO MAIS ROBUSTA DO ID
    if (!updateUserDto.id || updateUserDto.id.trim() === '') {
      console.error('❌ [UsersService] ID não fornecido ou vazio');
      throw new NotFoundException('ID do usuário é obrigatório');
    }

    const userId = updateUserDto.id.trim();
    console.log('🔑 [UsersService] Usando ID:', userId);

    // ✅ BUSCAR USUÁRIO
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      console.error('❌ [UsersService] Usuário não encontrado com ID:', userId);
      throw new NotFoundException('Usuário não encontrado');
    }

    console.log('✅ [UsersService] Usuário encontrado:', user.id);

    // ✅ ATUALIZAR DADOS BÁSICOS APENAS SE FORNECIDOS
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

    // ✅ ATUALIZAR ENDEREÇO COM TRATAMENTO SEGURO
    if (updateUserDto.address) {
      console.log('🏠 [UsersService] Atualizando endereço...');
      
      // ✅ GARANTIR QUE user.address EXISTE E TEM TIPO CORRETO
      if (!user.address || typeof user.address !== 'object') {
        user.address = {};
      }

      // ✅ CRIAR REFERÊNCIA LOCAL PARA EVITAR ERROS DE UNDEFINED
      const userAddress = user.address as Record<string, any>;
      
      // Atualizar campos do endereço apenas se fornecidos
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

      // ✅ REASSIGNAR PARA GARANTIR QUE AS MUDANÇAS SEJAM DETECTADAS
      user.address = { ...userAddress };
      console.log('✅ [UsersService] Endereço atualizado:', user.address);
    }

    // ✅ SALVAR NO BANCO
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

  // Método corrigido com validação de retorno
  async getUserById(id: string): Promise<UserEntity> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }
}