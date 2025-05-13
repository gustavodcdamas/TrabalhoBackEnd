import { SearchUserDto } from './dto/search-user.dto';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindOptionsWhere, Like } from 'typeorm';
import { UserEntity } from './entities/user.entity';

@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /*@Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto) {
    try {
      return await this.usersService.create(createUserDto);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.code === '23505') {
        // Código de erro para violação de unique constraint
        throw new ConflictException('Email já está em uso');
      }
      throw error;
    }
  }*/

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto) {
    await this.usersService.create(createUserDto); // Remove a atribuição a uma variável
    return {
      message: 'User created successfully',
    };
  }

  @Get('')
  getHello(): string {
    return 'Hello Users!';
  }

  @Get('all/')
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    // Usando a nova abordagem findOneByOrFail
    return await this.usersService.findOneOrFail({ id });
  }

  @Get('email/:email')
  async findByEmail(@Param('email') email: string) {
    // Exemplo de busca por email
    return await this.usersService.findOneOrFail({ email });
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string, // Validação de UUID
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return await this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return await this.usersService.destroy(id);
    return {
      message: 'User deleted successfully',
    };
  }

  @Get('search')
  async search(@Query() query: SearchUserDto) {
    const where: FindOptionsWhere<UserEntity> = {};

    if (query.first_name) {
      where.first_name = Like(`%${query.first_name}%`);
    }

    if (query.email) {
      where.email = Like(`%${query.email}%`);
    }

    try {
      const users = await this.usersService.findByCriteria(where);
      if (!users || users.length === 0) {
        throw new NotFoundException('No users found matching the criteria');
      }
      return users;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new NotFoundException(error.message);
      }
      throw new NotFoundException('Search failed');
    }
  }
}
