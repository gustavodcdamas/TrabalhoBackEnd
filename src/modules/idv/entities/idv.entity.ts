import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('idv')
export class Idv {
    @PrimaryGeneratedColumn('uuid')
    id: string;

  @Column()
  title: string;

  @Column()
  descricao: string;

  @Column()
  image: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
    deleted_at: Date;
}
