// modules/cliente/cliente.controller.ts - SIMPLES como seus outros controllers
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { SearchClienteDto } from './dto/search-cliente.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientesService } from './cliente.service';
import { AdminGuard } from 'src/guards/admin.guard'; // ✅ Seu guard que já funciona

@ApiTags('clientes')
@Controller('api/clientes')
@UseGuards(JwtAuthGuard, AdminGuard) // ✅ Usar os mesmos guards dos outros módulos
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {
    console.log('🎮 ClientesController inicializado');
  }

  @Get('test')
  @ApiOperation({ summary: 'Teste do módulo clientes' })
  test() {
    return { 
      message: 'Módulo clientes funcionando!',
      timestamp: new Date().toISOString()
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo cliente - Apenas Admins' })
  @ApiResponse({ status: 201, description: 'Cliente criado com sucesso' })
  @ApiResponse({ status: 403, description: 'Acesso negado - Apenas administradores' })
  @ApiResponse({ status: 409, description: 'Cliente com este email já existe' })
  async create(@Body() createClienteDto: CreateClienteDto) {
    try {
      console.log('📝 Controller: Criando cliente...');
      const cliente = await this.clientesService.create(createClienteDto);
      
      return {
        message: 'Cliente criado com sucesso',
        data: cliente,
      };
    } catch (error) {
      console.error('❌ Controller: Erro ao criar cliente:', error.message);
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os clientes - Apenas Admins' })
  @ApiResponse({ status: 200, description: 'Lista de clientes retornada com sucesso' })
  @ApiResponse({ status: 403, description: 'Acesso negado - Apenas administradores' })
  async findAll() {
    try {
      console.log('📋 Controller: Listando clientes...');
      const clientes = await this.clientesService.findAll();
      
      return {
        message: 'Clientes listados com sucesso',
        data: clientes,
        total: clientes.length,
      };
    } catch (error) {
      console.error('❌ Controller: Erro ao listar clientes:', error.message);
      throw error;
    }
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar clientes - Apenas Admins' })
  @ApiResponse({ status: 200, description: 'Busca realizada com sucesso' })
  @ApiResponse({ status: 403, description: 'Acesso negado - Apenas administradores' })
  async search(@Query() searchDto: SearchClienteDto) {
    try {
      console.log('🔍 Controller: Buscando clientes...');
      const clientes = await this.clientesService.search(searchDto);
      
      return {
        message: 'Busca realizada com sucesso',
        data: clientes,
        total: clientes.length,
      };
    } catch (error) {
      console.error('❌ Controller: Erro na busca:', error.message);
      throw error;
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estatísticas dos clientes - Apenas Admins' })
  @ApiResponse({ status: 200, description: 'Estatísticas retornadas com sucesso' })
  @ApiResponse({ status: 403, description: 'Acesso negado - Apenas administradores' })
  async getStats() {
    try {
      console.log('📊 Controller: Obtendo estatísticas...');
      const [total, ativos] = await Promise.all([
        this.clientesService.getCount(),
        this.clientesService.getActiveCount(),
      ]);

      return {
        message: 'Estatísticas obtidas com sucesso',
        data: {
          total,
          ativos,
          inativos: total - ativos,
        },
      };
    } catch (error) {
      console.error('❌ Controller: Erro ao obter estatísticas:', error.message);
      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar cliente por ID - Apenas Admins' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado - Apenas administradores' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    try {
      console.log('🔍 Controller: Buscando cliente por ID...');
      const cliente = await this.clientesService.findOne(id);
      
      return {
        message: 'Cliente encontrado',
        data: cliente,
      };
    } catch (error) {
      console.error('❌ Controller: Erro ao buscar cliente:', error.message);
      throw error;
    }
  }

  @Get('email/:email')
  @ApiOperation({ summary: 'Buscar cliente por email - Apenas Admins' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado - Apenas administradores' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async findByEmail(@Param('email') email: string) {
    try {
      console.log('🔍 Controller: Buscando cliente por email...');
      const cliente = await this.clientesService.findByEmail(email);
      
      return {
        message: 'Cliente encontrado',
        data: cliente,
      };
    } catch (error) {
      console.error('❌ Controller: Erro ao buscar cliente por email:', error.message);
      throw error;
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar cliente - Apenas Admins' })
  @ApiResponse({ status: 200, description: 'Cliente atualizado com sucesso' })
  @ApiResponse({ status: 403, description: 'Acesso negado - Apenas administradores' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  @ApiResponse({ status: 409, description: 'Cliente com este email já existe' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateClienteDto: UpdateClienteDto,
  ) {
    try {
      console.log('✏️ Controller: Atualizando cliente...');
      const cliente = await this.clientesService.update(id, updateClienteDto);
      
      return {
        message: 'Cliente atualizado com sucesso',
        data: cliente,
      };
    } catch (error) {
      console.error('❌ Controller: Erro ao atualizar cliente:', error.message);
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir cliente - Apenas Admins' })
  @ApiResponse({ status: 204, description: 'Cliente excluído com sucesso' })
  @ApiResponse({ status: 403, description: 'Acesso negado - Apenas administradores' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    try {
      console.log('🗑️ Controller: Excluindo cliente...');
      await this.clientesService.remove(id);
    } catch (error) {
      console.error('❌ Controller: Erro ao excluir cliente:', error.message);
      throw error;
    }
  }
}