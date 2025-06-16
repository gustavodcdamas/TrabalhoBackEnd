import { PartialType } from '@nestjs/mapped-types';
import { CreateServicosDto } from './create-servicos.dto';
import { Column } from 'typeorm';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateServicosDto extends PartialType(CreateServicosDto) {
  @Column()
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(50, { message: 'O título não pode ter mais de 50 caracteres' })
  titulo?: string;
  
  @Column()
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100, { message: 'O ícone não pode ter mais de 100 caracteres' })
  icon?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @Column()
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(200, { message: 'A descrição não pode ter mais de 200 caracteres' })
  descricao?: string;
}

export class UpdateServicosWithImageDto extends UpdateServicosDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'Arquivo de ícone' })
  file?: Express.Multer.File;
}