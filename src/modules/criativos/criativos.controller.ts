import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile, Req, UnauthorizedException, UsePipes, ValidationPipe } from '@nestjs/common';
import { criativosService } from './criativos.service';
import { CreateCriativoDto, CriativoWithImageDto } from './dto/create-criativo.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateCriativoDto } from './dto/update-criativo.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Criativo } from './entities/criativo.entity';
import { UploadsService } from '../uploads/uploads.service';
import { SanitizePipe } from 'src/common/sanitize.pipe';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { LoggerService } from '../logger/logger.service';

@Controller('api/criativos')
export class CriativosController {
  constructor(
    private readonly CriativosService: criativosService,
    private readonly uploadsService: UploadsService,
    private logger: LoggerService,
  ) {}

  @Get('redis-test')
  async testRedis() {
    return this.CriativosService.checkRedisConnection();
  }

  @Get('cache-test')
  async cacheTest() {
  
    await this.CriativosService.setCacheValue('test_key', 'test_value');
    
    const value = await this.CriativosService.getCacheValue('test_key');
    
    return {
      set: 'test_value',
      get: value
    };
  }

  @Get('cache-clear')
  async cacheClear() {
    await this.CriativosService.clearCache();
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
    @Body() CreateCriativosDto: CriativoWithImageDto,
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Criativo> {
    if (!req.user) {
      this.logger.error(
        'Tentativa de criação de Criativos sem usuário autenticado',
        '',
        'CriativosController'
      );
      throw new UnauthorizedException('Usuário não autenticado');
    }

    // Agora o TypeScript sabe que req.user tem email e firstName
    const userEmail = req.user.email;
    const userName = req.user.firstName;
    
    try {
      this.logger.log(
        `Usuário ${userName} (${userEmail}) iniciando criação de Criativos`,
        'CriativosController'
      );

      if (file) {
        this.logger.log(
          `Processando upload de imagem para novo Criativos`,
          'CriativosController'
        );
        const processedImage = await this.uploadsService.processUploadedImage(file);
        CreateCriativosDto.image = processedImage.medium;
      }

      const result = await this.CriativosService.create(CreateCriativosDto);
      
      this.logger.log(
        `Criativos criado com sucesso por ${userName} (${userEmail}). ID: ${result.id}`,
        'CriativosController'
      );
      
      return result;
    } catch (error) {
      this.logger.error(
        `Falha na criação de Criativos por ${userName} (${userEmail}): ${error.message}`,
        error.stack,
        'CriativosController'
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
    @Body() updateCriativosDto: UpdateCriativoDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Criativo> {
    try {
      if (file) {
        const processedImage = await this.uploadsService.processUploadedImage(file);
        updateCriativosDto.image = processedImage.medium;
      }
      
      return await this.CriativosService.update(id, updateCriativosDto);
    } catch (error) {
      this.logger.error(
        `Falha na atualização do Criativos ID ${id}: ${error.message}`,
        error.stack,
        'CriativosController'
      );
      throw error;
    }
  }

  @Get()
  findAll(): Promise<Criativo[]> {
    return this.CriativosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Criativo> {
    return this.CriativosService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string): Promise<void> {
    return this.CriativosService.remove(id);
  }
}
