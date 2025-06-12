// landing.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('landing_pages')
export class Landing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true }) // Permitir nulo se não for obrigatório
  titulo: string;

  @Column()
  cliente: string;

  @Column({ nullable: true }) // Este campo pode ser nulo inicialmente
  excluidoPor: string;

  @Column({ default: 'ativo' }) // Valor padrão
  status: string;

  @Column()
  descricao: string;

  @Column()
  image: string;

  @CreateDateColumn({ name: 'created_at' }) // Mapear para o nome correto da coluna
  dataCriacao: Date;

  @UpdateDateColumn({ name: 'updated_at' }) // Mapear para o nome correto da coluna
  dataAtualizacao: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  dataExclusao: Date;
}