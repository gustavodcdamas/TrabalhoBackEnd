// update-user.dto.ts
import { IsNotEmpty, IsString, Length, Validate, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { CpfValidator } from '../../../validators/cpf.validator';
import { CepValidator } from '../../../validators/cep.validator';
import { UserRole } from '../../../enums/user-role.enum';

class AddressDto {
  @IsOptional() // Alterado para opcional
  @Validate(CepValidator)
  cep?: string; // Alterado para opcional

  @IsOptional() // Alterado para opcional
  logradouro?: string;

  @IsOptional() // Alterado para opcional
  bairro?: string;

  @IsOptional() // Alterado para opcional
  cidade?: string;

  @IsOptional() // Alterado para opcional
  @Length(2, 2)
  estado?: string;

  @IsOptional() // Alterado para opcional
  numero?: string;

  @IsOptional()
  complemento?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsEnum(UserRole) // Corrigido para usar enum
  role?: UserRole; // Corrigido o tipo

  @IsOptional()
  @IsString()
  resetPasswordTokenHash?: string | null;

  @IsOptional()
  resetPasswordExpires?: Date | null;

  @IsOptional()
  @IsString()
  emailVerificationToken?: string;

  @IsOptional()
  isEmailVerified?: boolean;

  @IsOptional()
  emailVerified?: boolean;

  @IsOptional()
  accountDisabled?: boolean;

  @IsOptional()
  @Validate(CpfValidator)
  cpf?: string;

  @IsOptional()
  @Validate(CepValidator)
  cep?: string;

  @IsOptional()
  @IsString()
  logradouro?: string;

  @IsOptional()
  @IsString()
  bairro?: string;

  @IsOptional()
  @IsString()
  cidade?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsString()
  complemento?: string;

  @IsOptional()
  address?: AddressDto;
}