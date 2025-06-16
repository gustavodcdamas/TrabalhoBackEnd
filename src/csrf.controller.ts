import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from './common/decorators/publicRota.decorator';

@Controller('api')
export class CsrfController {
  @Get('csrf-token')
  @Public()
  getToken(@Req() req: Request, @Res() res: Response): void {
    try {
      console.log('🔑 Gerando CSRF token...');
      console.log('📝 Session ID:', req.sessionID);
      console.log('🍪 Cookies existentes:', Object.keys(req.cookies || {}));
      
      const csrfToken = req.csrfToken();
      
      console.log('✅ CSRF token gerado:', csrfToken);
      
      // ✅ Definir cookie CSRF
      res.cookie('XSRF-TOKEN', csrfToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 86400000, // 24 horas
      });
      
      res.status(200).json({ csrfToken });
    } catch (error) {
      console.error('❌ Erro ao gerar token CSRF:', error.message);
      res.status(500).json({ message: 'Erro ao gerar token CSRF', error: error.message });
    }
  }
}