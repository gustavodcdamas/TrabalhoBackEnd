import { Injectable } from '@nestjs/common';
import { CreateCriativoDto } from './dto/create-criativo.dto';
import { UpdateCriativoDto } from './dto/update-criativo.dto';

@Injectable()
export class CriativosService {
  create(createCriativoDto: CreateCriativoDto) {
    return 'This action adds a new criativo';
  }

  findAll() {
    return `This action returns all criativos`;
  }

  findOne(id: number) {
    return `This action returns a #${id} criativo`;
  }

  update(id: number, updateCriativoDto: UpdateCriativoDto) {
    return `This action updates a #${id} criativo`;
  }

  remove(id: number) {
    return `This action removes a #${id} criativo`;
  }
}
