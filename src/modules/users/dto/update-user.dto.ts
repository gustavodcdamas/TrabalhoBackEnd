// update-user.dto.ts - VERSÃO SIMPLIFICADA PARA DEBUG
import { IsOptional, IsString, IsUUID, Length, IsEmail, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @IsOptional()
  @IsUUID(4, { message: 'ID deve ser um UUID válido' })
  id?: string;

  @IsOptional()
  @IsString({ message: 'Nome deve ser uma string' })
  @Length(1, 50, { message: 'Nome deve ter entre 1 e 50 caracteres' })
  firstName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email deve ser válido' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Sobrenome deve ser uma string' })
  @Length(1, 50, { message: 'Sobrenome deve ter entre 1 e 50 caracteres' })
  lastName?: string;

  @IsOptional()
  @IsString({ message: 'Username deve ser uma string' })
  @Length(3, 30, { message: 'Username deve ter entre 3 e 30 caracteres' })
  username?: string;

  @IsOptional()
  @IsString({ message: 'Password deve ser uma string' })
  password?: string;

  @IsOptional()
  @IsString({ message: 'Role deve ser uma string' })
  role?: string;

  @IsOptional()
  @IsString({ message: 'CPF deve ser uma string' })
  @Length(11, 11, { message: 'CPF deve ter exatamente 11 dígitos' })
  cpf?: string;

  @IsOptional()
  isEmailVerified?: boolean;

  @IsOptional()
  emailVerified?: boolean;

  @IsOptional()
  accountDisabled?: boolean;

  // ✅ ENDEREÇO SIMPLIFICADO - SEM VALIDAÇÕES COMPLEXAS
  @IsOptional()
  @ApiProperty({ 
    description: 'Dados do endereço',
    type: 'object',
    properties: {
      cep: { type: 'string', description: 'CEP com 8 dígitos' },
      logradouro: { type: 'string' },
      bairro: { type: 'string' },
      cidade: { type: 'string' },
      estado: { type: 'string' },
      numero: { type: 'string' },
      complemento: { type: 'string' }
    }
  })
  address?: {
    cep?: string;
    logradouro?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    numero?: string;
    complemento?: string;
  };

  // ✅ CAMPOS INDIVIDUAIS DE ENDEREÇO (PARA COMPATIBILIDADE)
  @IsOptional()
  @IsString({ message: 'CEP deve ser uma string' })
  cep?: string;

  @IsOptional()
  @IsString({ message: 'Logradouro deve ser uma string' })
  logradouro?: string;

  @IsOptional()
  @IsString({ message: 'Bairro deve ser uma string' })
  bairro?: string;

  @IsOptional()
  @IsString({ message: 'Cidade deve ser uma string' })
  cidade?: string;

  @IsOptional()
  @IsString({ message: 'Estado deve ser uma string' })
  estado?: string;

  @IsOptional()
  @IsString({ message: 'Número deve ser uma string' })
  numero?: string;

  @IsOptional()
  @IsString({ message: 'Complemento deve ser uma string' })
  complemento?: string;

  // ✅ CAMPOS DE RESET DE SENHA
  @IsOptional()
  @IsString()
  resetPasswordTokenHash?: string | null;

  @IsOptional()
  resetPasswordExpires?: Date | null;

  @IsOptional()
  @IsString()
  emailVerificationToken?: string;

  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @Matches(/^\(\d{2}\) \d{5}-\d{4}$/, { 
    message: 'Formato de telefone inválido. Use: (00) 00000-0000' 
  })
  telefone?: string;
}

// ✅ DTO AINDA MAIS SIMPLES PARA TESTE
export class SimpleUpdateUserDto {
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
  cpf?: string;
}