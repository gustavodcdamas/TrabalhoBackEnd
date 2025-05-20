import {
  BeforeInsert,
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

  markEmailAsVerified() {
    this.isEmailVerified = true;
    this.emailVerificationToken = null;
  }

  @Column({ nullable: true, type: 'varchar', select: false })
  resetPasswordTokenHash: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires: Date | null;

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
  @IsNotEmpty()
  @MaxLength(50)
  lastName: string;

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
    this.password = await bcrypt.hash(newPassword, 10);
  }

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  /*@BeforeInsert()
  async hashPassword(): Promise<void> {
    if (this.password) {
      this.password = (await hash(this.password, 10)) as string;
    }
  }

  async comparePassword(attempt: string): Promise<boolean> {
    return (await compare(attempt, this.password)) as boolean;
  }*/

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }

  async comparePassword(attempt: string): Promise<boolean> {
    return await bcrypt.compare(attempt, this.password);
  }
  
}
