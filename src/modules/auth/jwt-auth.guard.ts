import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { IS_PUBLIC_KEY } from '../../common/decorators/publicRota.decorator';
import { Reflector } from '@nestjs/core';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private authService: AuthService, private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    console.log('🔍 Headers recebidos:', Object.keys(request.headers));
    console.log('🔍 Authorization header:', authHeader);

    if (!authHeader) {
      console.error('[JwtAuthGuard] Token de autenticação não encontrado no cabeçalho');
      throw new UnauthorizedException('Token de autenticação não encontrado');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      console.error('[JwtAuthGuard] Token JWT ausente no cabeçalho');
      throw new UnauthorizedException('Token inválido ou ausente');
    }

    const user = await this.authService.validateToken(token);
    if (!user) {
      console.error('[JwtAuthGuard] Token inválido ou expirado');
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    request.user = user;
    return true;
  }
}