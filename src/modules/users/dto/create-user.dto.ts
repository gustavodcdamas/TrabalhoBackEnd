import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsBoolean, Matches } from 'class-validator';
import { UserRole } from '../../../enums/user-role.enum';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsOptional()
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;

  @IsOptional()
  @IsString()
  resetPasswordTokenHash?: string | null;

  @IsOptional()
  resetPasswordExpires?: Date | null;

  @IsOptional()
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsString()
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
  @IsString({ message: 'Phone must be a string' })
  @Matches(/^\(\d{2}\) \d{5}-\d{4}$/, { 
    message: 'Formato de telefone inválido. Use: (00) 00000-0000' 
  })
  telefone?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsString()
  complemento?: string;
}