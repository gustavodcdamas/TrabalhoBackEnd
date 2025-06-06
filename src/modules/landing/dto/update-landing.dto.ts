import { PartialType } from '@nestjs/mapped-types';
import { CreateLandingDto } from './create-landing.dto';
import { Column } from 'typeorm';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateLandingDto extends PartialType(CreateLandingDto) {
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

export class updateLandingWithImageDto extends UpdateLandingDto {
  file?: Express.Multer.File;
}