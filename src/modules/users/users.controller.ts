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
  UseGuards,
  Req,
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

@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: RequestWithUser) {
    return this.usersService.findOneOrFail({ id: req.user.id });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto) {
    await this.usersService.create(createUserDto);
    return { message: 'User created successfully' };
  }

  @Get('hello')
  getHello(): string {
    return 'Hello Users!';
  }

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOneOrFail({ id });
  }

  @Get('email/:email')
  async findByEmail(@Param('email') email: string) {
    return this.usersService.findOneOrFail({ email });
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':email')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('email', ParseUUIDPipe) email: string) {
    await this.usersService.destroy(email);
  }

  @Get('search')
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
}
