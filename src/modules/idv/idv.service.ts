// idv.service.ts - VERSÃO CORRIGIDA E COMPLETA
import { Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateIdvDto } from './dto/create-idv.dto';
import { UpdateIdvDto } from './dto/update-idv.dto';
import { Idv } from './entities/idv.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, MoreThan } from 'typeorm';
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
export class IdvService {
  private readonly CACHE_KEY_IDV = 'all_idv';
  private readonly CACHE_TTL = 60 * 60 * 24; // 24 hrs

  constructor(
    @InjectRepository(Idv)
    public readonly idvRepository: Repository<Idv>, // Tornado público para debug
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly uploadsService: UploadsService,
    private readonly logger: LoggerService,
    private readonly redisService: RedisService,
  ) {
    this.logger.log('IdvService inicializado', 'IdvService');
  }

  // ===== MÉTODOS PRINCIPAIS =====

  async create(createIdvDto: CreateIdvDto): Promise<Idv> {
    try {
      this.logger.log('🚀 Criando nova IDV', 'IdvService');
      this.logger.log(`📋 Dados recebidos: ${JSON.stringify({
        titulo: createIdvDto.titulo,
        cliente: createIdvDto.cliente,
        hasImage: !!createIdvDto.image
      })}`, 'IdvService');
      
      const idvData = {
        cliente: createIdvDto.cliente,
        descricao: createIdvDto.descricao,
        image: createIdvDto.image,
        titulo: createIdvDto.titulo || `Projeto IDV ${createIdvDto.cliente}`,
        status: 'ativo'
      };

      const idv = this.idvRepository.create(idvData);
      const savedIdv = await this.idvRepository.save(idv);
      
      // Limpar cache
      await this.clearCache();
      
      this.logger.log(`✅ IDV criada com sucesso - ID: ${savedIdv.id}`, 'IdvService');
      return savedIdv;

    } catch (error) {
      this.logger.error(`❌ Erro ao criar IDV: ${error.message}`, error.stack, 'IdvService');
      throw new InternalServerErrorException(`Erro ao criar projeto de identidade visual: ${error.message}`);
    }
  }

  async findAll(options: FindAllOptions = {}): Promise<Idv[]> {
    try {
      const { status, search, page = 1, limit = 10 } = options;
      
      console.log('🔍 findAll usando padrão LANDING:', { status, search, page, limit });
      
      // ✅ USAR QUERY BUILDER COMO NO LANDING
      const queryBuilder = this.idvRepository.createQueryBuilder('idv');
      
      // ✅ IMPORTANTE: Incluir deleted_at IS NULL explicitamente
      queryBuilder.where('idv.deleted_at IS NULL');
      
      // Filtrar por status se especificado
      if (status && status !== 'all') {
        queryBuilder.andWhere('idv.status = :status', { status });
      } else {
        // Se não especificado, buscar apenas ativos
        queryBuilder.andWhere('idv.status = :status', { status: 'ativo' });
      }
      
      // Filtrar por busca se especificada
      if (search) {
        queryBuilder.andWhere(
          '(idv.titulo ILIKE :search OR idv.cliente ILIKE :search OR idv.descricao ILIKE :search)',
          { search: `%${search}%` }
        );
      }
      
      // Ordenar por data de criação (mais recentes primeiro)
      queryBuilder.orderBy('idv.dataCriacao', 'DESC');
      
      // Paginação
      if (page && limit) {
        queryBuilder.skip((page - 1) * limit).take(limit);
      }
      
      const result = await queryBuilder.getMany();
      
      console.log('📊 Resultado com query builder:', result.length, 'registros');
      
      // ✅ CACHEAR NO REDIS APENAS PARA CONSULTA PADRÃO
      if (!status && !search && page === 1 && limit === 10) {
        await this.redisService.set(this.CACHE_KEY_IDV, result, this.CACHE_TTL);
        console.log('💾 Dados salvos no Redis cache');
      }
      
      return result;

    } catch (error) {
      console.error('❌ Erro em findAll:', error);
      this.logger.error(`❌ Erro ao buscar IDVs: ${error.message}`, error.stack, 'IdvService');
      throw new InternalServerErrorException('Erro ao buscar projetos de identidade visual');
    }
  }

  async findOne(id: string): Promise<Idv> {
    try {
      this.logger.log(`🔍 Buscando IDV por ID: ${id}`, 'IdvService');
      
      const cacheKey = `idv_${id}`;
      const cached = await this.cacheManager.get<Idv>(cacheKey);
      
      if (cached) {
        this.logger.log(`📦 IDV encontrada no cache: ${id}`, 'IdvService');
        return cached;
      }

      const idv = await this.idvRepository.findOne({ 
        where: { id },
        relations: [] // Adicionar relações se necessário
      });

      if (!idv) {
        this.logger.warn(`❌ IDV não encontrada: ${id}`, 'IdvService');
        throw new NotFoundException(`Projeto de identidade visual com ID ${id} não encontrado`);
      }

      // Cachear por 1 hora
      await this.cacheManager.set(cacheKey, idv, 3600);
      this.logger.log(`✅ IDV encontrada e armazenada em cache: ${id}`, 'IdvService');
      
      return idv;

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`❌ Erro ao buscar IDV ${id}: ${error.message}`, error.stack, 'IdvService');
      throw new InternalServerErrorException('Erro ao buscar projeto de identidade visual');
    }
  }

  async update(id: string, updateIdvDto: UpdateIdvDto): Promise<Idv> {
    try {
      this.logger.log(`📝 Atualizando IDV ${id}`, 'IdvService');
      this.logger.log(`📋 Dados para atualização: ${JSON.stringify({
        titulo: updateIdvDto.titulo,
        cliente: updateIdvDto.cliente,
        status: updateIdvDto.status,
        hasNewImage: !!updateIdvDto.image
      })}`, 'IdvService');
      
      const existingIdv = await this.idvRepository.findOne({ where: { id } });
      if (!existingIdv) {
        this.logger.warn(`❌ IDV não encontrada para atualização: ${id}`, 'IdvService');
        throw new NotFoundException(`Projeto de identidade visual com ID ${id} não encontrado`);
      }

      // Merge dos dados
      this.idvRepository.merge(existingIdv, updateIdvDto);
      
      const updatedIdv = await this.idvRepository.save(existingIdv);
      
      // Limpar cache
      await this.clearCacheForItem(id);
      
      this.logger.log(`✅ IDV ${id} atualizada com sucesso`, 'IdvService');
      return updatedIdv;

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`❌ Erro ao atualizar IDV ${id}: ${error.message}`, error.stack, 'IdvService');
      throw new InternalServerErrorException('Erro ao atualizar projeto de identidade visual');
    }
  }

  async remove(id: string, userId?: string): Promise<void> {
    try {
      this.logger.log(`🗑️ Removendo IDV ${id}`, 'IdvService');
      
      const idv = await this.idvRepository.findOne({ where: { id } });
      if (!idv) {
        this.logger.warn(`❌ IDV não encontrada para remoção: ${id}`, 'IdvService');
        throw new NotFoundException(`Projeto de identidade visual com ID ${id} não encontrado`);
      }

      // Soft delete - marcar como excluído
      await this.idvRepository.update(id, {
        status: 'excluido',
        excluidoPor: userId,
        // dataExclusao: new Date() - será gerenciada pelo TypeORM automaticamente com @DeleteDateColumn
      });

      this.logger.log(`🗑️ IDV marcada como excluída: ${id}`, 'IdvService');

      // Remover arquivos de imagem se necessário
      if (idv.image) {
        try {
          await this.uploadsService.deleteFile(idv.image);
          this.logger.log(`🗑️ Arquivo de imagem removido: ${idv.image}`, 'IdvService');
        } catch (deleteError) {
          this.logger.warn(`⚠️ Erro ao deletar arquivo de imagem: ${deleteError.message}`, 'IdvService');
        }
      }

      // Limpar cache
      await this.clearCacheForItem(id);
      
      this.logger.log(`✅ IDV ${id} removida com sucesso`, 'IdvService');

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`❌ Erro ao remover IDV ${id}: ${error.message}`, error.stack, 'IdvService');
      throw new InternalServerErrorException('Erro ao remover projeto de identidade visual');
    }
  }

  // ===== MÉTODOS UTILITÁRIOS =====

  async getStats(): Promise<any> {
    try {
      this.logger.log('📊 Buscando estatísticas das IDVs', 'IdvService');
      
      const cacheKey = 'idv_stats';
      const cached = await this.cacheManager.get(cacheKey);
      
      if (cached) {
        this.logger.log('📦 Estatísticas obtidas do cache', 'IdvService');
        return cached;
      }

      const [total, ativos, inativos, excluidos] = await Promise.all([
        this.idvRepository.count(),
        this.idvRepository.count({ where: { status: 'ativo' } }),
        this.idvRepository.count({ where: { status: 'inativo' } }),
        this.idvRepository.count({ where: { status: 'excluido' } })
      ]);

      // Projetos criados nos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentes = await this.idvRepository.count({
        where: {
          dataCriacao: MoreThan(thirtyDaysAgo)
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
      
      this.logger.log(`📊 Estatísticas calculadas: ${JSON.stringify(stats)}`, 'IdvService');
      return stats;

    } catch (error) {
      this.logger.error(`❌ Erro ao buscar estatísticas: ${error.message}`, error.stack, 'IdvService');
      throw new InternalServerErrorException('Erro ao buscar estatísticas');
    }
  }

  async search(term: string, limit: number = 10): Promise<Idv[]> {
    try {
      this.logger.log(`🔍 Realizando busca por: "${term}" (limite: ${limit})`, 'IdvService');
      
      const result = await this.idvRepository.find({
        where: [
          { titulo: Like(`%${term}%`) },
          { cliente: Like(`%${term}%`) },
          { descricao: Like(`%${term}%`) }
        ],
        take: limit,
        order: { dataCriacao: 'DESC' }
      });

      this.logger.log(`✅ Busca concluída: ${result.length} resultados encontrados`, 'IdvService');
      return result;
    } catch (error) {
      this.logger.error(`❌ Erro na busca: ${error.message}`, error.stack, 'IdvService');
      throw new InternalServerErrorException('Erro na busca');
    }
  }

  // ===== MÉTODOS DE CACHE =====

  async clearCache(): Promise<void> {
    try {
      await Promise.all([
        this.cacheManager.del(this.CACHE_KEY_IDV),
        this.cacheManager.del('idv_stats')
      ]);
      this.logger.log('🧹 Cache geral das IDVs limpo', 'IdvService');
    } catch (error) {
      this.logger.warn(`⚠️ Erro ao limpar cache: ${error.message}`, 'IdvService');
    }
  }

  async clearCacheForItem(id: string): Promise<void> {
    try {
      await Promise.all([
        this.cacheManager.del(this.CACHE_KEY_IDV),
        this.cacheManager.del(`idv_${id}`),
        this.cacheManager.del('idv_stats')
      ]);
      this.logger.log(`🧹 Cache da IDV ${id} limpo`, 'IdvService');
    } catch (error) {
      this.logger.warn(`⚠️ Erro ao limpar cache do item ${id}: ${error.message}`, 'IdvService');
    }
  }

  // ===== MÉTODOS DE TESTE/DEBUG =====

  async checkRedisConnection(): Promise<string> {
    try {
      await this.cacheManager.set('connection_test', 'OK', 10);
      const value = await this.cacheManager.get('connection_test');
      const status = value === 'OK' ? 'Redis connection successful!' : 'Connection failed';
      this.logger.log(`🔌 Teste de conexão Redis: ${status}`, 'IdvService');
      return status;
    } catch (error) {
      const errorMsg = `Redis connection error: ${error.message}`;
      this.logger.error(`❌ ${errorMsg}`, error.stack, 'IdvService');
      return errorMsg;
    }
  }

  async setCacheValue(key: string, value: any): Promise<void> {
    await this.cacheManager.set(key, value);
    this.logger.log(`💾 Valor definido no cache: ${key}`, 'IdvService');
  }

  async getCacheValue(key: string): Promise<any> {
    const value = await this.cacheManager.get(key);
    this.logger.log(`📦 Valor obtido do cache: ${key}`, 'IdvService');
    return value;
  }
}