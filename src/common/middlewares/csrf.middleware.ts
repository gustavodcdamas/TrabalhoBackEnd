// src/common/middlewares/csrf.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as csurf from 'csurf';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private csrfProtection = csurf({
    cookie: {
      httpOnly: false, // ✅ Permitir que o frontend leia o cookie
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  });

  use(req: Request, res: Response, next: NextFunction) {
    // ✅ Pular CSRF para rotas específicas
    const skipCsrfRoutes = [
      '/api/csrf-token',
      '/uploads',
      '/api/docs'
    ];

    const shouldSkip = skipCsrfRoutes.some(route => req.path.startsWith(route));
    
    if (shouldSkip) {
      console.log('⏭️ Pulando CSRF para:', req.path);
      return next();
    }

    // ✅ Aplicar CSRF apenas para métodos que modificam dados
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      console.log('🔒 Aplicando CSRF para:', req.method, req.path);
      console.log('📋 Headers recebidos:', {
        'x-csrf-token': req.headers['x-csrf-token'],
        'authorization': req.headers['authorization'] ? 'Bearer ***' : 'Não encontrado',
        'content-type': req.headers['content-type']
      });
      console.log('🍪 Cookies:', Object.keys(req.cookies || {}));
      console.log('📝 Session ID:', req.sessionID);
      
      this.csrfProtection(req, res, (error) => {
        if (error) {
          console.error('❌ Erro CSRF:', {
            code: error.code,
            message: error.message,
            sessionID: req.sessionID,
            csrfToken: req.headers['x-csrf-token']
          });
        } else {
          console.log('✅ CSRF validado com sucesso');
        }
        next(error);
      });
    } else {
      console.log('⏭️ Método GET - pulando CSRF');
      next();
    }
  }
}