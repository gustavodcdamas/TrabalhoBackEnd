import { PartialType } from '@nestjs/mapped-types';
import { CreateInstitucionalDto } from './create-institucional.dto';
import { Column } from 'typeorm';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Institucional } from '../entities/institucional.entity';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateInstitucionalDto extends PartialType(CreateInstitucionalDto) {
  @Column()
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(50, { message: 'O nome não pode ter mais de 50 caracteres' })
  titulo?: string;
  
  @Column()
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100, { message: 'O nome não pode ter mais de 100 caracteres' })
  image?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @Column()
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(200, { message: 'O nome não pode ter mais de 200 caracteres' })
  descricao?: string;
}

export class updateLandingWithImageDto extends UpdateInstitucionalDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'Arquivo de imagem' })
  file?: Express.Multer.File;
}