import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, UploadedFile, UseInterceptors, BadRequestException, InternalServerErrorException, Query } from '@nestjs/common';
import { LandingService } from './landing.service';
import { CreateLandingDto } from './dto/create-landing.dto';
import { UpdateLandingDto } from './dto/update-landing.dto';
import { Landing } from './entities/landing.entity';
import { UploadsService } from '../uploads/uploads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoggerService } from '../logger/logger.service';
import { Request } from 'express';
import { JwtUser } from '../auth/decorators/jwt-user.decorator';

@ApiTags('Landing Pages')
@Controller('api/landing')
export class LandingController {
  constructor(
    private readonly landingService: LandingService,
    private readonly uploadsService: UploadsService,
    private logger: LoggerService,
  ) {}

  // ===== ENDPOINTS PRINCIPAIS =====

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Criar nova landing page' })
  @ApiResponse({ status: 201, description: 'Landing page criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createLandingDto: CreateLandingDto,
    @Req() req: Request,
    @JwtUser() user: any
  ): Promise<Landing> {
    this.logger.log(`Criando nova landing page - User: ${user.id}`, 'LandingController');
    
    try {
      // Validações
      if (!file) {
        throw new BadRequestException('Arquivo de imagem é obrigatório');
      }

      if (!createLandingDto.cliente) {
        throw new BadRequestException('Cliente é obrigatório');
      }

      if (!createLandingDto.descricao) {
        throw new BadRequestException('Descrição é obrigatória');
      }

      // Processar imagem
      const processedImage = await this.uploadsService.processUploadedImage(file);
      
      // Preparar dados
      const landingData = {
        cliente: createLandingDto.cliente,
        descricao: createLandingDto.descricao,
        image: processedImage.medium,
        titulo: createLandingDto.titulo || `Projeto ${createLandingDto.cliente}`,
        status: 'ativo'
      };

      // Salvar
      const result = await this.landingService.create(landingData);
      
      this.logger.log(`Landing page criada com sucesso - ID: ${result.id}`, 'LandingController');
      return result;

    } catch (error: any) {
      this.logger.error(`Erro ao criar landing page: ${error.message}`, error.stack, 'LandingController');
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException(`Erro interno: ${error.message}`);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as landing pages' })
  @ApiResponse({ status: 200, description: 'Lista de landing pages' })
  async findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ): Promise<Landing[]> {
    try {
      return await this.landingService.findAll({
        status,
        search,
        page: page || 1,
        limit: limit || 10
      });
    } catch (error: any) {
      this.logger.error(`Erro ao buscar landing pages: ${error.message}`, error.stack, 'LandingController');
      throw new InternalServerErrorException('Erro ao buscar projetos');
    }
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obter estatísticas das landing pages' })
  async getStats(): Promise<any> {
    try {
      return await this.landingService.getStats();
    } catch (error: any) {
      this.logger.error(`Erro ao buscar estatísticas: ${error.message}`, error.stack, 'LandingController');
      throw new InternalServerErrorException('Erro ao buscar estatísticas');
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar landing page por ID' })
  @ApiResponse({ status: 200, description: 'Landing page encontrada' })
  @ApiResponse({ status: 404, description: 'Landing page não encontrada' })
  async findOne(@Param('id') id: string): Promise<Landing> {
    try {
      return await this.landingService.findOne(id);
    } catch (error: any) {
      this.logger.error(`Erro ao buscar landing page ${id}: ${error.message}`, error.stack, 'LandingController');
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Atualizar landing page' })
  @ApiResponse({ status: 200, description: 'Landing page atualizada com sucesso' })
  @ApiResponse({ status: 404, description: 'Landing page não encontrada' })
  async update(
    @Param('id') id: string,
    @Body() updateLandingDto: UpdateLandingDto,
    @UploadedFile() file?: Express.Multer.File,
    @JwtUser() user?: any
  ): Promise<Landing> {
    this.logger.log(`Atualizando landing page ${id} - User: ${user?.id}`, 'LandingController');
    
    try {
      // Se há arquivo, processar nova imagem
      if (file) {
        const processedImage = await this.uploadsService.processUploadedImage(file);
        updateLandingDto.image = processedImage.medium;
      }
      
      const result = await this.landingService.update(id, updateLandingDto);
      
      this.logger.log(`Landing page ${id} atualizada com sucesso`, 'LandingController');
      return result;
      
    } catch (error: any) {
      this.logger.error(`Erro ao atualizar landing page ${id}: ${error.message}`, error.stack, 'LandingController');
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Excluir landing page' })
  @ApiResponse({ status: 200, description: 'Landing page excluída com sucesso' })
  @ApiResponse({ status: 404, description: 'Landing page não encontrada' })
  async remove(
    @Param('id') id: string,
    @JwtUser() user: any
  ): Promise<{message: string}> {
    this.logger.log(`Excluindo landing page ${id} - User: ${user.id}`, 'LandingController');
    
    try {
      await this.landingService.remove(id, user.id);
      
      this.logger.log(`Landing page ${id} excluída com sucesso`, 'LandingController');
      return { message: 'Landing page excluída com sucesso' };
      
    } catch (error: any) {
      this.logger.error(`Erro ao excluir landing page ${id}: ${error.message}`, error.stack, 'LandingController');
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
      this.logger.error(`Erro no upload de imagem: ${error.message}`, error.stack, 'LandingController');
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
}