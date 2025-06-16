import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, UploadedFile, UseInterceptors, BadRequestException, InternalServerErrorException, Query } from '@nestjs/common';
import { CriativosService } from './criativos.service';
import { CreateCriativoDto } from './dto/create-criativo.dto';
import { UpdateCriativoDto } from './dto/update-criativo.dto';
import { Criativo } from './entities/criativo.entity';
import { UploadsService } from '../uploads/uploads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoggerService } from '../logger/logger.service';
import { Request } from 'express';
import { JwtUser } from '../auth/decorators/jwt-user.decorator';

@ApiTags('Criativos')
@Controller('api/criativos')
export class CriativosController {
  constructor(
    private readonly criativosService: CriativosService,
    private readonly uploadsService: UploadsService,
    private logger: LoggerService,
  ) {
    this.logger.log('CriativosController inicializado', 'CriativosController');
  }

  // ===== ENDPOINTS PRINCIPAIS =====

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Criar novo projeto criativo' })
  @ApiResponse({ status: 201, description: 'Projeto criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createCriativoDto: CreateCriativoDto,
    @Req() req: Request,
    @JwtUser() user: any
  ): Promise<Criativo> {
    this.logger.log(`Criando novo criativo - User: ${user.id}`, 'CriativosController');
    
    try {
      // Validações
      if (!file) {
        this.logger.warn('❌ Arquivo de imagem não fornecido', 'CriativosController');
        throw new BadRequestException('Arquivo de imagem é obrigatório');
      }

      if (!createCriativoDto.cliente) {
        this.logger.warn('❌ Cliente não fornecido', 'CriativosController');
        throw new BadRequestException('Cliente é obrigatório');
      }

      if (!createCriativoDto.descricao) {
        this.logger.warn('❌ Descrição não fornecida', 'CriativosController');
        throw new BadRequestException('Descrição é obrigatória');
      }

      this.logger.log(`📸 Processando upload de imagem: ${file.originalname} (${file.size} bytes)`, 'CriativosController');

      // Processar imagem
      const processedImage = await this.uploadsService.processUploadedImage(file);
      
      // Preparar dados
      const criativoData = {
        cliente: createCriativoDto.cliente,
        descricao: createCriativoDto.descricao,
        image: processedImage.medium,
        titulo: createCriativoDto.titulo || `Projeto Criativo ${createCriativoDto.cliente}`,
        status: 'ativo'
      };

      // Salvar
      const result = await this.criativosService.create(criativoData);
      
      this.logger.log(`Criativo criado com sucesso - ID: ${result.id}`, 'CriativosController');
      return result;

    } catch (error: any) {
      this.logger.error(`Erro ao criar criativo: ${error.message}`, error.stack, 'CriativosController');
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException(`Erro interno: ${error.message}`);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os projetos criativos' })
  @ApiResponse({ status: 200, description: 'Lista de projetos' })
  async findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ): Promise<Criativo[]> {
    try {
      return await this.criativosService.findAll({
        status,
        search,
        page: page || 1,
        limit: limit || 10
      });
    } catch (error: any) {
      this.logger.error(`Erro ao buscar criativos: ${error.message}`, error.stack, 'CriativosController');
      throw new InternalServerErrorException('Erro ao buscar projetos');
    }
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obter estatísticas dos projetos' })
  async getStats(): Promise<any> {
    try {
      return await this.criativosService.getStats();
    } catch (error: any) {
      this.logger.error(`Erro ao buscar estatísticas: ${error.message}`, error.stack, 'CriativosController');
      throw new InternalServerErrorException('Erro ao buscar estatísticas');
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar projeto por ID' })
  @ApiResponse({ status: 200, description: 'Projeto encontrado' })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado' })
  async findOne(@Param('id') id: string): Promise<Criativo> {
    try {
      return await this.criativosService.findOne(id);
    } catch (error: any) {
      this.logger.error(`Erro ao buscar criativo ${id}: ${error.message}`, error.stack, 'CriativosController');
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Atualizar projeto criativo' })
  @ApiResponse({ status: 200, description: 'Projeto atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado' })
  async update(
    @Param('id') id: string,
    @Body() updateCriativoDto: UpdateCriativoDto,
    @UploadedFile() file?: Express.Multer.File,
    @JwtUser() user?: any
  ): Promise<Criativo> {
    this.logger.log(`Atualizando criativo ${id} - User: ${user?.id}`, 'CriativosController');
    
    try {
      // Se há arquivo, processar nova imagem
      if (file) {
        const processedImage = await this.uploadsService.processUploadedImage(file);
        updateCriativoDto.image = processedImage.medium;
      }
      
      const result = await this.criativosService.update(id, updateCriativoDto);
      
      this.logger.log(`Criativo ${id} atualizado com sucesso`, 'CriativosController');
      return result;
      
    } catch (error: any) {
      this.logger.error(`Erro ao atualizar criativo ${id}: ${error.message}`, error.stack, 'CriativosController');
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Excluir projeto criativo' })
  @ApiResponse({ status: 200, description: 'Projeto excluído com sucesso' })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado' })
  async remove(
    @Param('id') id: string,
    @JwtUser() user: any
  ): Promise<{message: string}> {
    this.logger.log(`Excluindo criativo ${id} - User: ${user.id}`, 'CriativosController');
    
    try {
      await this.criativosService.remove(id, user.id);
      
      this.logger.log(`Criativo ${id} excluído com sucesso`, 'CriativosController');
      return { message: 'Projeto criativo excluído com sucesso' };
      
    } catch (error: any) {
      this.logger.error(`Erro ao excluir criativo ${id}: ${error.message}`, error.stack, 'CriativosController');
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
      this.logger.error(`Erro no upload de imagem: ${error.message}`, error.stack, 'CriativosController');
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

  @Get('debug/check-table')
  async checkTable(): Promise<any> {
    this.logger.log('🔍 Verificando estrutura da tabela Criativos', 'CriativosController');
    
    try {
      // Tentar fazer uma query simples para verificar se a tabela existe
      const count = await this.criativosService.criativosRepository.count();
      this.logger.log(`✅ Tabela Criativos existe e tem ${count} registros`, 'CriativosController');
      
      return { 
        status: 'OK', 
        tableExists: true, 
        recordCount: count,
        message: 'Tabela Criativos está funcionando corretamente'
      };
    } catch (error: any) {
      this.logger.error(`❌ Problema com tabela Criativos: ${error.message}`, error.stack, 'CriativosController');
      return { 
        status: 'ERROR', 
        tableExists: false, 
        error: error.message,
        message: 'Tabela Criativos não existe ou há problemas de configuração'
      };
    }
  }

  @Post('debug/clear-cache')
  async clearCache(): Promise<any> {
    await this.criativosService.clearCache();
    return { message: 'Cache limpo com sucesso' };
  }

  @Get('debug/all')
  async debugAll(): Promise<any> {
    return await this.criativosService.debugFindAll();
  }
}