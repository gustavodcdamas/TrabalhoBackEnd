// idv.entity.ts - VERSÃO CORRIGIDA SEGUINDO O PADRÃO
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('idv')
export class Idv {
 @ApiProperty({ description: 'ID único da identidade visual' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Título da identidade visual' })
  @Column({ type: 'varchar', length: 255 })
  titulo: string;

  @ApiProperty({ description: 'Nome do cliente' })
  @Column({ type: 'varchar', length: 255 })
  cliente: string;

  @ApiProperty({ description: 'Descrição da identidade visual' })
  @Column({ type: 'text' })
  descricao: string;

  @ApiProperty({ description: 'Caminho da imagem' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  image: string;

  @ApiProperty({ description: 'Status da identidade visual' })
  @Column({ type: 'varchar', length: 50, default: 'ativo' })
  status: string;

  @ApiProperty({ description: 'Usuário que excluiu', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  excluidoPor?: string;

  @ApiProperty({ description: 'Data de criação' })
  @CreateDateColumn()
  dataCriacao: Date;

  @ApiProperty({ description: 'Data de atualização' })
  @UpdateDateColumn()
  dataAtualizacao: Date;

  @ApiProperty({ description: 'Data de exclusão (soft delete)', required: false })
  @Column({ type: 'timestamp', nullable: true })
  dataExclusao?: Date;
}