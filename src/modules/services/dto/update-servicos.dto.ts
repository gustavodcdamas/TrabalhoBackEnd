import { PartialType } from '@nestjs/mapped-types';
import { CreateServicosDto } from './create-servicos.dto';
import { Column } from 'typeorm';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateServicosDto extends PartialType(CreateServicosDto) {
    @Column()
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    @MaxLength(50, { message: 'O nome não pode ter mais de 50 caracteres' })
    titulo: string;
    
    @Column()
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    @MaxLength(100, { message: 'O nome não pode ter mais de 100 caracteres' })
    icon: string;

    @Column()
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    @MaxLength(200, { message: 'O nome não pode ter mais de 200 caracteres' })
    descricao: string;
}
