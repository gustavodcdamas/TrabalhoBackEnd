import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../../modules/logger/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, headers, body } = request;
    const now = Date.now();
    const userAgent = headers['user-agent'] || '';
    const ip = request.ip || request.connection?.remoteAddress;

    // Log simplificado da requisição
    this.logger.log(
      `Incoming request: ${method} ${url} from ${ip} (${userAgent})`,
      'HTTP'
    );

    return next.handle().pipe(
      tap((responseData) => {
        const response = context.switchToHttp().getResponse();
        const { statusCode } = response;
        const contentLength = response.get('content-length') || '?';
        const duration = Date.now() - now;

        // Log simplificado da resposta
        this.logger.log(
          `Outgoing response: ${method} ${url} - ${statusCode} (${duration}ms, ${contentLength} bytes)`,
          'HTTP'
        );

        // Log opcional do corpo da resposta (apenas em desenvolvimento)
        if (process.env.NODE_ENV === 'development' && responseData) {
          this.logger.debug(
            `Response data: ${JSON.stringify(responseData, null, 2)}`,
            'HTTP-DEBUG'
          );
        }
      }),
    );
  }
}