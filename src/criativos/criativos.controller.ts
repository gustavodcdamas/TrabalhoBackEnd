import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CriativosService } from './criativos.service';
import { CreateCriativoDto } from './dto/create-criativo.dto';
import { UpdateCriativoDto } from './dto/update-criativo.dto';

@Controller('criativos')
export class CriativosController {
  constructor(private readonly criativosService: CriativosService) {}

  @Post()
  create(@Body() createCriativoDto: CreateCriativoDto) {
    return this.criativosService.create(createCriativoDto);
  }

  @Get()
  findAll() {
    return this.criativosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.criativosService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCriativoDto: UpdateCriativoDto) {
    return this.criativosService.update(+id, updateCriativoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.criativosService.remove(+id);
  }
}
