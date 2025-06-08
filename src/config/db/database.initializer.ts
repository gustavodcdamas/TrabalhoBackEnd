// src/database/database.initializer.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../../modules/users/entities/user.entity';
import { UserRole } from 'src/modules/users/enums/user-role.enum';

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
        withDeleted: true
      });

      if (existingSuperAdmin) {
        existingSuperAdmin.password = await bcrypt.hash(superAdminPassword, 15);
        existingSuperAdmin.isSuperAdmin = true;
        existingSuperAdmin.isEmailVerified = true;
        existingSuperAdmin.isAdmin = true;
        existingSuperAdmin.isClient = false;
        existingSuperAdmin.role = UserRole.SUPER_ADMIN;
        await this.usersRepository.save(existingSuperAdmin);
        this.logger.log('Super admin updated successfully');
        return;
      }
      
      // Cria com todos os campos obrigatórios
      const superAdmin = this.usersRepository.create({
        firstName: 'Super', // Adicione valores padrão ou obtenha do config
        lastName: 'Admin',
        email: superAdminEmail,
        password: await bcrypt.hash(superAdminPassword, 15),
        isSuperAdmin: true,
        isEmailVerified: true, // Importante para admin
        isAdmin: true,
        isClient: false,
        role: UserRole.SUPER_ADMIN
      });
      
      await this.usersRepository.save(superAdmin);
      this.logger.log('Super admin created successfully');
    } catch (error) {
      this.logger.error('Critical: Failed to create super admin', error);
      throw error; // Importante para falhar a inicialização se não conseguir criar
    }
  }
}