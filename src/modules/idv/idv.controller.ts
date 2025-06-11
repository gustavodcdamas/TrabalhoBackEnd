// idv.controller.ts - VERSÃO CORRIGIDA E COMPLETA
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, UploadedFile, UseInterceptors, BadRequestException, InternalServerErrorException, Query } from '@nestjs/common';
import { IdvService } from './idv.service';
import { CreateIdvDto } from './dto/create-idv.dto';
import { UpdateIdvDto } from './dto/update-idv.dto';
import { Idv } from './entities/idv.entity';
import { UploadsService } from '../uploads/uploads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoggerService } from '../logger/logger.service';
import { Request } from 'express';
import { JwtUser } from '../auth/decorators/jwt-user.decorator';

@ApiTags('Identidade Visual')
@Controller('api/idv')
export class IdvController {
  constructor(
    private readonly idvService: IdvService,
    private readonly uploadsService: UploadsService,
    private logger: LoggerService,
  ) {
    this.logger.log('IdvController inicializado', 'IdvController');
  }

  // ===== ENDPOINTS PRINCIPAIS =====

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Criar novo projeto de identidade visual' })
  @ApiResponse({ status: 201, description: 'Projeto criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createIdvDto: CreateIdvDto,
    @Req() req: Request,
    @JwtUser() user: any
  ): Promise<Idv> {
    this.logger.log(`🚀 Criando novo projeto IDV - User: ${user.id}`, 'IdvController');
    this.logger.log(`📋 Dados recebidos: ${JSON.stringify({
      cliente: createIdvDto.cliente,
      titulo: createIdvDto.titulo,
      hasFile: !!file
    })}`, 'IdvController');
    
    try {
      // Validações
      if (!file) {
        this.logger.warn('❌ Arquivo de imagem não fornecido', 'IdvController');
        throw new BadRequestException('Arquivo de imagem é obrigatório');
      }

      if (!createIdvDto.cliente) {
        this.logger.warn('❌ Cliente não fornecido', 'IdvController');
        throw new BadRequestException('Cliente é obrigatório');
      }

      if (!createIdvDto.descricao) {
        this.logger.warn('❌ Descrição não fornecida', 'IdvController');
        throw new BadRequestException('Descrição é obrigatória');
      }

      this.logger.log(`📸 Processando upload de imagem: ${file.originalname} (${file.size} bytes)`, 'IdvController');

      // Processar imagem
      const processedImage = await this.uploadsService.processUploadedImage(file);
      
      this.logger.log(`✅ Imagem processada com sucesso: ${processedImage.medium}`, 'IdvController');

      // Preparar dados
      const idvData = {
        cliente: createIdvDto.cliente,
        descricao: createIdvDto.descricao,
        image: processedImage.medium,
        titulo: createIdvDto.titulo || `Projeto IDV ${createIdvDto.cliente}`,
        status: 'ativo'
      };

      this.logger.log(`💾 Salvando IDV com dados: ${JSON.stringify({
        ...idvData,
        image: `${idvData.image.substring(0, 30)}...`
      })}`, 'IdvController');

      // Salvar
      const result = await this.idvService.create(idvData);
      
      this.logger.log(`✅ IDV criada com sucesso - ID: ${result.id}`, 'IdvController');
      return result;

    } catch (error: any) {
      this.logger.error(`❌ Erro ao criar IDV: ${error.message}`, error.stack, 'IdvController');
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException(`Erro interno: ${error.message}`);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os projetos de identidade visual' })
  @ApiResponse({ status: 200, description: 'Lista de projetos' })
  async findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ): Promise<Idv[]> {
    this.logger.log(`📥 Buscando IDVs com filtros: ${JSON.stringify({
      status, search, page: page || 1, limit: limit || 10
    })}`, 'IdvController');

    try {
      const result = await this.idvService.findAll({
        status,
        search,
        page: page || 1,
        limit: limit || 10
      });

      this.logger.log(`✅ ${result.length} IDVs encontradas`, 'IdvController');
      return result;

    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar IDVs: ${error.message}`, error.stack, 'IdvController');
      throw new InternalServerErrorException('Erro ao buscar projetos de identidade visual');
    }
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obter estatísticas dos projetos de identidade visual' })
  async getStats(): Promise<any> {
    this.logger.log('📊 Solicitação de estatísticas das IDVs', 'IdvController');

    try {
      const stats = await this.idvService.getStats();
      this.logger.log(`📊 Estatísticas calculadas: ${JSON.stringify(stats)}`, 'IdvController');
      return stats;

    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar estatísticas: ${error.message}`, error.stack, 'IdvController');
      throw new InternalServerErrorException('Erro ao buscar estatísticas');
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar projeto de identidade visual por ID' })
  @ApiResponse({ status: 200, description: 'Projeto encontrado' })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado' })
  async findOne(@Param('id') id: string): Promise<Idv> {
    this.logger.log(`🔍 Buscando IDV por ID: ${id}`, 'IdvController');

    try {
      const result = await this.idvService.findOne(id);
      this.logger.log(`✅ IDV encontrada: ${id}`, 'IdvController');
      return result;

    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar IDV ${id}: ${error.message}`, error.stack, 'IdvController');
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Atualizar projeto de identidade visual' })
  @ApiResponse({ status: 200, description: 'Projeto atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado' })
  async update(
    @Param('id') id: string,
    @Body() updateIdvDto: UpdateIdvDto,
    @UploadedFile() file?: Express.Multer.File,
    @JwtUser() user?: any
  ): Promise<Idv> {
    this.logger.log(`📝 Atualizando IDV ${id} - User: ${user?.id}`, 'IdvController');
    this.logger.log(`📋 Dados para atualização: ${JSON.stringify({
      titulo: updateIdvDto.titulo,
      cliente: updateIdvDto.cliente,
      status: updateIdvDto.status,
      hasNewFile: !!file
    })}`, 'IdvController');
    
    try {
      // Se há arquivo, processar nova imagem
      if (file) {
        this.logger.log(`📸 Processando nova imagem: ${file.originalname}`, 'IdvController');
        const processedImage = await this.uploadsService.processUploadedImage(file);
        updateIdvDto.image = processedImage.medium;
        this.logger.log(`✅ Nova imagem processada: ${processedImage.medium}`, 'IdvController');
      }
      
      const result = await this.idvService.update(id, updateIdvDto);
      
      this.logger.log(`✅ IDV ${id} atualizada com sucesso`, 'IdvController');
      return result;
      
    } catch (error: any) {
      this.logger.error(`❌ Erro ao atualizar IDV ${id}: ${error.message}`, error.stack, 'IdvController');
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Excluir projeto de identidade visual' })
  @ApiResponse({ status: 200, description: 'Projeto excluído com sucesso' })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado' })
  async remove(
    @Param('id') id: string,
    @JwtUser() user: any
  ): Promise<{message: string}> {
    this.logger.log(`🗑️ Excluindo IDV ${id} - User: ${user.id}`, 'IdvController');
    
    try {
      await this.idvService.remove(id, user.id);
      
      this.logger.log(`✅ IDV ${id} excluída com sucesso`, 'IdvController');
      return { message: 'Projeto de identidade visual excluído com sucesso' };
      
    } catch (error: any) {
      this.logger.error(`❌ Erro ao excluir IDV ${id}: ${error.message}`, error.stack, 'IdvController');
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
    this.logger.log('📸 Upload de imagem independente iniciado', 'IdvController');

    try {
      if (!file) {
        this.logger.warn('❌ Nenhum arquivo fornecido para upload', 'IdvController');
        throw new BadRequestException('Arquivo é obrigatório');
      }

      this.logger.log(`📸 Processando upload: ${file.originalname} (${file.size} bytes)`, 'IdvController');

      const processedImage = await this.uploadsService.processUploadedImage(file);
      
      this.logger.log(`✅ Upload processado com sucesso: ${processedImage.medium}`, 'IdvController');

      return {
        url: processedImage.medium
      };
      
    } catch (error: any) {
      this.logger.error(`❌ Erro no upload de imagem: ${error.message}`, error.stack, 'IdvController');
      throw new BadRequestException(`Erro no upload: ${error.message}`);
    }
  }

  // ===== ENDPOINTS DE DEBUG (REMOVER EM PRODUÇÃO) =====

  @Get('debug/health')
  async healthCheck(): Promise<any> {
    this.logger.log('🏥 Health check das IDVs solicitado', 'IdvController');
    
    const health = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      service: 'IdvService'
    };

    this.logger.log(`🏥 Health check resultado: ${JSON.stringify(health)}`, 'IdvController');
    return health;
  }

  @Get('debug/redis-test')
  async testRedis(): Promise<any> {
    this.logger.log('🔌 Teste de conexão Redis solicitado', 'IdvController');
    
    try {
      const result = await this.idvService.checkRedisConnection();
      this.logger.log(`🔌 Resultado do teste Redis: ${result}`, 'IdvController');
      return { result };
    } catch (error: any) {
      this.logger.error(`❌ Erro no teste Redis: ${error.message}`, error.stack, 'IdvController');
      return { error: error.message };
    }
  }

  @Get('debug/check-table')
  async checkTable(): Promise<any> {
    this.logger.log('🔍 Verificando estrutura da tabela IDV', 'IdvController');
    
    try {
      // Tentar fazer uma query simples para verificar se a tabela existe
      const count = await this.idvService.idvRepository.count();
      this.logger.log(`✅ Tabela IDV existe e tem ${count} registros`, 'IdvController');
      
      return { 
        status: 'OK', 
        tableExists: true, 
        recordCount: count,
        message: 'Tabela IDV está funcionando corretamente'
      };
    } catch (error: any) {
      this.logger.error(`❌ Problema com tabela IDV: ${error.message}`, error.stack, 'IdvController');
      return { 
        status: 'ERROR', 
        tableExists: false, 
        error: error.message,
        message: 'Tabela IDV não existe ou há problemas de configuração'
      };
    }
  }

  @Get('debug/cache-clear')
  @UseGuards(JwtAuthGuard)
  async clearCache(): Promise<any> {
    this.logger.log('🧹 Limpeza de cache solicitada', 'IdvController');
    
    try {
      await this.idvService.clearCache();
      this.logger.log('✅ Cache limpo com sucesso', 'IdvController');
      return { message: 'Cache das IDVs limpo com sucesso' };
    } catch (error: any) {
      this.logger.error(`❌ Erro ao limpar cache: ${error.message}`, error.stack, 'IdvController');
      return { error: error.message };
    }
  }
}