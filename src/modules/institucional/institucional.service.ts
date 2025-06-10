import { Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateInstitucionalDto } from './dto/create-institucional.dto';
import { UpdateInstitucionalDto } from './dto/update-institucional.dto';
import { Institucional } from './entities/institucional.entity';
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
export class InstitucionalService {
  private readonly CACHE_KEY_Institucional = 'all_Institucional';
  private readonly CACHE_TTL = 60 * 60 * 24; // 24 hrs

  constructor(
    @InjectRepository(Institucional)
    private readonly institucionalRepository: Repository<Institucional>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly uploadsService: UploadsService,
    private readonly logger: LoggerService,
    private readonly redisService: RedisService,
  ) {
    this.logger.log('InstitucionalService inicializado', 'InstitucionalService');
  }

  async testCache(): Promise<any> {
    console.log('🧪 Iniciando teste de cache...');
    
    try {
      // Teste 1: Verificar se o cacheManager existe
      console.log('1️⃣ CacheManager existe:', !!this.cacheManager);
      
      // Teste 2: Tentar definir um valor simples
      console.log('2️⃣ Tentando definir valor no cache...');
      await this.cacheManager.set('test_simple', 'hello_world', 60);
      console.log('✅ Valor definido com sucesso');
      
      // Teste 3: Tentar recuperar o valor
      console.log('3️⃣ Tentando recuperar valor do cache...');
      const retrieved = await this.cacheManager.get('test_simple');
      console.log('📤 Valor recuperado:', retrieved);
      
      // Teste 4: Tentar definir um objeto
      console.log('4️⃣ Tentando definir objeto no cache...');
      const testObject = { id: 1, name: 'Test', timestamp: new Date() };
      await this.cacheManager.set('test_object', testObject, 60);
      console.log('✅ Objeto definido com sucesso');
      
      // Teste 5: Recuperar o objeto
      console.log('5️⃣ Tentando recuperar objeto do cache...');
      const retrievedObject = await this.cacheManager.get('test_object');
      console.log('📤 Objeto recuperado:', retrievedObject);
      
      // ✅ TESTE 6 CORRIGIDO - sem usar stores
      console.log('6️⃣ Verificando tipo de store...');
      try {
        const storeType = this.cacheManager.stores?.constructor?.name || 'unknown';
        console.log('🏪 Tipo de store:', storeType);
      } catch (e) {
        console.log('ℹ️ Não foi possível identificar o tipo de store');
      }
      
      return {
        cacheManagerExists: !!this.cacheManager,
        simpleValueTest: retrieved === 'hello_world',
        objectTest: !!retrievedObject,
        retrievedObject,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.error('❌ Erro no teste de cache:', error);
      return {
        error: error.message,
        stack: error.stack,
        timestamp: new Date()
      };
    }
  }

  // ===== MÉTODOS PRINCIPAIS =====

  async create(createInstitucionalDto: CreateInstitucionalDto): Promise<Institucional> {
    try {
      this.logger.log('Criando novo institucional', 'InstitucionalService');
      
      const institucionalData = {
        cliente: createInstitucionalDto.cliente,
        descricao: createInstitucionalDto.descricao,
        image: createInstitucionalDto.image,
        titulo: createInstitucionalDto.titulo || `Projeto ${createInstitucionalDto.cliente}`,
        status: 'ativo'
      };

      const institucional = this.institucionalRepository.create(institucionalData);
      const savedInstitucional = await this.institucionalRepository.save(institucional);
      
      // Limpar cache
      await this.clearCache();
      
      this.logger.log(`Institucional criado com sucesso - ID: ${savedInstitucional.id}`, 'InstitucionalService');
      return savedInstitucional;

    } catch (error) {
      this.logger.error(`Erro ao criar institucional: ${error.message}`, error.stack, 'InstitucionalService');
      throw new InternalServerErrorException(`Erro ao criar projeto: ${error.message}`);
    }
  }

  async findAll(options: FindAllOptions = {}): Promise<Institucional[]> {
    try {
      const { status, search, page = 1, limit = 10 } = options;
      
      console.log('🔍 findAll chamado com opções:', { status, search, page, limit });
      
      // ✅ TENTAR CACHE REDIS PRIMEIRO
      if (!status && !search && page === 1 && limit === 10) {
        const cached = await this.redisService.get<Institucional[]>(this.CACHE_KEY_Institucional);
        if (cached && Array.isArray(cached)) {
          console.log('✅ Dados obtidos do Redis cache:', cached.length, 'itens');
          return cached;
        }
      }

      console.log('🗄️ Buscando dados no banco...');
      
      // Buscar do banco
      const result = await this.institucionalRepository.find({
        where: { status: 'ativo' },
        order: { dataCriacao: 'DESC' },
        take: limit,
        skip: (page - 1) * limit
      });
      
      console.log('📊 Dados do banco:', result.length, 'itens');
      
      // ✅ SALVAR NO REDIS
      if (!status && !search && page === 1 && limit === 10) {
        await this.redisService.set(this.CACHE_KEY_Institucional, result, this.CACHE_TTL);
      }
      
      return result;

    } catch (error) {
      console.error('❌ Erro geral:', error);
      throw new InternalServerErrorException('Erro ao buscar projetos');
    }
  }

  async findOne(id: string): Promise<Institucional> {
    try {
      const cacheKey = `institucional_${id}`;
      const cached = await this.cacheManager.get<Institucional>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const institucional = await this.institucionalRepository.findOne({ 
        where: { id },
        relations: [] // Adicionar relações se necessário
      });

      if (!institucional) {
        throw new NotFoundException(`Projeto com ID ${id} não encontrado`);
      }

      // Cachear por 1 hora
      await this.cacheManager.set(cacheKey, institucional, 3600);
      
      return institucional;

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao buscar institucional ${id}: ${error.message}`, error.stack, 'InstitucionalService');
      throw new InternalServerErrorException('Erro ao buscar projeto');
    }
  }

  async update(id: string, updateInstitucionalDto: UpdateInstitucionalDto): Promise<Institucional> {
    try {
      this.logger.log(`Atualizando institucional ${id}`, 'InstitucionalService');
      
      const existingInstitucional = await this.institucionalRepository.findOne({ where: { id } });
      if (!existingInstitucional) {
        throw new NotFoundException(`Projeto com ID ${id} não encontrado`);
      }

      // Merge dos dados
      this.institucionalRepository.merge(existingInstitucional, updateInstitucionalDto);
      
      const updatedInstitucional = await this.institucionalRepository.save(existingInstitucional);
      
      // Limpar cache
      await this.clearCacheForItem(id);
      
      this.logger.log(`Institucional ${id} atualizado com sucesso`, 'InstitucionalService');
      return updatedInstitucional;

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao atualizar institucional ${id}: ${error.message}`, error.stack, 'InstitucionalService');
      throw new InternalServerErrorException('Erro ao atualizar projeto');
    }
  }

  async remove(id: string, userId?: string): Promise<void> {
    try {
      this.logger.log(`Removendo institucional ${id}`, 'InstitucionalService');
      
      const institucional = await this.institucionalRepository.findOne({ where: { id } });
      if (!institucional) {
        throw new NotFoundException(`Projeto com ID ${id} não encontrado`);
      }

      // Soft delete - marcar como excluído
      await this.institucionalRepository.update(id, {
        status: 'excluido',
        excluidoPor: userId,
        dataExclusao: new Date()
      });

      // Remover arquivos de imagem se necessário
      if (institucional.image) {
        try {
          await this.uploadsService.deleteFile(institucional.image);
        } catch (deleteError) {
          this.logger.warn(`Erro ao deletar arquivo de imagem: ${deleteError.message}`, 'InstitucionalService');
        }
      }

      // Limpar cache
      await this.clearCacheForItem(id);
      
      this.logger.log(`Institucional ${id} removido com sucesso`, 'InstitucionalService');

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao remover institucional ${id}: ${error.message}`, error.stack, 'InstitucionalService');
      throw new InternalServerErrorException('Erro ao remover projeto');
    }
  }

  // ===== MÉTODOS UTILITÁRIOS =====

  async getStats(): Promise<any> {
    try {
      const cacheKey = 'institucional_stats';
      const cached = await this.cacheManager.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const [total, ativos, inativos, excluidos] = await Promise.all([
        this.institucionalRepository.count(),
        this.institucionalRepository.count({ where: { status: 'ativo' } }),
        this.institucionalRepository.count({ where: { status: 'inativo' } }),
        this.institucionalRepository.count({ where: { status: 'excluido' } })
      ]);

      // Projetos criados nos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentes = await this.institucionalRepository.count({
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
      this.logger.error(`Erro ao buscar estatísticas: ${error.message}`, error.stack, 'InstitucionalService');
      throw new InternalServerErrorException('Erro ao buscar estatísticas');
    }
  }

  async search(term: string, limit: number = 10): Promise<Institucional[]> {
    try {
      return await this.institucionalRepository.find({
        where: [
          { titulo: Like(`%${term}%`) },
          { cliente: Like(`%${term}%`) },
          { descricao: Like(`%${term}%`) }
        ],
        take: limit,
        order: { dataCriacao: 'DESC' }
      });
    } catch (error) {
      this.logger.error(`Erro na busca: ${error.message}`, error.stack, 'InstitucionalService');
      throw new InternalServerErrorException('Erro na busca');
    }
  }

  // ===== MÉTODOS DE CACHE =====

  async clearCache(): Promise<void> {
    try {
      await Promise.all([
        this.redisService.del(this.CACHE_KEY_Institucional),
        this.redisService.del('institucional_stats'),
        // ✅ REMOVER reset() - usar del() para chaves específicas
        this.cacheManager.del(this.CACHE_KEY_Institucional),
        this.cacheManager.del('institucional_stats')
      ]);
    } catch (error) {
      this.logger.warn(`Erro ao limpar cache: ${error.message}`, 'InstitucionalService');
    }
  }

  async clearCacheForItem(id: string): Promise<void> {
    try {
      await Promise.all([
        this.cacheManager.del(this.CACHE_KEY_Institucional),
        this.cacheManager.del(`institucional_${id}`),
        this.cacheManager.del('institucional_stats')
      ]);
    } catch (error) {
      this.logger.warn(`Erro ao limpar cache do item ${id}: ${error.message}`, 'InstitucionalService');
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

  async testRedisConnection(): Promise<any> {
    try {
      const ping = await this.redisService.ping();
      const testKey = 'test-' + Date.now();
      const testValue = { message: 'Redis test', timestamp: new Date() };
      
      await this.redisService.set(testKey, testValue, 300);
      const retrieved = await this.redisService.get(testKey);
      const keys = await this.redisService.keys('test-*');
      
      return {
        ping,
        testKey,
        testValue,
        retrieved,
        keys,
        testSuccessful: JSON.stringify(testValue) === JSON.stringify(retrieved),
        timestamp: new Date()
      };
    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}