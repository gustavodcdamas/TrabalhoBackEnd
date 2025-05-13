import { Injectable } from '@nestjs/common';
import { CreateLandingDto } from './dto/create-landing.dto';
import { UpdateLandingDto } from './dto/update-landing.dto';

@Injectable()
export class LandingService {
  create(createLandingDto: CreateLandingDto) {
    return 'This action adds a new landing';
  }

  findAll() {
    return `This action returns all landing`;
  }

  findOne(id: number) {
    return `This action returns a #${id} landing`;
  }

  update(id: number, updateLandingDto: UpdateLandingDto) {
    return `This action updates a #${id} landing`;
  }

  remove(id: number) {
    return `This action removes a #${id} landing`;
  }
}
