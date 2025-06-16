// src/users/dto/update-user-verification.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { IsDate, IsOptional, IsString } from 'class-validator';

export class UpdateUserVerificationDto {
  @IsOptional()
  @IsString()
  resetPasswordTokenHash?: string | null;

  @IsOptional()
  @IsDate()
  resetPasswordExpires?: Date | null;
  
  emailVerificationToken?: string;
  isEmailVerified?: boolean;
}