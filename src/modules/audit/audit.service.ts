import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(
    action: string,
    entityType: string,
    user: { id: string; email: string },
    entityId?: string,
    metadata?: any,
  ) {
    const log = this.auditLogRepository.create({
      action,
      entityType,
      entityId,
      userId: user.id,
      userEmail: user.email,
      metadata,
    });

    await this.auditLogRepository.save(log);
  }
}