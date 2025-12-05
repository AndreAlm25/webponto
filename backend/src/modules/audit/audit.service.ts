import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

export interface AuditLogInput {
  companyId: string;
  userId?: string;
  userName: string;
  userRole: Role;
  action: string;
  module: string;
  entityId?: string;
  entityName?: string;
  oldData?: any;
  newData?: any;
  ip?: string;
  userAgent?: string;
}

export interface AuditLogFilters {
  userId?: string;
  module?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  entityId?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Registrar uma ação no log de auditoria
   */
  async log(input: AuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        companyId: input.companyId,
        userId: input.userId,
        userName: input.userName,
        userRole: input.userRole,
        action: input.action,
        module: input.module,
        entityId: input.entityId,
        entityName: input.entityName,
        oldData: input.oldData,
        newData: input.newData,
        ip: input.ip,
        userAgent: input.userAgent,
      },
    });
  }

  /**
   * Listar logs de auditoria de uma empresa
   */
  async getLogs(companyId: string, filters: AuditLogFilters, page = 1, limit = 50) {
    const where: any = { companyId };

    if (filters.userId) {
      where.userId = filters.userId;
    }
    if (filters.module) {
      where.module = filters.module;
    }
    if (filters.action) {
      where.action = filters.action;
    }
    if (filters.entityId) {
      where.entityId = filters.entityId;
    }
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        where.timestamp.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.timestamp.lte = filters.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obter detalhes de um log específico
   */
  async getLogById(id: string) {
    return this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Listar módulos disponíveis (para filtro)
   */
  async getModules(companyId: string) {
    const modules = await this.prisma.auditLog.findMany({
      where: { companyId },
      select: { module: true },
      distinct: ['module'],
    });
    return modules.map((m) => m.module);
  }

  /**
   * Listar ações disponíveis (para filtro)
   */
  async getActions(companyId: string) {
    const actions = await this.prisma.auditLog.findMany({
      where: { companyId },
      select: { action: true },
      distinct: ['action'],
    });
    return actions.map((a) => a.action);
  }

  /**
   * Estatísticas de auditoria
   */
  async getStats(companyId: string, startDate?: Date, endDate?: Date) {
    const where: any = { companyId };
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const [total, byModule, byAction, byUser] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({
        by: ['module'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['userId', 'userName'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      total,
      byModule: byModule.map((m) => ({ module: m.module, count: m._count.id })),
      byAction: byAction.map((a) => ({ action: a.action, count: a._count.id })),
      byUser: byUser.map((u) => ({ userId: u.userId, userName: u.userName, count: u._count.id })),
    };
  }
}
