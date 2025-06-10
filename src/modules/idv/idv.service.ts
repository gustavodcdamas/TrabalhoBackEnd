import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateIdvDto } from './dto/create-idv.dto';
import { UpdateIdvDto } from './dto/update-idv.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadsService } from '../uploads/uploads.service';
import { Idv } from './entities/idv.entity';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class IdvService {
  private readonly CACHE_KEY_Idv = 'all_Idv';
  private readonly CACHE_TTL = 60 * 60 * 24; // 24 hrs


  constructor(
    @InjectRepository(Idv)
    private readonly IdvRepository: Repository<Idv>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly uploadsService: UploadsService,
    private readonly logger: LoggerService,
  ) {
    this.logger.log('IdvService inicializado', 'IdvService');
  }

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

  async clearCache(): Promise<void> {
    try {
      //await this.cacheManager.reset(); // ✅ USAR reset() ao invés de clear()
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  }

  async create(createIdvDto: CreateIdvDto): Promise<Idv> {
    try {
      this.logger.log(`Criando nova Idv: ${createIdvDto.titulo}`, 'IdvService');
      
      const Idv = this.IdvRepository.create(createIdvDto);
      const savedIdv = await this.IdvRepository.save(Idv);
      
      await this.cacheManager.del(this.CACHE_KEY_Idv);
      
      this.logger.log(`Idv criada com ID: ${savedIdv.id}`, 'IdvService');
      return savedIdv;
    } catch (error) {
      this.logger.error(
        `Falha ao criar Idv: ${error.message}`,
        error.stack,
        'IdvService'
      );
      throw error;
    }
  }

  async update(id: string, updateIdvDto: UpdateIdvDto): Promise<Idv> {
    try {
      this.logger.log(`Atualizando Idv ID: ${id}`, 'IdvService');
      
      // Verifica se a Idv existe
      const existingIdv = await this.IdvRepository.findOne({ where: { id } });
      if (!existingIdv) {
        throw new NotFoundException(`Idv com ID ${id} não encontrado`);
      }

      // Atualiza os campos
      this.IdvRepository.merge(existingIdv, updateIdvDto);
      
      // Salva as alterações
      const updatedIdv = await this.IdvRepository.save(existingIdv);
      
      // Limpa o cache
      await this.cacheManager.del(`Idv_${id}`);
      await this.cacheManager.del(this.CACHE_KEY_Idv);
      
      this.logger.log(`Idv ID: ${id} atualizado com sucesso`, 'IdvService');
      return updatedIdv;
    } catch (error) {
      this.logger.error(
        `Falha ao atualizar Idv ID: ${id}: ${error.message}`,
        error.stack,
        'IdvService'
      );
      throw error;
    }
  }

  async findAll(): Promise<Idv[]> {
    try {
      // tenta pegar do cache
      const cached = await this.cacheManager.get<Idv[]>(this.CACHE_KEY_Idv);
      if (cached) return cached;
    } catch (error) {
      console.error('Falha no cache, usando banco de dados', error);
    }
    
    // se não tiver no cache pega do banco
    const dados = await this.IdvRepository.find();
    
    try {
      // armazena em cache
      await this.cacheManager.set(this.CACHE_KEY_Idv, dados, this.CACHE_TTL);
    } catch (error) {
      console.error('Falha ao atualizar cache', error);
    }
    
    return dados;
  }

  async findOne(id: string): Promise<Idv> {
    const cacheKey = `Idv_${id}`;
    const cached = await this.cacheManager.get<Idv>(cacheKey);
      
    if (cached) return cached;

    const Idv = await this.IdvRepository.findOne({ where: { id } });

    if (!Idv) {
      throw new NotFoundException(`Idv com ID ${id} não encontrado`);
    }

    await this.cacheManager.set(cacheKey, Idv, 360 * 360); // 1h de cache
    return Idv;
  }

  async remove(id: string): Promise<void> {
    try {
      this.logger.log(`Iniciando remoção do Idv ID: ${id}`, 'IdvService');
      
      const Idv = await this.IdvRepository.findOne({ where: { id } });
      if (!Idv) {
        throw new NotFoundException(`Idv com ID ${id} não encontrado`);
      }

      if (Idv.image) {
        this.logger.log(`Removendo imagens da Idv ID: ${id}`, 'IdvService');
        // ... código existente de remoção
      }

      await this.IdvRepository.delete(id);
      await this.cacheManager.del(`Idv${id}`);
      await this.cacheManager.del(this.CACHE_KEY_Idv);
      
      this.logger.log(`Idv ID: ${id} removido com sucesso`, 'IdvService');
    } catch (error) {
      this.logger.error(
        `Falha ao remover Idv ID: ${id}: ${error.message}`,
        error.stack,
        'IdvService'
      );
      throw error;
    }
  }
}
