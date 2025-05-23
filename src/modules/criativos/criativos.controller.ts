import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { criativosService } from './criativos.service';
import { CreateCriativoDto, CriativoWithImageDto } from './dto/create-criativo.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateCriativoDto } from './dto/update-criativo.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Criativo } from './entities/criativo.entity';
import { UploadsService } from '../uploads/uploads.service';

@Controller('api/criativos')
export class CriativosController {
  constructor(
    private readonly criativosService: criativosService,
    private readonly uploadsService: UploadsService,
  ) {}

  @Get('redis-test')
  async testRedis() {
    return this.criativosService.checkRedisConnection();
  }

  @Get('cache-test')
  async cacheTest() {

    await this.criativosService.setCacheValue('test_key', 'test_value');
    
    const value = await this.criativosService.getCacheValue('test_key');
    
    return {
      set: 'test_value',
      get: value
    };
  }

  @Get('cache-clear')
  async cacheClear() {
    await this.criativosService.clearCache();
    return { message: 'Cache cleared' };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() createCriativoDto: CriativoWithImageDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Criativo> {

    if (file) {
      const processedImage = await this.uploadsService.processUploadedImage(file);
      createCriativoDto.image = processedImage.medium;
    }

    return this.criativosService.create(createCriativoDto);
  }

  @Get()
  findAll(): Promise<Criativo[]> {
    return this.criativosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Criativo> {
    return this.criativosService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string): Promise<void> {
    return this.criativosService.remove(id);
  }
}
