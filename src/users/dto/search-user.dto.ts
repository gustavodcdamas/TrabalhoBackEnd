import { IsOptional, IsString } from 'class-validator';

export class SearchUserDto {
  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  email?: string;
}
