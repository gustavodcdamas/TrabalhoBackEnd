// src/database/database.initializer.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../../modules/users/entities/user.entity';

@Injectable()
export class DatabaseInitializer {
  private readonly logger = new Logger(DatabaseInitializer.name);

  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    private configService: ConfigService,
  ) {}

  async initialize(): Promise<void> {
    await this.createSuperAdmin();
  }

  private async createSuperAdmin(): Promise<void> {
    const superAdminEmail = this.configService.get<string>('SUPER_ADMIN_EMAIL');
    const superAdminPassword = this.configService.get<string>('SUPER_ADMIN_PASSWORD');

    // Verifica se as variáveis de ambiente existem
    if (!superAdminEmail || !superAdminPassword) {
      this.logger.error('Super admin credentials not configured in environment variables');
      throw new Error('Super admin credentials not configured');
    }

    try {
      const existingSuperAdmin = await this.usersRepository.findOne({
        where: { email: superAdminEmail },
      });

      if (existingSuperAdmin) {
        this.logger.log('Super admin already exists');
        return;
      }

      const hashedPassword = await bcrypt.hash(superAdminPassword, 10);
      
      // Cria com todos os campos obrigatórios
      const superAdmin = this.usersRepository.create({
        firstName: 'Super', // Adicione valores padrão ou obtenha do config
        lastName: 'Admin',
        email: superAdminEmail,
        password: hashedPassword,
        isSuperAdmin: true,
        isEmailVerified: true, // Importante para admin
        isAdmin: true,
        isClient: false
      });
      
      await this.usersRepository.save(superAdmin);
      this.logger.log('Super admin created successfully');
    } catch (error) {
      this.logger.error('Critical: Failed to create super admin', error);
      throw error; // Importante para falhar a inicialização se não conseguir criar
    }
  }
}