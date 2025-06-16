// uploads.service.ts - VERSÃO CORRIGIDA PARA CAMINHOS
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadsService {
  private readonly uploadPath: string;

  constructor(private configService: ConfigService) {
    this.uploadPath = path.join(process.cwd(), 'uploads');
    this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.mkdir(this.uploadPath, { recursive: true });
      console.log('✅ Pasta uploads verificada:', this.uploadPath);
    } catch (error) {
      console.error('❌ Erro ao criar pasta uploads:', error);
    }
  }

  async processUploadedImage(file: Express.Multer.File): Promise<{
    original: string;
    medium: string;
    thumbnail: string;
  }> {
    try {
      console.log('🔍 Processando imagem:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      });

      const fileId = uuidv4();
      const ext = path.extname(file.originalname).toLowerCase();
      
      // ✅ NOMES DOS ARQUIVOS (apenas nomes, não caminhos)
      const fileNames = {
        original: `${fileId}-original${ext}`,
        medium: `${fileId}-medium.png`,
        thumbnail: `${fileId}-thumb.png`
      };

      // ✅ CAMINHOS COMPLETOS PARA SALVAR
      const filePaths = {
        original: path.join(this.uploadPath, fileNames.original),
        medium: path.join(this.uploadPath, fileNames.medium),
        thumbnail: path.join(this.uploadPath, fileNames.thumbnail)
      };

      console.log('💾 Salvando arquivos:', fileNames);

      // Salvar original
      await fs.writeFile(filePaths.original, file.buffer);

      // Criar versão média (800x600)
      await sharp(file.buffer)
        .resize(800, 600, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .png({ quality: 80 })
        .toFile(filePaths.medium);

      // Criar thumbnail (200x150)
      await sharp(file.buffer)
        .resize(200, 150, { 
          fit: 'cover' 
        })
        .png({ quality: 70 })
        .toFile(filePaths.thumbnail);

      console.log('✅ Imagens processadas com sucesso');

      // ✅ RETORNAR APENAS OS NOMES DOS ARQUIVOS
      return {
        original: fileNames.original,
        medium: fileNames.medium,
        thumbnail: fileNames.thumbnail
      };

    } catch (error) {
      console.error('❌ Erro ao processar imagem:', error);
      throw new Error(`Erro ao processar imagem: ${error.message}`);
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      if (!fileName) return;
      
      // ✅ CONSTRUIR CAMINHO CORRETO
      const filePath = path.join(this.uploadPath, fileName);
      
      console.log('🗑️ Tentando deletar:', filePath);
      
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
        console.log(`✅ Arquivo deletado: ${fileName}`);
      } catch (error) {
        console.log(`⚠️ Arquivo não encontrado: ${fileName}`);
      }
    } catch (error) {
      console.error('❌ Erro ao deletar arquivo:', error);
    }
  }

  async fileExists(fileName: string): Promise<boolean> {
    try {
      const filePath = path.join(this.uploadPath, fileName);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  getFileUrl(fileName: string): string {
    if (!fileName) return '';
    
    const baseUrl = this.configService.get<string>('BASE_URL') || 'http://localhost:3333';
    return `${baseUrl}/uploads/${fileName}`;
  }

  // ✅ MÉTODO PARA LISTAR ARQUIVOS (DEBUG)
  async listFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.uploadPath);
      console.log('📁 Arquivos na pasta uploads:', files);
      return files;
    } catch (error) {
      console.error('❌ Erro ao listar arquivos:', error);
      return [];
    }
  }
}