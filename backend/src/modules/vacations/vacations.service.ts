import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { addDays, subDays, differenceInDays, startOfDay, endOfDay, isWeekend } from 'date-fns'

@Injectable()
export class VacationsService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // LISTAR FÉRIAS
  // ==========================================

  async listVacations(companyId: string, filters: {
    employeeId?: string
    status?: string
    year?: number
  }) {
    const where: any = { companyId }

    if (filters.employeeId) {
      where.employeeId = filters.employeeId
    }

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.year) {
      where.OR = [
        { acquisitionStart: { gte: new Date(filters.year, 0, 1), lte: new Date(filters.year, 11, 31) } },
        { acquisitionEnd: { gte: new Date(filters.year, 0, 1), lte: new Date(filters.year, 11, 31) } },
        { concessionEnd: { gte: new Date(filters.year, 0, 1), lte: new Date(filters.year, 11, 31) } },
      ]
    }

    const vacations = await this.prisma.vacation.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            registrationId: true,
            baseSalary: true,
            hireDate: true,
            user: { select: { name: true, avatarUrl: true } },
            position: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
        periods: {
          orderBy: { periodNumber: 'asc' },
        },
        approver: {
          select: { name: true },
        },
      },
      orderBy: [
        { status: 'asc' },
        { concessionEnd: 'asc' },
      ],
    })

    return {
      success: true,
      vacations: vacations.map(v => ({
        ...v,
        employeeName: v.employee.user?.name || 'Sem nome',
        positionName: v.employee.position?.name,
        departmentName: v.employee.department?.name,
        approverName: v.approver?.name,
        isExpired: v.status === 'EXPIRED' || (new Date() > v.concessionEnd && !['COMPLETED', 'REGULARIZED'].includes(v.status)),
        isExpiringSoon: !['COMPLETED', 'EXPIRED', 'REGULARIZED'].includes(v.status) && 
          differenceInDays(v.concessionEnd, new Date()) <= 60,
        daysUntilExpiration: differenceInDays(v.concessionEnd, new Date()),
      })),
    }
  }

  // ==========================================
  // LISTAR FUNCIONÁRIOS COM PERÍODOS AQUISITIVOS
  // ==========================================

  async listEmployeesWithVacationStatus(companyId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { companyId, active: true },
      include: {
        user: { select: { name: true, avatarUrl: true } },
        position: { select: { name: true } },
        department: { select: { name: true } },
        vacations: {
          include: {
            periods: { orderBy: { periodNumber: 'asc' } },
          },
          orderBy: { acquisitionStart: 'desc' },
        },
      },
      orderBy: { hireDate: 'asc' },
    })

    const today = new Date()

    return {
      success: true,
      employees: employees.map(emp => {
        const hireDate = new Date(emp.hireDate)
        
        // Calcular todos os períodos aquisitivos desde a contratação
        const acquisitivePeriods = this.calculateAcquisitivePeriods(hireDate, today)
        
        // Verificar quais períodos já têm férias programadas
        const periodsWithStatus = acquisitivePeriods.map(period => {
          // Comparar apenas a data (sem hora) para evitar problemas de timezone
          const periodStartStr = period.acquisitionStart.toISOString().split('T')[0]
          const existingVacation = emp.vacations.find(v => {
            const vacStartStr = new Date(v.acquisitionStart).toISOString().split('T')[0]
            return vacStartStr === periodStartStr
          })
          
          // Se tem férias regularizadas ou concluídas, não está mais vencido
          const isEffectivelyExpired = period.isExpired && 
            (!existingVacation || !['COMPLETED', 'REGULARIZED'].includes(existingVacation.status))
          
          return {
            ...period,
            isExpired: isEffectivelyExpired, // Sobrescrever isExpired
            vacation: existingVacation ? {
              ...existingVacation,
              regularizationType: existingVacation.regularizationType,
              regularizationDate: existingVacation.regularizationDate,
              regularizedAt: existingVacation.regularizedAt,
            } : null,
            status: existingVacation?.status || 'PENDING',
            hasVacation: !!existingVacation,
          }
        })

        // Contar férias pendentes/vencidas (excluindo regularizadas e concluídas)
        const pendingVacations = periodsWithStatus.filter(p => 
          !p.hasVacation && p.isAcquired
        ).length
        
        const expiredVacations = periodsWithStatus.filter(p => 
          p.isExpired && (!p.hasVacation || !['COMPLETED', 'REGULARIZED'].includes(p.vacation?.status || ''))
        ).length

        return {
          id: emp.id,
          registrationId: emp.registrationId,
          name: emp.user?.name || 'Sem nome',
          avatarUrl: emp.user?.avatarUrl,
          positionName: emp.position?.name,
          departmentName: emp.department?.name,
          hireDate: emp.hireDate,
          baseSalary: emp.baseSalary,
          acquisitivePeriods: periodsWithStatus,
          pendingVacations,
          expiredVacations,
          totalVacationDaysAvailable: pendingVacations * 30,
        }
      }),
    }
  }

  // Calcular períodos aquisitivos desde a contratação
  private calculateAcquisitivePeriods(hireDate: Date, today: Date) {
    const periods = []
    let currentStart = new Date(hireDate)
    let periodNumber = 1

    while (currentStart < today) {
      const acquisitionEnd = addDays(new Date(currentStart), 365 - 1) // 12 meses
      const concessionStart = addDays(acquisitionEnd, 1)
      const concessionEnd = addDays(concessionStart, 365 - 1) // 12 meses para conceder

      const isAcquired = today > acquisitionEnd // Já adquiriu direito
      const isExpired = today > concessionEnd // Período concessivo venceu

      periods.push({
        periodNumber,
        acquisitionStart: currentStart,
        acquisitionEnd,
        concessionStart,
        concessionEnd,
        isAcquired,
        isExpired,
        daysUntilAcquisition: isAcquired ? 0 : differenceInDays(acquisitionEnd, today),
        daysUntilExpiration: isExpired ? 0 : differenceInDays(concessionEnd, today),
      })

      currentStart = addDays(acquisitionEnd, 1)
      periodNumber++

      // Limitar a 5 períodos para não sobrecarregar
      if (periodNumber > 5) break
    }

    return periods
  }

  // ==========================================
  // BUSCAR FÉRIAS POR ID
  // ==========================================

  async getVacation(id: string) {
    const vacation = await this.prisma.vacation.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            registrationId: true,
            baseSalary: true,
            hireDate: true,
            user: { select: { name: true, avatarUrl: true } },
            position: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
        periods: {
          orderBy: { periodNumber: 'asc' },
        },
        approver: {
          select: { name: true },
        },
      },
    })

    if (!vacation) {
      throw new NotFoundException('Férias não encontradas')
    }

    return { success: true, vacation }
  }

  // ==========================================
  // PROGRAMAR FÉRIAS
  // ==========================================

  async scheduleVacation(companyId: string, data: {
    employeeId: string
    acquisitionStart: string // Data início do período aquisitivo
    soldDays?: number // Dias vendidos (abono pecuniário)
    periods: Array<{
      startDate: string
      days: number
    }>
    notes?: string
  }, userId: string) {
    // Validar funcionário
    const employee = await this.prisma.employee.findFirst({
      where: { id: data.employeeId, companyId },
    })

    if (!employee) {
      throw new NotFoundException('Funcionário não encontrado')
    }

    // Calcular período aquisitivo e concessivo
    const acquisitionStart = new Date(data.acquisitionStart)
    const acquisitionEnd = addDays(acquisitionStart, 365 - 1)
    const concessionStart = addDays(acquisitionEnd, 1)
    const concessionEnd = addDays(concessionStart, 365 - 1)

    // Verificar se já existe férias para este período
    const existingVacation = await this.prisma.vacation.findFirst({
      where: {
        employeeId: data.employeeId,
        acquisitionStart: acquisitionStart,
      },
    })

    if (existingVacation) {
      throw new BadRequestException('Já existe férias programadas para este período aquisitivo')
    }

    // Validar dias vendidos
    const soldDays = data.soldDays || 0
    if (soldDays < 0 || soldDays > 10) {
      throw new BadRequestException('Dias vendidos deve ser entre 0 e 10')
    }

    // Calcular total de dias a gozar
    const totalDaysToUse = 30 - soldDays
    const totalPeriodDays = data.periods.reduce((sum, p) => sum + p.days, 0)

    if (totalPeriodDays !== totalDaysToUse) {
      throw new BadRequestException(
        `Total de dias dos períodos (${totalPeriodDays}) deve ser igual a ${totalDaysToUse} dias`
      )
    }

    // Validar número de períodos
    if (data.periods.length < 1 || data.periods.length > 3) {
      throw new BadRequestException('Férias podem ser divididas em 1, 2 ou 3 períodos')
    }

    // Validar regras CLT para cada período
    await this.validatePeriods(companyId, data.periods)

    // Calcular valores de cada período
    const baseSalary = Number(employee.baseSalary)
    const dailyRate = baseSalary / 30

    // Criar férias e períodos
    const vacation = await this.prisma.vacation.create({
      data: {
        companyId,
        employeeId: data.employeeId,
        acquisitionStart,
        acquisitionEnd,
        concessionStart,
        concessionEnd,
        totalDays: 30,
        soldDays,
        usedDays: 0,
        remainingDays: totalDaysToUse,
        status: 'SCHEDULED',
        approvedBy: userId,
        approvedAt: new Date(),
        notes: data.notes,
        periods: {
          create: data.periods.map((period, index) => {
            const startDate = new Date(period.startDate)
            const endDate = addDays(startDate, period.days - 1)
            const paymentDueDate = subDays(startDate, 2)
            
            const baseValue = period.days * dailyRate
            const bonusValue = baseValue / 3 // 1/3 constitucional
            const totalValue = baseValue + bonusValue

            return {
              periodNumber: index + 1,
              startDate,
              endDate,
              days: period.days,
              paymentDueDate,
              baseValue,
              bonusValue,
              totalValue,
              status: 'SCHEDULED',
            }
          }),
        },
      },
      include: {
        periods: true,
        employee: {
          select: {
            user: { select: { name: true } },
          },
        },
      },
    })

    // Se vendeu dias, calcular abono pecuniário
    let abonoValue = 0
    if (soldDays > 0) {
      const abonoBase = soldDays * dailyRate
      const abonoBonus = abonoBase / 3
      abonoValue = abonoBase + abonoBonus
    }

    // Criar VacationRequest automaticamente para que o funcionário possa assinar
    const firstPeriod = vacation.periods[0]
    await this.prisma.vacationRequest.create({
      data: {
        employeeId: data.employeeId,
        companyId,
        vacationId: vacation.id,
        requestedStartDate: firstPeriod.startDate,
        requestedDays: totalDaysToUse,
        sellDays: soldDays,
        status: 'AWAITING_SIGNATURE', // Aguardando assinatura do funcionário
        counterProposalNotes: data.notes || 'Férias agendadas pelo RH',
        approvedAt: new Date(),
        approvedBy: userId,
      },
    })

    return {
      success: true,
      vacation,
      abonoValue,
      message: `Férias programadas com sucesso para ${vacation.employee.user?.name}`,
    }
  }

  // Validar períodos conforme regras CLT e modo de conformidade
  private async validatePeriods(companyId: string, periods: Array<{ startDate: string, days: number }>) {
    // Buscar configurações da empresa
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    })

    if (!company) {
      throw new NotFoundException('Empresa não encontrada')
    }

    const isFlexible = company.complianceLevel === 'FLEXIBLE'
    const isFull = company.complianceLevel === 'FULL'
    const isCustom = company.complianceLevel === 'CUSTOM'

    // Se modo FLEXIBLE, não valida nada (apenas avisa)
    const warnings: string[] = []

    // Ordenar por data
    const sortedPeriods = [...periods].sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    )

    // Validar máximo 3 períodos
    const shouldValidateMaxPeriods = isFull || (isCustom && company.vacationValidateMaxPeriods)
    if (sortedPeriods.length > 3) {
      const msg = 'Férias podem ser divididas em no máximo 3 períodos'
      if (shouldValidateMaxPeriods) throw new BadRequestException(msg)
      warnings.push(msg)
    }

    // Validar período mínimo de 14 dias
    const shouldValidateMinDays = isFull || (isCustom && company.vacationValidateMinDays)
    if (sortedPeriods.length > 0 && sortedPeriods[0].days < 14) {
      const msg = 'O primeiro período deve ter no mínimo 14 dias corridos'
      if (shouldValidateMinDays) throw new BadRequestException(msg)
      warnings.push(msg)
    }

    // Validar demais períodos (mínimo 5 dias cada)
    for (let i = 1; i < sortedPeriods.length; i++) {
      if (sortedPeriods[i].days < 5) {
        const msg = `O ${i + 1}º período deve ter no mínimo 5 dias corridos`
        if (shouldValidateMinDays) throw new BadRequestException(msg)
        warnings.push(msg)
      }
    }

    // Validar que não inicia 2 dias antes de feriado ou DSR
    const shouldValidateStartDate = isFull || (isCustom && company.vacationValidateStartDate)
    for (const period of sortedPeriods) {
      const startDate = new Date(period.startDate)
      
      // Verificar se é sábado (véspera de domingo/DSR)
      if (startDate.getDay() === 6) { // Sábado
        const msg = `Férias não podem iniciar em sábado (${startDate.toLocaleDateString('pt-BR')}) - véspera de DSR`
        if (shouldValidateStartDate) throw new BadRequestException(msg)
        warnings.push(msg)
      }

      // Verificar se é sexta-feira (2 dias antes de domingo)
      if (startDate.getDay() === 5) { // Sexta
        const msg = `Férias não podem iniciar em sexta-feira (${startDate.toLocaleDateString('pt-BR')}) - 2 dias antes de DSR`
        if (shouldValidateStartDate) throw new BadRequestException(msg)
        warnings.push(msg)
      }

      // Verificar feriados nos próximos 2 dias
      const twoDaysAfter = addDays(startDate, 2)
      const holidays = await this.prisma.holiday.findMany({
        where: {
          companyId,
          active: true,
          date: {
            gt: startDate,
            lte: twoDaysAfter,
          },
        },
      })

      if (holidays.length > 0) {
        const msg = `Férias não podem iniciar em ${startDate.toLocaleDateString('pt-BR')} - há feriado (${holidays[0].name}) nos próximos 2 dias`
        if (shouldValidateStartDate) throw new BadRequestException(msg)
        warnings.push(msg)
      }
    }

    return { warnings }
  }

  // ==========================================
  // ATUALIZAR FÉRIAS
  // ==========================================

  async updateVacation(id: string, data: {
    soldDays?: number
    periods?: Array<{
      id?: string
      startDate: string
      days: number
    }>
    notes?: string
  }, userId: string) {
    const vacation = await this.prisma.vacation.findUnique({
      where: { id },
      include: { employee: true, periods: true },
    })

    if (!vacation) {
      throw new NotFoundException('Férias não encontradas')
    }

    if (vacation.status !== 'SCHEDULED' && vacation.status !== 'PENDING') {
      throw new BadRequestException('Apenas férias pendentes ou agendadas podem ser editadas')
    }

    // Se atualizando períodos
    if (data.periods) {
      const soldDays = data.soldDays ?? vacation.soldDays
      const totalDaysToUse = 30 - soldDays
      const totalPeriodDays = data.periods.reduce((sum, p) => sum + p.days, 0)

      if (totalPeriodDays !== totalDaysToUse) {
        throw new BadRequestException(
          `Total de dias dos períodos (${totalPeriodDays}) deve ser igual a ${totalDaysToUse} dias`
        )
      }

      // Validar regras CLT
      await this.validatePeriods(vacation.companyId, data.periods)

      // Deletar períodos antigos e criar novos
      await this.prisma.vacationPeriod.deleteMany({
        where: { vacationId: id },
      })

      const baseSalary = Number(vacation.employee.baseSalary)
      const dailyRate = baseSalary / 30

      await this.prisma.vacationPeriod.createMany({
        data: data.periods.map((period, index) => {
          const startDate = new Date(period.startDate)
          const endDate = addDays(startDate, period.days - 1)
          const paymentDueDate = subDays(startDate, 2)
          
          const baseValue = period.days * dailyRate
          const bonusValue = baseValue / 3
          const totalValue = baseValue + bonusValue

          return {
            vacationId: id,
            periodNumber: index + 1,
            startDate,
            endDate,
            days: period.days,
            paymentDueDate,
            baseValue,
            bonusValue,
            totalValue,
            status: 'SCHEDULED',
          }
        }),
      })
    }

    // Atualizar férias
    const updated = await this.prisma.vacation.update({
      where: { id },
      data: {
        soldDays: data.soldDays,
        remainingDays: data.soldDays !== undefined ? 30 - data.soldDays : undefined,
        notes: data.notes,
      },
      include: {
        periods: { orderBy: { periodNumber: 'asc' } },
        employee: {
          select: { user: { select: { name: true } } },
        },
      },
    })

    return { success: true, vacation: updated }
  }

  // ==========================================
  // CANCELAR FÉRIAS
  // ==========================================

  async cancelVacation(id: string, userId: string) {
    const vacation = await this.prisma.vacation.findUnique({
      where: { id },
    })

    if (!vacation) {
      throw new NotFoundException('Férias não encontradas')
    }

    if (vacation.status === 'IN_PROGRESS' || vacation.status === 'COMPLETED') {
      throw new BadRequestException('Não é possível cancelar férias em andamento ou concluídas')
    }

    const updated = await this.prisma.vacation.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        periods: {
          updateMany: {
            where: { vacationId: id },
            data: { status: 'CANCELLED' },
          },
        },
      },
    })

    return { success: true, vacation: updated }
  }

  // ==========================================
  // BUSCAR PERÍODOS DE FÉRIAS EM UM MÊS
  // (Para integração com cálculo de holerite)
  // ==========================================

  async getVacationPeriodsInMonth(employeeId: string, month: number, year: number) {
    const startOfMonth = new Date(year, month - 1, 1)
    const endOfMonth = new Date(year, month, 0)

    const periods = await this.prisma.vacationPeriod.findMany({
      where: {
        vacation: {
          employeeId,
          status: { in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] },
        },
        OR: [
          // Período começa no mês
          { startDate: { gte: startOfMonth, lte: endOfMonth } },
          // Período termina no mês
          { endDate: { gte: startOfMonth, lte: endOfMonth } },
          // Período engloba o mês inteiro
          { AND: [{ startDate: { lte: startOfMonth } }, { endDate: { gte: endOfMonth } }] },
        ],
        status: { in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] },
      },
      include: {
        vacation: true,
      },
    })

    // Calcular dias de férias dentro do mês
    let totalVacationDaysInMonth = 0

    for (const period of periods) {
      const periodStart = period.startDate > startOfMonth ? period.startDate : startOfMonth
      const periodEnd = period.endDate < endOfMonth ? period.endDate : endOfMonth
      const daysInMonth = differenceInDays(periodEnd, periodStart) + 1
      totalVacationDaysInMonth += daysInMonth
    }

    return {
      periods,
      totalVacationDaysInMonth,
    }
  }

  // ==========================================
  // CALCULAR ABONO PECUNIÁRIO
  // ==========================================

  calculateAbonoPecuniario(baseSalary: number, soldDays: number) {
    if (soldDays <= 0 || soldDays > 10) {
      return { baseValue: 0, bonusValue: 0, totalValue: 0 }
    }

    const dailyRate = baseSalary / 30
    const baseValue = soldDays * dailyRate
    const bonusValue = baseValue / 3 // 1/3 constitucional
    const totalValue = baseValue + bonusValue

    return { baseValue, bonusValue, totalValue }
  }

  // ==========================================
  // BUSCAR FÉRIAS DO FUNCIONÁRIO (para dashboard)
  // ==========================================

  async getEmployeeVacations(employeeId: string) {
    if (!employeeId) {
      return { acquisitivePeriods: [], vacations: [] }
    }

    // Buscar funcionário com suas férias
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        vacations: {
          include: {
            periods: true,
          },
          orderBy: { acquisitionStart: 'asc' },
        },
      },
    })

    if (!employee) {
      return { acquisitivePeriods: [], vacations: [] }
    }

    // Calcular períodos aquisitivos
    const today = new Date()
    const acquisitivePeriods = this.calculateAcquisitivePeriods(new Date(employee.hireDate), today)

    // Mapear períodos com status de férias
    const periodsWithStatus = acquisitivePeriods.map(period => {
      const periodStartStr = period.acquisitionStart.toISOString().split('T')[0]
      const existingVacation = employee.vacations.find(v => {
        const vacStartStr = new Date(v.acquisitionStart).toISOString().split('T')[0]
        return vacStartStr === periodStartStr
      })

      const isEffectivelyExpired = period.isExpired && 
        (!existingVacation || !['COMPLETED', 'REGULARIZED'].includes(existingVacation.status))

      return {
        ...period,
        isExpired: isEffectivelyExpired,
        vacation: existingVacation ? {
          id: existingVacation.id,
          status: existingVacation.status,
          totalDays: existingVacation.totalDays,
          soldDays: existingVacation.soldDays,
          usedDays: existingVacation.usedDays,
          remainingDays: existingVacation.remainingDays,
          regularizationType: existingVacation.regularizationType,
          regularizationDate: existingVacation.regularizationDate,
          periods: existingVacation.periods.map(p => ({
            periodNumber: p.periodNumber,
            startDate: p.startDate,
            endDate: p.endDate,
            days: p.days,
            status: p.status,
          })),
        } : null,
        status: existingVacation?.status || 'PENDING',
        hasVacation: !!existingVacation,
      }
    })

    return {
      employeeId: employee.id,
      hireDate: employee.hireDate,
      acquisitivePeriods: periodsWithStatus,
    }
  }

  // ==========================================
  // REGULARIZAR FÉRIAS (para migração de sistema)
  // ==========================================

  async regularizeVacation(
    companyId: string,
    userId: string,
    data: {
      employeeId: string
      acquisitionStart: string  // Data início do período aquisitivo
      regularizationType: 'ENJOYED' | 'PAID_DOUBLE'  // Gozadas ou pagas em dobro
      regularizationDate: string  // Data em que foram gozadas/pagas (ou início do gozo)
      startDate?: string  // Data início do período de gozo (para ENJOYED)
      endDate?: string    // Data fim do período de gozo (para ENJOYED)
      // Campos para PAID_DOUBLE (formulário completo)
      soldDays?: number   // Dias vendidos (abono pecuniário)
      periods?: Array<{ startDate: string; days: number }>  // Períodos de gozo
      notes?: string
    }
  ) {
    // Buscar funcionário
    const employee = await this.prisma.employee.findFirst({
      where: { id: data.employeeId, companyId },
      select: { id: true, hireDate: true, baseSalary: true },
    })

    if (!employee) {
      throw new NotFoundException('Funcionário não encontrado')
    }

    // Calcular datas do período aquisitivo
    const acquisitionStart = new Date(data.acquisitionStart)
    const acquisitionEnd = addDays(acquisitionStart, 364) // 12 meses - 1 dia
    const concessionStart = addDays(acquisitionEnd, 1)
    const concessionEnd = addDays(concessionStart, 364)

    // Verificar se já existe férias para esse período
    const existingVacation = await this.prisma.vacation.findFirst({
      where: {
        employeeId: data.employeeId,
        acquisitionStart: acquisitionStart,
      },
    })

    // Preparar dados dos períodos de gozo
    const baseSalary = Number(employee.baseSalary) || 0
    const dailyRate = baseSalary / 30
    let periodsToCreate: any[] = []
    let soldDaysValue = 0

    if (data.regularizationType === 'ENJOYED' && data.startDate) {
      // GOZADAS: um único período de 30 dias
      const startDate = new Date(data.startDate)
      const endDate = addDays(startDate, 29)
      const days = 30
      const baseValue = days * dailyRate
      const bonusValue = baseValue / 3
      const totalValue = baseValue + bonusValue

      periodsToCreate = [{
        periodNumber: 1,
        startDate,
        endDate,
        days,
        paymentDueDate: subDays(startDate, 2),
        baseValue,
        bonusValue,
        totalValue,
        status: 'COMPLETED',
        paidAt: startDate,
      }]
    } else if (data.regularizationType === 'PAID_DOUBLE' && data.periods && data.periods.length > 0) {
      // PAGAS EM DOBRO: múltiplos períodos conforme informado
      soldDaysValue = data.soldDays || 0
      
      periodsToCreate = data.periods.map((p, idx) => {
        const startDate = new Date(p.startDate)
        const endDate = addDays(startDate, p.days - 1)
        const baseValue = p.days * dailyRate
        const bonusValue = baseValue / 3
        const totalValue = baseValue + bonusValue

        return {
          periodNumber: idx + 1,
          startDate,
          endDate,
          days: p.days,
          paymentDueDate: subDays(startDate, 2),
          baseValue,
          bonusValue,
          totalValue,
          status: 'COMPLETED',
          paidAt: startDate,
        }
      })
    }

    const usedDays = 30 - soldDaysValue

    if (existingVacation) {
      // Atualizar férias existente para REGULARIZED
      const updated = await this.prisma.vacation.update({
        where: { id: existingVacation.id },
        data: {
          status: 'REGULARIZED',
          regularizedAt: new Date(),
          regularizedBy: userId,
          regularizationType: data.regularizationType,
          regularizationDate: new Date(data.regularizationDate),
          notes: data.notes || existingVacation.notes,
          soldDays: soldDaysValue,
          usedDays,
          remainingDays: 0,
        },
      })

      // Criar períodos de gozo
      for (const periodData of periodsToCreate) {
        await this.prisma.vacationPeriod.create({
          data: {
            vacationId: updated.id,
            ...periodData,
          },
        })
      }

      return {
        success: true,
        message: 'Férias regularizadas com sucesso',
        vacation: updated,
      }
    }

    // Criar nova férias já regularizada
    const vacation = await this.prisma.vacation.create({
      data: {
        employeeId: data.employeeId,
        companyId,
        acquisitionStart,
        acquisitionEnd,
        concessionStart,
        concessionEnd,
        totalDays: 30,
        soldDays: soldDaysValue,
        usedDays,
        remainingDays: 0,
        status: 'REGULARIZED',
        regularizedAt: new Date(),
        regularizedBy: userId,
        regularizationType: data.regularizationType,
        regularizationDate: new Date(data.regularizationDate),
        notes: data.notes,
      },
    })

    // Criar períodos de gozo
    for (const periodData of periodsToCreate) {
      await this.prisma.vacationPeriod.create({
        data: {
          vacationId: vacation.id,
          ...periodData,
        },
      })
    }

    return {
      success: true,
      message: 'Férias regularizadas com sucesso',
      vacation,
    }
  }
}
