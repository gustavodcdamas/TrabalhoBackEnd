import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('criativos')
export class Criativo {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    image: string;

    @Column()
    descricao: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deleted_at: Date;
}
