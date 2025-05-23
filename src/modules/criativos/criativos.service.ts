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


@Injectable()
export class criativosService {
  private readonly CACHE_KEY_CRIATIVOS = 'all_criativos';
  private readonly CACHE_TTL = 60 * 60 * 24; // 24 hrs

  constructor(
    @InjectRepository(Criativo)
    private readonly criativosRepository: Repository<Criativo>,
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

  async create(CreateCriativoDto: CreateCriativoDto): Promise<Criativo> {
    const criativo = this.criativosRepository.create(CreateCriativoDto);
    const savedCriativo = await this.criativosRepository.save(criativo);
    
    // invalida o cache
    await this.cacheManager.del(this.CACHE_KEY_CRIATIVOS);
    
    return savedCriativo;
  }

  async findAll(): Promise<Criativo[]> {
    try {
      // tenta pegar do cache
      const cached = await this.cacheManager.get<Criativo[]>(this.CACHE_KEY_CRIATIVOS);
      if (cached) return cached;
    } catch (error) {
      console.error('Falha no cache, usando banco de dados', error);
    }
    
    // se não tiver no cache pega do banco
    const dados = await this.criativosRepository.find();
    
    try {
      // armazena em cache
      await this.cacheManager.set(this.CACHE_KEY_CRIATIVOS, dados, this.CACHE_TTL);
    } catch (error) {
      console.error('Falha ao atualizar cache', error);
    }
    
    return dados;
  }

  async findOne(id: string): Promise<Criativo> {
    const cacheKey = `criativo_${id}`;
    const cached = await this.cacheManager.get<Criativo>(cacheKey);
  
    if (cached) return cached;

    const criativos = await this.criativosRepository.findOne({ where: { id } });
    if (!criativos) {
      throw new NotFoundException(`Criativo com ID ${id} não encontrado`);
    }

    await this.cacheManager.set(cacheKey, criativos, 60 * 60); // 1h de cache
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
    await this.cacheManager.del(`criativo_${id}`);
    await this.cacheManager.del(this.CACHE_KEY_CRIATIVOS);
  }
}
