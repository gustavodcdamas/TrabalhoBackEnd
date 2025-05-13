import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { hashSync } from 'bcrypt';

@Entity({ name: 'UserEntity' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true }) // Adicionei unique para emails
  email: string;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ select: false })
  password: string;

  @Column({ default: false, select: false })
  is_admin: boolean;

  @Column({ default: false, select: false })
  is_super_admin: boolean;

  @Column({ default: true })
  is_client: boolean;

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
  hashPassword() {
    this.password = hashSync(this.password, 10);
  }
}
