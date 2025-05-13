import { PartialType } from '@nestjs/mapped-types';
import { CreateCriativoDto } from './create-criativo.dto';

export class UpdateCriativoDto extends PartialType(CreateCriativoDto) {}
