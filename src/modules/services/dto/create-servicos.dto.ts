import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { Column } from "typeorm";

export class CreateServicosDto {
  @ApiProperty({
    example: 'Design Gráfico',
    description: 'Título do serviço',
  })
  @Column()
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(50, { message: 'O nome não pode ter mais de 50 caracteres' })
  titulo: string;

  @ApiProperty({
    example: 'imagem.jpg, imagem.png, imagem.jpeg',
    description: 'Imagem do serviço',
  })
  @Column()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50, { message: 'O nome não pode ter mais de 50 caracteres' })
  icon?: string;

  @ApiProperty({
    example: 'Criação de identidade visual',
    description: 'Descrição detalhada do serviço',
  })
  @Column()
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(200, { message: 'A mensagem não pode ter mais de 200 caracteres' })
  descricao: string;
}

export class ServicosWithImageDto extends CreateServicosDto {
  file?: Express.Multer.File;
}