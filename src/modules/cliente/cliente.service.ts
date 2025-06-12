// modules/cliente/cliente.service.ts - SIMPLES sem cache
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like } from 'typeorm';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { SearchClienteDto } from './dto/search-cliente.dto';
import { ClienteEntity, ClienteStatus } from './entity/cliente.entity';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(ClienteEntity)
    private readonly clientesRepository: Repository<ClienteEntity>,
  ) {
    console.log('🔧 ClientesService inicializado');
  }

  async create(createClienteDto: CreateClienteDto): Promise<ClienteEntity> {
    console.log('📝 Criando cliente:', createClienteDto);
    
    // Verificar se já existe cliente com este email
    const existingCliente = await this.clientesRepository.findOne({
      where: { email: createClienteDto.email },
    });

    if (existingCliente) {
      throw new ConflictException('Cliente com este email já existe');
    }

    const cliente = this.clientesRepository.create({
      ...createClienteDto,
      status: createClienteDto.status || ClienteStatus.ATIVO,
    });

    const savedCliente = await this.clientesRepository.save(cliente);
    console.log('✅ Cliente criado com sucesso:', savedCliente.id);
    
    return savedCliente;
  }

  async findAll(): Promise<ClienteEntity[]> {
    console.log('📋 Buscando todos os clientes...');
    
    const clientes = await this.clientesRepository.find({
      order: { created_at: 'DESC' },
    });
    
    console.log(`✅ ${clientes.length} clientes encontrados`);
    return clientes;
  }

  async findOne(id: string): Promise<ClienteEntity> {
    console.log('🔍 Buscando cliente por ID:', id);
    
    const cliente = await this.clientesRepository.findOne({
      where: { id },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente não encontrado');
    }
    
    console.log('✅ Cliente encontrado:', cliente.nome);
    return cliente;
  }

  async findByEmail(email: string): Promise<ClienteEntity> {
    console.log('🔍 Buscando cliente por email:', email);
    
    const cliente = await this.clientesRepository.findOne({
      where: { email },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente não encontrado');
    }

    return cliente;
  }

  async update(id: string, updateClienteDto: UpdateClienteDto): Promise<ClienteEntity> {
    console.log('✏️ Atualizando cliente:', id, updateClienteDto);
    
    const cliente = await this.findOne(id);

    // Se está alterando email, verificar se não existe outro cliente com este email
    if (updateClienteDto.email && updateClienteDto.email !== cliente.email) {
      const existingCliente = await this.clientesRepository.findOne({
        where: { email: updateClienteDto.email },
      });

      if (existingCliente) {
        throw new ConflictException('Cliente com este email já existe');
      }
    }

    this.clientesRepository.merge(cliente, updateClienteDto);
    const updatedCliente = await this.clientesRepository.save(cliente);

    console.log('✅ Cliente atualizado com sucesso');
    return updatedCliente;
  }

  async remove(id: string): Promise<void> {
    console.log('🗑️ Removendo cliente:', id);
    
    const cliente = await this.findOne(id);
    await this.clientesRepository.softDelete(id);
    
    console.log('✅ Cliente removido com sucesso');
  }

  async search(searchDto: SearchClienteDto): Promise<ClienteEntity[]> {
    console.log('🔍 Buscando clientes com filtros:', searchDto);
    
    const where: FindOptionsWhere<ClienteEntity>[] = [];

    // Se tem busca geral, procura em nome, email e telefone
    if (searchDto.search) {
      const searchTerm = `%${searchDto.search}%`;
      where.push(
        { nome: Like(searchTerm) },
        { email: Like(searchTerm) },
        { telefone: Like(searchTerm) },
      );
    } else {
      // Busca específica por campos
      const specificWhere: FindOptionsWhere<ClienteEntity> = {};
      
      if (searchDto.nome) {
        specificWhere.nome = Like(`%${searchDto.nome}%`);
      }
      
      if (searchDto.email) {
        specificWhere.email = Like(`%${searchDto.email}%`);
      }
      
      if (searchDto.telefone) {
        specificWhere.telefone = Like(`%${searchDto.telefone}%`);
      }
      
      if (searchDto.status) {
        specificWhere.status = searchDto.status;
      }

      if (Object.keys(specificWhere).length > 0) {
        where.push(specificWhere);
      }
    }

    if (where.length === 0) {
      return this.findAll();
    }

    const results = await this.clientesRepository.find({
      where: where.length === 1 ? where[0] : where,
      order: { created_at: 'DESC' },
    });
    
    console.log(`✅ ${results.length} clientes encontrados na busca`);
    return results;
  }

  async getCount(): Promise<number> {
    const count = await this.clientesRepository.count();
    console.log('📊 Total de clientes:', count);
    return count;
  }

  async getActiveCount(): Promise<number> {
    const count = await this.clientesRepository.count({
      where: { status: ClienteStatus.ATIVO },
    });
    console.log('📊 Clientes ativos:', count);
    return count;
  }
}