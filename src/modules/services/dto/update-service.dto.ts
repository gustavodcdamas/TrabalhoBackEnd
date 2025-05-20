import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceDto } from './create-service.dto';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateServiceDto extends PartialType(CreateServiceDto) {
    @IsNotEmpty()
    @IsString()
    title: string;
    
    @IsNotEmpty()
    @IsString()
    icon: string;
}
