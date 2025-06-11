import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';
import { LoggerService } from '../../logger/logger.service';
import { ServicosService } from '../../services/servicos.service';
import { CriativosService } from '../../criativos/criativos.service';

@Injectable()
export class LimpezaService implements OnModuleInit {
  constructor(private readonly logger: LoggerService,
  private readonly criativosService: CriativosService,
  private readonly servicosService: ServicosService,
  ) {}

  onModuleInit() {
    this.logger.log('CleanupService inicializado', 'CleanupService');
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanUnusedFiles() {
    this.logger.log('Iniciando limpeza de arquivos não utilizados', 'CleanupService');
    
    try {
      const usedFiles = await this.getUsedFilesFromDatabase(); // Implemente este método
      const allFiles = this.getAllStoredFiles();
      
      const unusedFiles = allFiles.filter(file => !usedFiles.includes(file));
      
      await this.deleteFiles(unusedFiles);
      
      this.logger.log(`Limpeza concluída. Arquivos removidos: ${unusedFiles.length}`, 'CleanupService');
    } catch (error) {
      this.logger.error(`Falha na limpeza: ${error.message}`, error.stack, 'CleanupService');
    }
  }

  private async getUsedFilesFromDatabase(): Promise<string[]> {
    // Implementação alternativa sem a entidade Arquivo
    // Você precisará consultar todas as tabelas que referenciam arquivos
    // Exemplo fictício - adapte para seu caso real:
    
    // 1. Obter imagens de criativos
    const criativos = await this.criativosService.findAll();
    const criativosFiles = criativos.map(c => path.basename(c.image));
    
    // 2. Obter ícones de serviços
    const servicos = await this.servicosService.findAll();
    const servicosFiles = servicos.map(s => path.basename(s.icon));
    
    // Combine todos os arquivos em uso
    return [...new Set([...criativosFiles, ...servicosFiles])];
  }

  private getAllStoredFiles(): string[] {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      return [];
    }
    return fs.readdirSync(uploadDir);
  }

  private async deleteFiles(files: string[]): Promise<void> {
    const uploadDir = path.join(process.cwd(), 'uploads');
    
    await Promise.all(files.map(async file => {
      const filePath = path.join(uploadDir, file);
      try {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
          this.logger.log(`Arquivo removido: ${file}`, 'CleanupService');
        }
      } catch (error) {
        this.logger.error(`Erro ao remover ${file}: ${error.message}`, error.stack, 'CleanupService');
      }
    }));
  }
}