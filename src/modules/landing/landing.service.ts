// landing.service.ts
import { Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateLandingDto } from './dto/create-landing.dto';
import { UpdateLandingDto } from './dto/update-landing.dto';
import { Landing } from './entities/landing.entity';
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
export class LandingService {
  private readonly CACHE_KEY_LANDING = 'all_landing_pages';
  private readonly CACHE_TTL = 60 * 60 * 24; // 24 hrs

  constructor(
    @InjectRepository(Landing)
    private readonly landingRepository: Repository<Landing>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly uploadsService: UploadsService,
    private readonly logger: LoggerService,
    private readonly redisService: RedisService,
  ) {
    this.logger.log('LandingService inicializado', 'LandingService');
  }

  // ===== MÉTODOS PRINCIPAIS =====

  async create(createLandingDto: CreateLandingDto): Promise<Landing> {
    try {
      this.logger.log('Criando nova landing page', 'LandingService');
      
      const landingData = {
        cliente: createLandingDto.cliente,
        descricao: createLandingDto.descricao,
        image: createLandingDto.image,
        titulo: createLandingDto.titulo || `Projeto ${createLandingDto.cliente}`,
        status: 'ativo'
      };

      const landing = this.landingRepository.create(landingData);
      const savedLanding = await this.landingRepository.save(landing);
      
      // Limpar cache
      await this.clearCache();
      
      this.logger.log(`Landing page criada com sucesso - ID: ${savedLanding.id}`, 'LandingService');
      return savedLanding;

    } catch (error) {
      this.logger.error(`Erro ao criar landing page: ${error.message}`, error.stack, 'LandingService');
      throw new InternalServerErrorException(`Erro ao criar projeto: ${error.message}`);
    }
  }

  async findAll(options: FindAllOptions = {}): Promise<Landing[]> {
    try {
      const { status, search, page = 1, limit = 10 } = options;
      
      // Se não há filtros, tentar cache
      if (!status && !search && page === 1 && limit === 10) {
        const cached = await this.cacheManager.get<Landing[]>(this.CACHE_KEY_LANDING);
        if (cached) {
          this.logger.log('Dados obtidos do cache', 'LandingService');
          return cached;
        }
      }

      // Construir query
      const queryBuilder = this.landingRepository.createQueryBuilder('landing');
      
      // Filtrar por status
      if (status && status !== 'all') {
        queryBuilder.andWhere('landing.status = :status', { status });
      }
      
      // Filtrar por busca
      if (search) {
        queryBuilder.andWhere(
          '(landing.titulo ILIKE :search OR landing.cliente ILIKE :search OR landing.descricao ILIKE :search)',
          { search: `%${search}%` }
        );
      }
      
      // Ordenar por data de criação (mais recentes primeiro)
      queryBuilder.orderBy('landing.dataCriacao', 'DESC');
      
      // Paginação
      if (page && limit) {
        queryBuilder.skip((page - 1) * limit).take(limit);
      }

      const result = await queryBuilder.getMany();
      
      // Cachear apenas se não há filtros
      if (!status && !search && page === 1 && limit === 10) {
        await this.cacheManager.set(this.CACHE_KEY_LANDING, result, this.CACHE_TTL);
      }
      
      return result;

    } catch (error) {
      this.logger.error(`Erro ao buscar landing pages: ${error.message}`, error.stack, 'LandingService');
      throw new InternalServerErrorException('Erro ao buscar projetos');
    }
  }

  async findOne(id: string): Promise<Landing> {
    try {
      const cacheKey = `landing_${id}`;
      const cached = await this.cacheManager.get<Landing>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const landing = await this.landingRepository.findOne({ 
        where: { id },
        relations: [] // Adicionar relações se necessário
      });

      if (!landing) {
        throw new NotFoundException(`Landing page com ID ${id} não encontrada`);
      }

      // Cachear por 1 hora
      await this.cacheManager.set(cacheKey, landing, 3600);
      
      return landing;

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao buscar landing page ${id}: ${error.message}`, error.stack, 'LandingService');
      throw new InternalServerErrorException('Erro ao buscar projeto');
    }
  }

  async update(id: string, updateLandingDto: UpdateLandingDto): Promise<Landing> {
    try {
      this.logger.log(`Atualizando landing page ${id}`, 'LandingService');
      
      const existingLanding = await this.landingRepository.findOne({ where: { id } });
      if (!existingLanding) {
        throw new NotFoundException(`Landing page com ID ${id} não encontrada`);
      }

      // Merge dos dados
      this.landingRepository.merge(existingLanding, updateLandingDto);
      
      const updatedLanding = await this.landingRepository.save(existingLanding);
      
      // Limpar cache
      await this.clearCacheForItem(id);
      
      this.logger.log(`Landing page ${id} atualizada com sucesso`, 'LandingService');
      return updatedLanding;

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao atualizar landing page ${id}: ${error.message}`, error.stack, 'LandingService');
      throw new InternalServerErrorException('Erro ao atualizar projeto');
    }
  }

  async remove(id: string, userId?: string): Promise<void> {
    try {
      this.logger.log(`Removendo landing page ${id}`, 'LandingService');
      
      const landing = await this.landingRepository.findOne({ where: { id } });
      if (!landing) {
        throw new NotFoundException(`Landing page com ID ${id} não encontrada`);
      }

      // Soft delete - marcar como excluído
      await this.landingRepository.update(id, {
        status: 'excluido',
        excluidoPor: userId,
        dataExclusao: new Date()
      });

      // Remover arquivos de imagem se necessário
      if (landing.image) {
        try {
          await this.uploadsService.deleteFile(landing.image);
        } catch (deleteError) {
          this.logger.warn(`Erro ao deletar arquivo de imagem: ${deleteError.message}`, 'LandingService');
        }
      }

      // Limpar cache
      await this.clearCacheForItem(id);
      
      this.logger.log(`Landing page ${id} removida com sucesso`, 'LandingService');

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao remover landing page ${id}: ${error.message}`, error.stack, 'LandingService');
      throw new InternalServerErrorException('Erro ao remover projeto');
    }
  }

  // ===== MÉTODOS UTILITÁRIOS =====

  async getStats(): Promise<any> {
    try {
      const cacheKey = 'landing_stats';
      const cached = await this.cacheManager.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const [total, ativos, inativos, excluidos] = await Promise.all([
        this.landingRepository.count(),
        this.landingRepository.count({ where: { status: 'ativo' } }),
        this.landingRepository.count({ where: { status: 'inativo' } }),
        this.landingRepository.count({ where: { status: 'excluido' } })
      ]);

      // Projetos criados nos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentes = await this.landingRepository.count({
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
      this.logger.error(`Erro ao buscar estatísticas: ${error.message}`, error.stack, 'LandingService');
      throw new InternalServerErrorException('Erro ao buscar estatísticas');
    }
  }

  async search(term: string, limit: number = 10): Promise<Landing[]> {
    try {
      return await this.landingRepository.find({
        where: [
          { titulo: Like(`%${term}%`) },
          { cliente: Like(`%${term}%`) },
          { descricao: Like(`%${term}%`) }
        ],
        take: limit,
        order: { dataCriacao: 'DESC' }
      });
    } catch (error) {
      this.logger.error(`Erro na busca: ${error.message}`, error.stack, 'LandingService');
      throw new InternalServerErrorException('Erro na busca');
    }
  }

  // ===== MÉTODOS DE CACHE =====

  async clearCache(): Promise<void> {
    try {
      await Promise.all([
        this.cacheManager.del(this.CACHE_KEY_LANDING),
        this.cacheManager.del('landing_stats')
      ]);
    } catch (error) {
      this.logger.warn(`Erro ao limpar cache: ${error.message}`, 'LandingService');
    }
  }

  async clearCacheForItem(id: string): Promise<void> {
    try {
      await Promise.all([
        this.cacheManager.del(this.CACHE_KEY_LANDING),
        this.cacheManager.del(`landing_${id}`),
        this.cacheManager.del('landing_stats')
      ]);
    } catch (error) {
      this.logger.warn(`Erro ao limpar cache do item ${id}: ${error.message}`, 'LandingService');
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