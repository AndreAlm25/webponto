import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OvertimeStatus } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class OvertimeService {
  private readonly logger = new Logger(OvertimeService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Listar horas extras pendentes, aprovadas ou rejeitadas
   */
  async listarHorasExtras(
    companyId: string,
    filters?: {
      employeeId?: string
      status?: OvertimeStatus
      startDate?: Date
      endDate?: Date
    }
  ) {
    const where: any = {
      companyId,
      isOvertime: true,
    };

    if (filters?.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters?.status) {
      where.overtimeStatus = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = startOfDay(filters.startDate);
      if (filters.endDate) where.timestamp.lte = endOfDay(filters.endDate);
    }

    const timeEntries = await this.prisma.timeEntry.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            registrationId: true,
            user: {
              select: {
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    return timeEntries;
  }

  /**
   * Contar horas extras por status
   */
  async contarPorStatus(companyId: string) {
    const [pending, approved, rejected] = await Promise.all([
      this.prisma.timeEntry.count({
        where: { companyId, isOvertime: true, overtimeStatus: OvertimeStatus.PENDING },
      }),
      this.prisma.timeEntry.count({
        where: { companyId, isOvertime: true, overtimeStatus: OvertimeStatus.APPROVED },
      }),
      this.prisma.timeEntry.count({
        where: { companyId, isOvertime: true, overtimeStatus: OvertimeStatus.REJECTED },
      }),
    ]);

    return {
      pending,
      approved,
      rejected,
      total: pending + approved + rejected,
    };
  }

  /**
   * Aprovar hora extra
   */
  async aprovarHoraExtra(timeEntryId: string, userId: string, notes?: string) {
    const timeEntry = await this.prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
    });

    if (!timeEntry) {
      throw new NotFoundException('Registro de ponto não encontrado.');
    }

    if (!timeEntry.isOvertime) {
      throw new BadRequestException('Este registro não é hora extra.');
    }

    if (timeEntry.overtimeStatus !== OvertimeStatus.PENDING) {
      throw new BadRequestException('Esta hora extra já foi processada.');
    }

    const updated = await this.prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: {
        overtimeStatus: OvertimeStatus.APPROVED,
        overtimeApprovedBy: userId,
        overtimeApprovedAt: new Date(),
        overtimeNotes: notes || timeEntry.overtimeNotes,
      },
      include: {
        employee: {
          select: {
            id: true,
            registrationId: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(
      `✅ Hora extra aprovada: ${timeEntry.id} (${timeEntry.overtimeMinutes}min) - Aprovado por: ${userId}`
    );

    return updated;
  }

  /**
   * Rejeitar hora extra
   */
  async rejeitarHoraExtra(timeEntryId: string, userId: string, notes?: string) {
    const timeEntry = await this.prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
    });

    if (!timeEntry) {
      throw new NotFoundException('Registro de ponto não encontrado.');
    }

    if (!timeEntry.isOvertime) {
      throw new BadRequestException('Este registro não é hora extra.');
    }

    if (timeEntry.overtimeStatus !== OvertimeStatus.PENDING) {
      throw new BadRequestException('Esta hora extra já foi processada.');
    }

    const updated = await this.prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: {
        overtimeStatus: OvertimeStatus.REJECTED,
        overtimeApprovedBy: userId,
        overtimeApprovedAt: new Date(),
        overtimeNotes: notes || timeEntry.overtimeNotes,
      },
      include: {
        employee: {
          select: {
            id: true,
            registrationId: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(
      `❌ Hora extra rejeitada: ${timeEntry.id} (${timeEntry.overtimeMinutes}min) - Rejeitado por: ${userId}`
    );

    return updated;
  }

  /**
   * Banco de Horas: saldo consolidado por funcionário
   */
  async bancodeHoras(companyId: string, employeeId?: string) {
    const where: any = { companyId, isOvertime: true, overtimeStatus: OvertimeStatus.APPROVED }
    if (employeeId) where.employeeId = employeeId

    const entries = await this.prisma.timeEntry.findMany({
      where,
      select: {
        employeeId: true,
        overtimeMinutes: true,
        overtimeType: true,
        overtimeRate: true,
        timestamp: true,
        employee: {
          select: {
            id: true,
            registrationId: true,
            allowTimeBank: true,
            user: { select: { name: true, avatarUrl: true } },
            position: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    })

    // Agrupar por funcionário
    const byEmployee = new Map<string, any>()
    for (const e of entries) {
      if (!byEmployee.has(e.employeeId)) {
        byEmployee.set(e.employeeId, {
          employeeId: e.employeeId,
          employeeName: e.employee.user?.name || '',
          registrationId: e.employee.registrationId,
          position: e.employee.position?.name || null,
          department: e.employee.department?.name || null,
          avatarUrl: e.employee.user?.avatarUrl || null,
          allowTimeBank: e.employee.allowTimeBank,
          totalMinutes: 0,
          entries50: 0,
          entries100: 0,
          lastEntry: null,
        })
      }
      const emp = byEmployee.get(e.employeeId)
      emp.totalMinutes += e.overtimeMinutes || 0
      const rate = Number(e.overtimeRate) || 1.5
      if (rate >= 2) emp.entries100 += e.overtimeMinutes || 0
      else emp.entries50 += e.overtimeMinutes || 0
      if (!emp.lastEntry || new Date(e.timestamp) > new Date(emp.lastEntry)) {
        emp.lastEntry = e.timestamp
      }
    }

    return Array.from(byEmployee.values()).sort((a, b) => b.totalMinutes - a.totalMinutes)
  }

  /**
   * Aprovar múltiplas horas extras em lote
   */
  async aprovarEmLote(timeEntryIds: string[], userId: string) {
    const results = await Promise.all(
      timeEntryIds.map((id) => this.aprovarHoraExtra(id, userId).catch((e) => ({ error: e.message })))
    );

    const approved = results.filter((r) => !('error' in r));
    const failed = results.filter((r) => 'error' in r);

    return {
      approved: approved.length,
      failed: failed.length,
      results,
    };
  }

  /**
   * Rejeitar múltiplas horas extras em lote
   */
  async rejeitarEmLote(timeEntryIds: string[], userId: string, notes?: string) {
    const results = await Promise.all(
      timeEntryIds.map((id) => this.rejeitarHoraExtra(id, userId, notes).catch((e) => ({ error: e.message })))
    );

    const rejected = results.filter((r) => !('error' in r));
    const failed = results.filter((r) => 'error' in r);

    return {
      rejected: rejected.length,
      failed: failed.length,
      results,
    };
  }
}
