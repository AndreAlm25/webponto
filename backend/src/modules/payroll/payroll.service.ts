import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { Decimal } from '@prisma/client/runtime/library'
import { PayrollStatus } from '@prisma/client'
import { EventsGateway } from '../../events/events.gateway'

// Tabela INSS 2025 (atualizada)
const INSS_TABLE = [
  { min: 0, max: 1518.00, rate: 0.075 },
  { min: 1518.01, max: 2793.88, rate: 0.09 },
  { min: 2793.89, max: 4190.83, rate: 0.12 },
  { min: 4190.84, max: 8157.41, rate: 0.14 },
]
const INSS_CEILING = 8157.41

// Tabela IR 2025 (atualizada)
const IR_TABLE = [
  { min: 0, max: 2259.20, rate: 0, deduction: 0 },
  { min: 2259.21, max: 2826.65, rate: 0.075, deduction: 169.44 },
  { min: 2826.66, max: 3751.05, rate: 0.15, deduction: 381.44 },
  { min: 3751.06, max: 4664.68, rate: 0.225, deduction: 662.77 },
  { min: 4664.69, max: Infinity, rate: 0.275, deduction: 896.00 },
]
const IR_DEPENDENT_DEDUCTION = 189.59

// Interface para configurações de folha
interface PayrollConfigData {
  // Encargos
  enableInss: boolean
  enableIrrf: boolean
  enableFgts: boolean
  // Adicional noturno
  enableNightShift: boolean
  nightShiftStart: string
  nightShiftEnd: string
  nightShiftPercentage: number
  // Vale avulso
  enableExtraAdvance: boolean
  maxExtraAdvancePercentage?: number | null
  // Benefícios padrão da empresa
  enableTransportVoucher: boolean
  transportVoucherRate: number
  enableMealVoucher: boolean
  mealVoucherValue: number
  mealVoucherDiscount: number
  enableHealthInsurance: boolean
  healthInsuranceValue: number
  enableDentalInsurance: boolean
  dentalInsuranceValue: number
  // 13º e Férias
  enable13thSalary: boolean
  enableVacationBonus: boolean
  // Modo de pagamento flexível
  paymentMode: 'FULL' | 'ADVANCE' | 'INSTALLMENTS'
  fullPaymentDay: number
  advancePercent: number
  advancePaymentDay: number
  balancePaymentDay: number
  installmentCount: number
  installment1Percent: number
  installment1Day: number
  installment2Percent: number
  installment2Day: number
  installment3Percent: number
  installment3Day?: number | null
  installment4Percent: number
  installment4Day?: number | null
}

// Mapeamento de escala para dias por mês
const WORK_SCHEDULE_DAYS: Record<string, number> = {
  FIVE_TWO: 22,          // 5x2 - Segunda a Sexta
  SIX_ONE: 26,           // 6x1 - Segunda a Sábado
  TWELVE_THIRTYSIX: 15,  // 12x36 - ~15 dias/mês
  FOUR_TWO: 20,          // 4x2 - ~20 dias/mês
  CUSTOM: 22,            // Personalizado (usa customWorkDaysPerMonth)
}

// Calcular horas por dia baseado no horário do funcionário
function calculateHoursPerDay(
  workStartTime: string,
  workEndTime: string,
  breakStartTime?: string | null,
  breakEndTime?: string | null
): number {
  const [startH, startM] = workStartTime.split(':').map(Number)
  const [endH, endM] = workEndTime.split(':').map(Number)
  
  let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM)
  
  // Se horário de saída é menor que entrada, passou da meia-noite
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60
  }
  
  // Descontar intervalo se existir
  if (breakStartTime && breakEndTime) {
    const [breakStartH, breakStartM] = breakStartTime.split(':').map(Number)
    const [breakEndH, breakEndM] = breakEndTime.split(':').map(Number)
    const breakMinutes = (breakEndH * 60 + breakEndM) - (breakStartH * 60 + breakStartM)
    if (breakMinutes > 0) {
      totalMinutes -= breakMinutes
    }
  }
  
  return totalMinutes / 60
}

// Calcular dias por mês baseado na escala do funcionário
function calculateDaysPerMonth(
  workSchedule: string,
  customWorkDaysPerMonth?: number | null
): number {
  if (workSchedule === 'CUSTOM' && customWorkDaysPerMonth) {
    return customWorkDaysPerMonth
  }
  return WORK_SCHEDULE_DAYS[workSchedule] || 22
}

// Serviço de Folha de Pagamento
@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // ==========================================
  // CONFIGURAÇÕES DE FOLHA
  // ==========================================

  // Buscar ou criar configurações de folha da empresa
  async getOrCreateConfig(companyId: string) {
    let config = await this.prisma.payrollConfig.findUnique({
      where: { companyId },
    })

    if (!config) {
      // Criar configuração padrão
      config = await this.prisma.payrollConfig.create({
        data: {
          companyId,
          // Encargos
          enableInss: true,
          enableIrrf: true,
          enableFgts: true,
          // Adicional noturno - DESABILITADO por padrão
          enableNightShift: false,
          nightShiftStart: '22:00',
          nightShiftEnd: '05:00',
          nightShiftPercentage: 20,
          // Vale avulso
          enableExtraAdvance: false,
          maxExtraAdvancePercentage: null,
          // Benefícios padrão
          enableTransportVoucher: true,
          transportVoucherRate: 6,
          enableMealVoucher: false,
          mealVoucherValue: 0,
          mealVoucherDiscount: 0,
          enableHealthInsurance: false,
          healthInsuranceValue: 0,
          enableDentalInsurance: false,
          dentalInsuranceValue: 0,
          // 13º e Férias
          enable13thSalary: true,
          enableVacationBonus: true,
          // Modo de pagamento - PADRÃO: Mensal, dia 5
          paymentMode: 'FULL',
          fullPaymentDay: 5,
          advancePercent: 40,
          advancePaymentDay: 15,
          balancePaymentDay: 5,
          installmentCount: 2,
          installment1Percent: 50,
          installment1Day: 15,
          installment2Percent: 50,
          installment2Day: 30,
          installment3Percent: 0,
          installment3Day: null,
          installment4Percent: 0,
          installment4Day: null,
        },
      })
    }

    return {
      success: true,
      config: this.formatConfig(config),
    }
  }

  // Atualizar configurações de folha
  async updateConfig(companyId: string, data: Partial<PayrollConfigData>) {
    // Garantir que existe configuração
    await this.getOrCreateConfig(companyId)

    // Verificar nível de conformidade da empresa
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { complianceLevel: true },
    })

    // Se complianceLevel=FULL, forçar encargos obrigatórios como true
    if (company?.complianceLevel === 'FULL') {
      data.enableInss = true
      data.enableIrrf = true
      data.enableFgts = true
      data.enable13thSalary = true
      data.enableVacationBonus = true
    }

    const config = await this.prisma.payrollConfig.update({
      where: { companyId },
      data,
    })

    return {
      success: true,
      message: 'Configurações atualizadas com sucesso',
      config: this.formatConfig(config),
    }
  }

  // ==========================================
  // BENEFÍCIOS PERSONALIZADOS
  // ==========================================

  // Listar benefícios da empresa
  async listBenefits(companyId: string) {
    const benefits = await this.prisma.customBenefit.findMany({
      where: { companyId },
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    })

    return {
      success: true,
      benefits: benefits.map((b) => ({
        ...b,
        value: Number(b.value),
        employeeCount: b._count.employees,
      })),
    }
  }

  // Criar benefício personalizado
  async createBenefit(companyId: string, data: { name: string; description?: string; value: number; type: 'EARNING' | 'DEDUCTION' }) {
    // Verificar se já existe benefício com mesmo nome
    const existing = await this.prisma.customBenefit.findUnique({
      where: { companyId_name: { companyId, name: data.name } },
    })

    if (existing) {
      throw new BadRequestException('Já existe um benefício com este nome')
    }

    const benefit = await this.prisma.customBenefit.create({
      data: {
        companyId,
        name: data.name,
        description: data.description,
        value: data.value,
        type: data.type,
      },
    })

    return {
      success: true,
      message: 'Benefício criado com sucesso',
      benefit: { ...benefit, value: Number(benefit.value) },
    }
  }

  // Atualizar benefício
  async updateBenefit(benefitId: string, data: { name?: string; description?: string; value?: number; type?: 'EARNING' | 'DEDUCTION'; active?: boolean }) {
    const benefit = await this.prisma.customBenefit.findUnique({
      where: { id: benefitId },
    })

    if (!benefit) {
      throw new NotFoundException('Benefício não encontrado')
    }

    const updated = await this.prisma.customBenefit.update({
      where: { id: benefitId },
      data,
    })

    return {
      success: true,
      message: 'Benefício atualizado com sucesso',
      benefit: { ...updated, value: Number(updated.value) },
    }
  }

  // Excluir benefício
  async deleteBenefit(benefitId: string) {
    const benefit = await this.prisma.customBenefit.findUnique({
      where: { id: benefitId },
    })

    if (!benefit) {
      throw new NotFoundException('Benefício não encontrado')
    }

    await this.prisma.customBenefit.delete({
      where: { id: benefitId },
    })

    return {
      success: true,
      message: 'Benefício excluído com sucesso',
    }
  }

  // Buscar benefício com funcionários vinculados
  async getBenefitWithEmployees(benefitId: string) {
    const benefit = await this.prisma.customBenefit.findUnique({
      where: { id: benefitId },
      include: {
        employees: {
          where: { active: true },
          include: {
            employee: {
              include: {
                user: { select: { name: true, avatarUrl: true } },
                position: { select: { name: true } },
              },
            },
          },
        },
      },
    })

    if (!benefit) {
      throw new NotFoundException('Benefício não encontrado')
    }

    return {
      success: true,
      benefit: {
        ...benefit,
        value: Number(benefit.value),
        employees: benefit.employees.map((eb) => ({
          id: eb.id,
          employeeId: eb.employeeId,
          customValue: eb.customValue ? Number(eb.customValue) : null,
          name: eb.employee.user?.name || 'Sem nome',
          position: eb.employee.position?.name || null,
          avatarUrl: eb.employee.user?.avatarUrl || null,
        })),
      },
    }
  }

  // Vincular funcionário a benefício
  async addEmployeeToBenefit(benefitId: string, employeeId: string, customValue?: number) {
    const benefit = await this.prisma.customBenefit.findUnique({
      where: { id: benefitId },
    })

    if (!benefit) {
      throw new NotFoundException('Benefício não encontrado')
    }

    // Verificar se já está vinculado
    const existing = await this.prisma.employeeBenefit.findUnique({
      where: { employeeId_benefitId: { employeeId, benefitId } },
    })

    if (existing) {
      throw new BadRequestException('Funcionário já está vinculado a este benefício')
    }

    await this.prisma.employeeBenefit.create({
      data: {
        employeeId,
        benefitId,
        customValue: customValue || null,
      },
    })

    return {
      success: true,
      message: 'Funcionário vinculado ao benefício com sucesso',
    }
  }

  // Desvincular funcionário de benefício
  async removeEmployeeFromBenefit(benefitId: string, employeeId: string) {
    const link = await this.prisma.employeeBenefit.findUnique({
      where: { employeeId_benefitId: { employeeId, benefitId } },
    })

    if (!link) {
      throw new NotFoundException('Vínculo não encontrado')
    }

    await this.prisma.employeeBenefit.delete({
      where: { id: link.id },
    })

    return {
      success: true,
      message: 'Funcionário desvinculado do benefício',
    }
  }

  // ==========================================
  // FOLHAS DE PAGAMENTO
  // ==========================================

  // Listar folhas de pagamento da empresa
  async listPayrolls(companyId: string, year?: number) {
    const where: any = { companyId }
    if (year) {
      where.referenceYear = year
    }

    const payrolls = await this.prisma.payroll.findMany({
      where,
      orderBy: [{ referenceYear: 'desc' }, { referenceMonth: 'desc' }],
      include: {
        _count: {
          select: { payslips: true },
        },
      },
    })

    return {
      success: true,
      payrolls: payrolls.map((p) => ({
        ...p,
        totalGross: Number(p.totalGross),
        totalDeductions: Number(p.totalDeductions),
        totalNet: Number(p.totalNet),
        employeeCount: p._count.payslips,
      })),
    }
  }

  // Buscar folha de pagamento por ID
  async getPayrollById(id: string) {
    const payroll = await this.prisma.payroll.findUnique({
      where: { id },
      include: {
        payslips: {
          include: {
            employee: {
              include: {
                user: { select: { name: true, avatarUrl: true } },
                position: { select: { name: true } },
                department: { select: { name: true } },
              },
            },
          },
          orderBy: { employeeName: 'asc' },
        },
      },
    })

    if (!payroll) {
      throw new NotFoundException('Folha de pagamento não encontrada')
    }

    return {
      success: true,
      payroll: this.formatPayroll(payroll),
    }
  }

  // Buscar ou criar folha de pagamento do mês
  async getOrCreatePayroll(companyId: string, month: number, year: number) {
    let payroll = await this.prisma.payroll.findUnique({
      where: {
        companyId_referenceMonth_referenceYear: {
          companyId,
          referenceMonth: month,
          referenceYear: year,
        },
      },
      include: {
        payslips: {
          include: {
            employee: {
              include: {
                user: { select: { name: true, avatarUrl: true } },
                position: { select: { name: true } },
                department: { select: { name: true } },
              },
            },
            installments: {
              orderBy: { installmentNumber: 'asc' },
            },
          },
          orderBy: { employeeName: 'asc' },
        },
      },
    })

    if (!payroll) {
      // Criar nova folha de pagamento
      payroll = await this.prisma.payroll.create({
        data: {
          companyId,
          referenceMonth: month,
          referenceYear: year,
          status: 'DRAFT',
        },
        include: {
          payslips: {
            include: {
              employee: {
                include: {
                  user: { select: { name: true, avatarUrl: true } },
                  position: { select: { name: true } },
                  department: { select: { name: true } },
                },
              },
              installments: {
                orderBy: { installmentNumber: 'asc' },
              },
            },
          },
        },
      })
    }

    return {
      success: true,
      payroll: this.formatPayroll(payroll),
    }
  }

  // Gerar holerites para todos os funcionários ativos
  async generatePayslips(payrollId: string) {
    const payroll = await this.prisma.payroll.findUnique({
      where: { id: payrollId },
      include: { payslips: true },
    })

    if (!payroll) {
      throw new NotFoundException('Folha de pagamento não encontrada')
    }

    if (payroll.status !== 'DRAFT' && payroll.status !== 'REVIEW') {
      throw new BadRequestException('Folha de pagamento não pode ser alterada neste status')
    }

    // Validar período - não pode gerar folha de mês futuro
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    
    if (payroll.referenceYear > currentYear || 
        (payroll.referenceYear === currentYear && payroll.referenceMonth > currentMonth)) {
      throw new BadRequestException('Não é possível gerar folha de pagamento para mês futuro')
    }

    // Buscar configurações da empresa
    const { config } = await this.getOrCreateConfig(payroll.companyId)

    // Buscar funcionários ativos da empresa com benefícios
    const employees = await this.prisma.employee.findMany({
      where: {
        companyId: payroll.companyId,
        active: true,
      },
      include: {
        user: { select: { name: true } },
        position: { select: { name: true } },
        department: { select: { name: true } },
        benefits: {
          where: { active: true },
          include: {
            benefit: true,
          },
        },
      },
    })

    // Buscar registros de ponto do mês
    const startDate = new Date(payroll.referenceYear, payroll.referenceMonth - 1, 1)
    const endDate = new Date(payroll.referenceYear, payroll.referenceMonth, 0, 23, 59, 59)

    const timeEntries = await this.prisma.timeEntry.findMany({
      where: {
        companyId: payroll.companyId,
        timestamp: { gte: startDate, lte: endDate },
      },
    })

    // Agrupar registros por funcionário
    const entriesByEmployee = new Map<string, any[]>()
    for (const entry of timeEntries) {
      const list = entriesByEmployee.get(entry.employeeId) || []
      list.push(entry)
      entriesByEmployee.set(entry.employeeId, list)
    }

    // Atualizar status para calculando
    await this.prisma.payroll.update({
      where: { id: payrollId },
      data: { status: 'CALCULATING' },
    })

    let totalGross = 0
    let totalDeductions = 0
    let totalNet = 0

    // Buscar todos os vales (Advance) aprovados ou pagos do mês de referência
    const advances = await this.prisma.advance.findMany({
      where: {
        companyId: payroll.companyId,
        referenceMonth: payroll.referenceMonth,
        referenceYear: payroll.referenceYear,
        status: { in: ['APPROVED', 'PAID'] },
      },
    })

    // Agrupar vales por funcionário
    const advancesByEmployee = new Map<string, any[]>()
    for (const advance of advances) {
      const list = advancesByEmployee.get(advance.employeeId) || []
      list.push(advance)
      advancesByEmployee.set(advance.employeeId, list)
    }

    // Buscar atestados médicos aprovados do mês de referência
    const startOfMonth = new Date(payroll.referenceYear, payroll.referenceMonth - 1, 1)
    const endOfMonth = new Date(payroll.referenceYear, payroll.referenceMonth, 0)
    
    const medicalCertificates = await this.prisma.medicalCertificate.findMany({
      where: {
        companyId: payroll.companyId,
        status: 'APPROVED',
        OR: [
          { startDate: { gte: startOfMonth, lte: endOfMonth } },
          { endDate: { gte: startOfMonth, lte: endOfMonth } },
          { AND: [{ startDate: { lte: startOfMonth } }, { endDate: { gte: endOfMonth } }] },
        ],
      },
    })

    // Agrupar atestados por funcionário e calcular dias justificados
    const justifiedDaysByEmployee = new Map<string, number>()
    for (const cert of medicalCertificates) {
      const certStart = cert.startDate > startOfMonth ? cert.startDate : startOfMonth
      const certEnd = cert.endDate < endOfMonth ? cert.endDate : endOfMonth
      const diffTime = Math.abs(certEnd.getTime() - certStart.getTime())
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      
      const current = justifiedDaysByEmployee.get(cert.employeeId) || 0
      justifiedDaysByEmployee.set(cert.employeeId, current + days)
    }

    // Buscar períodos de férias do mês
    const vacationPeriods = await this.prisma.vacationPeriod.findMany({
      where: {
        vacation: {
          companyId: payroll.companyId,
          status: { in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] },
        },
        OR: [
          { startDate: { gte: startOfMonth, lte: endOfMonth } },
          { endDate: { gte: startOfMonth, lte: endOfMonth } },
          { AND: [{ startDate: { lte: startOfMonth } }, { endDate: { gte: endOfMonth } }] },
        ],
        status: { in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] },
      },
      include: { vacation: true },
    })

    // Agrupar dias de férias por funcionário
    const vacationDaysByEmployee = new Map<string, number>()
    for (const period of vacationPeriods) {
      const periodStart = period.startDate > startOfMonth ? period.startDate : startOfMonth
      const periodEnd = period.endDate < endOfMonth ? period.endDate : endOfMonth
      const diffTime = Math.abs(periodEnd.getTime() - periodStart.getTime())
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      
      const current = vacationDaysByEmployee.get(period.vacation.employeeId) || 0
      vacationDaysByEmployee.set(period.vacation.employeeId, current + days)
    }

    // Gerar/atualizar holerite de cada funcionário
    for (const employee of employees) {
      const entries = entriesByEmployee.get(employee.id) || []
      const employeeAdvances = advancesByEmployee.get(employee.id) || []
      const justifiedAbsenceDays = justifiedDaysByEmployee.get(employee.id) || 0
      const vacationDaysInMonth = vacationDaysByEmployee.get(employee.id) || 0
      const payslipData = this.calculatePayslip(employee, entries, payroll.referenceMonth, payroll.referenceYear, config, employeeAdvances, justifiedAbsenceDays, vacationDaysInMonth)

      // Verificar se já existe holerite
      const existingPayslip = payroll.payslips.find((p) => p.employeeId === employee.id)

      let payslipId: string

      if (existingPayslip) {
        await this.prisma.payslip.update({
          where: { id: existingPayslip.id },
          data: {
            ...payslipData,
            calculatedAt: new Date(),
            status: 'CALCULATED',
          },
        })
        payslipId = existingPayslip.id

        // Limpar benefícios antigos
        await this.prisma.payslipBenefit.deleteMany({
          where: { payslipId: existingPayslip.id },
        })
      } else {
        const newPayslip = await this.prisma.payslip.create({
          data: {
            payrollId,
            employeeId: employee.id,
            companyId: payroll.companyId,
            referenceMonth: payroll.referenceMonth,
            referenceYear: payroll.referenceYear,
            ...payslipData,
            calculatedAt: new Date(),
            status: 'CALCULATED',
          },
        })
        payslipId = newPayslip.id
      }

      // Adicionar benefícios personalizados ao holerite
      for (const eb of employee.benefits) {
        const value = eb.customValue ? Number(eb.customValue) : Number(eb.benefit.value)
        await this.prisma.payslipBenefit.create({
          data: {
            payslipId,
            benefitId: eb.benefit.id,
            name: eb.benefit.name,
            value,
            type: eb.benefit.type,
          },
        })
      }

      // Gerar parcelas de pagamento baseado na configuração
      await this.generateInstallments(
        payslipId,
        Number(payslipData.netSalary),
        payroll.referenceMonth,
        payroll.referenceYear,
        config,
        employee
      )

      totalGross += Number(payslipData.grossSalary)
      totalDeductions += Number(payslipData.totalDeductions)
      totalNet += Number(payslipData.netSalary)
    }

    // Atualizar totais da folha
    const updatedPayroll = await this.prisma.payroll.update({
      where: { id: payrollId },
      data: {
        status: 'REVIEW',
        totalGross,
        totalDeductions,
        totalNet,
        totalEmployees: employees.length,
      },
      include: {
        payslips: {
          include: {
            employee: {
              include: {
                user: { select: { name: true, avatarUrl: true } },
                position: { select: { name: true } },
                department: { select: { name: true } },
              },
            },
            customBenefits: true,
          },
          orderBy: { employeeName: 'asc' },
        },
      },
    })

    return {
      success: true,
      message: `Holerites gerados para ${employees.length} funcionários`,
      payroll: this.formatPayroll(updatedPayroll),
    }
  }

  // Calcular dados do holerite de um funcionário
  private calculatePayslip(employee: any, entries: any[], month: number, year: number, config: any, advances: any[] = [], justifiedAbsenceDays: number = 0, vacationDaysInMonth: number = 0) {
    const baseSalary = Number(employee.baseSalary)
    
    // NOVO: Calcular horas/dia baseado no horário do funcionário
    const workHoursPerDay = calculateHoursPerDay(
      employee.workStartTime || '08:00',
      employee.workEndTime || '18:00',
      employee.breakStartTime,
      employee.breakEndTime
    )
    
    // NOVO: Calcular dias/mês baseado na escala do funcionário
    const workDaysPerMonth = calculateDaysPerMonth(
      employee.workSchedule || 'FIVE_TWO',
      employee.customWorkDaysPerMonth
    )
    
    const monthlyHours = workDaysPerMonth * workHoursPerDay
    const hourlyRate = baseSalary / monthlyHours

    // Calcular dias trabalhados e horas
    const workDays = this.calculateWorkDays(entries)
    const workedHours = workDays * workHoursPerDay

    // Calcular horas extras aprovadas
    const overtimeEntries = entries.filter((e) => e.isOvertime && e.overtimeStatus === 'APPROVED')
    let overtimeHours50 = 0
    let overtimeHours100 = 0

    for (const entry of overtimeEntries) {
      const minutes = entry.overtimeMinutes || 0
      const hours = minutes / 60
      const rate = Number(entry.overtimeRate) || 1.5

      if (rate >= 2) {
        overtimeHours100 += hours
      } else {
        overtimeHours50 += hours
      }
    }

    const overtimeValue50 = overtimeHours50 * hourlyRate * 1.5
    const overtimeValue100 = overtimeHours100 * hourlyRate * 2

    // Calcular faltas e atrasos (usa dias da escala do funcionário)
    // Descontar dias justificados por atestado médico E dias de férias
    const expectedWorkDays = Math.max(0, workDaysPerMonth - vacationDaysInMonth) // Dias que deveria trabalhar (excluindo férias)
    const rawAbsenceDays = Math.max(0, expectedWorkDays - workDays)
    const absenceDays = Math.max(0, rawAbsenceDays - justifiedAbsenceDays)
    const absenceValue = absenceDays * (baseSalary / 30)
    const justifiedDays = Math.min(justifiedAbsenceDays, rawAbsenceDays) // Dias efetivamente justificados

    const lateMinutes = entries.filter((e) => e.isLate).reduce((sum, e) => sum + (e.lateMinutes || 0), 0)
    const lateValue = (lateMinutes / 60) * hourlyRate

    // Calcular benefícios personalizados (proventos e descontos)
    let customEarnings = 0
    let customDeductions = 0
    
    if (employee.benefits) {
      for (const eb of employee.benefits) {
        const value = eb.customValue ? Number(eb.customValue) : Number(eb.benefit.value)
        if (eb.benefit.type === 'EARNING') {
          customEarnings += value
        } else {
          customDeductions += value
        }
      }
    }

    // Proventos totais
    const totalEarnings = baseSalary + overtimeValue50 + overtimeValue100 + customEarnings

    // Calcular INSS (se habilitado)
    let inssBase = 0
    let inssValue = 0
    let inssRate = 0
    
    if (config.enableInss) {
      inssBase = totalEarnings
      const inssCalc = this.calculateINSS(inssBase)
      inssValue = inssCalc.value
      inssRate = inssCalc.rate
    }

    // Calcular IR (se habilitado)
    let irBase = 0
    let irValue = 0
    let irRate = 0
    
    if (config.enableIrrf) {
      irBase = totalEarnings - inssValue
      const irCalc = this.calculateIR(irBase)
      irValue = irCalc.value
      irRate = irCalc.rate
    }

    // NOVO: Benefícios - usa config individual do funcionário se existir, senão usa config da empresa
    const useCustomBenefits = employee.useCustomBenefits || false
    
    // Vale-transporte
    let transportVoucher = 0
    const vtEnabled = useCustomBenefits && employee.transportVoucherEnabled !== null 
      ? employee.transportVoucherEnabled 
      : config.enableTransportVoucher
    if (vtEnabled) {
      const vtRate = useCustomBenefits && employee.transportVoucherRate !== null
        ? Number(employee.transportVoucherRate)
        : Number(config.transportVoucherRate) || 6
      transportVoucher = baseSalary * (vtRate / 100)
    }

    // Vale-refeição
    let mealVoucher = 0
    const vrEnabled = useCustomBenefits && employee.mealVoucherEnabled !== null
      ? employee.mealVoucherEnabled
      : config.enableMealVoucher
    if (vrEnabled) {
      const vrValue = useCustomBenefits && employee.mealVoucherValue !== null
        ? Number(employee.mealVoucherValue)
        : Number(config.mealVoucherValue)
      const vrDiscount = useCustomBenefits && employee.mealVoucherDiscount !== null
        ? Number(employee.mealVoucherDiscount)
        : Number(config.mealVoucherDiscount)
      if (vrDiscount > 0) {
        mealVoucher = vrValue * (vrDiscount / 100)
      }
    }

    // Plano de saúde
    let healthInsurance = 0
    const healthEnabled = useCustomBenefits && employee.healthInsuranceEnabled !== null
      ? employee.healthInsuranceEnabled
      : config.enableHealthInsurance
    if (healthEnabled) {
      healthInsurance = useCustomBenefits && employee.healthInsuranceValue !== null
        ? Number(employee.healthInsuranceValue)
        : Number(config.healthInsuranceValue) || 0
    }

    // Plano odontológico
    let dentalInsurance = 0
    const dentalEnabled = useCustomBenefits && employee.dentalInsuranceEnabled !== null
      ? employee.dentalInsuranceEnabled
      : config.enableDentalInsurance
    if (dentalEnabled) {
      dentalInsurance = useCustomBenefits && employee.dentalInsuranceValue !== null
        ? Number(employee.dentalInsuranceValue)
        : Number(config.dentalInsuranceValue) || 0
    }

    // Calcular vales (Advance) - separar por tipo
    let salaryAdvanceValue = 0  // Adiantamento salarial
    let extraAdvanceValue = 0   // Vale avulso
    for (const advance of advances) {
      const amount = Number(advance.amount || 0)
      if (advance.type === 'SALARY') {
        salaryAdvanceValue += amount
      } else {
        extraAdvanceValue += amount
      }
    }
    const advancePayment = salaryAdvanceValue + extraAdvanceValue

    // Valor do atraso para desconto (só desconta se enableLateDiscount = true)
    // lateValue é sempre calculado para análise, mas lateDiscount é o que entra no desconto
    const lateDiscount = config.enableLateDiscount !== false ? lateValue : 0

    // Total de descontos (incluindo vales)
    const totalDeductions = absenceValue + lateDiscount + inssValue + irValue + 
                           transportVoucher + mealVoucher + healthInsurance + 
                           dentalInsurance + customDeductions + advancePayment

    // FGTS (se habilitado - obrigação da empresa, não desconta do funcionário)
    let fgtsBase = 0
    let fgtsValue = 0
    
    if (config.enableFgts) {
      fgtsBase = totalEarnings
      fgtsValue = fgtsBase * 0.08
    }

    // Totais
    const grossSalary = totalEarnings
    const netSalary = grossSalary - totalDeductions

    return {
      employeeName: employee.user?.name || 'Sem nome',
      employeePosition: employee.position?.name || null,
      employeeDepartment: employee.department?.name || null,
      employeeRegistration: employee.registrationId,
      baseSalary,
      workedDays: workDays,
      workedHours,
      overtimeHours50,
      overtimeValue50,
      overtimeHours100,
      overtimeValue100,
      nightShiftHours: 0,
      nightShiftValue: 0,
      hazardPay: 0,
      unhealthyPay: 0,
      bonus: 0,
      otherEarnings: customEarnings,
      totalEarnings,
      absenceDays,
      absenceValue,
      justifiedAbsenceDays: justifiedDays,
      lateMinutes,
      lateValue,
      lateDiscounted: config.enableLateDiscount !== false,
      inssBase,
      inssValue,
      inssRate,
      irBase,
      irValue,
      irRate,
      transportVoucher,
      mealVoucher,
      healthInsurance,
      dentalInsurance,
      unionContribution: 0,
      loanDeduction: 0,
      advancePayment,
      salaryAdvanceValue,
      extraAdvanceValue,
      otherDeductions: customDeductions,
      totalDeductions,
      fgtsBase,
      fgtsValue,
      grossSalary,
      netSalary,
    }
  }

  // Calcular dias trabalhados baseado nos registros de ponto
  private calculateWorkDays(entries: any[]): number {
    const daysWorked = new Set<string>()
    for (const entry of entries) {
      if (entry.type === 'CLOCK_IN') {
        const date = new Date(entry.timestamp).toISOString().split('T')[0]
        daysWorked.add(date)
      }
    }
    return daysWorked.size
  }

  // Calcular dias de falta
  private calculateAbsenceDays(entries: any[], month: number, year: number): number {
    const workDays = this.calculateWorkDays(entries)
    const totalWorkDaysInMonth = this.getWorkDaysInMonth(month, year)
    return Math.max(0, totalWorkDaysInMonth - workDays)
  }

  // Obter dias úteis do mês (excluindo sábados e domingos)
  private getWorkDaysInMonth(month: number, year: number): number {
    const daysInMonth = new Date(year, month, 0).getDate()
    let workDays = 0
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day)
      const dayOfWeek = date.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workDays++
      }
    }
    return workDays
  }

  // Calcular INSS progressivo
  private calculateINSS(base: number): { value: number; rate: number } {
    if (base > INSS_CEILING) {
      base = INSS_CEILING
    }

    let totalINSS = 0
    let lastMax = 0
    let appliedRate = 0

    for (const bracket of INSS_TABLE) {
      if (base > bracket.min) {
        const taxableAmount = Math.min(base, bracket.max) - lastMax
        totalINSS += taxableAmount * bracket.rate
        appliedRate = bracket.rate * 100
        lastMax = bracket.max
      }
    }

    return { value: totalINSS, rate: appliedRate }
  }

  // Calcular IR
  private calculateIR(base: number): { value: number; rate: number } {
    for (const bracket of IR_TABLE) {
      if (base >= bracket.min && base <= bracket.max) {
        const ir = base * bracket.rate - bracket.deduction
        return { value: Math.max(0, ir), rate: bracket.rate * 100 }
      }
    }
    return { value: 0, rate: 0 }
  }

  // Aprovar folha de pagamento
  async approvePayroll(payrollId: string, userId: string) {
    console.log('[approvePayroll] payrollId:', payrollId)
    
    const payroll = await this.prisma.payroll.findUnique({
      where: { id: payrollId },
    })

    if (!payroll) {
      throw new NotFoundException('Folha de pagamento não encontrada')
    }

    console.log('[approvePayroll] payroll status:', payroll.status)

    // Permitir aprovar folhas em REVIEW (após gerar holerites)
    if (payroll.status !== 'REVIEW') {
      throw new BadRequestException(`Folha de pagamento precisa estar em revisão para ser aprovada. Status atual: ${payroll.status}`)
    }

    // Aprovar todos os holerites
    await this.prisma.payslip.updateMany({
      where: { payrollId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        // approvedBy só aceita UUID válido, não string 'system'
        ...(userId && userId !== 'system' ? { approvedBy: userId } : {}),
      },
    })

    const updatedPayroll = await this.prisma.payroll.update({
      where: { id: payrollId },
      data: {
        status: 'APPROVED',
        closedAt: new Date(),
        // closedBy só aceita UUID válido, não string 'system'
        ...(userId && userId !== 'system' ? { closedBy: userId } : {}),
      },
      include: {
        payslips: {
          include: {
            employee: {
              include: {
                user: { select: { name: true, avatarUrl: true } },
                position: { select: { name: true } },
                department: { select: { name: true } },
              },
            },
          },
          orderBy: { employeeName: 'asc' },
        },
      },
    })

    return {
      success: true,
      message: 'Folha de pagamento aprovada com sucesso',
      payroll: this.formatPayroll(updatedPayroll),
    }
  }

  // Marcar folha como paga
  async markAsPaid(payrollId: string) {
    const payroll = await this.prisma.payroll.findUnique({
      where: { id: payrollId },
    })

    if (!payroll) {
      throw new NotFoundException('Folha de pagamento não encontrada')
    }

    if (payroll.status !== 'APPROVED') {
      throw new BadRequestException('Folha de pagamento precisa estar aprovada para ser marcada como paga')
    }

    // Marcar todos os holerites como pagos
    await this.prisma.payslip.updateMany({
      where: { payrollId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    })

    const updatedPayroll = await this.prisma.payroll.update({
      where: { id: payrollId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
      include: {
        payslips: {
          include: {
            employee: {
              include: {
                user: { select: { name: true, avatarUrl: true } },
                position: { select: { name: true } },
                department: { select: { name: true } },
              },
            },
          },
          orderBy: { employeeName: 'asc' },
        },
      },
    })

    return {
      success: true,
      message: 'Folha de pagamento marcada como paga',
      payroll: this.formatPayroll(updatedPayroll),
    }
  }

  // Buscar holerite individual
  async getPayslip(payslipId: string) {
    const payslip = await this.prisma.payslip.findUnique({
      where: { id: payslipId },
      include: {
        employee: {
          include: {
            user: { select: { name: true, avatarUrl: true, email: true } },
            position: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
        payroll: {
          include: {
            company: { select: { tradeName: true, cnpj: true } },
          },
        },
      },
    })

    if (!payslip) {
      throw new NotFoundException('Holerite não encontrado')
    }

    return {
      success: true,
      payslip: this.formatPayslip(payslip),
    }
  }

  // Atualizar holerite individual (ajustes manuais)
  async updatePayslip(payslipId: string, data: any) {
    const payslip = await this.prisma.payslip.findUnique({
      where: { id: payslipId },
      include: { payroll: true },
    })

    if (!payslip) {
      throw new NotFoundException('Holerite não encontrado')
    }

    if (payslip.status === 'PAID') {
      throw new BadRequestException('Holerite já foi pago e não pode ser alterado')
    }

    // Recalcular totais se necessário
    const updatedData = { ...data }
    
    // Recalcular total de proventos
    const totalEarnings =
      Number(data.baseSalary ?? payslip.baseSalary) +
      Number(data.overtimeValue50 ?? payslip.overtimeValue50) +
      Number(data.overtimeValue100 ?? payslip.overtimeValue100) +
      Number(data.nightShiftValue ?? payslip.nightShiftValue) +
      Number(data.hazardPay ?? payslip.hazardPay) +
      Number(data.unhealthyPay ?? payslip.unhealthyPay) +
      Number(data.bonus ?? payslip.bonus) +
      Number(data.otherEarnings ?? payslip.otherEarnings)

    // Recalcular total de descontos
    const totalDeductions =
      Number(data.absenceValue ?? payslip.absenceValue) +
      Number(data.lateValue ?? payslip.lateValue) +
      Number(data.inssValue ?? payslip.inssValue) +
      Number(data.irValue ?? payslip.irValue) +
      Number(data.transportVoucher ?? payslip.transportVoucher) +
      Number(data.mealVoucher ?? payslip.mealVoucher) +
      Number(data.healthInsurance ?? payslip.healthInsurance) +
      Number(data.dentalInsurance ?? payslip.dentalInsurance) +
      Number(data.unionContribution ?? payslip.unionContribution) +
      Number(data.loanDeduction ?? payslip.loanDeduction) +
      Number(data.advancePayment ?? payslip.advancePayment) +
      Number(data.otherDeductions ?? payslip.otherDeductions)

    updatedData.totalEarnings = totalEarnings
    updatedData.totalDeductions = totalDeductions
    updatedData.grossSalary = totalEarnings
    updatedData.netSalary = totalEarnings - totalDeductions

    const updated = await this.prisma.payslip.update({
      where: { id: payslipId },
      data: updatedData,
      include: {
        employee: {
          include: {
            user: { select: { name: true, avatarUrl: true } },
            position: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
      },
    })

    // Recalcular totais da folha
    await this.recalculatePayrollTotals(payslip.payrollId)

    return {
      success: true,
      message: 'Holerite atualizado com sucesso',
      payslip: this.formatPayslip(updated),
    }
  }

  // ==========================================
  // APROVAÇÃO E PAGAMENTO INDIVIDUAL
  // ==========================================

  // Aprovar holerite individual
  async approvePayslip(payslipId: string, userId: string) {
    const payslip = await this.prisma.payslip.findUnique({
      where: { id: payslipId },
      include: { payroll: true },
    })

    if (!payslip) {
      throw new NotFoundException('Holerite não encontrado')
    }

    if (payslip.status !== 'CALCULATED') {
      throw new BadRequestException('Holerite precisa estar calculado para ser aprovado')
    }

    const updated = await this.prisma.payslip.update({
      where: { id: payslipId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        // approvedBy só aceita UUID válido, não string 'system'
        ...(userId && userId !== 'system' ? { approvedBy: userId } : {}),
      },
      include: {
        employee: {
          include: {
            user: { select: { name: true, avatarUrl: true } },
            position: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
      },
    })

    // Verificar se todos os holerites da folha foram aprovados
    await this.updatePayrollStatusIfNeeded(payslip.payrollId)

    return {
      success: true,
      message: 'Holerite aprovado com sucesso',
      payslip: this.formatPayslip(updated),
    }
  }

  // Aprovar múltiplos holerites
  async approveMultiplePayslips(payslipIds: string[], userId: string) {
    console.log('[approveMultiplePayslips] payslipIds:', payslipIds)
    console.log('[approveMultiplePayslips] userId:', userId)
    
    if (!payslipIds || payslipIds.length === 0) {
      throw new BadRequestException('Nenhum holerite selecionado')
    }
    
    const payslips = await this.prisma.payslip.findMany({
      where: { id: { in: payslipIds } },
    })
    
    console.log('[approveMultiplePayslips] found payslips:', payslips.length)
    console.log('[approveMultiplePayslips] payslips status:', payslips.map(p => ({ id: p.id, status: p.status })))

    if (payslips.length === 0) {
      throw new BadRequestException('Nenhum holerite encontrado com os IDs fornecidos')
    }

    const notCalculated = payslips.filter(p => p.status !== 'CALCULATED')
    if (notCalculated.length > 0) {
      console.log('[approveMultiplePayslips] notCalculated:', notCalculated.map(p => ({ id: p.id, status: p.status })))
      throw new BadRequestException(`${notCalculated.length} holerite(s) não estão calculados. Status atual: ${notCalculated.map(p => p.status).join(', ')}`)
    }

    await this.prisma.payslip.updateMany({
      where: { id: { in: payslipIds } },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        // approvedBy só aceita UUID válido, não string 'system'
        ...(userId && userId !== 'system' ? { approvedBy: userId } : {}),
      },
    })

    // Atualizar status das folhas afetadas
    const payrollIds = [...new Set(payslips.map(p => p.payrollId))]
    for (const payrollId of payrollIds) {
      await this.updatePayrollStatusIfNeeded(payrollId)
    }

    return {
      success: true,
      message: `${payslipIds.length} holerite(s) aprovado(s) com sucesso`,
      approvedCount: payslipIds.length,
    }
  }

  // Pagar holerite individual
  async payPayslip(payslipId: string, userId: string) {
    const payslip = await this.prisma.payslip.findUnique({
      where: { id: payslipId },
      include: { payroll: true },
    })

    if (!payslip) {
      throw new NotFoundException('Holerite não encontrado')
    }

    // Só pode pagar holerite que foi aceito pelo funcionário
    if (payslip.status !== 'ACCEPTED') {
      throw new BadRequestException('Holerite precisa ser aceito pelo funcionário antes de ser pago')
    }

    const updated = await this.prisma.payslip.update({
      where: { id: payslipId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
      include: {
        employee: {
          include: {
            user: { select: { name: true, avatarUrl: true } },
            position: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
      },
    })

    // Verificar se todos os holerites da folha foram pagos
    await this.updatePayrollStatusIfNeeded(payslip.payrollId)

    return {
      success: true,
      message: 'Holerite pago com sucesso',
      payslip: this.formatPayslip(updated),
    }
  }

  // Pagar múltiplos holerites
  async payMultiplePayslips(payslipIds: string[], userId: string) {
    const payslips = await this.prisma.payslip.findMany({
      where: { id: { in: payslipIds } },
    })

    // Só pode pagar holerites que foram aceitos pelo funcionário
    const notAccepted = payslips.filter(p => p.status !== 'ACCEPTED')
    if (notAccepted.length > 0) {
      throw new BadRequestException(`${notAccepted.length} holerite(s) não foram aceitos pelo funcionário`)
    }

    await this.prisma.payslip.updateMany({
      where: { id: { in: payslipIds } },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    })

    // Atualizar status das folhas afetadas
    const payrollIds = [...new Set(payslips.map(p => p.payrollId))]
    for (const payrollId of payrollIds) {
      await this.updatePayrollStatusIfNeeded(payrollId)
    }

    return {
      success: true,
      message: `${payslipIds.length} holerite(s) pago(s) com sucesso`,
      paidCount: payslipIds.length,
    }
  }

  // Atualizar status da folha baseado nos holerites
  private async updatePayrollStatusIfNeeded(payrollId: string) {
    const payslips = await this.prisma.payslip.findMany({
      where: { payrollId },
    })

    if (payslips.length === 0) return

    // Novo fluxo: CALCULATED -> APPROVED -> ACCEPTED/REJECTED -> PAID
    const allPaid = payslips.every(p => p.status === 'PAID')
    const allAcceptedOrPaid = payslips.every(p => p.status === 'ACCEPTED' || p.status === 'PAID')
    const allApprovedOrBetter = payslips.every(p => 
      p.status === 'APPROVED' || p.status === 'ACCEPTED' || p.status === 'REJECTED' || p.status === 'PAID'
    )
    const allCalculatedOrBetter = payslips.every(p => 
      p.status === 'CALCULATED' || p.status === 'APPROVED' || p.status === 'ACCEPTED' || p.status === 'REJECTED' || p.status === 'PAID'
    )

    let newStatus: PayrollStatus | null = null

    if (allPaid) {
      newStatus = PayrollStatus.PAID
    } else if (allAcceptedOrPaid) {
      // Todos aceitos pelo funcionário (prontos para pagar)
      newStatus = PayrollStatus.APPROVED
    } else if (allApprovedOrBetter) {
      // Todos aprovados pelo admin (aguardando aceite do funcionário)
      newStatus = PayrollStatus.APPROVED
    } else if (allCalculatedOrBetter) {
      // Todos calculados = em revisão
      newStatus = PayrollStatus.REVIEW
    }

    if (newStatus) {
      await this.prisma.payroll.update({
        where: { id: payrollId },
        data: { 
          status: newStatus,
          ...(newStatus === PayrollStatus.PAID ? { paidAt: new Date() } : {}),
          ...(newStatus === PayrollStatus.APPROVED ? { closedAt: new Date() } : {}),
        },
      })
    }
  }

  // Recalcular totais da folha de pagamento
  private async recalculatePayrollTotals(payrollId: string) {
    const payslips = await this.prisma.payslip.findMany({
      where: { payrollId },
    })

    const totals = payslips.reduce(
      (acc, p) => ({
        totalGross: acc.totalGross + Number(p.grossSalary),
        totalDeductions: acc.totalDeductions + Number(p.totalDeductions),
        totalNet: acc.totalNet + Number(p.netSalary),
      }),
      { totalGross: 0, totalDeductions: 0, totalNet: 0 },
    )

    await this.prisma.payroll.update({
      where: { id: payrollId },
      data: {
        totalGross: totals.totalGross,
        totalDeductions: totals.totalDeductions,
        totalNet: totals.totalNet,
        totalEmployees: payslips.length,
      },
    })
  }

  // Obter resumo da folha de pagamento
  async getPayrollSummary(companyId: string, year: number) {
    const payrolls = await this.prisma.payroll.findMany({
      where: { companyId, referenceYear: year },
      orderBy: { referenceMonth: 'asc' },
    })

    const monthlyData = payrolls.map((p) => ({
      month: p.referenceMonth,
      status: p.status,
      totalGross: Number(p.totalGross),
      totalDeductions: Number(p.totalDeductions),
      totalNet: Number(p.totalNet),
      employeeCount: p.totalEmployees,
    }))

    const totals = monthlyData.reduce(
      (acc, m) => ({
        totalGross: acc.totalGross + m.totalGross,
        totalDeductions: acc.totalDeductions + m.totalDeductions,
        totalNet: acc.totalNet + m.totalNet,
      }),
      { totalGross: 0, totalDeductions: 0, totalNet: 0 },
    )

    return {
      success: true,
      year,
      monthlyData,
      totals,
    }
  }

  // Formatar configurações para resposta
  private formatConfig(config: any) {
    return {
      ...config,
      // Adicional noturno
      nightShiftPercentage: Number(config.nightShiftPercentage || 20),
      // Vale avulso
      maxExtraAdvancePercentage: config.maxExtraAdvancePercentage ? Number(config.maxExtraAdvancePercentage) : null,
      // Benefícios
      transportVoucherRate: Number(config.transportVoucherRate),
      mealVoucherValue: Number(config.mealVoucherValue),
      mealVoucherDiscount: Number(config.mealVoucherDiscount),
      healthInsuranceValue: Number(config.healthInsuranceValue),
      dentalInsuranceValue: Number(config.dentalInsuranceValue),
      workHoursPerDay: Number(config.workHoursPerDay),
      // Modo de pagamento flexível
      advancePercent: Number(config.advancePercent || 40),
      installment1Percent: Number(config.installment1Percent || 50),
      installment2Percent: Number(config.installment2Percent || 50),
      installment3Percent: Number(config.installment3Percent || 0),
      installment4Percent: Number(config.installment4Percent || 0),
    }
  }

  // Formatar folha de pagamento para resposta
  private formatPayroll(payroll: any) {
    return {
      ...payroll,
      totalGross: Number(payroll.totalGross),
      totalDeductions: Number(payroll.totalDeductions),
      totalNet: Number(payroll.totalNet),
      payslips: payroll.payslips?.map((p: any) => this.formatPayslip(p)) || [],
    }
  }

  // Formatar holerite para resposta
  private formatPayslip(payslip: any) {
    return {
      ...payslip,
      baseSalary: Number(payslip.baseSalary),
      workedHours: Number(payslip.workedHours),
      overtimeHours50: Number(payslip.overtimeHours50),
      overtimeValue50: Number(payslip.overtimeValue50),
      overtimeHours100: Number(payslip.overtimeHours100),
      overtimeValue100: Number(payslip.overtimeValue100),
      nightShiftHours: Number(payslip.nightShiftHours),
      nightShiftValue: Number(payslip.nightShiftValue),
      hazardPay: Number(payslip.hazardPay),
      unhealthyPay: Number(payslip.unhealthyPay),
      bonus: Number(payslip.bonus),
      otherEarnings: Number(payslip.otherEarnings),
      totalEarnings: Number(payslip.totalEarnings),
      absenceValue: Number(payslip.absenceValue),
      lateValue: Number(payslip.lateValue),
      inssBase: Number(payslip.inssBase),
      inssValue: Number(payslip.inssValue),
      inssRate: Number(payslip.inssRate),
      irBase: Number(payslip.irBase),
      irValue: Number(payslip.irValue),
      irRate: Number(payslip.irRate),
      transportVoucher: Number(payslip.transportVoucher),
      mealVoucher: Number(payslip.mealVoucher),
      healthInsurance: Number(payslip.healthInsurance),
      dentalInsurance: Number(payslip.dentalInsurance),
      unionContribution: Number(payslip.unionContribution),
      loanDeduction: Number(payslip.loanDeduction),
      advancePayment: Number(payslip.advancePayment),
      otherDeductions: Number(payslip.otherDeductions),
      totalDeductions: Number(payslip.totalDeductions),
      fgtsBase: Number(payslip.fgtsBase),
      fgtsValue: Number(payslip.fgtsValue),
      grossSalary: Number(payslip.grossSalary),
      netSalary: Number(payslip.netSalary),
      salaryAdvanceValue: Number(payslip.salaryAdvanceValue || 0),
      extraAdvanceValue: Number(payslip.extraAdvanceValue || 0),
      installments: payslip.installments?.map((i: any) => ({
        ...i,
        percentage: Number(i.percentage),
        amount: Number(i.amount),
      })) || [],
    }
  }

  // Listar holerites de um funcionário
  async listEmployeePayslips(employeeId: string) {
    const payslips = await this.prisma.payslip.findMany({
      where: { employeeId },
      include: {
        installments: {
          orderBy: { installmentNumber: 'asc' },
        },
      },
      orderBy: [
        { referenceYear: 'desc' },
        { referenceMonth: 'desc' },
      ],
    })

    return {
      success: true,
      payslips: payslips.map(p => this.formatPayslip(p)),
    }
  }

  // Previsão em tempo real do holerite (sem salvar no banco)
  // Usado no dashboard do funcionário para mostrar estimativa antes do fechamento
  async getPayslipPreview(employeeId: string, month: number, year: number) {
    // Buscar funcionário com todos os dados necessários
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: true,
        company: {
          include: {
            payrollConfig: true,
          },
        },
        position: true,
        department: true,
        benefits: {
          include: { benefit: true },
          where: { benefit: { active: true } },
        },
        timeEntries: {
          where: {
            timestamp: {
              gte: new Date(year, month - 1, 1),
              lt: new Date(year, month, 1),
            },
          },
        },
      },
    })

    if (!employee) {
      return { success: false, error: 'Funcionário não encontrado' }
    }

    const config = employee.company?.payrollConfig
    if (!config) {
      return { success: false, error: 'Configuração de folha não encontrada' }
    }

    // Buscar adiantamentos do mês
    const advances = await this.prisma.advance.findMany({
      where: {
        employeeId,
        referenceMonth: month,
        referenceYear: year,
        status: { in: ['APPROVED', 'PAID'] },
      },
    })

    // Buscar atestados médicos aprovados do mês
    const certificates = await this.prisma.medicalCertificate.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
        startDate: {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1),
        },
      },
    })

    // Calcular dias justificados por atestado
    const justifiedAbsenceDays = certificates.reduce((sum, cert) => sum + cert.days, 0)

    // Buscar períodos de férias do mês
    const startOfMonth = new Date(year, month - 1, 1)
    const endOfMonth = new Date(year, month, 0)
    
    const vacationPeriods = await this.prisma.vacationPeriod.findMany({
      where: {
        vacation: {
          employeeId,
          status: { in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] },
        },
        OR: [
          { startDate: { gte: startOfMonth, lte: endOfMonth } },
          { endDate: { gte: startOfMonth, lte: endOfMonth } },
          { AND: [{ startDate: { lte: startOfMonth } }, { endDate: { gte: endOfMonth } }] },
        ],
        status: { in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] },
      },
    })

    // Calcular dias de férias no mês
    let vacationDaysInMonth = 0
    for (const period of vacationPeriods) {
      const periodStart = period.startDate > startOfMonth ? period.startDate : startOfMonth
      const periodEnd = period.endDate < endOfMonth ? period.endDate : endOfMonth
      const diffTime = Math.abs(periodEnd.getTime() - periodStart.getTime())
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      vacationDaysInMonth += days
    }

    // Calcular dados do holerite usando o método existente
    // O método calculatePayslip espera: (employee, entries, month, year, config, advances, justifiedAbsenceDays, vacationDaysInMonth)
    const payslipData = this.calculatePayslip(
      employee,
      employee.timeEntries || [],
      month,
      year,
      config,
      advances,
      justifiedAbsenceDays,
      vacationDaysInMonth
    )

    // Verificar se já existe holerite oficial para este mês
    const existingPayslip = await this.prisma.payslip.findFirst({
      where: {
        employeeId,
        referenceMonth: month,
        referenceYear: year,
      },
    })

    // Calcular dias restantes no mês
    const today = new Date()
    const lastDayOfMonth = new Date(year, month, 0).getDate()
    const currentDay = today.getMonth() + 1 === month && today.getFullYear() === year 
      ? today.getDate() 
      : lastDayOfMonth
    const daysRemaining = lastDayOfMonth - currentDay

    return {
      success: true,
      isPreview: true, // Indica que é uma previsão, não um holerite oficial
      hasOfficialPayslip: !!existingPayslip,
      officialPayslipId: existingPayslip?.id || null,
      officialPayslipStatus: existingPayslip?.status || null,
      referenceMonth: month,
      referenceYear: year,
      daysRemaining, // Dias restantes até o fechamento
      lastDayOfMonth,
      currentDay,
      // Dados do funcionário
      employee: {
        id: employee.id,
        name: employee.user?.name || 'Sem nome',
        position: employee.position?.name || null,
        department: employee.department?.name || null,
        registrationId: employee.registrationId,
        baseSalary: Number(employee.baseSalary),
      },
      // Dados calculados
      preview: {
        ...payslipData,
        // Arredondar valores para 2 casas decimais
        baseSalary: Math.round(payslipData.baseSalary * 100) / 100,
        totalEarnings: Math.round(payslipData.totalEarnings * 100) / 100,
        totalDeductions: Math.round(payslipData.totalDeductions * 100) / 100,
        netSalary: Math.round(payslipData.netSalary * 100) / 100,
        inssValue: Math.round(payslipData.inssValue * 100) / 100,
        irValue: Math.round(payslipData.irValue * 100) / 100,
        transportVoucher: Math.round(payslipData.transportVoucher * 100) / 100,
        healthInsurance: Math.round(payslipData.healthInsurance * 100) / 100,
        lateValue: Math.round(payslipData.lateValue * 100) / 100,
        absenceValue: Math.round(payslipData.absenceValue * 100) / 100,
        fgtsValue: Math.round(payslipData.fgtsValue * 100) / 100,
      },
      // Configurações relevantes
      config: {
        enableLateDiscount: config.enableLateDiscount,
        enableInss: config.enableInss,
        enableIrrf: config.enableIrrf,
        enableFgts: config.enableFgts,
      },
    }
  }

  // ==========================================
  // PARCELAS DE PAGAMENTO (INSTALLMENTS)
  // ==========================================

  // Gerar parcelas de pagamento para um holerite
  async generateInstallments(
    payslipId: string,
    netSalary: number,
    referenceMonth: number,
    referenceYear: number,
    config: any,
    employee: any
  ) {
    // Deletar parcelas existentes
    await this.prisma.payslipInstallment.deleteMany({
      where: { payslipId },
    })

    const installments: any[] = []
    const paymentMode = config.paymentMode || 'FULL'

    if (paymentMode === 'FULL') {
      // Pagamento único - 100% em uma data
      const day = employee.customPaymentDay1 || config.fullPaymentDay || 5
      const dueDate = new Date(referenceYear, referenceMonth, day) // Mês seguinte
      
      installments.push({
        payslipId,
        installmentNumber: 1,
        totalInstallments: 1,
        percentage: 100,
        amount: netSalary,
        dueDate,
      })
    } else if (paymentMode === 'ADVANCE') {
      // Adiantamento - 2 parcelas (ex: 40% dia 15 + 60% dia 5)
      const advancePercent = Number(config.advancePercent || 40)
      const balancePercent = 100 - advancePercent
      
      const advanceDay = employee.customPaymentDay1 || config.advancePaymentDay || 15
      const balanceDay = employee.customPaymentDay2 || config.balancePaymentDay || 5
      
      // Parcela 1: Adiantamento (mesmo mês)
      const advanceDueDate = new Date(referenceYear, referenceMonth - 1, advanceDay)
      installments.push({
        payslipId,
        installmentNumber: 1,
        totalInstallments: 2,
        percentage: advancePercent,
        amount: Math.round((netSalary * advancePercent / 100) * 100) / 100,
        dueDate: advanceDueDate,
      })
      
      // Parcela 2: Saldo (mês seguinte)
      const balanceDueDate = new Date(referenceYear, referenceMonth, balanceDay)
      installments.push({
        payslipId,
        installmentNumber: 2,
        totalInstallments: 2,
        percentage: balancePercent,
        amount: Math.round((netSalary * balancePercent / 100) * 100) / 100,
        dueDate: balanceDueDate,
      })
    } else if (paymentMode === 'INSTALLMENTS') {
      // Parcelado - 2 ou 4 parcelas
      const count = config.installmentCount || 2
      const totalInstallments = count === 4 ? 4 : 2
      
      const percentages = [
        Number(config.installment1Percent || (count === 2 ? 50 : 25)),
        Number(config.installment2Percent || (count === 2 ? 50 : 25)),
        Number(config.installment3Percent || 25),
        Number(config.installment4Percent || 25),
      ]
      
      const days = [
        employee.customPaymentDay1 || config.installment1Day || 7,
        employee.customPaymentDay2 || config.installment2Day || 14,
        employee.customPaymentDay3 || config.installment3Day || 21,
        employee.customPaymentDay4 || config.installment4Day || 28,
      ]
      
      for (let i = 0; i < totalInstallments; i++) {
        const percentage = percentages[i]
        const day = days[i]
        const dueDate = new Date(referenceYear, referenceMonth - 1, day)
        
        installments.push({
          payslipId,
          installmentNumber: i + 1,
          totalInstallments,
          percentage,
          amount: Math.round((netSalary * percentage / 100) * 100) / 100,
          dueDate,
        })
      }
    }

    // Criar parcelas no banco
    for (const inst of installments) {
      await this.prisma.payslipInstallment.create({ data: inst })
    }

    return installments
  }

  // Listar parcelas de um holerite
  async listPayslipInstallments(payslipId: string) {
    const installments = await this.prisma.payslipInstallment.findMany({
      where: { payslipId },
      orderBy: { installmentNumber: 'asc' },
    })

    return {
      success: true,
      installments: installments.map(i => ({
        ...i,
        percentage: Number(i.percentage),
        amount: Number(i.amount),
      })),
    }
  }

  // Pagar uma parcela específica
  async payInstallment(installmentId: string, paidBy: string) {
    const installment = await this.prisma.payslipInstallment.findUnique({
      where: { id: installmentId },
      include: { payslip: true },
    })

    if (!installment) {
      throw new NotFoundException('Parcela não encontrada')
    }

    if (installment.paidAt) {
      throw new BadRequestException('Parcela já foi paga')
    }

    // Atualizar parcela como paga
    const updated = await this.prisma.payslipInstallment.update({
      where: { id: installmentId },
      data: {
        paidAt: new Date(),
        paidBy,
      },
    })

    // Verificar se todas as parcelas foram pagas
    const allInstallments = await this.prisma.payslipInstallment.findMany({
      where: { payslipId: installment.payslipId },
    })

    const allPaid = allInstallments.every(i => i.paidAt !== null)

    // Se todas pagas, marcar holerite como PAID
    if (allPaid) {
      await this.prisma.payslip.update({
        where: { id: installment.payslipId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
        },
      })

      // Emitir evento WebSocket
      const payslip = await this.prisma.payslip.findUnique({
        where: { id: installment.payslipId },
        include: { payroll: true },
      })
      if (payslip?.payroll) {
        this.eventsGateway.emitPayslipPaid(payslip.payroll.companyId, this.formatPayslip(payslip))
      }
    }

    return {
      success: true,
      message: allPaid ? 'Parcela paga - Holerite totalmente quitado!' : 'Parcela paga com sucesso',
      installment: {
        ...updated,
        percentage: Number(updated.percentage),
        amount: Number(updated.amount),
      },
      allPaid,
    }
  }

  // Pagar todas as parcelas pendentes de um holerite
  async payAllInstallments(payslipId: string, paidBy: string) {
    const installments = await this.prisma.payslipInstallment.findMany({
      where: { payslipId, paidAt: null },
    })

    if (installments.length === 0) {
      throw new BadRequestException('Não há parcelas pendentes')
    }

    // Pagar todas as parcelas pendentes
    await this.prisma.payslipInstallment.updateMany({
      where: { payslipId, paidAt: null },
      data: {
        paidAt: new Date(),
        paidBy,
      },
    })

    // Marcar holerite como PAID
    await this.prisma.payslip.update({
      where: { id: payslipId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    })

    // Emitir evento WebSocket
    const payslip = await this.prisma.payslip.findUnique({
      where: { id: payslipId },
      include: { payroll: true },
    })
    if (payslip?.payroll) {
      this.eventsGateway.emitPayslipPaid(payslip.payroll.companyId, this.formatPayslip(payslip))
    }

    return {
      success: true,
      message: `${installments.length} parcela(s) paga(s) - Holerite totalmente quitado!`,
      paidCount: installments.length,
    }
  }

  // Listar parcelas atrasadas (para alertas)
  async listOverdueInstallments(companyId: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const overdueInstallments = await this.prisma.payslipInstallment.findMany({
      where: {
        payslip: { companyId },
        paidAt: null,
        dueDate: { lt: today },
      },
      include: {
        payslip: {
          include: {
            employee: {
              include: { user: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    })

    return {
      success: true,
      overdueCount: overdueInstallments.length,
      installments: overdueInstallments.map(i => ({
        id: i.id,
        payslipId: i.payslipId,
        installmentNumber: i.installmentNumber,
        totalInstallments: i.totalInstallments,
        percentage: Number(i.percentage),
        amount: Number(i.amount),
        dueDate: i.dueDate,
        daysOverdue: Math.floor((today.getTime() - new Date(i.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
        employeeId: i.payslip.employeeId,
        employeeName: i.payslip.employee?.user?.name || i.payslip.employeeName,
        referenceMonth: i.payslip.referenceMonth,
        referenceYear: i.payslip.referenceYear,
      })),
    }
  }

  // ==========================================
  // ASSINATURA DIGITAL DO HOLERITE
  // ==========================================

  // Marcar holerite como visualizado
  async markPayslipViewed(payslipId: string) {
    const payslip = await this.prisma.payslip.findUnique({
      where: { id: payslipId },
    })

    if (!payslip) {
      throw new NotFoundException('Holerite não encontrado')
    }

    // Só atualiza se ainda não foi visualizado
    if (!payslip.viewedAt) {
      await this.prisma.payslip.update({
        where: { id: payslipId },
        data: { viewedAt: new Date() },
      })
    }

    return { success: true, message: 'Visualização registrada' }
  }

  // Marcar que o usuário rolou até o final do holerite
  async markPayslipScrolled(payslipId: string) {
    const payslip = await this.prisma.payslip.findUnique({
      where: { id: payslipId },
    })

    if (!payslip) {
      throw new NotFoundException('Holerite não encontrado')
    }

    // Só atualiza se ainda não foi marcado
    if (!payslip.scrolledToEnd) {
      await this.prisma.payslip.update({
        where: { id: payslipId },
        data: {
          scrolledToEnd: true,
          scrolledAt: new Date(),
        },
      })
    }

    return { success: true, message: 'Scroll registrado' }
  }

  // Assinar holerite digitalmente
  async signPayslip(payslipId: string, acceptTerms: boolean, ip: string, device: string) {
    if (!acceptTerms) {
      throw new BadRequestException('É necessário aceitar os termos para assinar o holerite')
    }

    const payslip = await this.prisma.payslip.findUnique({
      where: { id: payslipId },
    })

    if (!payslip) {
      throw new NotFoundException('Holerite não encontrado')
    }

    if (payslip.signedAt) {
      throw new BadRequestException('Este holerite já foi assinado')
    }

    // Verificar se o usuário rolou até o final (obrigatório)
    if (!payslip.scrolledToEnd) {
      throw new BadRequestException('É necessário visualizar todo o holerite antes de assinar. Role até o final do documento.')
    }

    // Gerar hash do documento (baseado nos valores principais)
    const crypto = require('crypto')
    const dataToHash = JSON.stringify({
      id: payslip.id,
      employeeId: payslip.employeeId,
      referenceMonth: payslip.referenceMonth,
      referenceYear: payslip.referenceYear,
      grossSalary: payslip.grossSalary.toString(),
      netSalary: payslip.netSalary.toString(),
      totalDeductions: payslip.totalDeductions.toString(),
    })
    const documentHash = crypto.createHash('sha256').update(dataToHash).digest('hex')

    // Atualizar holerite com assinatura
    const updated = await this.prisma.payslip.update({
      where: { id: payslipId },
      data: {
        signedAt: new Date(),
        signedByIp: ip,
        signedByDevice: device,
        documentHash,
        signatureTerms: true,
      },
    })

    return {
      success: true,
      message: 'Holerite assinado com sucesso',
      payslip: this.formatPayslip(updated),
    }
  }

  // ==========================================
  // ACEITE/REJEIÇÃO DO FUNCIONÁRIO
  // ==========================================

  // Funcionário aceita o holerite (👍)
  async acceptPayslip(payslipId: string, employeeId: string) {
    const payslip = await this.prisma.payslip.findUnique({
      where: { id: payslipId },
    })

    if (!payslip) {
      throw new NotFoundException('Holerite não encontrado')
    }

    // Verificar se o holerite pertence ao funcionário
    if (payslip.employeeId !== employeeId) {
      throw new BadRequestException('Você não tem permissão para aceitar este holerite')
    }

    // Não pode aceitar holerite já aceito, rejeitado ou pago
    if (payslip.status === 'ACCEPTED' || payslip.status === 'REJECTED' || payslip.status === 'PAID') {
      throw new BadRequestException('Este holerite não pode ser aceito')
    }

    const updated = await this.prisma.payslip.update({
      where: { id: payslipId },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        rejectedAt: null,
        rejectionReason: null,
      },
      include: {
        employee: {
          include: {
            user: { select: { name: true, avatarUrl: true } },
            position: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
      },
    })

    // Atualizar status da folha se necessário
    await this.updatePayrollStatusIfNeeded(payslip.payrollId)

    // Emitir evento WebSocket para atualização em tempo real
    const payroll = await this.prisma.payroll.findUnique({ where: { id: payslip.payrollId } })
    if (payroll) {
      this.eventsGateway.emitPayslipAccepted(payroll.companyId, this.formatPayslip(updated))
    }

    return {
      success: true,
      message: 'Holerite aceito com sucesso',
      payslip: this.formatPayslip(updated),
    }
  }

  // Funcionário rejeita o holerite (👎)
  async rejectPayslip(payslipId: string, employeeId: string, reason: string) {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('É necessário informar o motivo da rejeição')
    }

    const payslip = await this.prisma.payslip.findUnique({
      where: { id: payslipId },
    })

    if (!payslip) {
      throw new NotFoundException('Holerite não encontrado')
    }

    // Verificar se o holerite pertence ao funcionário
    if (payslip.employeeId !== employeeId) {
      throw new BadRequestException('Você não tem permissão para rejeitar este holerite')
    }

    // Não pode rejeitar holerite já aceito, rejeitado ou pago
    if (payslip.status === 'ACCEPTED' || payslip.status === 'REJECTED' || payslip.status === 'PAID') {
      throw new BadRequestException('Este holerite não pode ser rejeitado')
    }

    const updated = await this.prisma.payslip.update({
      where: { id: payslipId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason.trim(),
        acceptedAt: null,
      },
      include: {
        employee: {
          include: {
            user: { select: { name: true, avatarUrl: true } },
            position: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
      },
    })

    // Atualizar status da folha se necessário
    await this.updatePayrollStatusIfNeeded(payslip.payrollId)

    // Emitir evento WebSocket para atualização em tempo real
    const payroll = await this.prisma.payroll.findUnique({ where: { id: payslip.payrollId } })
    if (payroll) {
      this.eventsGateway.emitPayslipRejected(payroll.companyId, this.formatPayslip(updated))
    }

    return {
      success: true,
      message: 'Holerite rejeitado. O motivo foi registrado.',
      payslip: this.formatPayslip(updated),
    }
  }

  // Admin reaprova holerite rejeitado (após correção)
  async reapprovePayslip(payslipId: string, userId: string) {
    const payslip = await this.prisma.payslip.findUnique({
      where: { id: payslipId },
    })

    if (!payslip) {
      throw new NotFoundException('Holerite não encontrado')
    }

    // Só pode reaprovar holerite que foi rejeitado
    if (payslip.status !== 'REJECTED') {
      throw new BadRequestException('Apenas holerites rejeitados podem ser reaprovados')
    }

    const updated = await this.prisma.payslip.update({
      where: { id: payslipId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        ...(userId && userId !== 'system' ? { approvedBy: userId } : {}),
        // Limpar dados de rejeição anterior
        rejectedAt: null,
        rejectionReason: null,
        acceptedAt: null,
      },
      include: {
        employee: {
          include: {
            user: { select: { name: true, avatarUrl: true } },
            position: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
      },
    })

    // Atualizar status da folha se necessário
    await this.updatePayrollStatusIfNeeded(payslip.payrollId)

    return {
      success: true,
      message: 'Holerite reaprovado com sucesso',
      payslip: this.formatPayslip(updated),
    }
  }

  // ==========================================
  // GRUPOS DE PAGAMENTO
  // ==========================================

  // Listar grupos de pagamento
  async listPaymentGroups(companyId: string) {
    const groups = await this.prisma.paymentGroup.findMany({
      where: { companyId },
      include: {
        employees: {
          include: {
            user: { select: { name: true } },
            position: { select: { name: true } },
          },
        },
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    })

    return {
      success: true,
      groups: groups.map(g => ({
        ...g,
        advancePercentage: g.advancePercentage ? Number(g.advancePercentage) : null,
        employeeCount: g._count.employees,
      })),
    }
  }

  // Criar grupo de pagamento
  async createPaymentGroup(companyId: string, data: {
    name: string
    description?: string
    paymentDay1: number
    paymentDay2?: number
    advanceDay?: number
    advancePercentage?: number
  }) {
    const group = await this.prisma.paymentGroup.create({
      data: {
        companyId,
        name: data.name,
        description: data.description,
        paymentDay1: data.paymentDay1,
        paymentDay2: data.paymentDay2,
        advanceDay: data.advanceDay,
        advancePercentage: data.advancePercentage,
      },
    })

    return {
      success: true,
      message: 'Grupo de pagamento criado com sucesso',
      group,
    }
  }

  // Atualizar grupo de pagamento
  async updatePaymentGroup(groupId: string, data: {
    name?: string
    description?: string
    paymentDay1?: number
    paymentDay2?: number
    advanceDay?: number
    advancePercentage?: number
    active?: boolean
  }) {
    const group = await this.prisma.paymentGroup.update({
      where: { id: groupId },
      data,
    })

    return {
      success: true,
      message: 'Grupo de pagamento atualizado com sucesso',
      group,
    }
  }

  // Excluir grupo de pagamento
  async deletePaymentGroup(groupId: string) {
    // Primeiro, desvincular funcionários
    await this.prisma.employee.updateMany({
      where: { paymentGroupId: groupId },
      data: { paymentGroupId: null },
    })

    await this.prisma.paymentGroup.delete({
      where: { id: groupId },
    })

    return {
      success: true,
      message: 'Grupo de pagamento excluído com sucesso',
    }
  }

  // Vincular funcionário a grupo de pagamento
  async addEmployeeToPaymentGroup(groupId: string, employeeId: string) {
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { paymentGroupId: groupId },
    })

    return {
      success: true,
      message: 'Funcionário vinculado ao grupo com sucesso',
    }
  }

  // Desvincular funcionário de grupo de pagamento
  async removeEmployeeFromPaymentGroup(groupId: string, employeeId: string) {
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { paymentGroupId: null },
    })

    return {
      success: true,
      message: 'Funcionário desvinculado do grupo com sucesso',
    }
  }

  // ==========================================
  // ADIANTAMENTOS E VALES
  // ==========================================

  // Listar adiantamentos
  async listAdvances(companyId: string, filters: {
    status?: string
    type?: string
    month?: number
    year?: number
  }) {
    const where: any = { companyId }
    
    if (filters.status) where.status = filters.status
    if (filters.type) where.type = filters.type
    if (filters.month) where.referenceMonth = filters.month
    if (filters.year) where.referenceYear = filters.year

    const advances = await this.prisma.advance.findMany({
      where,
      include: {
        employee: {
          include: {
            user: { select: { name: true } },
            position: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      success: true,
      advances: advances.map(a => ({
        ...a,
        amount: Number(a.amount),
        percentage: a.percentage ? Number(a.percentage) : null,
        employeeName: a.employee?.user?.name || 'N/A',
        employeePosition: a.employee?.position?.name || 'N/A',
      })),
    }
  }

  // Estatísticas de adiantamentos
  async getAdvanceStats(companyId: string) {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    const [pending, approved, paid, rejected] = await Promise.all([
      this.prisma.advance.count({ where: { companyId, status: 'PENDING' } }),
      this.prisma.advance.count({ where: { companyId, status: 'APPROVED' } }),
      this.prisma.advance.count({ where: { companyId, status: 'PAID', referenceMonth: month, referenceYear: year } }),
      this.prisma.advance.count({ where: { companyId, status: 'REJECTED', referenceMonth: month, referenceYear: year } }),
    ])

    // Funcionários com muitos vales (alerta)
    const employeesWithHighAdvances = await this.prisma.advance.groupBy({
      by: ['employeeId'],
      where: {
        companyId,
        referenceMonth: month,
        referenceYear: year,
        status: { in: ['APPROVED', 'PAID', 'DISCOUNTED'] },
      },
      _sum: { amount: true },
    })

    // Buscar dados dos funcionários para calcular % do salário
    const alerts = []
    for (const ea of employeesWithHighAdvances) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: ea.employeeId },
        include: { user: { select: { name: true } } },
      })
      if (employee) {
        const totalAdvances = Number(ea._sum.amount || 0)
        const salary = Number(employee.baseSalary)
        const percentage = salary > 0 ? (totalAdvances / salary) * 100 : 0
        if (percentage >= 40) {
          alerts.push({
            employeeId: employee.id,
            employeeName: employee.user?.name || 'N/A',
            totalAdvances,
            salary,
            percentage: Math.round(percentage),
          })
        }
      }
    }

    return {
      success: true,
      stats: { pending, approved, paid, rejected },
      alerts,
    }
  }

  // Listar adiantamentos de um funcionário
  async listEmployeeAdvances(employeeId: string, filters: { month?: number; year?: number }) {
    const where: any = { employeeId }
    if (filters.month) where.referenceMonth = filters.month
    if (filters.year) where.referenceYear = filters.year

    const advances = await this.prisma.advance.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // Calcular total e limite
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { company: { include: { payrollConfig: true } } },
    })

    const now = new Date()
    const month = filters.month || now.getMonth() + 1
    const year = filters.year || now.getFullYear()

    const monthAdvances = advances.filter(
      a => a.referenceMonth === month && a.referenceYear === year && 
           ['APPROVED', 'PAID', 'DISCOUNTED'].includes(a.status)
    )
    const totalMonth = monthAdvances.reduce((sum, a) => sum + Number(a.amount), 0)
    
    const salary = Number(employee?.baseSalary || 0)
    const maxPercentage = Number(employee?.company?.payrollConfig?.maxExtraAdvancePercentage || 50)
    const maxAmount = salary * (maxPercentage / 100)
    const available = Math.max(0, maxAmount - totalMonth)

    return {
      success: true,
      advances: advances.map(a => ({
        ...a,
        amount: Number(a.amount),
        percentage: a.percentage ? Number(a.percentage) : null,
      })),
      summary: {
        totalMonth,
        maxAmount,
        available,
        percentage: salary > 0 ? Math.round((totalMonth / salary) * 100) : 0,
      },
    }
  }

  // Criar adiantamento
  async createAdvance(companyId: string, data: {
    employeeId: string
    type: 'SALARY_ADVANCE' | 'EXTRA_ADVANCE'
    amount: number
    percentage?: number
    reason?: string
    referenceMonth?: number
    referenceYear?: number
  }) {
    const now = new Date()
    const month = data.referenceMonth || now.getMonth() + 1
    const year = data.referenceYear || now.getFullYear()

    // Verificar limite para EXTRA_ADVANCE
    if (data.type === 'EXTRA_ADVANCE') {
      const employee = await this.prisma.employee.findUnique({
        where: { id: data.employeeId },
        include: { company: { include: { payrollConfig: true } } },
      })

      if (!employee) {
        throw new NotFoundException('Funcionário não encontrado')
      }

      const config = employee.company?.payrollConfig
      if (!config?.enableExtraAdvance) {
        throw new BadRequestException('Vale avulso não está habilitado para esta empresa')
      }

      // Verificar limite
      const existingAdvances = await this.prisma.advance.aggregate({
        where: {
          employeeId: data.employeeId,
          referenceMonth: month,
          referenceYear: year,
          status: { in: ['APPROVED', 'PAID', 'DISCOUNTED'] },
        },
        _sum: { amount: true },
      })

      const totalExisting = Number(existingAdvances._sum.amount || 0)
      const salary = Number(employee.baseSalary)
      const maxPercentage = Number(config.maxExtraAdvancePercentage || 50)
      const maxAmount = salary * (maxPercentage / 100)

      if (totalExisting + data.amount > maxAmount) {
        throw new BadRequestException(
          `Limite de adiantamento excedido. Máximo: R$ ${maxAmount.toFixed(2)}, Já utilizado: R$ ${totalExisting.toFixed(2)}, Disponível: R$ ${(maxAmount - totalExisting).toFixed(2)}`
        )
      }
    }

    const advance = await this.prisma.advance.create({
      data: {
        companyId,
        employeeId: data.employeeId,
        type: data.type,
        amount: data.amount,
        percentage: data.percentage,
        reason: data.reason,
        referenceMonth: month,
        referenceYear: year,
        status: data.type === 'SALARY_ADVANCE' ? 'APPROVED' : 'PENDING', // Adiantamento salarial é automático
      },
    })

    return {
      success: true,
      message: data.type === 'SALARY_ADVANCE' 
        ? 'Adiantamento salarial criado com sucesso'
        : 'Solicitação de vale enviada para aprovação',
      advance: {
        ...advance,
        amount: Number(advance.amount),
        percentage: advance.percentage ? Number(advance.percentage) : null,
      },
    }
  }

  // Aprovar adiantamento
  async approveAdvance(advanceId: string, approvedById: string) {
    const advance = await this.prisma.advance.update({
      where: { id: advanceId },
      data: {
        status: 'APPROVED',
        approvedById,
        approvedAt: new Date(),
      },
    })

    return {
      success: true,
      message: 'Adiantamento aprovado com sucesso',
      advance: {
        ...advance,
        amount: Number(advance.amount),
      },
    }
  }

  // Rejeitar adiantamento
  async rejectAdvance(advanceId: string, reason?: string) {
    const advance = await this.prisma.advance.update({
      where: { id: advanceId },
      data: {
        status: 'REJECTED',
        rejectedReason: reason,
      },
    })

    return {
      success: true,
      message: 'Adiantamento rejeitado',
      advance: {
        ...advance,
        amount: Number(advance.amount),
      },
    }
  }

  // Marcar adiantamento como pago
  async markAdvanceAsPaid(advanceId: string) {
    const advance = await this.prisma.advance.update({
      where: { id: advanceId },
      data: {
        status: 'PAID',
        paymentDate: new Date(),
      },
    })

    return {
      success: true,
      message: 'Adiantamento marcado como pago',
      advance: {
        ...advance,
        amount: Number(advance.amount),
      },
    }
  }

  // Cancelar adiantamento
  async cancelAdvance(advanceId: string) {
    await this.prisma.advance.delete({
      where: { id: advanceId },
    })

    return {
      success: true,
      message: 'Adiantamento cancelado',
    }
  }

  // ==========================================
  // ATESTADOS MÉDICOS
  // ==========================================

  // Listar atestados médicos
  async listMedicalCertificates(companyId: string, filters: {
    employeeId?: string
    status?: string
    month?: number
    year?: number
  }) {
    try {
      console.log('[PayrollService] listMedicalCertificates START', { companyId, filters })
      
      const where: any = { companyId }
      
      if (filters.employeeId) where.employeeId = filters.employeeId
      if (filters.status) where.status = filters.status
      
      // Filtrar por mês/ano (atestados que cobrem o período)
      if (filters.month && filters.year) {
        const startOfMonth = new Date(filters.year, filters.month - 1, 1)
        const endOfMonth = new Date(filters.year, filters.month, 0)
        where.OR = [
          { startDate: { gte: startOfMonth, lte: endOfMonth } },
          { endDate: { gte: startOfMonth, lte: endOfMonth } },
          { AND: [{ startDate: { lte: startOfMonth } }, { endDate: { gte: endOfMonth } }] },
        ]
      }

      console.log('[PayrollService] listMedicalCertificates WHERE:', JSON.stringify(where))

      const certificates = await this.prisma.medicalCertificate.findMany({
        where,
        include: {
          employee: {
            include: {
              user: { select: { name: true, avatarUrl: true } },
              position: { select: { name: true } },
              department: { select: { name: true } },
            },
          },
        },
        orderBy: { startDate: 'desc' },
      })

      console.log('[PayrollService] listMedicalCertificates FOUND:', certificates.length)

      return {
        success: true,
        certificates: certificates.map(c => ({
          ...c,
          employeeName: c.employee?.user?.name || 'Sem nome',
          employeePosition: c.employee?.position?.name || null,
          employeeDepartment: c.employee?.department?.name || null,
          employeeAvatar: c.employee?.user?.avatarUrl || null,
        })),
      }
    } catch (error) {
      console.error('[PayrollService] listMedicalCertificates ERROR:', error)
      throw error
    }
  }

  // Buscar atestado médico por ID
  async getMedicalCertificate(id: string) {
    const certificate = await this.prisma.medicalCertificate.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: { select: { name: true, avatarUrl: true } },
            position: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
      },
    })

    if (!certificate) {
      throw new NotFoundException('Atestado não encontrado')
    }

    return {
      success: true,
      certificate: {
        ...certificate,
        employeeName: certificate.employee?.user?.name || 'Sem nome',
        employeePosition: certificate.employee?.position?.name || null,
        employeeDepartment: certificate.employee?.department?.name || null,
        employeeAvatar: certificate.employee?.user?.avatarUrl || null,
      },
    }
  }

  // Criar atestado médico
  async createMedicalCertificate(companyId: string, data: {
    employeeId: string
    startDate: string
    endDate: string
    reason?: string
    doctorName?: string
    doctorCrm?: string
    attachmentUrl?: string
    notes?: string
  }) {
    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)
    
    // Calcular dias
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

    const certificate = await this.prisma.medicalCertificate.create({
      data: {
        companyId,
        employeeId: data.employeeId,
        startDate,
        endDate,
        days,
        reason: data.reason,
        doctorName: data.doctorName,
        doctorCrm: data.doctorCrm,
        attachmentUrl: data.attachmentUrl,
        notes: data.notes,
        status: 'PENDING',
      },
      include: {
        employee: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    })

    return {
      success: true,
      message: `Atestado de ${days} dia(s) criado com sucesso`,
      certificate,
    }
  }

  // Atualizar atestado médico
  async updateMedicalCertificate(id: string, data: {
    startDate?: string
    endDate?: string
    reason?: string
    doctorName?: string
    doctorCrm?: string
    attachmentUrl?: string
    notes?: string
  }) {
    const existing = await this.prisma.medicalCertificate.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Atestado não encontrado')
    if (existing.status !== 'PENDING') {
      throw new BadRequestException('Apenas atestados pendentes podem ser editados')
    }

    const updateData: any = {}
    
    if (data.startDate) updateData.startDate = new Date(data.startDate)
    if (data.endDate) updateData.endDate = new Date(data.endDate)
    if (data.reason !== undefined) updateData.reason = data.reason
    if (data.doctorName !== undefined) updateData.doctorName = data.doctorName
    if (data.doctorCrm !== undefined) updateData.doctorCrm = data.doctorCrm
    if (data.attachmentUrl !== undefined) updateData.attachmentUrl = data.attachmentUrl
    if (data.notes !== undefined) updateData.notes = data.notes

    // Recalcular dias se datas mudaram
    if (data.startDate || data.endDate) {
      const startDate = data.startDate ? new Date(data.startDate) : existing.startDate
      const endDate = data.endDate ? new Date(data.endDate) : existing.endDate
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
      updateData.days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    }

    const certificate = await this.prisma.medicalCertificate.update({
      where: { id },
      data: updateData,
    })

    return {
      success: true,
      message: 'Atestado atualizado',
      certificate,
    }
  }

  // Aprovar atestado médico
  async approveMedicalCertificate(id: string, userId: string) {
    const existing = await this.prisma.medicalCertificate.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Atestado não encontrado')
    if (existing.status !== 'PENDING') {
      throw new BadRequestException('Apenas atestados pendentes podem ser aprovados')
    }

    const certificate = await this.prisma.medicalCertificate.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: userId !== 'system' ? userId : null,
      },
      include: {
        employee: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    })

    return {
      success: true,
      message: `Atestado de ${certificate.days} dia(s) aprovado`,
      certificate,
    }
  }

  // Rejeitar atestado médico
  async rejectMedicalCertificate(id: string, userId: string, reason?: string) {
    const existing = await this.prisma.medicalCertificate.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Atestado não encontrado')
    if (existing.status !== 'PENDING') {
      throw new BadRequestException('Apenas atestados pendentes podem ser rejeitados')
    }

    const certificate = await this.prisma.medicalCertificate.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectedBy: userId !== 'system' ? userId : null,
        rejectionReason: reason,
      },
    })

    return {
      success: true,
      message: 'Atestado rejeitado',
      certificate,
    }
  }

  // Excluir atestado médico
  async deleteMedicalCertificate(id: string) {
    const existing = await this.prisma.medicalCertificate.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Atestado não encontrado')

    await this.prisma.medicalCertificate.delete({ where: { id } })

    return {
      success: true,
      message: 'Atestado excluído',
    }
  }

  // Estatísticas de atestados médicos
  async getMedicalCertificateStats(companyId: string) {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    const startOfMonth = new Date(year, month - 1, 1)
    const endOfMonth = new Date(year, month, 0)

    const [pending, approved, rejected, totalDaysThisMonth] = await Promise.all([
      this.prisma.medicalCertificate.count({ where: { companyId, status: 'PENDING' } }),
      this.prisma.medicalCertificate.count({ where: { companyId, status: 'APPROVED' } }),
      this.prisma.medicalCertificate.count({ where: { companyId, status: 'REJECTED' } }),
      this.prisma.medicalCertificate.aggregate({
        where: {
          companyId,
          status: 'APPROVED',
          OR: [
            { startDate: { gte: startOfMonth, lte: endOfMonth } },
            { endDate: { gte: startOfMonth, lte: endOfMonth } },
          ],
        },
        _sum: { days: true },
      }),
    ])

    // Funcionários com mais atestados no ano
    const topEmployees = await this.prisma.medicalCertificate.groupBy({
      by: ['employeeId'],
      where: {
        companyId,
        status: 'APPROVED',
        startDate: { gte: new Date(year, 0, 1) },
      },
      _sum: { days: true },
      _count: true,
      orderBy: { _sum: { days: 'desc' } },
      take: 5,
    })

    // Buscar nomes dos funcionários
    const employeeIds = topEmployees.map(e => e.employeeId)
    const employees = await this.prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      include: { user: { select: { name: true } } },
    })
    const employeeMap = new Map(employees.map(e => [e.id, e.user?.name || 'Sem nome']))

    return {
      success: true,
      stats: {
        pending,
        approved,
        rejected,
        totalDaysThisMonth: totalDaysThisMonth._sum.days || 0,
        topEmployees: topEmployees.map(e => ({
          employeeId: e.employeeId,
          employeeName: employeeMap.get(e.employeeId) || 'Sem nome',
          totalDays: e._sum.days || 0,
          count: e._count,
        })),
      },
    }
  }

  // Buscar atestados aprovados de um funcionário em um período (para cálculo de faltas)
  async getApprovedCertificatesForPeriod(employeeId: string, month: number, year: number) {
    const startOfMonth = new Date(year, month - 1, 1)
    const endOfMonth = new Date(year, month, 0)

    const certificates = await this.prisma.medicalCertificate.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
        OR: [
          { startDate: { gte: startOfMonth, lte: endOfMonth } },
          { endDate: { gte: startOfMonth, lte: endOfMonth } },
          { AND: [{ startDate: { lte: startOfMonth } }, { endDate: { gte: endOfMonth } }] },
        ],
      },
    })

    // Calcular dias justificados no mês
    let justifiedDays = 0
    for (const cert of certificates) {
      const certStart = cert.startDate > startOfMonth ? cert.startDate : startOfMonth
      const certEnd = cert.endDate < endOfMonth ? cert.endDate : endOfMonth
      const diffTime = Math.abs(certEnd.getTime() - certStart.getTime())
      justifiedDays += Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    }

    return { certificates, justifiedDays }
  }
}
