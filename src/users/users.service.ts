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

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<void> {
    // Retorno void
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email já está em uso');
    }

    const user = this.usersRepository.create(createUserDto);
    await this.usersRepository.save(user);
  }

  async store(data: CreateUserDto) {
    const user = this.usersRepository.create(data);
    return await this.usersRepository.save(user);
  }

  async findAll() {
    return await this.usersRepository.find({
      select: ['id', 'first_name', 'last_name', 'email'],
    });
  }

  async findOneOrFail(
    where: FindOptionsWhere<UserEntity> | FindOptionsWhere<UserEntity>[],
    options?: Omit<FindOneOptions<UserEntity>, 'where'>,
  ) {
    try {
      return await this.usersRepository.findOneOrFail({
        where,
        ...options,
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new NotFoundException('User not found');
    }
  }

  async update(id: string, data: UpdateUserDto) {
    const user = await this.usersRepository.findOneByOrFail({ id });
    this.usersRepository.merge(user, data);
    return await this.usersRepository.save(user);
  }
  async destroy(id: string) {
    await this.usersRepository.findOneByOrFail({ id });
    void this.usersRepository.softDelete({ id });
  }
  async findByCriteria(
    where: FindOptionsWhere<UserEntity> | FindOptionsWhere<UserEntity>[],
  ) {
    return await this.usersRepository.find({
      where,
      select: ['id', 'first_name', 'email'], // Campos que você quer retornar
    });
  }

  getHello(): string {
    return 'Hello Users!';
  }
}
