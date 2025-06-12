import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IsEmail, IsNotEmpty, MaxLength, IsEnum } from 'class-validator';

export enum ClienteStatus {
  ATIVO = 'ativo',
  INATIVO = 'inativo'
}

@Entity({ name: 'clientes' })
export class ClienteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty()
  @MaxLength(100)
  nome: string;

  @Column({ unique: true })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @Column()
  @IsNotEmpty()
  @MaxLength(20)
  telefone: string;

  @Column({
    type: 'enum',
    enum: ClienteStatus,
    default: ClienteStatus.ATIVO
  })
  @IsEnum(ClienteStatus)
  status: ClienteStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deleted_at: Date;
}