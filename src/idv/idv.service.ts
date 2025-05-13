import { Injectable } from '@nestjs/common';
import { CreateIdvDto } from './dto/create-idv.dto';
import { UpdateIdvDto } from './dto/update-idv.dto';

@Injectable()
export class IdvService {
  create(createIdvDto: CreateIdvDto) {
    return 'This action adds a new idv';
  }

  findAll() {
    return `This action returns all idv`;
  }

  findOne(id: number) {
    return `This action returns a #${id} idv`;
  }

  update(id: number, updateIdvDto: UpdateIdvDto) {
    return `This action updates a #${id} idv`;
  }

  remove(id: number) {
    return `This action removes a #${id} idv`;
  }
}
