import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Verificar se o usuário existe e tem permissões de admin
    if (!user || (!user.isAdmin && !user.isSuperAdmin)) {
      throw new ForbiddenException('Acesso negado. Apenas administradores podem acessar este recurso.');
    }

    return true;
  }
}

// Se você quiser mais flexibilidade, pode criar um guard específico para clientes:
@Injectable()
export class ClientesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Verificar se o usuário existe
    if (!user) {
      throw new ForbiddenException('Usuário não autenticado.');
    }

    // Verificar se tem permissões para gerenciar clientes
    // Admins e Super Admins podem gerenciar clientes
    const canManageClients = user.isAdmin || user.isSuperAdmin;
    
    if (!canManageClients) {
      throw new ForbiddenException('Acesso negado. Apenas administradores podem gerenciar clientes.');
    }

    return true;
  }
}