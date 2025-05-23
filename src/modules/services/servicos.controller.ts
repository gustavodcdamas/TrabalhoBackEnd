import { Controller, Get, Post, Delete, Patch, Body, Param, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ServicosService } from './servicos.service';
import { UploadsService } from '../uploads/uploads.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateServicosDto, ServicosWithImageDto } from './dto/create-servicos.dto';
import { UpdateServicosDto } from './dto/update-servicos.dto';
import { Servicos } from './entities/servicos.entity';

@Controller('api/servicos')
export class ServicosController {
  constructor(
  private ServicosService: ServicosService,
  private readonly uploadsService: UploadsService,
  ) {}

  @Get('redis-test')
  async testRedis() {
    return this.ServicosService.checkRedisConnection();
  }

  @Get('cache-test')
  async cacheTest() {
  
    await this.ServicosService.setCacheValue('test_key', 'test_value');
    
    const value = await this.ServicosService.getCacheValue('test_key');
    
    return {
      set: 'test_value',
      get: value
    };
  }

  @Get('cache-clear')
  async cacheClear() {
    await this.ServicosService.clearCache();
    return { message: 'Cache cleared' };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() CreateServicosDto: ServicosWithImageDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Servicos> {

    if (file) {
      const processedImage = await this.uploadsService.processUploadedImage(file);
      CreateServicosDto.icon = processedImage.medium;
    }

    return this.ServicosService.create(CreateServicosDto);
  }

  @Get()
  findAll(): Promise<Servicos[]> {
    return this.ServicosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Servicos> {
    return this.ServicosService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string): Promise<void> {
    return this.ServicosService.remove(id);
  }
}