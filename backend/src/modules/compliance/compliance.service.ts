import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ComplianceLevel, TimeEntryType } from '@prisma/client';

export interface ComplianceValidation {
  allowed: boolean;
  shouldWarn: boolean;
  shouldBlock: boolean;
  violations: string[];
  warnings: string[];
}

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Validar se o registro de ponto está em conformidade com as regras da empresa
   */
  async validateTimeEntry(
    companyId: string,
    employeeId: string,
    timestamp: Date,
    type: TimeEntryType,
    overtimeMinutes?: number,
  ): Promise<ComplianceValidation> {
    // Buscar configurações da empresa
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        complianceLevel: true,
        enforceWorkHours: true,
        enforceRestPeriod: true,
        enforceOvertimeRules: true,
        warnOnViolation: true,
        enableTolerances: true,
        earlyEntryToleranceMinutes: true,
        lateExitToleranceMinutes: true,
        lateArrivalToleranceMinutes: true,
      },
    });

    if (!company) {
      throw new BadRequestException('Empresa não encontrada');
    }

    // Se modo FLEXIBLE, permite tudo
    if (company.complianceLevel === ComplianceLevel.FLEXIBLE) {
      return {
        allowed: true,
        shouldWarn: false,
        shouldBlock: false,
        violations: [],
        warnings: [],
      };
    }

    const violations: string[] = [];
    const warnings: string[] = [];

    // Buscar funcionário
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        workStartTime: true,
        workEndTime: true,
        minRestHours: true,
        allowOvertime: true,
        allowOvertimeBefore: true,
        allowOvertimeAfter: true,
        maxOvertimeBefore: true,
        maxOvertimeAfter: true,
      },
    });

    if (!employee) {
      throw new BadRequestException('Funcionário não encontrado');
    }

    // REGRA CRÍTICA: Se admin permitiu hora extra, não validar descanso!
    // Hora extra configurada tem prioridade sobre validação CLT
    const overtimeAllowed = employee.allowOvertime && (
      (type === TimeEntryType.CLOCK_IN && employee.allowOvertimeBefore) ||
      (type === TimeEntryType.CLOCK_OUT && employee.allowOvertimeAfter)
    );

    this.logger.log(`📋 [COMPLIANCE] Hora extra permitida: ${overtimeAllowed}`);

    // ========================================
    // 0. VALIDAR HORÁRIO DE TRABALHO COM TOLERÂNCIAS
    // ========================================
    const currentTime = timestamp.toTimeString().slice(0, 5); // HH:MM
    const workStart = employee.workStartTime;
    const workEnd = employee.workEndTime;

    // ENTRADA: Validar com tolerância
    if (type === TimeEntryType.CLOCK_IN) {
      // 1. Calcular horário mais cedo permitido
      let earliestAllowedMin: number;
      
      if (employee.allowOvertime && employee.allowOvertimeBefore && employee.maxOvertimeBefore) {
        // COM hora extra: início é workStart - maxOvertimeBefore
        const [startHour, startMin] = workStart.split(':').map(Number);
        const startTotalMin = startHour * 60 + startMin;
        earliestAllowedMin = startTotalMin - employee.maxOvertimeBefore;
        this.logger.log(`📋 [COMPLIANCE] Hora extra antes permitida: ${employee.maxOvertimeBefore}min`);
      } else {
        // SEM hora extra: início é workStart
        const [startHour, startMin] = workStart.split(':').map(Number);
        earliestAllowedMin = startHour * 60 + startMin;
      }

      // 2. Aplicar tolerância (se ativa)
      if (company.enableTolerances) {
        const earlyTolerance = company.earlyEntryToleranceMinutes || 10;
        earliestAllowedMin -= earlyTolerance;
        this.logger.log(`📋 [COMPLIANCE] Tolerância de entrada aplicada: ${earlyTolerance}min`);
      }

      // 3. Validar
      const [currentHour, currentMin] = currentTime.split(':').map(Number);
      const currentTotalMin = currentHour * 60 + currentMin;

      if (currentTotalMin < earliestAllowedMin) {
        const earliestTime = `${Math.floor(earliestAllowedMin / 60).toString().padStart(2, '0')}:${(earliestAllowedMin % 60).toString().padStart(2, '0')}`;
        const violation = `Entrada muito cedo: você está tentando bater ponto antes do horário permitido. Horário permitido a partir de: ${earliestTime}`;
        violations.push(violation);
        this.logger.warn(`⚠️ [COMPLIANCE] ${violation}`);
      }
    }

    // SAÍDA: Apenas avisar se exceder tolerância (NUNCA bloqueia)
    if (type === TimeEntryType.CLOCK_OUT) {
      // 1. Calcular horário mais tarde permitido
      let latestAllowedMin: number;
      
      if (employee.allowOvertime && employee.allowOvertimeAfter && employee.maxOvertimeAfter) {
        // COM hora extra: fim é workEnd + maxOvertimeAfter
        const [endHour, endMin] = workEnd.split(':').map(Number);
        const endTotalMin = endHour * 60 + endMin;
        latestAllowedMin = endTotalMin + employee.maxOvertimeAfter;
        this.logger.log(`📋 [COMPLIANCE] Hora extra depois permitida: ${employee.maxOvertimeAfter}min`);
      } else {
        // SEM hora extra: fim é workEnd
        const [endHour, endMin] = workEnd.split(':').map(Number);
        latestAllowedMin = endHour * 60 + endMin;
      }

      // 2. Aplicar tolerância (se ativa)
      if (company.enableTolerances) {
        const lateTolerance = company.lateExitToleranceMinutes || 15;
        latestAllowedMin += lateTolerance;
        this.logger.log(`📋 [COMPLIANCE] Tolerância de saída aplicada: ${lateTolerance}min`);
      }

      // 3. Validar (apenas avisa, não bloqueia)
      const [currentHour, currentMin] = currentTime.split(':').map(Number);
      const currentTotalMin = currentHour * 60 + currentMin;

      if (currentTotalMin > latestAllowedMin) {
        const latestTime = `${Math.floor(latestAllowedMin / 60).toString().padStart(2, '0')}:${(latestAllowedMin % 60).toString().padStart(2, '0')}`;
        const violation = `Saída muito tarde: você está tentando bater ponto após o horário permitido. Horário máximo permitido: ${latestTime}`;
        violations.push(violation);
        this.logger.warn(`⚠️ [COMPLIANCE] ${violation}`);
      }
    }

    // ========================================
    // 1. VALIDAR HORAS DE TRABALHO (10h/dia)
    // ========================================
    if (
      company.complianceLevel === ComplianceLevel.FULL ||
      (company.complianceLevel === ComplianceLevel.CUSTOM && company.enforceWorkHours)
    ) {
      // Buscar entrada do dia
      const startOfDay = new Date(timestamp);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(timestamp);
      endOfDay.setHours(23, 59, 59, 999);

      const todayEntries = await this.prisma.timeEntry.findMany({
        where: {
          employeeId,
          timestamp: { gte: startOfDay, lte: endOfDay },
        },
        orderBy: { timestamp: 'asc' },
      });

      if (todayEntries.length > 0) {
        const firstEntry = todayEntries[0];
        const diffMs = timestamp.getTime() - firstEntry.timestamp.getTime();
        const totalHours = diffMs / (1000 * 60 * 60);

        // CLT: máximo 10h/dia (8h normais + 2h extras)
        if (totalHours > 10) {
          const violation = `Jornada excedida: você já trabalhou ${totalHours.toFixed(1)}h hoje. Limite máximo permitido: 10h por dia (8h normais + 2h extras - CLT Art. 58 e 59)`;
          violations.push(violation);
          this.logger.warn(`⚠️ [COMPLIANCE] ${violation}`);
        }
      }
    }

    // ========================================
    // 2. VALIDAR DESCANSO (11h entre jornadas)
    // ========================================
    // IMPORTANTE: Só valida descanso se hora extra NÃO estiver permitida
    // Se admin permitiu hora extra, ele assume responsabilidade pelo descanso
    if (
      type === TimeEntryType.CLOCK_IN &&
      !overtimeAllowed && // <-- NOVA CONDIÇÃO
      (company.complianceLevel === ComplianceLevel.FULL ||
        (company.complianceLevel === ComplianceLevel.CUSTOM && company.enforceRestPeriod))
    ) {
      const lastExit = await this.prisma.timeEntry.findFirst({
        where: {
          employeeId,
          type: TimeEntryType.CLOCK_OUT,
          timestamp: { lt: timestamp },
        },
        orderBy: { timestamp: 'desc' },
      });

      if (lastExit) {
        const diffMs = timestamp.getTime() - lastExit.timestamp.getTime();
        const restHours = diffMs / (1000 * 60 * 60);

        if (restHours < employee.minRestHours) {
          const violation = `Descanso insuficiente: você teve apenas ${restHours.toFixed(1)}h de descanso entre jornadas. Mínimo exigido: ${employee.minRestHours}h (CLT Art. 66)`;
          violations.push(violation);
          this.logger.warn(`⚠️ [COMPLIANCE] ${violation}`);
        }
      }
    }

    // ========================================
    // 3. VALIDAR HORA EXTRA (2h/dia máximo)
    // ========================================
    if (
      overtimeMinutes &&
      (company.complianceLevel === ComplianceLevel.FULL ||
        (company.complianceLevel === ComplianceLevel.CUSTOM && company.enforceOvertimeRules))
    ) {
      const overtimeHours = overtimeMinutes / 60;

      // CLT: máximo 2h extras/dia
      if (overtimeHours > 2) {
        const violation = `Hora extra excedida: você está tentando fazer ${overtimeHours.toFixed(1)}h de hora extra. Limite máximo permitido: 2h por dia (CLT Art. 59)`;
        violations.push(violation);
        this.logger.warn(`⚠️ [COMPLIANCE] ${violation}`);
      }
    }

    // ========================================
    // RESULTADO
    // ========================================
    const hasViolations = violations.length > 0;
    
    // REGRA CRÍTICA: NUNCA bloquear CLOCK_OUT!
    // Se bloquear saída, o ponto fica aberto e funcionário não consegue mais bater ponto
    const canBlock = type === TimeEntryType.CLOCK_IN; // Só pode bloquear ENTRADA
    
    // LÓGICA DE BLOQUEIO:
    // - FULL: sempre bloqueia se tiver violações
    // - CUSTOM: bloqueia APENAS se warnOnViolation = false (não está marcado "apenas avisar")
    // - FLEXIBLE: nunca bloqueia
    const shouldBlock = hasViolations && canBlock && (
      company.complianceLevel === ComplianceLevel.FULL ||
      (company.complianceLevel === ComplianceLevel.CUSTOM && !company.warnOnViolation)
    );
    const shouldWarn = hasViolations && company.warnOnViolation;

    if (shouldBlock) {
      this.logger.error(`🚫 [COMPLIANCE] Bloqueando ENTRADA por violação CLT`);
    } else if (hasViolations && type === TimeEntryType.CLOCK_OUT) {
      this.logger.warn(`⚠️ [COMPLIANCE] Violação detectada na SAÍDA, mas permitindo registro (não pode bloquear saída)`);
    }

    return {
      allowed: !shouldBlock,
      shouldWarn,
      shouldBlock,
      violations,
      warnings,
    };
  }

  /**
   * Calcula o valor em R$ da hora extra
   */
  async calculateOvertimeValue(
    employeeId: string,
    overtimeMinutes: number,
    date: Date,
    overtimeType?: string,
  ): Promise<{ rate: number; value: number; hourlyRate: number }> {
    // Buscar funcionário com salário
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        baseSalary: true,
        overtimeRate: true,
        weekendRate: true,
        holidayRate: true,
        nightShiftRate: true,
        companyId: true,
      },
    });

    if (!employee) {
      throw new BadRequestException('Funcionário não encontrado');
    }

    // Buscar configurações da empresa (taxas padrão)
    const company = await this.prisma.company.findUnique({
      where: { id: employee.companyId },
      select: {
        customOvertimeRate: true,
        customHolidayRate: true,
      },
    });

    // Calcular valor da hora normal
    // Salário mensal / 220 horas (média mensal CLT)
    const hourlyRate = Number(employee.baseSalary) / 220;

    // Determinar taxa aplicável
    let rate = 1.5; // Padrão CLT: 50% a mais

    // Prioridade: Employee > Company > Padrão CLT
    if (employee.overtimeRate) {
      rate = Number(employee.overtimeRate);
    } else if (company?.customOvertimeRate) {
      rate = Number(company.customOvertimeRate);
    }

    // Verificar se é fim de semana
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (isWeekend && employee.weekendRate) {
      rate = Number(employee.weekendRate);
    }

    // TODO: Verificar se é feriado (precisa de tabela de feriados)
    // if (isHoliday && employee.holidayRate) {
    //   rate = Number(employee.holidayRate);
    // }

    // Verificar se é noturno (22h-05h)
    const hour = date.getHours();
    const isNightShift = hour >= 22 || hour < 5;
    if (isNightShift && employee.nightShiftRate) {
      rate = Number(employee.nightShiftRate);
    }

    // Calcular valor
    const overtimeHours = overtimeMinutes / 60;
    const value = hourlyRate * rate * overtimeHours;

    this.logger.log(
      `💰 [OVERTIME] Funcionário: ${employeeId} | ` +
      `Minutos: ${overtimeMinutes} | Taxa: ${rate}x | ` +
      `Valor hora: R$ ${hourlyRate.toFixed(2)} | ` +
      `Valor total: R$ ${value.toFixed(2)}`
    );

    return {
      rate,
      value: Math.round(value * 100) / 100, // Arredondar para 2 casas
      hourlyRate: Math.round(hourlyRate * 100) / 100,
    };
  }

  async calculateOvertimeRate(
    companyId: string,
    isHoliday: boolean = false,
  ): Promise<number> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        complianceLevel: true,
        customOvertimeRate: true,
        customHolidayRate: true,
      },
    });

    if (!company) {
      throw new BadRequestException('Empresa não encontrada');
    }

    // Se CUSTOM, usa taxas personalizadas
    if (company.complianceLevel === ComplianceLevel.CUSTOM) {
      if (isHoliday && company.customHolidayRate) {
        return Number(company.customHolidayRate);
      }
      if (company.customOvertimeRate) {
        return Number(company.customOvertimeRate);
      }
    }

    // Padrão CLT
    return isHoliday ? 2.0 : 1.5; // 100% ou 50%
  }

  /**
   * Atualizar configurações de conformidade da empresa
   */
  async updateCompanyCompliance(
    companyId: string,
    data: {
      complianceLevel?: ComplianceLevel;
      enforceWorkHours?: boolean;
      enforceRestPeriod?: boolean;
      enforceOvertimeRules?: boolean;
      enforceTimeBankRules?: boolean;
      allowNegativeBalance?: boolean;
      customOvertimeRate?: number;
      customHolidayRate?: number;
      warnOnViolation?: boolean;
      enableTolerances?: boolean;
      earlyEntryToleranceMinutes?: number;
      lateExitToleranceMinutes?: number;
      lateArrivalToleranceMinutes?: number;
    },
  ) {
    this.logger.log(`📝 [COMPLIANCE] Atualizando configurações da empresa ${companyId}`);

    return this.prisma.company.update({
      where: { id: companyId },
      data: {
        complianceLevel: data.complianceLevel,
        enforceWorkHours: data.enforceWorkHours,
        enforceRestPeriod: data.enforceRestPeriod,
        enforceOvertimeRules: data.enforceOvertimeRules,
        enforceTimeBankRules: data.enforceTimeBankRules,
        allowNegativeBalance: data.allowNegativeBalance,
        customOvertimeRate: data.customOvertimeRate,
        customHolidayRate: data.customHolidayRate,
        warnOnViolation: data.warnOnViolation,
        enableTolerances: data.enableTolerances,
        earlyEntryToleranceMinutes: data.earlyEntryToleranceMinutes,
        lateExitToleranceMinutes: data.lateExitToleranceMinutes,
        lateArrivalToleranceMinutes: data.lateArrivalToleranceMinutes,
      },
    });
  }

  /**
   * Buscar configurações de conformidade da empresa
   */
  async getCompanyCompliance(companyId: string) {
    return this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        complianceLevel: true,
        enforceWorkHours: true,
        enforceRestPeriod: true,
        enforceOvertimeRules: true,
        enforceTimeBankRules: true,
        allowNegativeBalance: true,
        customOvertimeRate: true,
        customHolidayRate: true,
        warnOnViolation: true,
        enableTolerances: true,
        earlyEntryToleranceMinutes: true,
        lateExitToleranceMinutes: true,
        lateArrivalToleranceMinutes: true,
      },
    });
  }

  /**
   * Dashboard de conformidade com estatísticas
   */
  async getDashboardStats(
    companyId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    // Definir período padrão (últimos 30 dias)
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Buscar configurações da empresa
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        complianceLevel: true,
        enforceWorkHours: true,
        enforceRestPeriod: true,
        enforceOvertimeRules: true,
      },
    });

    // Buscar todos os registros de ponto do período
    const timeEntries = await this.prisma.timeEntry.findMany({
      where: {
        companyId,
        timestamp: {
          gte: start,
          lte: end,
        },
      },
      select: {
        id: true,
        timestamp: true,
        type: true,
        isOvertime: true,
        overtimeMinutes: true,
        overtimeValue: true,
        overtimeRate: true,
        isLate: true,
        lateMinutes: true,
        violatesRest: true,
        restHours: true,
        employeeId: true,
      },
      orderBy: { timestamp: 'desc' },
    });

    // Calcular estatísticas
    const totalEntries = timeEntries.length;
    const overtimeEntries = timeEntries.filter(e => e.isOvertime);
    const lateEntries = timeEntries.filter(e => e.isLate);
    const restViolations = timeEntries.filter(e => e.violatesRest);

    // Calcular total de minutos e valor de hora extra
    const totalOvertimeMinutes = overtimeEntries.reduce((sum, e) => sum + (e.overtimeMinutes || 0), 0);
    const totalOvertimeValue = overtimeEntries.reduce((sum, e) => sum + Number(e.overtimeValue || 0), 0);
    const totalLateMinutes = lateEntries.reduce((sum, e) => sum + (e.lateMinutes || 0), 0);

    // Calcular percentual de conformidade
    const violationCount = lateEntries.length + restViolations.length;
    const compliancePercentage = totalEntries > 0 
      ? Math.round(((totalEntries - violationCount) / totalEntries) * 100)
      : 100;

    // Agrupar por dia para gráfico
    const dailyStats = timeEntries.reduce((acc, entry) => {
      const date = entry.timestamp.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          overtime: 0,
          overtimeValue: 0,
          late: 0,
          restViolations: 0,
        };
      }
      if (entry.isOvertime) {
        acc[date].overtime += entry.overtimeMinutes || 0;
        acc[date].overtimeValue += Number(entry.overtimeValue || 0);
      }
      if (entry.isLate) acc[date].late++;
      if (entry.violatesRest) acc[date].restViolations++;
      return acc;
    }, {} as Record<string, any>);

    // Agrupar por funcionário
    const employeeStats = timeEntries.reduce((acc, entry) => {
      if (!acc[entry.employeeId]) {
        acc[entry.employeeId] = {
          employeeId: entry.employeeId,
          overtimeMinutes: 0,
          overtimeValue: 0,
          lateCount: 0,
          restViolations: 0,
        };
      }
      if (entry.isOvertime) {
        acc[entry.employeeId].overtimeMinutes += entry.overtimeMinutes || 0;
        acc[entry.employeeId].overtimeValue += Number(entry.overtimeValue || 0);
      }
      if (entry.isLate) acc[entry.employeeId].lateCount++;
      if (entry.violatesRest) acc[entry.employeeId].restViolations++;
      return acc;
    }, {} as Record<string, any>);

    return {
      period: {
        start,
        end,
      },
      config: company,
      summary: {
        totalEntries,
        compliancePercentage,
        violations: {
          total: violationCount,
          late: lateEntries.length,
          restViolations: restViolations.length,
        },
        overtime: {
          entries: overtimeEntries.length,
          totalMinutes: totalOvertimeMinutes,
          totalHours: Math.round((totalOvertimeMinutes / 60) * 10) / 10,
          totalValue: Math.round(totalOvertimeValue * 100) / 100,
          averageRate: overtimeEntries.length > 0
            ? Math.round((overtimeEntries.reduce((sum, e) => sum + Number(e.overtimeRate || 1.5), 0) / overtimeEntries.length) * 100) / 100
            : 1.5,
        },
        late: {
          entries: lateEntries.length,
          totalMinutes: totalLateMinutes,
        },
      },
      charts: {
        daily: Object.values(dailyStats).sort((a: any, b: any) => a.date.localeCompare(b.date)),
        byEmployee: Object.values(employeeStats).sort((a: any, b: any) => b.overtimeValue - a.overtimeValue),
      },
    };
  }
}
