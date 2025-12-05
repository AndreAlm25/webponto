import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

/**
 * Guard que verifica se o usuário tem a permissão necessária para acessar a rota
 * 
 * Fluxo:
 * 1. Se não há permissão definida na rota, permite acesso
 * 2. Se o usuário é SUPER_ADMIN ou COMPANY_ADMIN, permite acesso (bypass)
 * 3. Se o usuário é EMPLOYEE, nega acesso ao painel admin
 * 4. Para MANAGER, HR, FINANCIAL: verifica na tabela RolePermission
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Pegar a permissão necessária definida no decorator
    const requiredPermission = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Se não há permissão definida, permite acesso
    if (!requiredPermission) {
      return true;
    }

    // 2. Pegar o usuário do request (já validado pelo JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    // 3. SUPER_ADMIN e COMPANY_ADMIN: bypass (sempre tem todas as permissões)
    if (user.role === Role.SUPER_ADMIN || user.role === Role.COMPANY_ADMIN) {
      return true;
    }

    // 4. EMPLOYEE: não acessa painel admin
    if (user.role === Role.EMPLOYEE) {
      throw new ForbiddenException('Funcionários não têm acesso ao painel administrativo');
    }

    // 5. MANAGER, HR, FINANCIAL: verificar permissão na tabela
    const hasPermission = await this.checkPermission(
      user.companyId,
      user.role,
      requiredPermission,
    );

    if (!hasPermission) {
      throw new ForbiddenException(`Você não tem permissão para: ${requiredPermission}`);
    }

    return true;
  }

  /**
   * Verifica se o role tem a permissão na empresa
   */
  private async checkPermission(
    companyId: string,
    role: Role,
    permissionKey: string,
  ): Promise<boolean> {
    // Buscar a permissão pelo key
    const permission = await this.prisma.permission.findUnique({
      where: { key: permissionKey },
    });

    if (!permission) {
      // Permissão não existe no sistema - negar por segurança
      console.warn(`[PermissionGuard] Permissão não encontrada: ${permissionKey}`);
      return false;
    }

    // Buscar se o role tem essa permissão na empresa
    const rolePermission = await this.prisma.rolePermission.findUnique({
      where: {
        companyId_role_permissionId: {
          companyId,
          role,
          permissionId: permission.id,
        },
      },
    });

    // Se não existe registro, não tem permissão
    if (!rolePermission) {
      return false;
    }

    return rolePermission.granted;
  }
}
