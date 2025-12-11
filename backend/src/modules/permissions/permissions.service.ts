import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { seedCompanyPermissions } from '../../../prisma/seed-permissions';
import { EventsGateway } from '../../events/events.gateway';

@Injectable()
export class PermissionsService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  /**
   * Listar todas as permissões disponíveis no sistema
   * Agrupadas por módulo
   */
  async getAllPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });

    // Agrupar por módulo
    const grouped = permissions.reduce((acc, perm) => {
      if (!acc[perm.module]) {
        acc[perm.module] = [];
      }
      acc[perm.module].push({
        id: perm.id,
        key: perm.key,
        action: perm.action,
        description: perm.description,
      });
      return acc;
    }, {} as Record<string, any[]>);

    return grouped;
  }

  /**
   * Listar permissões de um role específico em uma empresa
   */
  async getRolePermissions(companyId: string, role: Role) {
    // Validar que não é SUPER_ADMIN, COMPANY_ADMIN ou EMPLOYEE
    if (role === Role.SUPER_ADMIN || role === Role.COMPANY_ADMIN) {
      throw new BadRequestException('SUPER_ADMIN e COMPANY_ADMIN têm todas as permissões');
    }
    if (role === Role.EMPLOYEE) {
      throw new BadRequestException('EMPLOYEE não tem acesso ao painel admin');
    }

    // Buscar todas as permissões
    const allPermissions = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });

    // Buscar permissões do role na empresa
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { companyId, role },
      include: { permission: true },
    });

    // Criar mapa de permissões concedidas
    const grantedMap = new Map(
      rolePermissions.map((rp) => [rp.permission.key, rp.granted]),
    );

    // Montar resposta com todas as permissões e status
    const grouped = allPermissions.reduce((acc, perm) => {
      if (!acc[perm.module]) {
        acc[perm.module] = [];
      }
      acc[perm.module].push({
        id: perm.id,
        key: perm.key,
        action: perm.action,
        description: perm.description,
        granted: grantedMap.get(perm.key) ?? false,
      });
      return acc;
    }, {} as Record<string, any[]>);

    return {
      role,
      permissions: grouped,
    };
  }

  /**
   * Atualizar permissões de um role em uma empresa
   */
  async updateRolePermissions(
    companyId: string,
    dto: UpdateRolePermissionsDto,
  ) {
    const { role, permissions } = dto;

    // Validar que não é SUPER_ADMIN, COMPANY_ADMIN ou EMPLOYEE
    if (role === Role.SUPER_ADMIN || role === Role.COMPANY_ADMIN) {
      throw new BadRequestException('Não é possível alterar permissões de SUPER_ADMIN ou COMPANY_ADMIN');
    }
    if (role === Role.EMPLOYEE) {
      throw new BadRequestException('EMPLOYEE não tem acesso ao painel admin');
    }

    // Buscar IDs das permissões
    const permissionKeys = permissions.map((p) => p.permissionKey);
    const dbPermissions = await this.prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
    });

    const permissionIdMap = new Map(
      dbPermissions.map((p) => [p.key, p.id]),
    );

    // Atualizar cada permissão
    const updates = permissions.map((p) => {
      const permissionId = permissionIdMap.get(p.permissionKey);
      if (!permissionId) {
        throw new BadRequestException(`Permissão não encontrada: ${p.permissionKey}`);
      }

      return this.prisma.rolePermission.upsert({
        where: {
          companyId_role_permissionId: {
            companyId,
            role,
            permissionId,
          },
        },
        update: { granted: p.granted },
        create: {
          companyId,
          role,
          permissionId,
          granted: p.granted,
        },
      });
    });

    await this.prisma.$transaction(updates);

    // Emitir evento WebSocket para atualizar permissões em tempo real
    // Todos os usuários com esse role na empresa vão recarregar suas permissões
    this.eventsGateway.emitPermissionsUpdated(companyId, role);

    return { success: true, message: 'Permissões atualizadas com sucesso' };
  }

  /**
   * Obter permissões do usuário atual (para o frontend)
   * Retorna lista de permission keys que o usuário tem
   */
  async getUserPermissions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, companyId: true },
    });

    if (!user) {
      return { permissions: [] };
    }

    // SUPER_ADMIN e COMPANY_ADMIN: todas as permissões
    if (user.role === Role.SUPER_ADMIN || user.role === Role.COMPANY_ADMIN) {
      const allPermissions = await this.prisma.permission.findMany({
        select: { key: true },
      });
      return {
        role: user.role,
        permissions: allPermissions.map((p) => p.key),
        isAdmin: true,
      };
    }

    // EMPLOYEE: sem permissões de admin
    if (user.role === Role.EMPLOYEE) {
      return {
        role: user.role,
        permissions: [],
        isAdmin: false,
      };
    }

    // MANAGER, HR, FINANCIAL: buscar permissões configuradas
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: {
        companyId: user.companyId,
        role: user.role,
        granted: true,
      },
      include: { permission: true },
    });

    return {
      role: user.role,
      permissions: rolePermissions.map((rp) => rp.permission.key),
      isAdmin: true,
    };
  }

  /**
   * Inicializar permissões padrão para uma nova empresa
   */
  async initializeCompanyPermissions(companyId: string) {
    await seedCompanyPermissions(companyId);
    return { success: true, message: 'Permissões inicializadas com sucesso' };
  }
}
