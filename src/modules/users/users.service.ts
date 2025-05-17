import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Repository, FindOptionsWhere, FindOneOptions, MoreThan } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import * as crypto from "crypto";
import * as bcrypt from 'bcrypt';
import { UpdateUserVerificationDto } from './dto/update-user-verification.dto';

@Injectable()
export class UsersService {

  //construtor que injeta a entidade usuarios
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  //metodo para criar um novo usuario
  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    const token = crypto.randomBytes(32).toString('hex');

    const user = this.usersRepository.create({
      ...createUserDto,
      password: await bcrypt.hash(createUserDto.password, 10),
      isEmailVerified: false,
      emailVerificationToken: token,
    });

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
    this.usersRepository.merge(user, updateUserDto);
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
    const user = this.usersRepository.create(data);
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
    this.usersRepository.merge(user, data);
    return this.usersRepository.save(user);
  }

  //metodo para buscar usuario pelo id
  async findOneById(id: string): Promise<UserEntity> {
    return this.usersRepository.findOneByOrFail({ id });
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
  async findOneByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password') // Apenas o necessário para validação
      .where('user.email = :email', { email })
      .getOne();
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
}
