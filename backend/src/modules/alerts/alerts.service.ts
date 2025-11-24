import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TimeEntryType } from '@prisma/client';

export interface Alert {
  id: string;
  type: 'OVERTIME_EXCEEDS' | 'LATE' | 'REST_VIOLATION' | 'OVERTIME_PENDING';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  employeeId: string;
  employeeName: string;
  timeEntryId: string;
  timestamp: Date;
  message: string;
  details: any;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Buscar todos os alertas de uma empresa
   */
  async getCompanyAlerts(companyId: string, filters?: {
    type?: string;
    severity?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // Data range
    const startDate = filters?.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 dias atrás
    const endDate = filters?.endDate || new Date();

    // 1. ALERTAS DE HORA EXTRA EXCEDIDA
    const exceededEntries = await this.prisma.timeEntry.findMany({
      where: {
        companyId,
        exceedsLimit: true,
        timestamp: { gte: startDate, lte: endDate },
      },
      include: {
        employee: {
          select: {
            id: true,
            user: { select: { name: true } },
            maxOvertimeBefore: true,
            maxOvertimeAfter: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    for (const entry of exceededEntries) {
      const limit = entry.type === TimeEntryType.CLOCK_IN 
        ? entry.employee.maxOvertimeBefore 
        : entry.employee.maxOvertimeAfter;

      alerts.push({
        id: `exceed_${entry.id}`,
        type: 'OVERTIME_EXCEEDS',
        severity: 'HIGH',
        employeeId: entry.employeeId,
        employeeName: entry.employee.user.name,
        timeEntryId: entry.id,
        timestamp: entry.timestamp,
        message: `${entry.employee.user.name} excedeu limite de hora extra`,
        details: {
          overtimeMinutes: entry.overtimeMinutes,
          limitMinutes: limit,
          exceedMinutes: entry.overtimeMinutes - limit,
          type: entry.overtimeType,
        },
      });
    }

    // 2. ALERTAS DE ATRASO
    const lateEntries = await this.prisma.timeEntry.findMany({
      where: {
        companyId,
        isLate: true,
        timestamp: { gte: startDate, lte: endDate },
      },
      include: {
        employee: {
          select: {
            id: true,
            user: { select: { name: true } },
            companyId: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    for (const entry of lateEntries) {
      alerts.push({
        id: `late_${entry.id}`,
        type: 'LATE',
        severity: entry.lateMinutes > 30 ? 'HIGH' : 'MEDIUM',
        employeeId: entry.employeeId,
        employeeName: entry.employee.user.name,
        timeEntryId: entry.id,
        timestamp: entry.timestamp,
        message: `${entry.employee.user.name} chegou atrasado`,
        details: {
          lateMinutes: entry.lateMinutes,
        },
      });
    }

    // 3. ALERTAS DE VIOLAÇÃO DE DESCANSO
    const restViolations = await this.prisma.timeEntry.findMany({
      where: {
        companyId,
        violatesRest: true,
        timestamp: { gte: startDate, lte: endDate },
      },
      include: {
        employee: {
          select: {
            id: true,
            user: { select: { name: true } },
            minRestHours: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    for (const entry of restViolations) {
      alerts.push({
        id: `rest_${entry.id}`,
        type: 'REST_VIOLATION',
        severity: 'HIGH',
        employeeId: entry.employeeId,
        employeeName: entry.employee.user.name,
        timeEntryId: entry.id,
        timestamp: entry.timestamp,
        message: `${entry.employee.user.name} não teve descanso suficiente`,
        details: {
          restHours: entry.restHours,
          minRestHours: entry.employee.minRestHours,
          missingHours: entry.employee.minRestHours - entry.restHours,
        },
      });
    }

    // 4. ALERTAS DE HORA EXTRA PENDENTE
    const pendingOvertimes = await this.prisma.timeEntry.findMany({
      where: {
        companyId,
        isOvertime: true,
        overtimeStatus: 'PENDING',
        timestamp: { gte: startDate, lte: endDate },
      },
      include: {
        employee: {
          select: {
            id: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    for (const entry of pendingOvertimes) {
      alerts.push({
        id: `pending_${entry.id}`,
        type: 'OVERTIME_PENDING',
        severity: 'LOW',
        employeeId: entry.employeeId,
        employeeName: entry.employee.user.name,
        timeEntryId: entry.id,
        timestamp: entry.timestamp,
        message: `${entry.employee.user.name} tem hora extra pendente`,
        details: {
          overtimeMinutes: entry.overtimeMinutes,
          type: entry.overtimeType,
        },
      });
    }

    // Filtrar por tipo e severidade se fornecido
    let filteredAlerts = alerts;
    if (filters?.type) {
      filteredAlerts = filteredAlerts.filter(a => a.type === filters.type);
    }
    if (filters?.severity) {
      filteredAlerts = filteredAlerts.filter(a => a.severity === filters.severity);
    }

    // Ordenar por timestamp (mais recente primeiro)
    filteredAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return filteredAlerts;
  }

  /**
   * Contar alertas por severidade
   */
  async getAlertsSummary(companyId: string): Promise<{
    total: number;
    high: number;
    medium: number;
    low: number;
    byType: Record<string, number>;
  }> {
    const alerts = await this.getCompanyAlerts(companyId);

    const summary = {
      total: alerts.length,
      high: alerts.filter(a => a.severity === 'HIGH').length,
      medium: alerts.filter(a => a.severity === 'MEDIUM').length,
      low: alerts.filter(a => a.severity === 'LOW').length,
      byType: {} as Record<string, number>,
    };

    // Contar por tipo
    for (const alert of alerts) {
      summary.byType[alert.type] = (summary.byType[alert.type] || 0) + 1;
    }

    return summary;
  }
}
