import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  action: string; // 'UPLOAD', 'DELETE', 'UPDATE'

  @Column()
  entityType: string; // 'CRIATIVO', 'SERVICO', 'ARQUIVO'

  @Column({ nullable: true })
  entityId: string;

  @Column()
  userId: string;

  @Column()
  userEmail: string;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;
}