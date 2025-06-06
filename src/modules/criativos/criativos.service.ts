import { CreateCriativoDto } from './dto/create-criativo.dto';
import { UpdateCriativoDto } from './dto/update-criativo.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Criativo } from './entities/criativo.entity';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { UploadsService } from '../uploads/uploads.service';
import * as path from 'path';
import { LoggerService } from '../logger/logger.service';


@Injectable()
export class criativosService {
  private readonly CACHE_KEY_Criativos = 'all_Criativos';
  private readonly CACHE_TTL = 60 * 60 * 24; // 24 hrs


  constructor(
    @InjectRepository(Criativo)
    private readonly CriativosRepository: Repository<Criativo>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly uploadsService: UploadsService,
    private readonly logger: LoggerService,
  ) {
    this.logger.log('CriativosService inicializado', 'CriativosService');
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

  async create(createCriativosDto: CreateCriativoDto): Promise<Criativo> {
    try {
      this.logger.log(`Criando nova Criativos: ${createCriativosDto.titulo}`, 'CriativosService');
      
      const Criativos = this.CriativosRepository.create(createCriativosDto);
      const savedCriativos = await this.CriativosRepository.save(Criativos);
      
      await this.cacheManager.del(this.CACHE_KEY_Criativos);
      
      this.logger.log(`Criativos criada com ID: ${savedCriativos.id}`, 'CriativosService');
      return savedCriativos;
    } catch (error) {
      this.logger.error(
        `Falha ao criar Criativos: ${error.message}`,
        error.stack,
        'CriativosService'
      );
      throw error;
    }
  }

  async update(id: string, updateCriativosDto: UpdateCriativoDto): Promise<Criativo> {
    try {
      this.logger.log(`Atualizando Criativos ID: ${id}`, 'CriativosService');
      
      // Verifica se a Criativos existe
      const existingCriativos = await this.CriativosRepository.findOne({ where: { id } });
      if (!existingCriativos) {
        throw new NotFoundException(`Criativos com ID ${id} não encontrado`);
      }

      // Atualiza os campos
      this.CriativosRepository.merge(existingCriativos, updateCriativosDto);
      
      // Salva as alterações
      const updatedCriativos = await this.CriativosRepository.save(existingCriativos);
      
      // Limpa o cache
      await this.cacheManager.del(`Criativos_${id}`);
      await this.cacheManager.del(this.CACHE_KEY_Criativos);
      
      this.logger.log(`Criativos ID: ${id} atualizado com sucesso`, 'CriativosService');
      return updatedCriativos;
    } catch (error) {
      this.logger.error(
        `Falha ao atualizar Criativos ID: ${id}: ${error.message}`,
        error.stack,
        'CriativosService'
      );
      throw error;
    }
  }

  async findAll(): Promise<Criativo[]> {
    try {
      // tenta pegar do cache
      const cached = await this.cacheManager.get<Criativo[]>(this.CACHE_KEY_Criativos);
      if (cached) return cached;
    } catch (error) {
      console.error('Falha no cache, usando banco de dados', error);
    }
    
    // se não tiver no cache pega do banco
    const dados = await this.CriativosRepository.find();
    
    try {
      // armazena em cache
      await this.cacheManager.set(this.CACHE_KEY_Criativos, dados, this.CACHE_TTL);
    } catch (error) {
      console.error('Falha ao atualizar cache', error);
    }
    
    return dados;
  }

  async findOne(id: string): Promise<Criativo> {
    const cacheKey = `Criativos_${id}`;
    const cached = await this.cacheManager.get<Criativo>(cacheKey);
      
    if (cached) return cached;

    const Criativos = await this.CriativosRepository.findOne({ where: { id } });

    if (!Criativos) {
      throw new NotFoundException(`Criativos com ID ${id} não encontrado`);
    }

    await this.cacheManager.set(cacheKey, Criativos, 360 * 360); // 1h de cache
    return Criativos;
  }

  async remove(id: string): Promise<void> {
    try {
      this.logger.log(`Iniciando remoção do Criativos ID: ${id}`, 'CriativosService');
      
      const Criativos = await this.CriativosRepository.findOne({ where: { id } });
      if (!Criativos) {
        throw new NotFoundException(`Criativos com ID ${id} não encontrado`);
      }

      if (Criativos.image) {
        this.logger.log(`Removendo imagens da Criativos ID: ${id}`, 'CriativosService');
        // ... código existente de remoção
      }

      await this.CriativosRepository.delete(id);
      await this.cacheManager.del(`Criativos${id}`);
      await this.cacheManager.del(this.CACHE_KEY_Criativos);
      
      this.logger.log(`Criativos ID: ${id} removido com sucesso`, 'CriativosService');
    } catch (error) {
      this.logger.error(
        `Falha ao remover Criativos ID: ${id}: ${error.message}`,
        error.stack,
        'CriativosService'
      );
      throw error;
    }
  }
}
