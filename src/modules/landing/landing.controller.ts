import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, UnauthorizedException, UploadedFile, UseInterceptors, UsePipes, ValidationPipe } from '@nestjs/common';
import { LandingService } from './landing.service';
import { CreateLandingDto, LandingWithImageDto } from './dto/create-landing.dto';
import { UpdateLandingDto, updateLandingWithImageDto } from './dto/update-landing.dto';
import { UploadsService } from '../uploads/uploads.service';
import { LoggerService } from '../logger/logger.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { SanitizePipe } from 'src/common/sanitize.pipe';
import { Request } from 'express';
import { Landing } from './entities/landing.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@Controller('api/landing')
export class LandingController {
  constructor(
    private readonly landingService: LandingService,
    private readonly uploadsService: UploadsService,
    private logger: LoggerService,
  ) {}

  @Get('redis-test')
  async testRedis() {
    return this.landingService.checkRedisConnection();
  }

  @Get('cache-test')
  async cacheTest() {
  
    await this.landingService.setCacheValue('test_key', 'test_value');
    
    const value = await this.landingService.getCacheValue('test_key');
    
    return {
      set: 'test_value',
      get: value
    };
  }

  @Get('cache-clear')
  async cacheClear() {
    await this.landingService.clearCache();
    return { message: 'Cache cleared' };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @UsePipes(new SanitizePipe({
    titulo: 'name',       // Sanitiza como nome
    descricao: 'text',    // Sanitiza como texto
    icon: 'url',
    image: 'url'
  }), new ValidationPipe())
  async create(
    @Body() createLandingDto: LandingWithImageDto,
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Landing> {
    if (!req.user) {
      this.logger.error(
        'Tentativa de criação de Landing sem usuário autenticado',
        '',
        'LandingController'
      );
      throw new UnauthorizedException('Usuário não autenticado');
    }

    // Agora o TypeScript sabe que req.user tem email e firstName
    const userEmail = req.user.email;
    const userName = req.user.firstName;
    
    try {
      this.logger.log(
        `Usuário ${userName} (${userEmail}) iniciando criação de Landing`,
        'LandingController'
      );

      if (file) {
        this.logger.log(
          `Processando upload de imagem para novo Landing`,
          'LandingController'
        );
        const processedImage = await this.uploadsService.processUploadedImage(file);
        createLandingDto.image = processedImage.medium;
      }

      const result = await this.landingService.create(createLandingDto);
      
      this.logger.log(
        `Landing criado com sucesso por ${userName} (${userEmail}). ID: ${result.id}`,
        'LandingController'
      );
      
      return result;
    } catch (error) {
      this.logger.error(
        `Falha na criação de Landing por ${userName} (${userEmail}): ${error.message}`,
        error.stack,
        'LandingController'
      );
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @UsePipes(new SanitizePipe({
    titulo: 'name',
    descricao: 'text',
    icon: 'url',
    image: 'url'
  }), new ValidationPipe())
  async update(
    @Param('id') id: string,
    @Body() updateLandingDto: updateLandingWithImageDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Landing> {
    try {
      if (file) {
        const processedImage = await this.uploadsService.processUploadedImage(file);
        updateLandingDto.image = processedImage.medium;
      }
      
      return await this.landingService.update(id, updateLandingDto);
    } catch (error) {
      this.logger.error(
        `Falha na atualização do Landing ID ${id}: ${error.message}`,
        error.stack,
        'LandingController'
      );
      throw error;
    }
  }

  @Get()
  findAll(): Promise<Landing[]> {
    return this.landingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Landing> {
    return this.landingService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string): Promise<void> {
    return this.landingService.remove(id);
  }
}
