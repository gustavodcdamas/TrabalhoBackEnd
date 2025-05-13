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
    const superAdminEmail = this.configService.get('SUPER_ADMIN_EMAIL');
    const superAdminPassword = this.configService.get('SUPER_ADMIN_PASSWORD');

    const existingSuperAdmin = await this.usersRepository.findOne({
      where: { email: superAdminEmail },
    });

    if (!existingSuperAdmin) {
      try {
        const hashedPassword = await bcrypt.hash(superAdminPassword, 10);
        
        const superAdmin = this.usersRepository.create({
          email: superAdminEmail,
          password: hashedPassword,
          is_super_admin: true,
        });
        
        await this.usersRepository.save(superAdmin);
        this.logger.log('Super admin created successfully');
      } catch (error) {
        this.logger.error('Failed to create super admin', error);
      }
    }
  }
}