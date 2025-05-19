// src/modules/services/services.controller.ts
import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { Service } from './entities/service.entity';

@Controller('api/services')
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  @Get('redis-test')
  async testRedis() {
    return this.servicesService.checkRedisConnection();
  }

  @Get('cache-test')
  async cacheTest() {
    // Set value
    await this.servicesService.setCacheValue('test_key', 'test_value');
    
    // Get value
    const value = await this.servicesService.getCacheValue('test_key');
    
    return {
      set: 'test_value',
      get: value
    };
  }

  @Get('cache-clear')
  async cacheClear() {
    await this.servicesService.clearCache();
    return { message: 'Cache cleared' };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createServiceDto: CreateServiceDto): Promise<Service> {
    return this.servicesService.create(createServiceDto);
  }

  @Get()
  findAll(): Promise<Service[]> {
    return this.servicesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Service> {
    return this.servicesService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string): Promise<void> {
    return this.servicesService.remove(id);
  }
}