import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../../modules/logger/logger.service';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
    const startTime = Date.now();
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || '';
    const user = req.user?.email || 'anonimo';

    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length') || '0';
      const responseTime = Date.now() - startTime;

      this.logger.log(
        JSON.stringify({ // Converta o objeto para string
          correlationId,
          message: 'Requisição HTTP',
          method,
          url: originalUrl,
          statusCode,
          contentLength,
          responseTime: `${responseTime}ms`,
          userAgent,
          ip,
          user: user,
        }),
        'HTTP'
      );
    });

    next();
  }
}