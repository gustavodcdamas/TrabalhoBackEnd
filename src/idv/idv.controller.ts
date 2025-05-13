import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { IdvService } from './idv.service';
import { CreateIdvDto } from './dto/create-idv.dto';
import { UpdateIdvDto } from './dto/update-idv.dto';

@Controller('idv')
export class IdvController {
  constructor(private readonly idvService: IdvService) {}

  @Post()
  create(@Body() createIdvDto: CreateIdvDto) {
    return this.idvService.create(createIdvDto);
  }

  @Get()
  findAll() {
    return this.idvService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.idvService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateIdvDto: UpdateIdvDto) {
    return this.idvService.update(+id, updateIdvDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.idvService.remove(+id);
  }
}
