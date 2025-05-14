import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { MessagesHelper } from '../../../common/helper/messages.helper';
import { RegExHelper } from '../../../common/helper/regex.helper';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100, { message: 'O nome não pode ter mais de 100 caracteres' })
  first_name: string;

  @IsString()
  @MinLength(2)
  @IsNotEmpty()
  @MaxLength(100, { message: 'O último nome não pode ter mais de 100 caracteres' })
  last_name: string;

  @IsNotEmpty({ message: 'O email não pode estar vazio' })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsNotEmpty()
  @IsString()
  @Matches(RegExHelper.password, { message: MessagesHelper.PASSWORD_VALID })
  password: string;
}
