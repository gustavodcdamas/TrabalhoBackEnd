import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IsEmail, IsNotEmpty, Length, MaxLength } from 'class-validator';
import * as bcrypt from 'bcrypt';
import * as crypto from "crypto";
import { UserRole } from '../../../enums/user-role.enum';

export interface AddressInterface {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  numero?: string;
  complemento?: string;
}

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ type: 'varchar', nullable: true, select: false })
  emailVerificationToken: string | null;

  generateVerificationToken() {
    this.emailVerificationToken = crypto.randomBytes(32).toString('hex');
  }

  @Column({
    type: 'enum',
    enum: UserRole,
    default: 'client'
  })
  role: UserRole;

  // Adicionado campo username que estava sendo usado no service
  @Column({ nullable: true })
  @MaxLength(50)
  username?: string;

  @BeforeInsert()
  @BeforeUpdate()
  validateRole() {
    if (!this.role) {
      this.role = UserRole.CLIENT;
    }
    
    if (!Object.values(UserRole).includes(this.role)) {
      throw new Error(`Invalid role: ${this.role}`);
    }
    this.updateRoleFlags();
  }

  // Método para atualizar flags baseadas no role
  updateRoleFlags() {
    this.isAdmin = this.role === UserRole.ADMIN || this.role === UserRole.SUPER_ADMIN;
    this.isSuperAdmin = this.role === UserRole.SUPER_ADMIN;
  }

  markEmailAsVerified() {
    this.isEmailVerified = true;
    this.emailVerificationToken = null;
  }

  @Column({ name: 'resetPasswordTokenHash', type: 'text', nullable: true })
  resetPasswordTokenHash: string | null;

  @Column({ name: 'resetPasswordExpires', type: 'timestamp', nullable: true })
  resetPasswordExpires: Date | null;

  @Column({ default: false, select: false })
  emailVerified: boolean;

  @Column({ default: false, select: false })
  accountDisabled?: boolean;

  async setResetToken(token: string): Promise<void> {
    this.resetPasswordTokenHash = await bcrypt.hash(token, 10);
    this.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos
  }

  async validateResetToken(token: string): Promise<boolean> {
    if (!this.resetPasswordTokenHash || !this.resetPasswordExpires) {
      return false;
    }
    if (this.resetPasswordExpires.getTime() < Date.now()) {
      return false;
    }
    return bcrypt.compare(token, this.resetPasswordTokenHash);
  }

  async clearResetToken(): Promise<void> {
    this.resetPasswordTokenHash = null;
    this.resetPasswordExpires = null;
  }

  @Column()
  @IsNotEmpty()
  @MaxLength(50)
  firstName: string;

  @Column()
  @MaxLength(50)
  lastName: string;

  // Corrigido: cpf e cep devem ser string para permitir replace()
  @Column({ nullable: true })
  @MaxLength(50)
  cpf?: string;

  @Column({ nullable: true })
  @MaxLength(50)
  cep?: string;

  @Column({ nullable: true })
  @MaxLength(50)
  logradouro?: string;

  @Column({ nullable: true })
  @MaxLength(50)
  bairro?: string;

  @Column({ nullable: true })
  @MaxLength(50)
  cidade?: string;

  @Column({ nullable: true })
  @MaxLength(50)
  estado?: string;

  @Column({ nullable: true })
  @MaxLength(50)
  numero?: string;

  @Column({ nullable: true })
  @MaxLength(50)
  telefone?: string;

  // Adicionado campo address como JSON para resolver erro do service
  @Column({ type: 'json', nullable: true })
  address?: {
    cep?: string;
    logradouro?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    numero?: string;
    complemento?: string;
  };

  @Column({ select: false })
  @Length(8, 100)
  password: string;

  @Column({ default: false, select: false })
  isAdmin: boolean;

  @Column({ default: false, select: false })
  isSuperAdmin: boolean;

  @Column({ default: true })
  isClient: boolean;

  setAsAdmin() {
    this.isAdmin = true;
    this.isClient = false;
  }

  async setPassword(newPassword: string) {
    this.password = await bcrypt.hash(newPassword, 15);
  }

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deleted_at: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    // Só faz hash se password foi modificado e não é vazio
    if (this.password && this.password !== '') {
      console.log('Senha antes do hash:', this.password);
      console.log('Tipo da senha:', typeof this.password);
      this.password = await bcrypt.hash(this.password, 15);
    } else if (this.password === undefined) {
      // Em vez de deletar, apenas ignore
      console.log('Senha não foi fornecida, mantendo valor atual');
      return;
    }
    // Se password for string vazia, não faz nada (evita hash de string vazia)
  }

  async comparePassword(attempt: string): Promise<boolean> {
    return await bcrypt.compare(attempt, this.password);
  }
}