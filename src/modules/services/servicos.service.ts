// servicos.service.ts - VERSÃO CORRIGIDA
import { Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateServicosDto } from './dto/create-servicos.dto';
import { UpdateServicosDto } from './dto/update-servicos.dto';
import { Servicos } from './entities/servicos.entity';
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
export class ServicosService {
  private readonly CACHE_KEY_SERVICOS = 'all_servicos';
  private readonly CACHE_TTL = 60 * 60 * 24; // 24 hrs

  constructor(
    @InjectRepository(Servicos)
    private readonly servicosRepository: Repository<Servicos>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly uploadsService: UploadsService,
    private readonly logger: LoggerService,
    private readonly redisService: RedisService,
  ) {
    this.logger.log('ServicosService inicializado', 'ServicosService');
  }

  // ===== MÉTODOS PRINCIPAIS =====

  async create(createServicosDto: CreateServicosDto): Promise<Servicos> {
    try {
      this.logger.log('Criando novo serviço', 'ServicosService');
      
      const servicosData = {
        cliente: createServicosDto.cliente,
        descricao: createServicosDto.descricao,
        icon: createServicosDto.icon,
        titulo: createServicosDto.titulo || `Serviço ${createServicosDto.cliente}`,
        status: 'ativo'
      };

      const servicos = this.servicosRepository.create(servicosData);
      const savedServicos = await this.servicosRepository.save(servicos);
      
      // Limpar cache
      await this.clearCache();
      
      this.logger.log(`Serviço criado com sucesso - ID: ${savedServicos.id}`, 'ServicosService');
      return savedServicos;

    } catch (error) {
      this.logger.error(`Erro ao criar serviço: ${error.message}`, error.stack, 'ServicosService');
      throw new InternalServerErrorException(`Erro ao criar serviço: ${error.message}`);
    }
  }

  async findAll(options: FindAllOptions = {}): Promise<Servicos[]> {
    try {
      const { status, search, page = 1, limit = 10 } = options;
      
      console.log('🔍 findAll chamado com opções:', { status, search, page, limit });
      
      // ✅ TENTAR CACHE REDIS PRIMEIRO
      if (!status && !search && page === 1 && limit === 10) {
        const cached = await this.redisService.get<Servicos[]>(this.CACHE_KEY_SERVICOS);
        if (cached && Array.isArray(cached)) {
          console.log('✅ Dados obtidos do Redis cache:', cached.length, 'itens');
          return cached;
        }
      }

      console.log('🗄️ Buscando dados no banco...');
      
      // Buscar do banco
      const result = await this.servicosRepository.find({
        where: { status: 'ativo' },
        order: { dataCriacao: 'DESC' },
        take: limit,
        skip: (page - 1) * limit
      });
      
      console.log('📊 Dados do banco:', result.length, 'itens');
      
      // ✅ SALVAR NO REDIS
      if (!status && !search && page === 1 && limit === 10) {
        await this.redisService.set(this.CACHE_KEY_SERVICOS, result, this.CACHE_TTL);
      }
      
      return result;

    } catch (error) {
      console.error('❌ Erro geral:', error);
      throw new InternalServerErrorException('Erro ao buscar projetos');
    }
  }

  async findOne(id: string): Promise<Servicos> {
    try {
      const cacheKey = `servicos_${id}`;
      const cached = await this.cacheManager.get<Servicos>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const servicos = await this.servicosRepository.findOne({ 
        where: { id },
        relations: [] // Adicionar relações se necessário
      });

      if (!servicos) {
        throw new NotFoundException(`Serviço com ID ${id} não encontrado`);
      }

      // Cachear por 1 hora
      await this.cacheManager.set(cacheKey, servicos, 3600);
      
      return servicos;

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao buscar serviço ${id}: ${error.message}`, error.stack, 'ServicosService');
      throw new InternalServerErrorException('Erro ao buscar serviço');
    }
  }

  async update(id: string, updateServicosDto: UpdateServicosDto): Promise<Servicos> {
    try {
      this.logger.log(`Atualizando serviço ${id}`, 'ServicosService');
      
      const existingServicos = await this.servicosRepository.findOne({ where: { id } });
      if (!existingServicos) {
        throw new NotFoundException(`Serviço com ID ${id} não encontrado`);
      }

      // Merge dos dados
      this.servicosRepository.merge(existingServicos, updateServicosDto);
      
      const updatedServicos = await this.servicosRepository.save(existingServicos);
      
      // Limpar cache
      await this.clearCacheForItem(id);
      
      this.logger.log(`Serviço ${id} atualizado com sucesso`, 'ServicosService');
      return updatedServicos;

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao atualizar serviço ${id}: ${error.message}`, error.stack, 'ServicosService');
      throw new InternalServerErrorException('Erro ao atualizar serviço');
    }
  }

  async remove(id: string, userId?: string): Promise<void> {
    try {
      this.logger.log(`Removendo serviço ${id}`, 'ServicosService');
      
      const servicos = await this.servicosRepository.findOne({ where: { id } });
      if (!servicos) {
        throw new NotFoundException(`Serviço com ID ${id} não encontrado`);
      }

      // Soft delete - marcar como excluído
      await this.servicosRepository.update(id, {
        status: 'excluido',
        excluidoPor: userId,
        dataExclusao: new Date()
      });

      // Remover arquivos de ícone se necessário
      if (servicos.icon) {
        try {
          await this.uploadsService.deleteFile(servicos.icon);
        } catch (deleteError) {
          this.logger.warn(`Erro ao deletar arquivo de ícone: ${deleteError.message}`, 'ServicosService');
        }
      }

      // Limpar cache
      await this.clearCacheForItem(id);
      
      this.logger.log(`Serviço ${id} removido com sucesso`, 'ServicosService');

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao remover serviço ${id}: ${error.message}`, error.stack, 'ServicosService');
      throw new InternalServerErrorException('Erro ao remover serviço');
    }
  }

  // ===== MÉTODOS UTILITÁRIOS =====

  async getStats(): Promise<any> {
    try {
      const cacheKey = 'servicos_stats';
      const cached = await this.cacheManager.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const [total, ativos, inativos, excluidos] = await Promise.all([
        this.servicosRepository.count(),
        this.servicosRepository.count({ where: { status: 'ativo' } }),
        this.servicosRepository.count({ where: { status: 'inativo' } }),
        this.servicosRepository.count({ where: { status: 'excluido' } })
      ]);

      // Serviços criados nos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentes = await this.servicosRepository.count({
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
      this.logger.error(`Erro ao buscar estatísticas: ${error.message}`, error.stack, 'ServicosService');
      throw new InternalServerErrorException('Erro ao buscar estatísticas');
    }
  }

  async search(term: string, limit: number = 10): Promise<Servicos[]> {
    try {
      return await this.servicosRepository.find({
        where: [
          { titulo: Like(`%${term}%`) },
          { cliente: Like(`%${term}%`) },
          { descricao: Like(`%${term}%`) }
        ],
        take: limit,
        order: { dataCriacao: 'DESC' }
      });
    } catch (error) {
      this.logger.error(`Erro na busca: ${error.message}`, error.stack, 'ServicosService');
      throw new InternalServerErrorException('Erro na busca');
    }
  }

  // ===== MÉTODOS DE CACHE =====

  async clearCache(): Promise<void> {
    try {
      await Promise.all([
        this.cacheManager.del(this.CACHE_KEY_SERVICOS),
        this.cacheManager.del('servicos_stats')
      ]);
    } catch (error) {
      this.logger.warn(`Erro ao limpar cache: ${error.message}`, 'ServicosService');
    }
  }

  async clearCacheForItem(id: string): Promise<void> {
    try {
      await Promise.all([
        this.cacheManager.del(this.CACHE_KEY_SERVICOS),
        this.cacheManager.del(`servicos_${id}`),
        this.cacheManager.del('servicos_stats')
      ]);
    } catch (error) {
      this.logger.warn(`Erro ao limpar cache do item ${id}: ${error.message}`, 'ServicosService');
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