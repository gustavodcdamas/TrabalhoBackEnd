import { Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateCriativoDto } from './dto/create-criativo.dto';
import { UpdateCriativoDto } from './dto/update-criativo.dto';
import { Criativo } from './entities/criativo.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { UploadsService } from '../uploads/uploads.service';
import { LoggerService } from '../logger/logger.service';
import { RedisService } from 'src/config/redis/redis.service';

interface FindAllOptions {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class CriativosService {
  private readonly CACHE_KEY_CRIATIVOS = 'all_criativos';
  private readonly CACHE_TTL = 60 * 60 * 24; // 24 hrs

  constructor(
    @InjectRepository(Criativo)
    public readonly criativosRepository: Repository<Criativo>, // Tornado público para debug
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly uploadsService: UploadsService,
    private readonly logger: LoggerService,
    private readonly redisService: RedisService,
  ) {
    this.logger.log('CriativosService inicializado', 'CriativosService');
  }

  // ===== MÉTODOS PRINCIPAIS =====

  async create(createCriativoDto: CreateCriativoDto): Promise<Criativo> {
    try {
      this.logger.log('🚀 Criando novo criativo', 'CriativosService');
      this.logger.log(`📋 Dados recebidos: ${JSON.stringify({
        titulo: createCriativoDto.titulo,
        cliente: createCriativoDto.cliente,
        hasImage: !!createCriativoDto.image
      })}`, 'CriativosService');
      
      const criativoData = {
        cliente: createCriativoDto.cliente,
        descricao: createCriativoDto.descricao,
        image: createCriativoDto.image,
        titulo: createCriativoDto.titulo || `Projeto Criativo ${createCriativoDto.cliente}`,
        status: 'ativo'
      };

      const criativo = this.criativosRepository.create(criativoData);
      const savedCriativo = await this.criativosRepository.save(criativo);
      
      // Limpar cache
      await this.clearCache();
      
      this.logger.log(`Criativo criado com sucesso - ID: ${savedCriativo.id}`, 'CriativosService');
      return savedCriativo;

    } catch (error) {
      this.logger.error(`Erro ao criar criativo: ${error.message}`, error.stack, 'CriativosService');
      throw new InternalServerErrorException(`Erro ao criar projeto criativo: ${error.message}`);
    }
  }

  async findAll(options: FindAllOptions = {}): Promise<Criativo[]> {
    try {
      const { status, search, page = 1, limit = 10 } = options;
      
      console.log('🔍 findAll chamado com opções:', { status, search, page, limit });
      
      // ✅ TENTAR CACHE REDIS PRIMEIRO
      if (!status && !search && page === 1 && limit === 10) {
        const cached = await this.redisService.get<Criativo[]>(this.CACHE_KEY_CRIATIVOS);
        if (cached && Array.isArray(cached)) {
          console.log('✅ Dados obtidos do Redis cache:', cached.length, 'itens');
          return cached;
        }
      }

      console.log('🗄️ Buscando dados no banco...');
      
      // Buscar do banco
      const result = await this.criativosRepository.find({
        where: { status: 'ativo' },
        order: { dataCriacao: 'DESC' },
        take: limit,
        skip: (page - 1) * limit
      });
      
      console.log('📊 Dados do banco:', result.length, 'itens');
      
      // ✅ SALVAR NO REDIS
      if (!status && !search && page === 1 && limit === 10) {
        await this.redisService.set(this.CACHE_KEY_CRIATIVOS, result, this.CACHE_TTL);
      }
      
      return result;

    } catch (error) {
      console.error('❌ Erro geral:', error);
      throw new InternalServerErrorException('Erro ao buscar projetos');
    }
  }
  
  async findOne(id: string): Promise<Criativo> {
    try {
      const cacheKey = `criativo_${id}`;
      const cached = await this.cacheManager.get<Criativo>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const criativo = await this.criativosRepository.findOne({ 
        where: { id },
        relations: [] // Adicionar relações se necessário
      });

      if (!criativo) {
        throw new NotFoundException(`Projeto criativo com ID ${id} não encontrado`);
      }

      // Cachear por 1 hora
      await this.cacheManager.set(cacheKey, criativo, 3600);
      
      return criativo;

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao buscar criativo ${id}: ${error.message}`, error.stack, 'CriativosService');
      throw new InternalServerErrorException('Erro ao buscar projeto criativo');
    }
  }

  async update(id: string, updateCriativoDto: UpdateCriativoDto): Promise<Criativo> {
    try {
      this.logger.log(`Atualizando criativo ${id}`, 'CriativosService');
      
      const existingCriativo = await this.criativosRepository.findOne({ where: { id } });
      if (!existingCriativo) {
        throw new NotFoundException(`Projeto criativo com ID ${id} não encontrado`);
      }

      // Merge dos dados
      this.criativosRepository.merge(existingCriativo, updateCriativoDto);
      
      const updatedCriativo = await this.criativosRepository.save(existingCriativo);
      
      // Limpar cache
      await this.clearCacheForItem(id);
      
      this.logger.log(`Criativo ${id} atualizado com sucesso`, 'CriativosService');
      return updatedCriativo;

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao atualizar criativo ${id}: ${error.message}`, error.stack, 'CriativosService');
      throw new InternalServerErrorException('Erro ao atualizar projeto criativo');
    }
  }

  async remove(id: string, userId?: string): Promise<void> {
    try {
      this.logger.log(`Removendo criativo ${id}`, 'CriativosService');
      
      const criativo = await this.criativosRepository.findOne({ where: { id } });
      if (!criativo) {
        throw new NotFoundException(`Projeto criativo com ID ${id} não encontrado`);
      }

      // Soft delete - marcar como excluído
      await this.criativosRepository.update(id, {
        status: 'excluido',
        excluidoPor: userId,
        dataExclusao: new Date()
      });

      // Remover arquivos de imagem se necessário
      if (criativo.image) {
        try {
          await this.uploadsService.deleteFile(criativo.image);
        } catch (deleteError) {
          this.logger.warn(`Erro ao deletar arquivo de imagem: ${deleteError.message}`, 'CriativosService');
        }
      }

      // Limpar cache
      await this.clearCacheForItem(id);
      
      this.logger.log(`Criativo ${id} removido com sucesso`, 'CriativosService');

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao remover criativo ${id}: ${error.message}`, error.stack, 'CriativosService');
      throw new InternalServerErrorException('Erro ao remover projeto criativo');
    }
  }

  // ===== MÉTODOS UTILITÁRIOS =====

  async getStats(): Promise<any> {
    try {
      const cacheKey = 'criativos_stats';
      const cached = await this.cacheManager.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const [total, ativos, inativos, excluidos] = await Promise.all([
        this.criativosRepository.count(),
        this.criativosRepository.count({ where: { status: 'ativo' } }),
        this.criativosRepository.count({ where: { status: 'inativo' } }),
        this.criativosRepository.count({ where: { status: 'excluido' } })
      ]);

      // Projetos criados nos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentes = await this.criativosRepository.count({
        where: {
          dataCriacao: require('typeorm').MoreThan(thirtyDaysAgo)
        }
      });

      const stats = {
        total,
        ativos,
        inativos,
        excluidos,
        recentes,
        percentualAtivos: total > 0 ? Math.round((ativos / total) * 100) : 0
      };

      // Cachear por 1 hora
      await this.cacheManager.set(cacheKey, stats, 3600);
      
      return stats;

    } catch (error) {
      this.logger.error(`Erro ao buscar estatísticas: ${error.message}`, error.stack, 'CriativosService');
      throw new InternalServerErrorException('Erro ao buscar estatísticas');
    }
  }

  async search(term: string, limit: number = 10): Promise<Criativo[]> {
    try {
      return await this.criativosRepository.find({
        where: [
          { titulo: Like(`%${term}%`) },
          { cliente: Like(`%${term}%`) },
          { descricao: Like(`%${term}%`) }
        ],
        take: limit,
        order: { dataCriacao: 'DESC' }
      });
    } catch (error) {
      this.logger.error(`Erro na busca: ${error.message}`, error.stack, 'CriativosService');
      throw new InternalServerErrorException('Erro na busca');
    }
  }

  // ===== MÉTODOS DE CACHE =====

  async clearCache(): Promise<void> {
    try {
      await Promise.all([
        this.cacheManager.del(this.CACHE_KEY_CRIATIVOS),
        this.cacheManager.del('criativos_stats')
      ]);
    } catch (error) {
      this.logger.warn(`Erro ao limpar cache: ${error.message}`, 'CriativosService');
    }
  }

  async clearCacheForItem(id: string): Promise<void> {
    try {
      await Promise.all([
        this.cacheManager.del(this.CACHE_KEY_CRIATIVOS),
        this.cacheManager.del(`criativo_${id}`),
        this.cacheManager.del('criativos_stats')
      ]);
    } catch (error) {
      this.logger.warn(`Erro ao limpar cache do item ${id}: ${error.message}`, 'CriativosService');
    }
  }

  // ===== MÉTODOS DE TESTE/DEBUG =====

  async checkRedisConnection(): Promise<string> {
    try {
      await this.cacheManager.set('connection_test', 'OK', 10);
      const value = await this.cacheManager.get('connection_test');
      return value === 'OK' ? 'Redis connection successful!' : 'Connection failed';
    } catch (error) {
      return `Redis connection error: ${error.message}`;
    }
  }

  async setCacheValue(key: string, value: any): Promise<void> {
    await this.cacheManager.set(key, value);
  }

  async getCacheValue(key: string): Promise<any> {
    return await this.cacheManager.get(key);
  }
}