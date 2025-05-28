import { IsString, IsNotEmpty, IsPhoneNumber } from 'class-validator';

export class SendMessageDto {

  @IsPhoneNumber()
  @IsNotEmpty()
  phoneNumberDest: string;

  @IsString()
  @IsNotEmpty()
  menssagemDest?: string;

  @IsString()
  @IsNotEmpty()
  contactName?: string;
}