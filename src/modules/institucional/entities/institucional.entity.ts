import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('institutional')
export class Institucional {
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
