import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  Matches,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ClienteStatus } from '../entity/cliente.entity';

export class CreateClienteDto {
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @IsString()
  @MaxLength(100, { message: 'O nome não pode ter mais de 100 caracteres' })
  nome: string;

  @IsNotEmpty({ message: 'Email é obrigatório' })
  @IsEmail({}, { message: 'Email inválido' })
  @MaxLength(255, { message: 'Email muito longo' })
  email: string;

  @IsNotEmpty({ message: 'Telefone é obrigatório' })
  @IsString()
  @Matches(/^\(\d{2}\) \d{5}-\d{4}$/, { 
    message: 'Formato de telefone inválido. Use: (00) 00000-0000' 
  })
  telefone: string;

  @IsOptional()
  @IsEnum(ClienteStatus, { message: 'Status deve ser ativo ou inativo' })
  status?: ClienteStatus;
}
