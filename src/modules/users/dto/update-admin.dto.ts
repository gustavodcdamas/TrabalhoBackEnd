// src/users/dto/update-admin.dto.ts
import { UserRole } from '../../../enums/user-role.enum';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  IsEnum,
} from 'class-validator';

export class UpdateAdminDto {
  @IsOptional()
  @IsString({ message: 'Nome deve ser uma string' })
  @MinLength(2, { message: 'O nome deve ter pelo menos 2 caracteres' })
  @MaxLength(50, { message: 'O nome não pode ter mais de 50 caracteres' })
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'Sobrenome deve ser uma string' })
  @MinLength(2, { message: 'O sobrenome deve ter pelo menos 2 caracteres' })
  @MaxLength(50, { message: 'O sobrenome não pode ter mais de 50 caracteres' })
  lastName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'A senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um símbolo especial'
  })
  password?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Role deve ser admin ou super_admin' })
  role?: UserRole.ADMIN | UserRole.SUPER_ADMIN;
}