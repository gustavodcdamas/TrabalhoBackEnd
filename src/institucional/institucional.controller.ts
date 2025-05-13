import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { InstitucionalService } from './institucional.service';
import { CreateInstitucionalDto } from './dto/create-institucional.dto';
import { UpdateInstitucionalDto } from './dto/update-institucional.dto';

@Controller('institucional')
export class InstitucionalController {
  constructor(private readonly institucionalService: InstitucionalService) {}

  @Post()
  create(@Body() createInstitucionalDto: CreateInstitucionalDto) {
    return this.institucionalService.create(createInstitucionalDto);
  }

  @Get()
  findAll() {
    return this.institucionalService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.institucionalService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInstitucionalDto: UpdateInstitucionalDto) {
    return this.institucionalService.update(+id, updateInstitucionalDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.institucionalService.remove(+id);
  }
}
