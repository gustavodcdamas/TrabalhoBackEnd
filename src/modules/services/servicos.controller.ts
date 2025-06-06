import { Controller, Get, Post, Delete, Patch, Body, Param, UseGuards, UseInterceptors, UploadedFile, Req, UnauthorizedException, UsePipes, ValidationPipe  } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ServicosService } from './servicos.service';
import { UploadsService } from '../uploads/uploads.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateServicosDto, ServicosWithImageDto } from './dto/create-servicos.dto';
import { UpdateServicosDto } from './dto/update-servicos.dto';
import { Servicos } from './entities/servicos.entity';
import { LoggerService } from '../logger/logger.service';
import { Request } from 'express';
import { SanitizePipe } from 'src/common/sanitize.pipe';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@Controller('api/servicos')
export class ServicosController {
  constructor(
  private ServicosService: ServicosService,
  private readonly uploadsService: UploadsService,
  private logger: LoggerService,
  ) {}

  @ApiOperation({ summary: 'Testar conexão com Redis' })
  @ApiResponse({ status: 201, description: 'Teste feito com sucesso' })
  @ApiResponse({ status: 401, description: 'Teste não autorizado autorizado' })
  @ApiBody({ type: CreateServicosDto })
  @Get('redis-test')
  async testRedis() {
    return this.ServicosService.checkRedisConnection();
  }

  @ApiOperation({ summary: 'Criar novo serviço' })
  @ApiResponse({ status: 201, description: 'Serviço criado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiBody({ type: CreateServicosDto })
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
  @UsePipes(new SanitizePipe({
    titulo: 'name',       // Sanitiza como nome
    descricao: 'text',    // Sanitiza como texto
    icon: 'url'          // Sanitiza como URL
  }), new ValidationPipe())
  async create(
    @Body() createServicosDto: ServicosWithImageDto,
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Servicos> {
    if (!req.user) {
      this.logger.error(
        'Tentativa de criação de serviço sem usuário autenticado',
        '',
        'ServicosController'
      );
      throw new UnauthorizedException('Usuário não autenticado');
    }

    // Agora o TypeScript sabe que req.user tem email e firstName
    const userEmail = req.user.email;
    const userName = req.user.firstName;
    
    try {
      this.logger.log(
        `Usuário ${userName} (${userEmail}) iniciando criação de serviço`,
        'ServicosController'
      );

      if (file) {
        this.logger.log(
          `Processando upload de imagem para novo serviço`,
          'ServicosController'
        );
        const processedImage = await this.uploadsService.processUploadedImage(file);
        createServicosDto.icon = processedImage.medium;
      }

      const result = await this.ServicosService.create(createServicosDto);
      
      this.logger.log(
        `Serviço criado com sucesso por ${userName} (${userEmail}). ID: ${result.id}`,
        'ServicosController'
      );
      
      return result;
    } catch (error) {
      this.logger.error(
        `Falha na criação de serviço por ${userName} (${userEmail}): ${error.message}`,
        error.stack,
        'ServicosController'
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
    icon: 'url'
  }), new ValidationPipe())
  async update(
    @Param('id') id: string,
    @Body() updateServicosDto: UpdateServicosDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Servicos> {
    try {
      if (file) {
        const processedImage = await this.uploadsService.processUploadedImage(file);
        updateServicosDto.icon = processedImage.medium;
      }
      
      return await this.ServicosService.update(id, updateServicosDto);
    } catch (error) {
      this.logger.error(
        `Falha na atualização do serviço ID ${id}: ${error.message}`,
        error.stack,
        'ServicosController'
      );
      throw error;
    }
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