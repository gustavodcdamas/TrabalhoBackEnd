import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { SyncReport, Inconsistency, FixedItem, DetailedReport } from '../../common/interfaces/sync.interfaces';

@Injectable()
export class SyncUserDataService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  // Método para encontrar e corrigir inconsistências de dados
  async findAndFixInconsistencies(): Promise<SyncReport> {
    console.log('🔍 [SyncService] Verificando inconsistências de usuários...');

    const allUsers = await this.usersRepository.find({
      select: ['id', 'email', 'firstName', 'lastName']
    });

    const report: SyncReport = {
      totalUsers: allUsers.length,
      inconsistencies: [],
      fixed: []
    };

    // Set para rastrear emails já verificados
    const checkedEmails = new Set<string>();

    for (const user of allUsers) {
      // Evitar verificar o mesmo email múltiplas vezes
      if (checkedEmails.has(user.email)) {
        continue;
      }
      
      console.log(`🔍 Verificando usuário: ${user.email} (ID: ${user.id})`);
      
      // Verificar se há dados duplicados ou inconsistentes
      const duplicates = await this.usersRepository.find({
        where: { email: user.email }
      });

      if (duplicates.length > 1) {
        const inconsistency: Inconsistency = {
          email: user.email,
          issue: 'Duplicated email',
          count: duplicates.length,
          ids: duplicates.map(d => d.id)
        };
        
        report.inconsistencies.push(inconsistency);
        console.log(`⚠️ Inconsistência encontrada: ${user.email} - ${duplicates.length} registros`);
      }

      checkedEmails.add(user.email);
    }

    console.log('📊 [SyncService] Relatório de inconsistências:', report);
    return report;
  }

  // Método para corrigir duplicatas (manter o mais recente)
  async fixDuplicatedUsers(): Promise<SyncReport> {
    console.log('🔧 [SyncService] Corrigindo usuários duplicados...');

    const report: SyncReport = {
      totalUsers: 0,
      inconsistencies: [],
      fixed: []
    };

    // Buscar emails duplicados
    const duplicateEmails = await this.usersRepository
      .createQueryBuilder('user')
      .select('user.email')
      .addSelect('COUNT(user.id)', 'count')
      .groupBy('user.email')
      .having('COUNT(user.id) > 1')
      .getRawMany();

    for (const duplicate of duplicateEmails) {
      const users = await this.usersRepository.find({
        where: { email: duplicate.user_email },
        order: { created_at: 'DESC' } // Mais recente primeiro
      });

      if (users.length > 1) {
        // Manter o primeiro (mais recente), remover os outros
        const [keepUser, ...removeUsers] = users;

        for (const userToRemove of removeUsers) {
          try {
            await this.usersRepository.remove(userToRemove);
            
            const fixedItem: FixedItem = {
              id: userToRemove.id,
              email: userToRemove.email,
              action: 'REMOVED_DUPLICATE',
              details: `Removido duplicata, mantido usuário ${keepUser.id}`
            };
            
            report.fixed.push(fixedItem);
            console.log(`✅ Removido usuário duplicado: ${userToRemove.id}`);
          } catch (error) {
            console.error(`❌ Erro ao remover usuário ${userToRemove.id}:`, error);
            
            const inconsistency: Inconsistency = {
              email: userToRemove.email,
              issue: 'Failed to remove duplicate',
              count: 1,
              ids: [userToRemove.id]
            };
            
            report.inconsistencies.push(inconsistency);
          }
        }
      }
    }

    console.log('📊 [SyncService] Relatório de correções:', report);
    return report;
  }

  // Método para buscar usuário por email e atualizar cache
  async getUserByEmailAndUpdateCache(email: string): Promise<UserEntity | null> {
    console.log(`🔍 [SyncService] Buscando usuário por email: ${email}`);
    
    const user = await this.usersRepository.findOne({
      where: { email }
    });

    if (user) {
      console.log(`✅ [SyncService] Usuário encontrado: ${user.id}`);
      return user;
    }

    console.log(`❌ [SyncService] Usuário não encontrado para email: ${email}`);
    return null;
  }

  // Método para verificar e corrigir JWT inconsistente
  async validateUserToken(tokenUserId: string, userEmail: string): Promise<UserEntity | null> {
    console.log(`🔍 [SyncService] Validando token - ID: ${tokenUserId}, Email: ${userEmail}`);

    // Primeiro, tentar buscar pelo ID do token
    let user = await this.usersRepository.findOne({
      where: { id: tokenUserId }
    });

    if (user) {
      // Verificar se o email também confere
      if (user.email === userEmail) {
        console.log(`✅ [SyncService] Token válido - dados consistentes`);
        return user;
      } else {
        console.log(`⚠️ [SyncService] Token com email inconsistente. Token: ${userEmail}, DB: ${user.email}`);
      }
    }

    // Se não encontrar pelo ID ou email inconsistente, buscar pelo email
    user = await this.usersRepository.findOne({
      where: { email: userEmail }
    });

    if (user) {
      console.log(`🔄 [SyncService] Usuário encontrado pelo email com ID diferente do token`);
      console.log(`    Token ID: ${tokenUserId}`);
      console.log(`    Real ID:  ${user.id}`);
      return user;
    }

    console.log(`❌ [SyncService] Usuário não encontrado nem por ID nem por email`);
    return null;
  }

  // Método para gerar relatório detalhado - CORRIGIDO
  async generateDetailedReport(): Promise<DetailedReport> {
    console.log('📊 [SyncService] Gerando relatório detalhado...');

    const totalUsers = await this.usersRepository.count();
    
    // ✅ CORREÇÃO: Usar IsNull() para verificar null
    const activeUsers = await this.usersRepository.count({
      where: { deleted_at: IsNull() }
    });
    
    const deletedUsers = totalUsers - activeUsers;

    // Buscar estatísticas por role - apenas usuários ativos
    const roleStats = await this.usersRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(user.id)', 'count')
      .where('user.deleted_at IS NULL')
      .groupBy('user.role')
      .getRawMany();

    // ✅ CORREÇÃO: Usar IsNull() para verificar null
    const unverifiedUsers = await this.usersRepository.count({
      where: { 
        isEmailVerified: false,
        deleted_at: IsNull()
      }
    });

    const report: DetailedReport = {
      summary: {
        totalUsers,
        activeUsers,
        deletedUsers,
        unverifiedUsers
      },
      roleDistribution: roleStats.map(stat => ({
        role: stat.role,
        count: parseInt(stat.count)
      })),
      timestamp: new Date().toISOString()
    };

    console.log('📋 [SyncService] Relatório detalhado:', report);
    return report;
  }
}