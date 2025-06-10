import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Landing } from './entities/landing.entity';
import { CreateLandingDto, LandingWithImageDto } from './dto/create-landing.dto';
import { UpdateLandingDto, updateLandingWithImageDto } from './dto/update-landing.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { UploadsService } from '../uploads/uploads.service';
import { LoggerService } from '../logger/logger.service';
import * as path from 'path';

@Injectable()
export class LandingService {
  private readonly CACHE_KEY_LANDINGS = 'all_landings';
  private readonly CACHE_TTL = 60 * 60 * 24; // 24 hrs


  constructor(
    @InjectRepository(Landing)
    private readonly landingRepository: Repository<Landing>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly uploadsService: UploadsService,
    private readonly logger: LoggerService,
  ) {
    this.logger.log('LandingService inicializado', 'LandingService');
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

  async create(createLandingDto: CreateLandingDto): Promise<Landing> {
    try {
      this.logger.log(`Criando nova landing: ${createLandingDto.titulo}`, 'LandingService');
      
      const landing = this.landingRepository.create(createLandingDto);
      const savedLanding = await this.landingRepository.save(landing);
      
      await this.cacheManager.del(this.CACHE_KEY_LANDINGS);
      
      this.logger.log(`Landing criada com ID: ${savedLanding.id}`, 'LandingService');
      return savedLanding;
    } catch (error) {
      this.logger.error(
        `Falha ao criar landing: ${error.message}`,
        error.stack,
        'LandingService'
      );
      throw error;
    }
  }

  async update(id: string, updateLandingDto: UpdateLandingDto): Promise<Landing> {
    try {
      this.logger.log(`Atualizando Landing ID: ${id}`, 'LandingService');
      
      // Verifica se a landing existe
      const existingLanding = await this.landingRepository.findOne({ where: { id } });
      if (!existingLanding) {
        throw new NotFoundException(`Landing com ID ${id} não encontrado`);
      }

      // Atualiza os campos
      this.landingRepository.merge(existingLanding, updateLandingDto);
      
      // Salva as alterações
      const updatedLanding = await this.landingRepository.save(existingLanding);
      
      // Limpa o cache
      await this.cacheManager.del(`Landing_${id}`);
      await this.cacheManager.del(this.CACHE_KEY_LANDINGS);
      
      this.logger.log(`Landing ID: ${id} atualizado com sucesso`, 'LandingService');
      return updatedLanding;
    } catch (error) {
      this.logger.error(
        `Falha ao atualizar Landing ID: ${id}: ${error.message}`,
        error.stack,
        'LandingService'
      );
      throw error;
    }
  }

  async findAll(): Promise<Landing[]> {
    try {
      // tenta pegar do cache
      const cached = await this.cacheManager.get<Landing[]>(this.CACHE_KEY_LANDINGS);
      if (cached) return cached;
    } catch (error) {
      console.error('Falha no cache, usando banco de dados', error);
    }
    
    // se não tiver no cache pega do banco
    const dados = await this.landingRepository.find();
    
    try {
      // armazena em cache
      await this.cacheManager.set(this.CACHE_KEY_LANDINGS, dados, this.CACHE_TTL);
    } catch (error) {
      console.error('Falha ao atualizar cache', error);
    }
    
    return dados;
  }

  async findOne(id: string): Promise<Landing> {
    const cacheKey = `Landing_${id}`;
    const cached = await this.cacheManager.get<Landing>(cacheKey);
      
    if (cached) return cached;

    const landing = await this.landingRepository.findOne({ where: { id } });

    if (!landing) {
      throw new NotFoundException(`Landing com ID ${id} não encontrado`);
    }

    await this.cacheManager.set(cacheKey, landing, 360 * 360); // 1h de cache
    return landing;
  }

  async remove(id: string): Promise<void> {
    try {
      this.logger.log(`Iniciando remoção do Landing ID: ${id}`, 'LandingService');
      
      const landing = await this.landingRepository.findOne({ where: { id } });
      if (!landing) {
        throw new NotFoundException(`Landing com ID ${id} não encontrado`);
      }

      if (landing.image) {
        this.logger.log(`Removendo imagens da Landing ID: ${id}`, 'LandingService');
        // ... código existente de remoção
      }

      await this.landingRepository.delete(id);
      await this.cacheManager.del(`landing${id}`);
      await this.cacheManager.del(this.CACHE_KEY_LANDINGS);
      
      this.logger.log(`Landing ID: ${id} removido com sucesso`, 'LandingService');
    } catch (error) {
      this.logger.error(
        `Falha ao remover Landing ID: ${id}: ${error.message}`,
        error.stack,
        'LandingService'
      );
      throw error;
    }
  }
}
