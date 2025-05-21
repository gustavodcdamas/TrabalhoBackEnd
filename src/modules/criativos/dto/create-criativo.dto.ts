import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { Column } from "typeorm";

export class CreateCriativoDto {
    @Column()
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    @MaxLength(50, { message: 'O nome não pode ter mais de 50 caracteres' })
    title: string;
        
    @Column()
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(50, { message: 'O nome não pode ter mais de 50 caracteres' })
    image?: string;
        
    @Column()
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    @MaxLength(200, { message: 'A mensagem não pode ter mais de 200 caracteres' })
    descricao: string;
}

export class CriativoWithImageDto extends CreateCriativoDto {
    file?: Express.Multer.File;
}