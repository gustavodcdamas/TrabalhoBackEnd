import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { v4 as uuid } from 'uuid';
import { HttpException, HttpStatus } from '@nestjs/common';
import { UploadConfig } from './upload.config';

export const multerConfig = {
  dest: UploadConfig.uploadDir,
};

export const multerOptions = {
  limits: {
    fileSize: UploadConfig.maxFileSize,
  },
  fileFilter: (req: any, file: any, cb: any) => {
    console.log('🔍 Validando arquivo:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    if (UploadConfig.allowedMimeTypes.includes(file.mimetype)) {
      console.log('✅ Arquivo aceito');
      cb(null, true);
    } else {
      console.log('❌ Arquivo rejeitado - tipo não suportado');
      cb(
        new HttpException(
          `Tipo de arquivo não suportado. Apenas ${UploadConfig.allowedMimeTypes.join(', ')} são permitidos.`,
          HttpStatus.BAD_REQUEST,
        ),
        false,
      );
    }
  },
  storage: diskStorage({
    destination: (req: any, file: any, cb: any) => {
      const uploadPath = UploadConfig.uploadDir;
      if (!existsSync(uploadPath)) {
        mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req: any, file: any, cb: any) => {
      cb(null, `${uuid()}${extname(file.originalname)}`);
    },
  }),
};