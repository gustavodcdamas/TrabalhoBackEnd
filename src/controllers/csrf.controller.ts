// src/controllers/csrf.controller.ts - VERSÃO CORRIGIDA
import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import * as csurf from 'csurf';

@Controller('api')
export class CsrfController {
  
  @Get('csrf-token')
  async getCsrfToken(@Req() req: Request, @Res() res: Response) {
    console.log('🔑 Gerando CSRF token...');
    
    try {
      // ✅ CONFIGURAÇÃO CSRF ISOLADA
      const csrfProtection = csurf({
        cookie: false,
        sessionKey: 'csrfSecret'
      });

      // ✅ APLICAR CSRF APENAS PARA GERAR TOKEN
      csrfProtection(req, res, (err) => {
        if (err) {
          console.error('❌ Erro CSRF:', err.message);
          return res.status(500).json({
            error: 'Erro ao configurar CSRF',
            message: err.message,
            details: 'Verifique se a sessão está configurada corretamente'
          });
        }

        try {
          // ✅ VERIFICAR SE csrfToken EXISTE
          if (!req.csrfToken) {
            console.error('❌ req.csrfToken não existe');
            return res.status(500).json({
              error: 'CSRF não disponível',
              message: 'Função csrfToken não foi adicionada ao request'
            });
          }

          if (typeof req.csrfToken !== 'function') {
            console.error('❌ req.csrfToken não é função');
            return res.status(500).json({
              error: 'CSRF mal configurado',
              message: 'csrfToken deve ser uma função'
            });
          }

          // ✅ GERAR TOKEN
          const token = req.csrfToken();
          
          if (!token) {
            console.error('❌ Token vazio');
            return res.status(500).json({
              error: 'Token vazio',
              message: 'Não foi possível gerar token CSRF'
            });
          }

          console.log('✅ Token CSRF gerado:', token.substring(0, 10) + '...');

          return res.json({
            csrfToken: token,
            timestamp: new Date().toISOString(),
            sessionId: req.sessionID,
            success: true
          });

        } catch (tokenError) {
          console.error('❌ Erro ao gerar token:', tokenError);
          return res.status(500).json({
            error: 'Erro ao gerar token',
            message: tokenError.message
          });
        }
      });

    } catch (error) {
      console.error('❌ Erro geral:', error);
      return res.status(500).json({
        error: 'Erro interno',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
}