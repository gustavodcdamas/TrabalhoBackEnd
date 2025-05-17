import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator';


export class UpdateUserDto extends PartialType(CreateUserDto) {
@IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  resetPasswordTokenHash?: string | null;

  @IsOptional()
  @IsDate()
  resetPasswordExpires?: Date | null;

  @IsOptional()
  @IsString()
  emailVerificationToken?: string | null;

  @IsOptional()
  isEmailVerified?: boolean;
}

export class UpdateUserVerificationDto {
  emailVerificationToken?: string;
  isEmailVerified?: boolean;
}