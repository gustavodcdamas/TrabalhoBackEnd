// common/middlewares/csrf.middleware.ts - VERSÃO AJUSTADA
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`⏭️ Método ${req.method} - ${req.path}`);
    
    // ✅ Pular CSRF para métodos GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      console.log('⏭️ Método GET - pulando CSRF');
      return next();
    }

    // ✅ Verificar se é uma rota que precisa de CSRF
    const skipCsrfPaths = [
      '/api/csrf-token',
      '/uploads',
      '/api/docs'
    ];

    const shouldSkipCsrf = skipCsrfPaths.some(path => req.path.startsWith(path));
    
    if (shouldSkipCsrf) {
      console.log('⏭️ Rota excluída do CSRF:', req.path);
      return next();
    }

    // ✅ Para outras rotas (incluindo /api/clientes), verificar CSRF
    console.log('🔍 Headers recebidos:', req.headers ? Object.keys(req.headers) : 'nenhum');
    console.log('🔍 Authorization header:', req.headers.authorization ? 'presente' : 'undefined');
    console.log('🔍 X-CSRF-Token header:', req.headers['x-csrf-token'] ? 'presente' : 'undefined');
    console.log('🔍 Cookies:', req.cookies ? Object.keys(req.cookies) : 'nenhum');

    // ✅ Verificar se o token CSRF está presente
    const csrfToken = req.headers['x-csrf-token'] || 
                     req.headers['x-xsrf-token'] || 
                     req.body._csrf ||
                     req.cookies['XSRF-TOKEN'];

    if (!csrfToken) {
      console.error('❌ CSRF token não encontrado nos headers/cookies/body');
      return res.status(403).json({
        statusCode: 403,
        message: 'CSRF token é obrigatório',
        error: 'Forbidden'
      });
    }

    console.log('✅ CSRF token encontrado, validando...');
    
    // ✅ Continuar com a validação padrão do CSRF
    next();
  }
}