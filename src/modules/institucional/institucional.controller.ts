import { Controller, Get, Post, Body, Patch, Param, Delete, Inject, NotFoundException, UseGuards, Req, UnauthorizedException, UploadedFile, UseInterceptors, UsePipes, ValidationPipe, Header, Res } from '@nestjs/common';
import { InstitucionalService } from './institucional.service';
import { CreateInstitucionalDto, InstitucionalWithImageDto } from './dto/create-institucional.dto';
import { UpdateInstitucionalDto } from './dto/update-institucional.dto';
import { Institucional } from './entities/institucional.entity';
import { UploadsService } from '../uploads/uploads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { SanitizePipe } from 'src/common/sanitize.pipe';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { LoggerService } from '../logger/logger.service';
import { Request, Response } from 'express';

@Controller('api/institucional')
export class InstitucionalController {
  constructor(
    private readonly InstitucionalService: InstitucionalService,
    private readonly uploadsService: UploadsService,
    private logger: LoggerService,
  ) {}

  @Get('redis-test')
  async testRedis() {
    return this.InstitucionalService.checkRedisConnection();
  }

  @Get('cache-test')
  async cacheTest() {
  
    await this.InstitucionalService.setCacheValue('test_key', 'test_value');
    
    const value = await this.InstitucionalService.getCacheValue('test_key');
    
    return {
      set: 'test_value',
      get: value
    };
  }

  @Get('cache-clear')
  async cacheClear() {
    await this.InstitucionalService.clearCache();
    return { message: 'Cache cleared' };
  }

  @Get('csrf-token')
  @Header('Cache-Control', 'none')
  getCsrfToken(@Req() req: Request, @Res() res: Response) {
    return res.json({ csrfToken: req.csrfToken() });
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
    @Body() createInstitucionalDto: InstitucionalWithImageDto,
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Institucional> {
    if (!req.user) {
      this.logger.error(
        'Tentativa de criação de Institucional sem usuário autenticado',
        '',
        'InstitucionalController'
      );
      throw new UnauthorizedException('Usuário não autenticado');
    }

    // Agora o TypeScript sabe que req.user tem email e firstName
    const userEmail = req.user.email;
    const userName = req.user.firstName;
    
    try {
      this.logger.log(
        `Usuário ${userName} (${userEmail}) iniciando criação de Institucional`,
        'InstitucionalController'
      );

      if (file) {
        this.logger.log(
          `Processando upload de imagem para novo Institucional`,
          'InstitucionalController'
        );
        const processedImage = await this.uploadsService.processUploadedImage(file);
        createInstitucionalDto.image = processedImage.medium;
      }

      const result = await this.InstitucionalService.create(createInstitucionalDto);
      
      this.logger.log(
        `Institucional criado com sucesso por ${userName} (${userEmail}). ID: ${result.id}`,
        'InstitucionalController'
      );
      
      return result;
    } catch (error) {
      this.logger.error(
        `Falha na criação de Institucional por ${userName} (${userEmail}): ${error.message}`,
        error.stack,
        'InstitucionalController'
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
    @Body() updateInstitucionalDto: UpdateInstitucionalDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Institucional> {
    try {
      if (file) {
        const processedImage = await this.uploadsService.processUploadedImage(file);
        updateInstitucionalDto.image = processedImage.medium;
      }
      
      return await this.InstitucionalService.update(id, updateInstitucionalDto);
    } catch (error) {
      this.logger.error(
        `Falha na atualização do Institucional ID ${id}: ${error.message}`,
        error.stack,
        'InstitucionalController'
      );
      throw error;
    }
  }

  @Get()
  findAll(): Promise<Institucional[]> {
    return this.InstitucionalService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Institucional> {
    return this.InstitucionalService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string): Promise<void> {
    return this.InstitucionalService.remove(id);
  }
}
