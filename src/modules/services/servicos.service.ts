import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Servicos } from './entities/servicos.entity';
import { CreateServicosDto } from './dto/create-servicos.dto';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as path from 'path';
import { UploadsService } from '../uploads/uploads.service';
import { LoggerService } from '../logger/logger.service';
import { UpdateServicosDto } from './dto/update-servicos.dto';

@Injectable()
export class ServicosService {
  private readonly CACHE_KEY_SERVICOS = 'all_services';
  private readonly CACHE_TTL = 60 * 60 * 24; // 24 hrs

  constructor(
    @InjectRepository(Servicos)
    private readonly servicosRepository: Repository<Servicos>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly uploadsService: UploadsService,
    private readonly logger: LoggerService,
  ) {
    this.logger.log('ServicosService inicializado', 'ServicosService');
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

  async create(createServicosDto: CreateServicosDto): Promise<Servicos> {
    try {
      this.logger.log(`Criando novo serviço: ${createServicosDto.titulo}`, 'ServicosService');
      
      const servico = this.servicosRepository.create(createServicosDto);
      const savedService = await this.servicosRepository.save(servico);
      
      await this.cacheManager.del(this.CACHE_KEY_SERVICOS);
      
      this.logger.log(`Serviço criado com ID: ${savedService.id}`, 'ServicosService');
      return savedService;
    } catch (error) {
      this.logger.error(
        `Falha ao criar serviço: ${error.message}`,
        error.stack,
        'ServicosService'
      );
      throw error;
    }
  }

  async update(id: string, updateServicosDto: UpdateServicosDto): Promise<Servicos> {
    try {
      this.logger.log(`Atualizando serviço ID: ${id}`, 'ServicosService');
      
      // Verifica se o serviço existe
      const existingService = await this.servicosRepository.findOne({ where: { id } });
      if (!existingService) {
        throw new NotFoundException(`Serviço com ID ${id} não encontrado`);
      }

      // Atualiza os campos
      this.servicosRepository.merge(existingService, updateServicosDto);
      
      // Salva as alterações
      const updatedService = await this.servicosRepository.save(existingService);
      
      // Limpa o cache
      await this.cacheManager.del(`servico_${id}`);
      await this.cacheManager.del(this.CACHE_KEY_SERVICOS);
      
      this.logger.log(`Serviço ID: ${id} atualizado com sucesso`, 'ServicosService');
      return updatedService;
    } catch (error) {
      this.logger.error(
        `Falha ao atualizar serviço ID: ${id}: ${error.message}`,
        error.stack,
        'ServicosService'
      );
      throw error;
    }
  }

  async findAll(): Promise<Servicos[]> {
    try {
      // tenta pegar do cache
      const cached = await this.cacheManager.get<Servicos[]>(this.CACHE_KEY_SERVICOS);
      if (cached) return cached;
    } catch (error) {
      console.error('Falha no cache, usando banco de dados', error);
    }
    
    // se não tiver no cache pega do banco
    const dados = await this.servicosRepository.find();
    
    try {
      // armazena em cache
      await this.cacheManager.set(this.CACHE_KEY_SERVICOS, dados, this.CACHE_TTL);
    } catch (error) {
      console.error('Falha ao atualizar cache', error);
    }
    
    return dados;
  }

  async findOne(id: string): Promise<Servicos> {
    const cacheKey = `servico_${id}`;
    const cached = await this.cacheManager.get<Servicos>(cacheKey);
      
    if (cached) return cached;

    const servicos = await this.servicosRepository.findOne({ where: { id } });

    if (!servicos) {
      throw new NotFoundException(`Serviço com ID ${id} não encontrado`);
    }

    await this.cacheManager.set(cacheKey, servicos, 360 * 360); // 1h de cache
    return servicos;
  }

  async remove(id: string): Promise<void> {
    try {
      this.logger.log(`Iniciando remoção do serviço ID: ${id}`, 'ServicosService');
      
      const servico = await this.servicosRepository.findOne({ where: { id } });
      if (!servico) {
        throw new NotFoundException(`Serviço com ID ${id} não encontrado`);
      }

      if (servico.icon) {
        this.logger.log(`Removendo imagens do serviço ID: ${id}`, 'ServicosService');
        // ... código existente de remoção
      }

      await this.servicosRepository.delete(id);
      await this.cacheManager.del(`servico_${id}`);
      await this.cacheManager.del(this.CACHE_KEY_SERVICOS);
      
      this.logger.log(`Serviço ID: ${id} removido com sucesso`, 'ServicosService');
    } catch (error) {
      this.logger.error(
        `Falha ao remover serviço ID: ${id}: ${error.message}`,
        error.stack,
        'ServicosService'
      );
      throw error;
    }
  }
}