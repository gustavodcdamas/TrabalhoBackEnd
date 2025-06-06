import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateInstitucionalDto } from './dto/create-institucional.dto';
import { UpdateInstitucionalDto } from './dto/update-institucional.dto';
import { Institucional } from './entities/institucional.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadsService } from '../uploads/uploads.service';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class InstitucionalService {
  private readonly CACHE_KEY_Institucional = 'all_Institucional';
  private readonly CACHE_TTL = 60 * 60 * 24; // 24 hrs


  constructor(
    @InjectRepository(Institucional)
    private readonly InstitucionalRepository: Repository<Institucional>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly uploadsService: UploadsService,
    private readonly logger: LoggerService,
  ) {
    this.logger.log('InstitucionalService inicializado', 'InstitucionalService');
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
    await this.cacheManager.clear();
  }

  async create(createInstitucionalDto: CreateInstitucionalDto): Promise<Institucional> {
    try {
      this.logger.log(`Criando nova Institucional: ${createInstitucionalDto.titulo}`, 'InstitucionalService');
      
      const Institucional = this.InstitucionalRepository.create(createInstitucionalDto);
      const savedInstitucional = await this.InstitucionalRepository.save(Institucional);
      
      await this.cacheManager.del(this.CACHE_KEY_Institucional);
      
      this.logger.log(`Institucional criada com ID: ${savedInstitucional.id}`, 'InstitucionalService');
      return savedInstitucional;
    } catch (error) {
      this.logger.error(
        `Falha ao criar Institucional: ${error.message}`,
        error.stack,
        'InstitucionalService'
      );
      throw error;
    }
  }

  async update(id: string, updateInstitucionalDto: UpdateInstitucionalDto): Promise<Institucional> {
    try {
      this.logger.log(`Atualizando Institucional ID: ${id}`, 'InstitucionalService');
      
      // Verifica se a Institucional existe
      const existingInstitucional = await this.InstitucionalRepository.findOne({ where: { id } });
      if (!existingInstitucional) {
        throw new NotFoundException(`Institucional com ID ${id} não encontrado`);
      }

      // Atualiza os campos
      this.InstitucionalRepository.merge(existingInstitucional, updateInstitucionalDto);
      
      // Salva as alterações
      const updatedInstitucional = await this.InstitucionalRepository.save(existingInstitucional);
      
      // Limpa o cache
      await this.cacheManager.del(`Institucional_${id}`);
      await this.cacheManager.del(this.CACHE_KEY_Institucional);
      
      this.logger.log(`Institucional ID: ${id} atualizado com sucesso`, 'InstitucionalService');
      return updatedInstitucional;
    } catch (error) {
      this.logger.error(
        `Falha ao atualizar Institucional ID: ${id}: ${error.message}`,
        error.stack,
        'InstitucionalService'
      );
      throw error;
    }
  }

  async findAll(): Promise<Institucional[]> {
    try {
      // tenta pegar do cache
      const cached = await this.cacheManager.get<Institucional[]>(this.CACHE_KEY_Institucional);
      if (cached) return cached;
    } catch (error) {
      console.error('Falha no cache, usando banco de dados', error);
    }
    
    // se não tiver no cache pega do banco
    const dados = await this.InstitucionalRepository.find();
    
    try {
      // armazena em cache
      await this.cacheManager.set(this.CACHE_KEY_Institucional, dados, this.CACHE_TTL);
    } catch (error) {
      console.error('Falha ao atualizar cache', error);
    }
    
    return dados;
  }

  async findOne(id: string): Promise<Institucional> {
    const cacheKey = `Institucional_${id}`;
    const cached = await this.cacheManager.get<Institucional>(cacheKey);
      
    if (cached) return cached;

    const Institucional = await this.InstitucionalRepository.findOne({ where: { id } });

    if (!Institucional) {
      throw new NotFoundException(`Institucional com ID ${id} não encontrado`);
    }

    await this.cacheManager.set(cacheKey, Institucional, 360 * 360); // 1h de cache
    return Institucional;
  }

  async remove(id: string): Promise<void> {
    try {
      this.logger.log(`Iniciando remoção do Institucional ID: ${id}`, 'InstitucionalService');
      
      const Institucional = await this.InstitucionalRepository.findOne({ where: { id } });
      if (!Institucional) {
        throw new NotFoundException(`Institucional com ID ${id} não encontrado`);
      }

      if (Institucional.image) {
        this.logger.log(`Removendo imagens da Institucional ID: ${id}`, 'InstitucionalService');
        // ... código existente de remoção
      }

      await this.InstitucionalRepository.delete(id);
      await this.cacheManager.del(`Institucional${id}`);
      await this.cacheManager.del(this.CACHE_KEY_Institucional);
      
      this.logger.log(`Institucional ID: ${id} removido com sucesso`, 'InstitucionalService');
    } catch (error) {
      this.logger.error(
        `Falha ao remover Institucional ID: ${id}: ${error.message}`,
        error.stack,
        'InstitucionalService'
      );
      throw error;
    }
  }
}
