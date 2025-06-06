import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { Institucional } from '../entities/institucional.entity';
import { Column } from "typeorm";

export class CreateInstitucionalDto {
    @Column()
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    @MaxLength(50, { message: 'O titulo não pode ter mais de 50 caracteres' })
    titulo: string;

    @Column()
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(100, { message: 'O icone não pode ter mais de 100 caracteres' })
    image?: string;

    @Column()
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    @MaxLength(200, { message: 'A mensagem não pode ter mais de 200 caracteres' })
    descricao: string;
}

export class InstitucionalWithImageDto extends CreateInstitucionalDto {
  file?: Express.Multer.File;
}