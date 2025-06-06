export const UploadConfig = {
  maxFileSize: 2 * 1024 * 1024, // 2mb no max
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
  uploadDir: 'uploads',
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
      height: null,
      fit: 'inside' as const,
      quality: 85,
      stripMetadata: true,
    },
  },
};