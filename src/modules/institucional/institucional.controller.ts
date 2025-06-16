import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, UploadedFile, UseInterceptors, BadRequestException, InternalServerErrorException, Query } from '@nestjs/common';
import { InstitucionalService } from './institucional.service';
import { CreateInstitucionalDto } from './dto/create-institucional.dto';
import { UpdateInstitucionalDto } from './dto/update-institucional.dto';
import { Institucional } from './entities/institucional.entity';
import { UploadsService } from '../uploads/uploads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoggerService } from '../logger/logger.service';
import { Request } from 'express';
import { JwtUser } from '../auth/decorators/jwt-user.decorator';

@ApiTags('Institucional')
@Controller('api/institucional')
export class InstitucionalController {
  constructor(
    private readonly institucionalService: InstitucionalService,
    private readonly uploadsService: UploadsService,
    private logger: LoggerService,
  ) {}

  // ===== ENDPOINTS PRINCIPAIS =====

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Criar novo projeto institucional' })
  @ApiResponse({ status: 201, description: 'Projeto criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createInstitucionalDto: CreateInstitucionalDto,
    @Req() req: Request,
    @JwtUser() user: any
  ): Promise<Institucional> {
    this.logger.log(`Criando novo institucional - User: ${user.id}`, 'InstitucionalController');
    
    try {
      // Validações
      if (!file) {
        throw new BadRequestException('Arquivo de imagem é obrigatório');
      }

      if (!createInstitucionalDto.cliente) {
        throw new BadRequestException('Cliente é obrigatório');
      }

      if (!createInstitucionalDto.descricao) {
        throw new BadRequestException('Descrição é obrigatória');
      }

      // Processar imagem
      const processedImage = await this.uploadsService.processUploadedImage(file);
      
      // Preparar dados
      const institucionalData = {
        cliente: createInstitucionalDto.cliente,
        descricao: createInstitucionalDto.descricao,
        image: processedImage.medium,
        titulo: createInstitucionalDto.titulo || `Projeto ${createInstitucionalDto.cliente}`,
        status: 'ativo'
      };

      // Salvar
      const result = await this.institucionalService.create(institucionalData);
      
      this.logger.log(`Institucional criado com sucesso - ID: ${result.id}`, 'InstitucionalController');
      return result;

    } catch (error: any) {
      this.logger.error(`Erro ao criar institucional: ${error.message}`, error.stack, 'InstitucionalController');
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException(`Erro interno: ${error.message}`);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os projetos institucionais' })
  @ApiResponse({ status: 200, description: 'Lista de projetos' })
  async findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ): Promise<Institucional[]> {
    try {
      return await this.institucionalService.findAll({
        status,
        search,
        page: page || 1,
        limit: limit || 10
      });
    } catch (error: any) {
      this.logger.error(`Erro ao buscar institucionais: ${error.message}`, error.stack, 'InstitucionalController');
      throw new InternalServerErrorException('Erro ao buscar projetos');
    }
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obter estatísticas dos projetos' })
  async getStats(): Promise<any> {
    try {
      return await this.institucionalService.getStats();
    } catch (error: any) {
      this.logger.error(`Erro ao buscar estatísticas: ${error.message}`, error.stack, 'InstitucionalController');
      throw new InternalServerErrorException('Erro ao buscar estatísticas');
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar projeto por ID' })
  @ApiResponse({ status: 200, description: 'Projeto encontrado' })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado' })
  async findOne(@Param('id') id: string): Promise<Institucional> {
    try {
      return await this.institucionalService.findOne(id);
    } catch (error: any) {
      this.logger.error(`Erro ao buscar institucional ${id}: ${error.message}`, error.stack, 'InstitucionalController');
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Atualizar projeto institucional' })
  @ApiResponse({ status: 200, description: 'Projeto atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado' })
  async update(
    @Param('id') id: string,
    @Body() updateInstitucionalDto: UpdateInstitucionalDto,
    @UploadedFile() file?: Express.Multer.File,
    @JwtUser() user?: any
  ): Promise<Institucional> {
    this.logger.log(`Atualizando institucional ${id} - User: ${user?.id}`, 'InstitucionalController');
    
    try {
      // Se há arquivo, processar nova imagem
      if (file) {
        const processedImage = await this.uploadsService.processUploadedImage(file);
        updateInstitucionalDto.image = processedImage.medium;
      }
      
      const result = await this.institucionalService.update(id, updateInstitucionalDto);
      
      this.logger.log(`Institucional ${id} atualizado com sucesso`, 'InstitucionalController');
      return result;
      
    } catch (error: any) {
      this.logger.error(`Erro ao atualizar institucional ${id}: ${error.message}`, error.stack, 'InstitucionalController');
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Excluir projeto institucional' })
  @ApiResponse({ status: 200, description: 'Projeto excluído com sucesso' })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado' })
  async remove(
    @Param('id') id: string,
    @JwtUser() user: any
  ): Promise<{message: string}> {
    this.logger.log(`Excluindo institucional ${id} - User: ${user.id}`, 'InstitucionalController');
    
    try {
      await this.institucionalService.remove(id, user.id);
      
      this.logger.log(`Institucional ${id} excluído com sucesso`, 'InstitucionalController');
      return { message: 'Projeto excluído com sucesso' };
      
    } catch (error: any) {
      this.logger.error(`Erro ao excluir institucional ${id}: ${error.message}`, error.stack, 'InstitucionalController');
      throw error;
    }
  }

  // ===== ENDPOINTS UTILITÁRIOS =====

  @Post('upload-image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Upload de imagem independente' })
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
      this.logger.error(`Erro no upload de imagem: ${error.message}`, error.stack, 'InstitucionalController');
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

  @Get('debug/test-cache')
  async testCache(): Promise<any> {
    return await this.institucionalService.testCache();
  }

  @Get('debug/redis-connection')
  async testRedisConnection(): Promise<any> {
    return await this.institucionalService.testRedisConnection();
  }
}