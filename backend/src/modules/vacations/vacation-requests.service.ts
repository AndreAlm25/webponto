import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { createHash } from 'crypto'
import { EventsGateway } from '../../events/events.gateway'

interface VacationPeriodInput {
  startDate: string
  days: number
}

interface CLTViolation {
  code: string
  message: string
  severity: 'error' | 'warning'
}

@Injectable()
export class VacationRequestsService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  // Helper para criar notificações
  private async createNotification(
    companyId: string,
    title: string,
    message: string,
  ) {
    try {
      await this.prisma.notification.create({
        data: {
          companyId,
          type: 'VACATION',
          title,
          message,
        },
      })
    } catch (e) {
      console.error('Erro ao criar notificação:', e)
    }
  }

  // ==========================================
  // VALIDAÇÕES CLT
  // ==========================================

  private async validateCLTRules(
    companyId: string,
    employeeId: string,
    vacationId: string | null,
    startDate: Date,
    days: number,
    periods: VacationPeriodInput[] | null,
    sellDays: number,
  ): Promise<{ violations: CLTViolation[]; canProceed: boolean }> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    })

    if (!company) {
      throw new NotFoundException('Empresa não encontrada')
    }

    const violations: CLTViolation[] = []
    const isFlexible = company.complianceLevel === 'FLEXIBLE'
    const isFull = company.complianceLevel === 'FULL'
    const isCustom = company.complianceLevel === 'CUSTOM'

    // Buscar funcionário
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { vacations: true },
    })

    if (!employee) {
      throw new NotFoundException('Funcionário não encontrado')
    }

    // Buscar feriados da empresa
    const holidays = await this.prisma.holiday.findMany({
      where: { companyId, active: true },
    })

    // 1. Validar período aquisitivo (12 meses)
    const shouldValidateAcquisitive = isFull || (isCustom && company.vacationValidateAcquisitive)
    if (shouldValidateAcquisitive) {
      const hireDate = new Date(employee.hireDate)
      const oneYearAfterHire = new Date(hireDate)
      oneYearAfterHire.setFullYear(oneYearAfterHire.getFullYear() + 1)
      
      if (new Date() < oneYearAfterHire) {
        violations.push({
          code: 'ACQUISITIVE_PERIOD',
          message: `Funcionário ainda não completou 12 meses de trabalho. Data de admissão: ${hireDate.toLocaleDateString('pt-BR')}`,
          severity: isFull ? 'error' : 'warning',
        })
      }
    }

    // 2. Validar período concessivo (não deixar vencer)
    // EXCEÇÃO: Se o período já está vencido, permitir a solicitação para regularização
    const shouldValidateConcessivo = isFull || (isCustom && company.vacationValidateConcessivo)
    if (shouldValidateConcessivo && vacationId) {
      const vacation = await this.prisma.vacation.findUnique({
        where: { id: vacationId },
      })
      
      if (vacation) {
        const concessionEnd = new Date(vacation.concessionEnd)
        const today = new Date()
        const isAlreadyExpired = today > concessionEnd // Período já venceu
        
        // Se o período JÁ VENCEU, não bloquear - funcionário precisa regularizar
        if (!isAlreadyExpired) {
          const requestedEnd = new Date(startDate)
          requestedEnd.setDate(requestedEnd.getDate() + days)
          
          if (requestedEnd > concessionEnd) {
            violations.push({
              code: 'CONCESSION_PERIOD',
              message: `As férias devem terminar antes de ${concessionEnd.toLocaleDateString('pt-BR')} (fim do período concessivo)`,
              severity: isFull ? 'error' : 'warning',
            })
          }
        }
        // Se já venceu, apenas adicionar um aviso (não erro)
        else {
          violations.push({
            code: 'EXPIRED_PERIOD',
            message: `Período concessivo vencido em ${concessionEnd.toLocaleDateString('pt-BR')} - férias devem ser pagas em dobro`,
            severity: 'warning', // Sempre warning, nunca bloqueia
          })
        }
      }
    }

    // 3. Validar máximo 3 períodos
    const shouldValidateMaxPeriods = isFull || (isCustom && company.vacationValidateMaxPeriods)
    if (shouldValidateMaxPeriods && periods && periods.length > 3) {
      violations.push({
        code: 'MAX_PERIODS',
        message: 'Férias podem ser divididas em no máximo 3 períodos',
        severity: isFull ? 'error' : 'warning',
      })
    }

    // 4. Validar período mínimo de 14 dias
    const shouldValidateMinDays = isFull || (isCustom && company.vacationValidateMinDays)
    if (shouldValidateMinDays && periods && periods.length > 1) {
      const hasMinPeriod = periods.some(p => p.days >= 14)
      if (!hasMinPeriod) {
        violations.push({
          code: 'MIN_PERIOD_DAYS',
          message: 'Pelo menos um período deve ter no mínimo 14 dias corridos',
          severity: isFull ? 'error' : 'warning',
        })
      }
      
      // Validar que nenhum período tem menos de 5 dias
      const hasShortPeriod = periods.some(p => p.days < 5)
      if (hasShortPeriod) {
        violations.push({
          code: 'SHORT_PERIOD',
          message: 'Nenhum período pode ter menos de 5 dias corridos',
          severity: isFull ? 'error' : 'warning',
        })
      }
    }

    // 5. Validar máximo 10 dias vendidos (abono pecuniário)
    const shouldValidateMaxSellDays = isFull || (isCustom && company.vacationValidateMaxSellDays)
    if (shouldValidateMaxSellDays && sellDays > 10) {
      violations.push({
        code: 'MAX_SELL_DAYS',
        message: 'O abono pecuniário (venda de dias) não pode exceder 10 dias',
        severity: isFull ? 'error' : 'warning',
      })
    }

    // 6. Validar início antes de feriado/fim de semana
    const shouldValidateStartDate = isFull || (isCustom && company.vacationValidateStartDate)
    if (shouldValidateStartDate) {
      const checkDates = periods ? periods.map(p => new Date(p.startDate)) : [startDate]
      
      for (const checkDate of checkDates) {
        const dayOfWeek = checkDate.getDay()
        
        // Não pode começar quinta ou sexta (2 dias antes do fim de semana)
        if (dayOfWeek === 4 || dayOfWeek === 5) {
          violations.push({
            code: 'START_BEFORE_WEEKEND',
            message: `Férias não podem iniciar em ${dayOfWeek === 4 ? 'quinta' : 'sexta'}-feira (2 dias antes do fim de semana)`,
            severity: isFull ? 'error' : 'warning',
          })
        }
        
        // Verificar se há feriado nos próximos 2 dias
        for (let i = 1; i <= 2; i++) {
          const nextDay = new Date(checkDate)
          nextDay.setDate(nextDay.getDate() + i)
          
          const isHoliday = holidays.some(h => {
            const holidayDate = new Date(h.date)
            return holidayDate.toDateString() === nextDay.toDateString()
          })
          
          if (isHoliday) {
            violations.push({
              code: 'START_BEFORE_HOLIDAY',
              message: `Férias não podem iniciar ${i} dia(s) antes de um feriado`,
              severity: isFull ? 'error' : 'warning',
            })
            break
          }
        }
      }
    }

    // 7. Validar total de dias
    const totalRequestedDays = days + sellDays
    if (totalRequestedDays > 30) {
      violations.push({
        code: 'TOTAL_DAYS_EXCEEDED',
        message: 'O total de dias (gozo + venda) não pode exceder 30 dias',
        severity: 'error',
      })
    }

    // 8. Validar sobreposição de datas com férias já programadas/em andamento
    const requestedStartDate = startDate
    const requestedEndDate = new Date(startDate)
    requestedEndDate.setDate(requestedEndDate.getDate() + days - 1)
    
    // Buscar todas as solicitações ativas do funcionário (exceto a atual se for edição)
    const existingRequests = await this.prisma.vacationRequest.findMany({
      where: {
        employeeId,
        status: { in: ['PENDING', 'APPROVED', 'AWAITING_SIGNATURE', 'EMPLOYEE_SIGNED', 'COUNTER_PROPOSAL'] },
      },
      include: {
        vacation: {
          include: {
            periods: true,
          },
        },
      },
    })
    
    // Também buscar férias agendadas diretamente (sem solicitação)
    const scheduledVacations = await this.prisma.vacation.findMany({
      where: {
        employeeId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
      include: {
        periods: true,
      },
    })
    
    // Verificar sobreposição com solicitações existentes
    for (const req of existingRequests) {
      // Pular se for o mesmo período aquisitivo (já está sendo tratado)
      if (vacationId && req.vacationId === vacationId) continue
      
      const reqStartDate = new Date(req.requestedStartDate)
      const reqEndDate = new Date(reqStartDate)
      reqEndDate.setDate(reqEndDate.getDate() + req.requestedDays - 1)
      
      // Verificar sobreposição: (A.start <= B.end) && (A.end >= B.start)
      const hasOverlap = requestedStartDate <= reqEndDate && requestedEndDate >= reqStartDate
      
      if (hasOverlap) {
        violations.push({
          code: 'DATE_OVERLAP',
          message: `Conflito de datas: você já tem férias de ${reqStartDate.toLocaleDateString('pt-BR')} a ${reqEndDate.toLocaleDateString('pt-BR')}. Escolha datas que não conflitem.`,
          severity: 'error',
        })
        break // Só precisa mostrar um conflito
      }
    }
    
    // Verificar sobreposição com férias agendadas
    for (const vacation of scheduledVacations) {
      // Pular se for o mesmo período aquisitivo
      if (vacationId && vacation.id === vacationId) continue
      
      for (const period of vacation.periods) {
        const periodStartDate = new Date(period.startDate)
        const periodEndDate = new Date(period.endDate)
        
        const hasOverlap = requestedStartDate <= periodEndDate && requestedEndDate >= periodStartDate
        
        if (hasOverlap) {
          violations.push({
            code: 'DATE_OVERLAP',
            message: `Conflito de datas: você já tem férias agendadas de ${periodStartDate.toLocaleDateString('pt-BR')} a ${periodEndDate.toLocaleDateString('pt-BR')}. Escolha datas que não conflitem.`,
            severity: 'error',
          })
          break
        }
      }
    }

    // Determinar se pode prosseguir
    const hasErrors = violations.some(v => v.severity === 'error')
    const canProceed = isFlexible || !hasErrors

    return { violations, canProceed }
  }

  // ==========================================
  // ENDPOINTS DO FUNCIONÁRIO
  // ==========================================

  async canEmployeeRequestVacation(employeeId: string) {
    if (!employeeId) {
      return { canRequest: false, reason: 'Usuário não é funcionário', availablePeriods: [] }
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        vacations: {
          where: {
            status: { in: ['PENDING', 'SCHEDULED'] },
            remainingDays: { gt: 0 },
          },
          orderBy: { acquisitionStart: 'asc' },
        },
        company: true,
      },
    })

    if (!employee) {
      return { canRequest: false, reason: 'Funcionário não encontrado', availablePeriods: [] }
    }

    // Verificar se tem período aquisitivo completo
    const hireDate = new Date(employee.hireDate)
    const today = new Date()
    const monthsWorked = (today.getFullYear() - hireDate.getFullYear()) * 12 + 
                         (today.getMonth() - hireDate.getMonth())

    if (monthsWorked < 12 && employee.company.complianceLevel === 'FULL') {
      return { 
        canRequest: false, 
        reason: 'Você ainda não completou 12 meses de trabalho',
        hireDate: employee.hireDate,
        monthsWorked,
        availablePeriods: [],
      }
    }

    // Buscar solicitações em andamento para excluir períodos já solicitados
    const pendingRequests = await this.prisma.vacationRequest.findMany({
      where: {
        employeeId,
        status: { in: ['PENDING', 'COUNTER_PROPOSAL', 'AWAITING_SIGNATURE', 'EMPLOYEE_SIGNED'] },
      },
      select: { vacationId: true },
    })
    
    const pendingVacationIds = pendingRequests
      .filter(r => r.vacationId)
      .map(r => r.vacationId)

    // Buscar períodos disponíveis (excluindo os que já têm solicitação em andamento)
    const availablePeriods = employee.vacations
      .filter(v => !pendingVacationIds.includes(v.id)) // Excluir períodos com solicitação pendente
      .map(v => ({
        id: v.id,
        acquisitionStart: v.acquisitionStart,
        acquisitionEnd: v.acquisitionEnd,
        concessionEnd: v.concessionEnd,
        totalDays: v.totalDays,
        usedDays: v.usedDays,
        soldDays: v.soldDays,
        remainingDays: v.remainingDays,
      }))

    return {
      canRequest: availablePeriods.length > 0 || employee.company.complianceLevel !== 'FULL',
      reason: availablePeriods.length === 0 ? 'Nenhum período de férias disponível' : null,
      availablePeriods,
      complianceLevel: employee.company.complianceLevel,
    }
  }

  async getEmployeeRequests(employeeId: string) {
    if (!employeeId) {
      return []
    }

    return this.prisma.vacationRequest.findMany({
      where: { employeeId },
      include: {
        vacation: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createRequest(
    employeeId: string,
    companyId: string,
    data: {
      vacationId?: string
      acquisitionStart?: string
      requestedStartDate: string
      requestedDays: number
      requestedPeriods?: VacationPeriodInput[]
      sellDays?: number
      employeeNotes?: string
    },
  ) {
    if (!employeeId) {
      throw new BadRequestException('Usuário não é funcionário')
    }

    // Verificar se pode solicitar
    const canRequest = await this.canEmployeeRequestVacation(employeeId)
    if (!canRequest.canRequest) {
      throw new BadRequestException(canRequest.reason)
    }

    // Pegar o período aquisitivo correto
    let vacationId = data.vacationId
    
    console.log('[FÉRIAS CREATE] ========== INÍCIO ==========')
    console.log('[FÉRIAS CREATE] data.vacationId:', data.vacationId)
    console.log('[FÉRIAS CREATE] data.acquisitionStart:', data.acquisitionStart)
    
    // Se não tem vacationId mas tem acquisitionStart, buscar/criar o vacation correto
    if (!vacationId && data.acquisitionStart) {
      const acquisitionStartDate = new Date(data.acquisitionStart)
      console.log('[FÉRIAS CREATE] acquisitionStartDate parsed:', acquisitionStartDate.toISOString())
      
      // Buscar vacation existente para este período aquisitivo (qualquer status)
      const existingVacation = await this.prisma.vacation.findFirst({
        where: {
          employeeId,
          acquisitionStart: acquisitionStartDate,
        },
      })
      
      console.log('[FÉRIAS CREATE] existingVacation encontrado:', existingVacation?.id || 'NENHUM')
      
      if (existingVacation) {
        vacationId = existingVacation.id
        console.log('[FÉRIAS CREATE] Usando existingVacation.id:', vacationId)
      } else {
        // Não existe vacation para este período - CRIAR um novo
        console.log('[FÉRIAS CREATE] Criando novo Vacation para o período...')
        
        // Calcular datas do período aquisitivo
        const acquisitionEnd = new Date(acquisitionStartDate)
        acquisitionEnd.setFullYear(acquisitionEnd.getFullYear() + 1)
        acquisitionEnd.setDate(acquisitionEnd.getDate() - 1) // 12 meses - 1 dia
        
        const concessionStart = new Date(acquisitionEnd)
        concessionStart.setDate(concessionStart.getDate() + 1)
        
        const concessionEnd = new Date(concessionStart)
        concessionEnd.setFullYear(concessionEnd.getFullYear() + 1)
        concessionEnd.setDate(concessionEnd.getDate() - 1)
        
        const newVacation = await this.prisma.vacation.create({
          data: {
            employeeId,
            companyId,
            acquisitionStart: acquisitionStartDate,
            acquisitionEnd,
            concessionStart,
            concessionEnd,
            totalDays: 30,
            usedDays: 0,
            soldDays: 0,
            remainingDays: 30,
            status: 'PENDING',
          },
        })
        
        vacationId = newVacation.id
        console.log('[FÉRIAS CREATE] Novo Vacation criado:', vacationId)
      }
    }
    
    // Fallback: pegar o período aquisitivo mais antigo se ainda não especificado
    if (!vacationId && canRequest.availablePeriods.length > 0) {
      vacationId = canRequest.availablePeriods[0].id
      console.log('[FÉRIAS CREATE] FALLBACK - usando primeiro período:', vacationId)
    }
    
    console.log('[FÉRIAS CREATE] vacationId FINAL:', vacationId)
    console.log('[FÉRIAS CREATE] ========== FIM ==========')
    
    // Verificar se já existe solicitação em andamento para este período específico
    if (vacationId) {
      const existingRequest = await this.prisma.vacationRequest.findFirst({
        where: {
          employeeId,
          vacationId,
          status: { in: ['PENDING', 'COUNTER_PROPOSAL', 'AWAITING_SIGNATURE', 'EMPLOYEE_SIGNED'] },
        },
      })
      
      if (existingRequest) {
        throw new BadRequestException('Já existe uma solicitação em andamento para este período de férias')
      }
    }

    const startDate = new Date(data.requestedStartDate)
    const sellDays = data.sellDays || 0

    // Validar regras CLT
    const validation = await this.validateCLTRules(
      companyId,
      employeeId,
      vacationId || null,
      startDate,
      data.requestedDays,
      data.requestedPeriods || null,
      sellDays,
    )

    if (!validation.canProceed) {
      throw new BadRequestException({
        message: 'Solicitação viola regras da CLT',
        violations: validation.violations,
      })
    }

    // Criar solicitação
    const request = await this.prisma.vacationRequest.create({
      data: {
        employeeId,
        companyId,
        vacationId,
        requestedStartDate: startDate,
        requestedDays: data.requestedDays,
        requestedPeriods: data.requestedPeriods ? JSON.parse(JSON.stringify(data.requestedPeriods)) : undefined,
        sellDays,
        employeeNotes: data.employeeNotes,
        status: 'PENDING',
        cltViolations: validation.violations.length > 0 ? JSON.parse(JSON.stringify(validation.violations)) : undefined,
        cltWarningsIgnored: validation.violations.some(v => v.severity === 'warning'),
      },
      include: {
        employee: {
          select: { id: true, registrationId: true, user: { select: { name: true } } },
        },
        vacation: true,
      },
    })

    // Notificar admin sobre nova solicitação
    const employeeName = request.employee.user?.name || 'Funcionário'
    await this.createNotification(
      companyId,
      'Nova Solicitação de Férias',
      `${employeeName} solicitou férias para ${new Date(data.requestedStartDate).toLocaleDateString('pt-BR')} (${data.requestedDays} dias)`,
    )

    // Emitir evento WebSocket para atualizar painel do admin em tempo real
    this.eventsGateway.emitVacationRequestCreated(companyId, request)

    return request
  }

  async respondToCounterProposal(
    requestId: string,
    employeeId: string,
    data: { accepted: boolean; notes?: string },
  ) {
    const request = await this.prisma.vacationRequest.findFirst({
      where: { id: requestId, employeeId },
    })

    if (!request) {
      throw new NotFoundException('Solicitação não encontrada')
    }

    if (request.status !== 'COUNTER_PROPOSAL') {
      throw new BadRequestException('Esta solicitação não está aguardando resposta')
    }

    if (data.accepted) {
      // Aceitar contraproposta - mover para aguardando assinatura
      return this.prisma.vacationRequest.update({
        where: { id: requestId },
        data: {
          status: 'AWAITING_SIGNATURE',
          counterAccepted: true,
          counterResponseAt: new Date(),
          counterResponseNotes: data.notes,
          // Atualizar dados com a contraproposta aceita
          requestedStartDate: (request.counterProposal as any)?.startDate 
            ? new Date((request.counterProposal as any).startDate) 
            : request.requestedStartDate,
          requestedDays: (request.counterProposal as any)?.days || request.requestedDays,
          requestedPeriods: (request.counterProposal as any)?.periods || request.requestedPeriods,
          sellDays: (request.counterProposal as any)?.sellDays ?? request.sellDays,
        },
      })
    } else {
      // Recusar contraproposta - volta para pendente para nova solicitação
      return this.prisma.vacationRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          counterAccepted: false,
          counterResponseAt: new Date(),
          counterResponseNotes: data.notes,
          rejectedAt: new Date(),
          rejectionReason: 'Contraproposta recusada pelo funcionário',
        },
      })
    }
  }

  async employeeSign(requestId: string, employeeId: string, ip: string, userAgent: string) {
    const request = await this.prisma.vacationRequest.findFirst({
      where: { id: requestId, employeeId },
      include: { employee: true, company: true },
    })

    if (!request) {
      throw new NotFoundException('Solicitação não encontrada')
    }

    if (request.status !== 'AWAITING_SIGNATURE' && request.status !== 'APPROVED') {
      throw new BadRequestException('Esta solicitação não está pronta para assinatura')
    }

    // Gerar hash da assinatura
    const signatureData = `${requestId}|${employeeId}|${new Date().toISOString()}|${ip}`
    const signatureHash = createHash('sha256').update(signatureData).digest('hex')

    // Verificar se admin já assinou
    const newStatus = request.adminSignedAt ? 'COMPLETED' : 'EMPLOYEE_SIGNED'

    const updated = await this.prisma.vacationRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        employeeSignedAt: new Date(),
        employeeSignedIp: ip,
        employeeSignedDevice: userAgent,
        employeeSignatureHash: signatureHash,
      },
    })

    // Emitir evento WebSocket para atualizar o painel admin
    this.eventsGateway.emitVacationRequestUpdated(request.companyId, updated)

    return updated
  }

  async markAsViewed(requestId: string, employeeId: string) {
    const request = await this.prisma.vacationRequest.findFirst({
      where: { id: requestId, employeeId },
    })

    if (!request) {
      throw new NotFoundException('Solicitação não encontrada')
    }

    return this.prisma.vacationRequest.update({
      where: { id: requestId },
      data: {
        employeeViewedAt: new Date(),
      },
    })
  }

  async markAsScrolled(requestId: string, employeeId: string) {
    const request = await this.prisma.vacationRequest.findFirst({
      where: { id: requestId, employeeId },
    })

    if (!request) {
      throw new NotFoundException('Solicitação não encontrada')
    }

    // Só atualiza se ainda não foi marcado como scrolled
    if (request.employeeScrolled) {
      return request
    }

    return this.prisma.vacationRequest.update({
      where: { id: requestId },
      data: {
        employeeScrolled: true,
        employeeScrolledAt: new Date(),
      },
    })
  }

  async cancelRequest(requestId: string, employeeId: string) {
    const request = await this.prisma.vacationRequest.findFirst({
      where: { id: requestId, employeeId },
    })

    if (!request) {
      throw new NotFoundException('Solicitação não encontrada')
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Apenas solicitações pendentes podem ser canceladas')
    }

    return this.prisma.vacationRequest.update({
      where: { id: requestId },
      data: {
        status: 'CANCELLED',
      },
    })
  }

  // ==========================================
  // ENDPOINTS DO ADMIN
  // ==========================================

  async listRequests(companyId: string, filters: { status?: string; employeeId?: string }) {
    const where: any = { companyId }

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.employeeId) {
      where.employeeId = filters.employeeId
    }

    return this.prisma.vacationRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            registrationId: true,
            user: { select: { name: true } },
            position: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
        vacation: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getRequest(requestId: string, companyId: string) {
    const request = await this.prisma.vacationRequest.findFirst({
      where: { id: requestId, companyId },
      include: {
        employee: {
          select: {
            id: true,
            registrationId: true,
            hireDate: true,
            baseSalary: true,
            user: { select: { name: true, email: true } },
            position: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
        vacation: {
          include: { periods: true },
        },
        company: {
          select: {
            tradeName: true,
            cnpj: true,
            complianceLevel: true,
          },
        },
      },
    })

    if (!request) {
      throw new NotFoundException('Solicitação não encontrada')
    }

    return request
  }

  async approveRequest(requestId: string, userId: string, companyId: string) {
    const request = await this.prisma.vacationRequest.findFirst({
      where: { id: requestId, companyId },
      include: { employee: { include: { user: true } } },
    })

    if (!request) {
      throw new NotFoundException('Solicitação não encontrada')
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Apenas solicitações pendentes podem ser aprovadas')
    }

    const updated = await this.prisma.vacationRequest.update({
      where: { id: requestId },
      data: {
        status: 'AWAITING_SIGNATURE',
        approvedAt: new Date(),
        approvedBy: userId,
      },
    })

    // Notificar funcionário
    await this.createNotification(
      companyId,
      'Férias Aprovadas',
      `Sua solicitação de férias foi aprovada! Acesse o sistema para assinar o aviso.`,
    )

    // Emitir evento WebSocket para atualizar painel do funcionário em tempo real
    this.eventsGateway.emitVacationRequestUpdated(companyId, updated)

    return updated
  }

  // Aprovação final do admin (após funcionário assinar)
  async finalApprove(requestId: string, userId: string, companyId: string, ip: string, userAgent: string) {
    const request = await this.prisma.vacationRequest.findFirst({
      where: { id: requestId, companyId },
      include: { employee: { include: { user: true } }, vacation: true },
    })

    if (!request) {
      throw new NotFoundException('Solicitação não encontrada')
    }

    if (request.status !== 'EMPLOYEE_SIGNED') {
      throw new BadRequestException('Esta solicitação não está aguardando aprovação final')
    }

    // Gerar hash do documento
    const documentContent = JSON.stringify({
      requestId: request.id,
      employeeId: request.employeeId,
      requestedStartDate: request.requestedStartDate,
      requestedDays: request.requestedDays,
      sellDays: request.sellDays,
      employeeSignedAt: request.employeeSignedAt,
      adminSignedAt: new Date().toISOString(),
    })
    const documentHash = require('crypto').createHash('sha256').update(documentContent).digest('hex')

    // Atualizar solicitação para COMPLETED
    const updated = await this.prisma.vacationRequest.update({
      where: { id: requestId },
      data: {
        status: 'COMPLETED',
        adminSignedAt: new Date(),
        adminSignedBy: userId,
        adminSignedIp: ip,
        adminSignedDevice: userAgent,
        adminSignatureHash: documentHash,
        documentHash,
      },
    })

    // Se tem vacation vinculada, atualizar status para COMPLETED também
    if (request.vacationId) {
      await this.prisma.vacation.update({
        where: { id: request.vacationId },
        data: { status: 'COMPLETED' },
      })
    }

    // Notificar funcionário
    await this.createNotification(
      companyId,
      'Férias Confirmadas',
      `Suas férias foram confirmadas pelo RH! Período: ${new Date(request.requestedStartDate).toLocaleDateString('pt-BR')} - ${request.requestedDays} dias.`,
    )

    // Emitir evento WebSocket
    this.eventsGateway.emitVacationRequestUpdated(companyId, updated)

    return updated
  }

  async rejectRequest(requestId: string, userId: string, companyId: string, reason: string) {
    const request = await this.prisma.vacationRequest.findFirst({
      where: { id: requestId, companyId },
      include: { employee: { include: { user: true } } },
    })

    if (!request) {
      throw new NotFoundException('Solicitação não encontrada')
    }

    if (request.status !== 'PENDING' && request.status !== 'COUNTER_PROPOSAL') {
      throw new BadRequestException('Esta solicitação não pode ser rejeitada')
    }

    const updated = await this.prisma.vacationRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectedBy: userId,
        rejectionReason: reason,
      },
    })

    // Notificar funcionário
    await this.createNotification(
      companyId,
      'Férias Rejeitadas',
      `Sua solicitação de férias foi rejeitada. Motivo: ${reason}`,
    )

    // Emitir evento WebSocket para atualizar painel do funcionário em tempo real
    this.eventsGateway.emitVacationRequestUpdated(companyId, updated)

    return updated
  }

  async makeCounterProposal(
    requestId: string,
    userId: string,
    companyId: string,
    data: {
      startDate: string
      days: number
      periods?: VacationPeriodInput[]
      sellDays?: number
      notes?: string
    },
  ) {
    const request = await this.prisma.vacationRequest.findFirst({
      where: { id: requestId, companyId },
    })

    if (!request) {
      throw new NotFoundException('Solicitação não encontrada')
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Apenas solicitações pendentes podem receber contraproposta')
    }

    // Validar a contraproposta também
    const validation = await this.validateCLTRules(
      companyId,
      request.employeeId,
      request.vacationId,
      new Date(data.startDate),
      data.days,
      data.periods || null,
      data.sellDays || 0,
    )

    if (!validation.canProceed) {
      throw new BadRequestException({
        message: 'Contraproposta viola regras da CLT',
        violations: validation.violations,
      })
    }

    const updated = await this.prisma.vacationRequest.update({
      where: { id: requestId },
      data: {
        status: 'COUNTER_PROPOSAL',
        counterProposal: JSON.parse(JSON.stringify({
          startDate: data.startDate,
          days: data.days,
          periods: data.periods,
          sellDays: data.sellDays,
        })),
        counterProposalAt: new Date(),
        counterProposalBy: userId,
        counterProposalNotes: data.notes,
      },
    })

    // Notificar funcionário sobre contraproposta
    await this.createNotification(
      companyId,
      'Contraproposta de Férias',
      `O RH enviou uma contraproposta para suas férias. Acesse o sistema para analisar.`,
    )

    return updated
  }

  async adminSign(requestId: string, userId: string, companyId: string, ip: string, userAgent: string) {
    const request = await this.prisma.vacationRequest.findFirst({
      where: { id: requestId, companyId },
    })

    if (!request) {
      throw new NotFoundException('Solicitação não encontrada')
    }

    if (request.status !== 'EMPLOYEE_SIGNED' && request.status !== 'AWAITING_SIGNATURE') {
      throw new BadRequestException('Esta solicitação não está pronta para assinatura do admin')
    }

    // Gerar hash da assinatura
    const signatureData = `${requestId}|${userId}|${new Date().toISOString()}|${ip}`
    const signatureHash = createHash('sha256').update(signatureData).digest('hex')

    // Gerar hash do documento completo
    const documentData = JSON.stringify({
      requestId,
      employeeId: request.employeeId,
      startDate: request.requestedStartDate,
      days: request.requestedDays,
      periods: request.requestedPeriods,
      sellDays: request.sellDays,
      employeeSignedAt: request.employeeSignedAt,
      adminSignedAt: new Date(),
    })
    const documentHash = createHash('sha256').update(documentData).digest('hex')

    // Verificar se funcionário já assinou
    const newStatus = request.employeeSignedAt ? 'COMPLETED' : 'AWAITING_SIGNATURE'

    const updatedRequest = await this.prisma.vacationRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        adminSignedAt: new Date(),
        adminSignedBy: userId,
        adminSignedIp: ip,
        adminSignedDevice: userAgent,
        adminSignatureHash: signatureHash,
        documentHash: newStatus === 'COMPLETED' ? documentHash : null,
      },
    })

    // Se completou, criar os períodos de férias no Vacation
    if (newStatus === 'COMPLETED' && request.vacationId) {
      await this.createVacationPeriods(request)
    }

    return updatedRequest
  }

  private async createVacationPeriods(request: any) {
    const periods = request.requestedPeriods as VacationPeriodInput[] | null
    
    if (periods && periods.length > 0) {
      // Criar múltiplos períodos
      for (let i = 0; i < periods.length; i++) {
        const period = periods[i]
        const startDate = new Date(period.startDate)
        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + period.days - 1)
        
        await this.prisma.vacationPeriod.create({
          data: {
            vacationId: request.vacationId,
            periodNumber: i + 1,
            startDate,
            endDate,
            days: period.days,
            status: 'SCHEDULED',
          },
        })
      }
    } else {
      // Criar período único
      const startDate = new Date(request.requestedStartDate)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + request.requestedDays - 1)
      
      await this.prisma.vacationPeriod.create({
        data: {
          vacationId: request.vacationId,
          periodNumber: 1,
          startDate,
          endDate,
          days: request.requestedDays,
          status: 'SCHEDULED',
        },
      })
    }

    // Atualizar vacation com dias usados
    const totalDays = request.requestedDays + (request.sellDays || 0)
    await this.prisma.vacation.update({
      where: { id: request.vacationId },
      data: {
        status: 'SCHEDULED',
        usedDays: { increment: request.requestedDays },
        soldDays: { increment: request.sellDays || 0 },
        remainingDays: { decrement: totalDays },
        approvedBy: request.approvedBy,
        approvedAt: request.approvedAt,
      },
    })
  }

  async countPendingRequests(companyId: string) {
    const count = await this.prisma.vacationRequest.count({
      where: {
        companyId,
        status: { in: ['PENDING', 'EMPLOYEE_SIGNED'] },
      },
    })

    return { count }
  }
}
