import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './entities/service.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class ServicesService {
  private readonly CACHE_KEY_SERVICES = 'all_services';
  private readonly CACHE_TTL = 60 * 60 * 24; // 24 hours in seconds

  constructor(
    @InjectRepository(Service)
    private readonly servicesRepository: Repository<Service>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
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

  async create(createServiceDto: CreateServiceDto): Promise<Service> {
    const service = this.servicesRepository.create(createServiceDto);
    const savedService = await this.servicesRepository.save(service);
    
    // Invalidate cache
    await this.cacheManager.del(this.CACHE_KEY_SERVICES);
    
    return savedService;
  }

  async findAll(): Promise<Service[]> {
    // Try to get from cache
    const cachedServices = await this.cacheManager.get<Service[]>(this.CACHE_KEY_SERVICES);
    
    if (cachedServices) {
      return cachedServices;
    }
    
    // If not in cache, get from database
    const services = await this.servicesRepository.find();
    
    // Store in cache
    await this.cacheManager.set(this.CACHE_KEY_SERVICES, services, this.CACHE_TTL);
    
    return services;
  }

  async findOne(id: string): Promise<Service> {
    const service = await this.servicesRepository.findOne({ where: { id } });
    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }
    return service;
  }

  async remove(id: string): Promise<void> {
    const result = await this.servicesRepository.delete(id);
    
    if (result.affected === 0) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }
    
    // Invalidate cache
    await this.cacheManager.del(this.CACHE_KEY_SERVICES);
  }
}