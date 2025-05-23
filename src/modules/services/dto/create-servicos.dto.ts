import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { Column } from "typeorm";

export class CreateServicosDto {
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
  icon?: string;
}

export class ServicosWithImageDto extends CreateServicosDto {
  file?: Express.Multer.File;
}