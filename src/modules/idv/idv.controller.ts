import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UnauthorizedException, UploadedFile, UseGuards, UseInterceptors, UsePipes, ValidationPipe } from '@nestjs/common';
import { IdvService } from './idv.service';
import { CreateIdvDto, IdvWithImageDto } from './dto/create-idv.dto';
import { UpdateIdvDto } from './dto/update-idv.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { SanitizePipe } from 'src/common/sanitize.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UploadsService } from '../uploads/uploads.service';
import { Idv } from './entities/idv.entity';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { LoggerService } from '../logger/logger.service';

@Controller('idv')
export class IdvController {
  constructor(
    private readonly IdvService: IdvService,
    private readonly uploadsService: UploadsService,
    private logger: LoggerService,
  ) {}

  @Get('redis-test')
  async testRedis() {
    return this.IdvService.checkRedisConnection();
  }

  @Get('cache-test')
  async cacheTest() {
  
    await this.IdvService.setCacheValue('test_key', 'test_value');
    
    const value = await this.IdvService.getCacheValue('test_key');
    
    return {
      set: 'test_value',
      get: value
    };
  }

  @Get('cache-clear')
  async cacheClear() {
    await this.IdvService.clearCache();
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
    @Body() CreateIdvDto: IdvWithImageDto,
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Idv> {
    if (!req.user) {
      this.logger.error(
        'Tentativa de criação de Idv sem usuário autenticado',
        '',
        'IdvController'
      );
      throw new UnauthorizedException('Usuário não autenticado');
    }

    // Agora o TypeScript sabe que req.user tem email e firstName
    const userEmail = req.user.email;
    const userName = req.user.firstName;
    
    try {
      this.logger.log(
        `Usuário ${userName} (${userEmail}) iniciando criação de Idv`,
        'IdvController'
      );

      if (file) {
        this.logger.log(
          `Processando upload de imagem para novo Idv`,
          'IdvController'
        );
        const processedImage = await this.uploadsService.processUploadedImage(file);
        CreateIdvDto.image = processedImage.medium;
      }

      const result = await this.IdvService.create(CreateIdvDto);
      
      this.logger.log(
        `Idv criado com sucesso por ${userName} (${userEmail}). ID: ${result.id}`,
        'IdvController'
      );
      
      return result;
    } catch (error) {
      this.logger.error(
        `Falha na criação de Idv por ${userName} (${userEmail}): ${error.message}`,
        error.stack,
        'IdvController'
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
    @Body() updateIdvDto: UpdateIdvDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Idv> {
    try {
      if (file) {
        const processedImage = await this.uploadsService.processUploadedImage(file);
        updateIdvDto.image = processedImage.medium;
      }
      
      return await this.IdvService.update(id, updateIdvDto);
    } catch (error) {
      this.logger.error(
        `Falha na atualização do Idv ID ${id}: ${error.message}`,
        error.stack,
        'IdvController'
      );
      throw error;
    }
  }

  @Get()
  findAll(): Promise<Idv[]> {
    return this.IdvService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Idv> {
    return this.IdvService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string): Promise<void> {
    return this.IdvService.remove(id);
  }
}
