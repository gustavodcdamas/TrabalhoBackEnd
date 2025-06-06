import { PartialType } from '@nestjs/mapped-types';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from "crypto";
import { MessagesHelper } from '../../../common/helper/messages.helper';
import { RegExHelper } from '../../../common/helper/regex.helper';
import { UserRole } from 'src/modules/users/enums/user-role.enum';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @IsString()
  @Length(8, 100)
  @Matches(RegExHelper.password, { message: MessagesHelper.PASSWORD_VALID })
  password: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  firstName: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  lastName: string;

  @IsOptional()
  @IsEnum(UserRole)
  role: UserRole = UserRole.CLIENT; // Valor padrão
}