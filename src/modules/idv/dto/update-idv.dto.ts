import { PartialType } from '@nestjs/mapped-types';
import { CreateIdvDto } from './create-idv.dto';
import { Column } from 'typeorm';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateIdvDto extends PartialType(CreateIdvDto) {
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

export class updateIdvWithImageDto extends UpdateIdvDto {
  file?: Express.Multer.File;
}