// servicos.controller.ts - VERSÃO CORRIGIDA
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, UploadedFile, UseInterceptors, BadRequestException, InternalServerErrorException, Query } from '@nestjs/common';
import { ServicosService } from './servicos.service';
import { CreateServicosDto } from './dto/create-servicos.dto';
import { UpdateServicosDto } from './dto/update-servicos.dto';
import { Servicos } from './entities/servicos.entity';
import { UploadsService } from '../uploads/uploads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoggerService } from '../logger/logger.service';
import { Request } from 'express';
import { JwtUser } from '../auth/decorators/jwt-user.decorator';

@ApiTags('Serviços')
@Controller('api/servicos')
export class ServicosController {
  constructor(
    private readonly servicosService: ServicosService,
    private readonly uploadsService: UploadsService,
    private logger: LoggerService,
  ) {}

  // ===== ENDPOINTS PRINCIPAIS =====

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Criar novo serviço' })
  @ApiResponse({ status: 201, description: 'Serviço criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createServicosDto: CreateServicosDto,
    @Req() req: Request,
    @JwtUser() user: any
  ): Promise<Servicos> {
    this.logger.log(`Criando novo serviço - User: ${user.id}`, 'ServicosController');
    
    try {
      // Validações
      if (!file) {
        throw new BadRequestException('Arquivo de ícone é obrigatório');
      }

      if (!createServicosDto.cliente) {
        throw new BadRequestException('Cliente é obrigatório');
      }

      if (!createServicosDto.descricao) {
        throw new BadRequestException('Descrição é obrigatória');
      }

      // Processar imagem
      const processedImage = await this.uploadsService.processUploadedImage(file);
      
      // Preparar dados
      const servicosData = {
        cliente: createServicosDto.cliente,
        descricao: createServicosDto.descricao,
        icon: processedImage.medium,
        titulo: createServicosDto.titulo || `Serviço ${createServicosDto.cliente}`,
        status: 'ativo'
      };

      // Salvar
      const result = await this.servicosService.create(servicosData);
      
      this.logger.log(`Serviço criado com sucesso - ID: ${result.id}`, 'ServicosController');
      return result;

    } catch (error: any) {
      this.logger.error(`Erro ao criar serviço: ${error.message}`, error.stack, 'ServicosController');
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException(`Erro interno: ${error.message}`);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os serviços' })
  @ApiResponse({ status: 200, description: 'Lista de serviços' })
  async findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ): Promise<Servicos[]> {
    try {
      return await this.servicosService.findAll({
        status,
        search,
        page: page || 1,
        limit: limit || 10
      });
    } catch (error: any) {
      this.logger.error(`Erro ao buscar serviços: ${error.message}`, error.stack, 'ServicosController');
      throw new InternalServerErrorException('Erro ao buscar serviços');
    }
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obter estatísticas dos serviços' })
  async getStats(): Promise<any> {
    try {
      return await this.servicosService.getStats();
    } catch (error: any) {
      this.logger.error(`Erro ao buscar estatísticas: ${error.message}`, error.stack, 'ServicosController');
      throw new InternalServerErrorException('Erro ao buscar estatísticas');
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar serviço por ID' })
  @ApiResponse({ status: 200, description: 'Serviço encontrado' })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  async findOne(@Param('id') id: string): Promise<Servicos> {
    try {
      return await this.servicosService.findOne(id);
    } catch (error: any) {
      this.logger.error(`Erro ao buscar serviço ${id}: ${error.message}`, error.stack, 'ServicosController');
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Atualizar serviço' })
  @ApiResponse({ status: 200, description: 'Serviço atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  async update(
    @Param('id') id: string,
    @Body() updateServicosDto: UpdateServicosDto,
    @UploadedFile() file?: Express.Multer.File,
    @JwtUser() user?: any
  ): Promise<Servicos> {
    this.logger.log(`Atualizando serviço ${id} - User: ${user?.id}`, 'ServicosController');
    
    try {
      // Se há arquivo, processar nova imagem
      if (file) {
        const processedImage = await this.uploadsService.processUploadedImage(file);
        updateServicosDto.icon = processedImage.medium;
      }
      
      const result = await this.servicosService.update(id, updateServicosDto);
      
      this.logger.log(`Serviço ${id} atualizado com sucesso`, 'ServicosController');
      return result;
      
    } catch (error: any) {
      this.logger.error(`Erro ao atualizar serviço ${id}: ${error.message}`, error.stack, 'ServicosController');
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Excluir serviço' })
  @ApiResponse({ status: 200, description: 'Serviço excluído com sucesso' })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  async remove(
    @Param('id') id: string,
    @JwtUser() user: any
  ): Promise<{message: string}> {
    this.logger.log(`Excluindo serviço ${id} - User: ${user.id}`, 'ServicosController');
    
    try {
      await this.servicosService.remove(id, user.id);
      
      this.logger.log(`Serviço ${id} excluído com sucesso`, 'ServicosController');
      return { message: 'Serviço excluído com sucesso' };
      
    } catch (error: any) {
      this.logger.error(`Erro ao excluir serviço ${id}: ${error.message}`, error.stack, 'ServicosController');
      throw error;
    }
  }

  // ===== ENDPOINTS UTILITÁRIOS =====

  @Post('upload-image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Upload de ícone independente' })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File
  ): Promise<{url: string}> {
    try {
      if (!file) {
        throw new BadRequestException('Arquivo é obrigatório');
      }

      const processedImage = await this.uploadsService.processUploadedImage(file);
      
      return {
        url: processedImage.medium
      };
      
    } catch (error: any) {
      this.logger.error(`Erro no upload de ícone: ${error.message}`, error.stack, 'ServicosController');
      throw new BadRequestException(`Erro no upload: ${error.message}`);
    }
  }

  // ===== ENDPOINTS DE DEBUG (REMOVER EM PRODUÇÃO) =====

  @Get('debug/health')
  async healthCheck(): Promise<any> {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    };
  }

  @Get('redis-test')
  async testRedis() {
    return this.servicosService.checkRedisConnection();
  }

  @Get('cache-test')
  async cacheTest() {
    await this.servicosService.setCacheValue('test_key', 'test_value');
    const value = await this.servicosService.getCacheValue('test_key');
    
    return {
      set: 'test_value',
      get: value
    };
  }

  @Get('cache-clear')
  async cacheClear() {
    await this.servicosService.clearCache();
    return { message: 'Cache cleared' };
  }
}