import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Repository, FindOptionsWhere, FindOneOptions } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import * as crypto from "crypto";
import { UpdateUserVerificationDto } from './dto/update-user-verification.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    const existingUser = await this.findOneByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email já está em uso');
    }

    const user = this.usersRepository.create({
      ...createUserDto,
      emailVerificationToken: crypto.randomBytes(32).toString('hex'),
      isEmailVerified: false
    });

    return this.usersRepository.save(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.usersRepository.findOneByOrFail({ id });
    this.usersRepository.merge(user, updateUserDto);
    return this.usersRepository.save(user);
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
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  async findAll(): Promise<UserEntity[]> {
    return this.usersRepository.find({
      select: ['id', 'firstName', 'lastName', 'email'],
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
    this.usersRepository.merge(user, data);
    return this.usersRepository.save(user);
  }

  async findOneById(id: string): Promise<UserEntity> {
    return this.usersRepository.findOneByOrFail({ id });
  }

  async destroy(id: string): Promise<void> {
    await this.usersRepository.findOneByOrFail({ id });
    await this.usersRepository.softDelete({ id });
  }

  async findByCriteria(
    where: FindOptionsWhere<UserEntity> | FindOptionsWhere<UserEntity>[],
  ): Promise<UserEntity[]> {
    return this.usersRepository.find({
      where,
      select: ['id', 'firstName', 'email'],
    });
  }

  async findOneByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect(['user.password', 'user.isAdmin', 'user.isSuperAdmin'])
      .where('user.email = :email', { email })
      .getOne();
  }
}
