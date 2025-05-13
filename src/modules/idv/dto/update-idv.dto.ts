import { PartialType } from '@nestjs/mapped-types';
import { CreateIdvDto } from './create-idv.dto';

export class UpdateIdvDto extends PartialType(CreateIdvDto) {}
