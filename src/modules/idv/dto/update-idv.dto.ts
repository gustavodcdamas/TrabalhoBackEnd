import { PartialType } from '@nestjs/mapped-types';
import { CreateIdvDto } from './create-idv.dto';
import { Column } from 'typeorm';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateIdvDto extends PartialType(CreateIdvDto) {
  @ApiProperty({ 
    description: 'Título do projeto de identidade visual',
    example: 'Identidade Visual Empresa ABC',
    required: false
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  titulo?: string;

  @ApiProperty({ 
    description: 'Nome do cliente',
    example: 'Empresa ABC Ltda'
  })
  @IsNotEmpty({ message: 'Cliente é obrigatório' })
  @IsString()
  @MinLength(3, { message: 'Cliente deve ter pelo menos 3 caracteres' })
  @MaxLength(255)
  cliente: string;

  @ApiProperty({ 
    description: 'Descrição detalhada do projeto',
    example: 'Desenvolvimento completo da identidade visual incluindo logo, cores, tipografia e aplicações.'
  })
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  @IsString()
  @MinLength(10, { message: 'Descrição deve ter pelo menos 10 caracteres' })
  descricao: string;

  @ApiProperty({ 
    description: 'Caminho da imagem principal',
    example: '/uploads/idv/logo-empresa-abc.jpg',
    required: false
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ 
    description: 'Status do projeto',
    example: 'ativo',
    enum: ['ativo', 'inativo', 'excluido'],
    default: 'ativo'
  })
  @IsOptional()
  @IsString()
  status?: string;
}

export class updateIdvWithImageDto extends UpdateIdvDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'Arquivo de imagem' })
  file?: Express.Multer.File;
  declare image?: string;
}
