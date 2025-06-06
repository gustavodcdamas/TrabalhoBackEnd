import { PartialType } from '@nestjs/mapped-types';
import { CreateCriativoDto } from './create-criativo.dto';
import { Column } from 'typeorm';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCriativoDto extends PartialType(CreateCriativoDto) {

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
    
    @Column()
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    @MaxLength(200, { message: 'O nome não pode ter mais de 200 caracteres' })
    descricao?: string;
}

export class UpdateCriativoWithImageDto extends UpdateCriativoDto {
    file?: Express.Multer.File;
}
