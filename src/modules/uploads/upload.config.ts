import * as path from 'path';

export const UploadConfig = {
  maxFileSize: 5 * 1024 * 1024, // 2mb no max
  allowedMimeTypes: [
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'image/webp',
    'image/gif',
    'image/tiff'
  ],
  uploadDir: path.join(process.cwd(), 'uploads'), // ✅ CORREÇÃO: Caminho absoluto
  convertToWebp: true,
  webpOptions: {
    quality: 80,
    alphaQuality: 80,
    lossless: false,
  },
  imageVersions: {
    original: {
      quality: 85,
      stripMetadata: true,
    },
    thumbnail: {
      width: 200,
      height: 200,
      fit: 'cover' as const,
      quality: 80,
      stripMetadata: true,
    },
    medium: {
      width: 800,
      height: 600, // ✅ CORREÇÃO: Defina uma altura ou deixe null
      fit: 'inside' as const,
      quality: 85,
      stripMetadata: true,
    },
  },
};