import { PartialType } from '@nestjs/mapped-types';
import { CreateInstitucionalDto } from './create-institucional.dto';

export class UpdateInstitucionalDto extends PartialType(CreateInstitucionalDto) {}
