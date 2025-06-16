import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { Criativo } from '../entities/criativo.entity';
import { Column } from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

export class CreateCriativoDto {
  @IsOptional() // Opcional se você vai gerar automaticamente no service
  @IsString()
  @MinLength(2)
  @MaxLength(50, { message: 'O titulo não pode ter mais de 50 caracteres' })
  titulo?: string;

  @IsNotEmpty({ message: 'Cliente é obrigatório' })
  @IsString()
  @MinLength(2)
  @MaxLength(50, { message: 'O cliente não pode ter mais de 50 caracteres' })
  cliente: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100, { message: 'A imagem não pode ter mais de 100 caracteres' })
  image?: string;

  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  @IsString()
  @MinLength(2)
  @MaxLength(200, { message: 'A descrição não pode ter mais de 200 caracteres' })
  descricao: string;
}

export class CriativoWithImageDto extends CreateCriativoDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'Arquivo de imagem' })
  file?: Express.Multer.File;
  declare image?: string;
}