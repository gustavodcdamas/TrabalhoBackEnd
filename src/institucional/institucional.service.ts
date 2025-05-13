import { Injectable } from '@nestjs/common';
import { CreateInstitucionalDto } from './dto/create-institucional.dto';
import { UpdateInstitucionalDto } from './dto/update-institucional.dto';

@Injectable()
export class InstitucionalService {
  create(createInstitucionalDto: CreateInstitucionalDto) {
    return 'This action adds a new institucional';
  }

  findAll() {
    return `This action returns all institucional`;
  }

  findOne(id: number) {
    return `This action returns a #${id} institucional`;
  }

  update(id: number, updateInstitucionalDto: UpdateInstitucionalDto) {
    return `This action updates a #${id} institucional`;
  }

  remove(id: number) {
    return `This action removes a #${id} institucional`;
  }
}
