import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ClienteStatus } from '../entity/cliente.entity';

export class SearchClienteDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsEnum(ClienteStatus)
  status?: ClienteStatus;

  @IsOptional()
  @IsString()
  search?: string; // busca geral
}