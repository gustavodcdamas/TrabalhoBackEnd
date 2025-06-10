import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CacheMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Cache apenas para arquivos estáticos
    if (req.path.startsWith('/uploads/')) {
      // Cache por 1 hora
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
    }
    
    next();
  }
}