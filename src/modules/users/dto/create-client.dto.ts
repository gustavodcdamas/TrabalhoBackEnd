import { UserRole } from '../../../enums/user-role.enum';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class CreateClientDto {
  @IsNotEmpty({ message: 'O nome não pode estar vazio' })
  @IsString()
  @MinLength(2, { message: 'O nome deve ter pelo menos 2 caracteres' })
  @MaxLength(50, { message: 'O nome não pode ter mais de 50 caracteres' })
  firstName: string;

  @IsNotEmpty({ message: 'O sobrenome não pode estar vazio' })
  @IsString()
  @MinLength(2, { message: 'O sobrenome deve ter pelo menos 2 caracteres' })
  @MaxLength(50, { message: 'O sobrenome não pode ter mais de 50 caracteres' })
  lastName: string;

  @IsNotEmpty({ message: 'O email não pode estar vazio' })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @Matches(/^\(\d{2}\) \d{5}-\d{4}$/, { 
    message: 'Formato de telefone inválido. Use: (00) 00000-0000' 
  })
  telefone?: string;

  @IsNotEmpty({ message: 'A senha não pode estar vazia' })
  @IsString()
  @MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'A senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um símbolo especial'
  })
  password: string;

  @IsOptional()
  @IsBoolean({ message: 'isClient deve ser um valor booleano' })
  isClient?: boolean = true;

  @IsOptional()
  role?: UserRole = UserRole.CLIENT;
}