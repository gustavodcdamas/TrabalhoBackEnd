import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuid } from 'uuid';
import { promisify } from 'util';
import { UploadConfig } from './upload.config';

const unlinkAsync = promisify(fs.unlink);

interface ProcessedImage {
  original: string;
  thumbnail: string;
  medium: string;
}

@Injectable()
export class UploadsService {
  constructor() {}

  private async cleanupFiles(files: string[]) {
    try {
      await Promise.all(files.map(file => 
        this.deleteFile(file).catch(error => 
          console.error(`Erro durante limpeza do arquivo ${file}:`, error)
      )));
    } catch (error) {
      console.error('Error during file cleanup:', error);
    }
  }
  
  async optimizeImage(buffer: Buffer, options: {
    format: keyof sharp.FormatEnum,
    quality: number,
    width?: number,
    height?: number,
    fit?: keyof sharp.FitEnum,
    stripMetadata?: boolean
  }) {
    let processor = sharp(buffer);

    if (options.stripMetadata) {
      processor = processor.withMetadata();
    }

    if ('width' in options && 'height' in options && options.width && options.height) {
      processor = processor.resize(options.width, options.height, {
        fit: options.fit,
        withoutEnlargement: true,
      });
    }

    return processor
      .toFormat(options.format, { quality: options.quality })
      .toBuffer();
  }

  async generateImageMetadata(buffer: Buffer) {
    const { width, height, format } = await sharp(buffer).metadata();
    return {
      dimensions: `${width}x${height}`,
      format,
      size: buffer.byteLength,
      altText: '' // Pode ser preenchido pelo frontend
    };
  }

  async processUploadedImage(file: Express.Multer.File): Promise<ProcessedImage> {
    const fileExt = path.extname(file.originalname).toLowerCase();
    const fileName = `${uuid()}${fileExt}`;
    const uploadDir = UploadConfig.uploadDir;

    try {
      // Caminhos para as diferentes versões
      const originalPath = path.join(uploadDir, `${fileName}-original${fileExt}`);
      const thumbnailPath = path.join(uploadDir, `${fileName}-thumbnail${fileExt}`);
      const mediumPath = path.join(uploadDir, `${fileName}-medium${fileExt}`);

      // Processa cada versão
      await Promise.all([
        sharp(file.buffer)
          .toFormat(fileExt.replace('.', '') as keyof sharp.FormatEnum, 
          { quality: UploadConfig.imageVersions.original.quality })
          .toFile(originalPath),
        
        sharp(file.buffer)
          .resize(
            UploadConfig.imageVersions.thumbnail.width,
            UploadConfig.imageVersions.thumbnail.height,
            { fit: UploadConfig.imageVersions.thumbnail.fit }
          )
          .toFile(thumbnailPath),
          
        sharp(file.buffer)
          .resize(
            UploadConfig.imageVersions.medium.width,
            UploadConfig.imageVersions.medium.height,
            { fit: UploadConfig.imageVersions.medium.fit }
          )
          .toFile(mediumPath)
      ]);

      return {
        original: originalPath,
        thumbnail: thumbnailPath,
        medium: mediumPath
      };
    } catch (error) {
      await this.cleanupFiles([
        path.join(uploadDir, `${fileName}-original${fileExt}`),
        path.join(uploadDir, `${fileName}-thumbnail${fileExt}`),
        path.join(uploadDir, `${fileName}-medium${fileExt}`)
      ]);
      throw new HttpException(
        `Erro ao processar imagem: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /*private async cleanupFiles(files: string[]) {
    await Promise.all(files.map(file => 
      this.deleteFile(file).catch(error => 
        console.error(`Erro durante limpeza do arquivo ${file}:`, error)
    )));
  }*/

  async deleteFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        await unlinkAsync(filePath);
      }
    } catch (error) {
      console.error(`Erro ao deletar arquivo ${filePath}:`, error);
      throw new HttpException(
        'Erro ao remover arquivo',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}