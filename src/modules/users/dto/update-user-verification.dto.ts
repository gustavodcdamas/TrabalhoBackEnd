// src/users/dto/update-user-verification.dto.ts
import { PartialType } from '@nestjs/mapped-types';

export class UpdateUserVerificationDto {
  emailVerificationToken?: string;
  isEmailVerified?: boolean;
}