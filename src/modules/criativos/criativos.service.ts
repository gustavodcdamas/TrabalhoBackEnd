import { CreateCriativoDto } from './dto/create-criativo.dto';
import { UpdateCriativoDto } from './dto/update-criativo.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { criativo } from './entities/criativo.entity';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { UploadsService } from '../uploads/uploads.service';
import * as path from 'path';


@Injectable()
export class criativosService {
  private readonly CACHE_KEY_CRIATIVOS = 'all_criativos';
  private readonly CACHE_TTL = 60 * 60 * 24; // 24 hours in seconds

  constructor(
    @InjectRepository(criativo)
    private readonly criativosRepository: Repository<criativo>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly uploadsService: UploadsService,
  ) {}

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

  async create(CreateCriativoDto: CreateCriativoDto): Promise<criativo> {
    const criativo = this.criativosRepository.create(CreateCriativoDto);
    const savedCriativo = await this.criativosRepository.save(criativo);
    
    // Invalidate cache
    await this.cacheManager.del(this.CACHE_KEY_CRIATIVOS);
    
    return savedCriativo;
  }

  async findAll(): Promise<criativo[]> {
    // Try to get from cache
    const cachedCriativos = await this.cacheManager.get<criativo[]>(this.CACHE_KEY_CRIATIVOS);
    
    if (cachedCriativos) {
      return cachedCriativos;
    }
    
    // If not in cache, get from database
    const criativos = await this.criativosRepository.find();
    
    // Store in cache
    await this.cacheManager.set(this.CACHE_KEY_CRIATIVOS, criativos, this.CACHE_TTL);
    
    return criativos;
  }

  async findOne(id: string): Promise<criativo> {
    const criativos = await this.criativosRepository.findOne({ where: { id } });
    if (!criativos) {
      throw new NotFoundException(`Criativo com ID ${id} não encontrado`);
    }
    return criativos;
  }

  async remove(id: string): Promise<void> {
    const result = await this.criativosRepository.delete(id);
    const criativo = await this.criativosRepository.findOne({ where: { id } });

    if (!criativo) {
      throw new NotFoundException(`Criativo com ID ${id} não encontrado`);
    }
    
    if (result.affected === 0) {
      throw new NotFoundException(`Criativo com ID ${id} não encontrado`);
    }

    if (criativo.image) {
      try {
        // Remove todas as versões da imagem
        const basePath = criativo.image.replace('-medium', '');
        const imageExt = path.extname(basePath);
        const imageName = path.basename(basePath, imageExt);
        
        const versions = ['original', 'thumbnail', 'medium'];
        await Promise.all(
          versions.map(version => 
            this.uploadsService.deleteFile(
              path.join('uploads', `${imageName}-${version}${imageExt}`)
            )
          )
        );
      } catch (error) {
        console.error('Erro ao remover imagens:', error);
      }
    }
    await this.criativosRepository.delete(id);
    await this.cacheManager.del(this.CACHE_KEY_CRIATIVOS);
  }
    

}
