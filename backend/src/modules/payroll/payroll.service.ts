import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { Decimal } from '@prisma/client/runtime/library'

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
  // Frequência e dias de pagamento
  paymentFrequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'
  paymentDay1: number
  paymentDay2?: number | null
  paymentDayOfWeek?: number | null
  // Encargos
  enableInss: boolean
  enableIrrf: boolean
  enableFgts: boolean
  // Adicional noturno
  enableNightShift: boolean
  nightShiftStart: string
  nightShiftEnd: string
  nightShiftPercentage: number
  // Adiantamento salarial
  enableSalaryAdvance: boolean
  salaryAdvanceDay?: number | null
  salaryAdvancePercentage?: number | null
  // Vale avulso
  enableExtraAdvance: boolean
  maxExtraAdvancePercentage?: number | null
  // Benefícios
  enableTransportVoucher: boolean
  transportVoucherRate: number
  enableMealVoucher: boolean
  mealVoucherValue: number
  mealVoucherDiscount: number
  enableHealthInsurance: boolean
  healthInsuranceValue: number
  enableDentalInsurance: boolean
  dentalInsuranceValue: number
  // Cálculo
  workDaysPerMonth: number
  workHoursPerDay: number
}

// Serviço de Folha de Pagamento
@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

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
          paymentFrequency: 'MONTHLY',
          paymentDay1: 5,
          paymentDay2: null,
          paymentDayOfWeek: null,
          enableInss: true,
          enableIrrf: true,
          enableFgts: true,
          // Adicional noturno
          enableNightShift: true,
          nightShiftStart: '22:00',
          nightShiftEnd: '05:00',
          nightShiftPercentage: 20,
          // Adiantamento salarial
          enableSalaryAdvance: false,
          salaryAdvanceDay: null,
          salaryAdvancePercentage: null,
          // Vale avulso
          enableExtraAdvance: false,
          maxExtraAdvancePercentage: null,
          // Benefícios
          enableTransportVoucher: true,
          transportVoucherRate: 6,
          enableMealVoucher: false,
          mealVoucherValue: 0,
          mealVoucherDiscount: 0,
          enableHealthInsurance: false,
          healthInsuranceValue: 0,
          enableDentalInsurance: false,
          dentalInsuranceValue: 0,
          enable13thSalary: true,
          enableVacationBonus: true,
          workDaysPerMonth: 22,
          workHoursPerDay: 8,
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

    // Gerar/atualizar holerite de cada funcionário
    for (const employee of employees) {
      const entries = entriesByEmployee.get(employee.id) || []
      const payslipData = this.calculatePayslip(employee, entries, payroll.referenceMonth, payroll.referenceYear, config)

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
  private calculatePayslip(employee: any, entries: any[], month: number, year: number, config: any) {
    const baseSalary = Number(employee.baseSalary)
    const workHoursPerDay = Number(config.workHoursPerDay) || 8
    const workDaysPerMonth = config.workDaysPerMonth || 22
    const monthlyHours = workDaysPerMonth * workHoursPerDay // Horas mensais baseado na config
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

    // Calcular faltas e atrasos
    const totalWorkDaysInMonth = this.getWorkDaysInMonth(month, year)
    const absenceDays = Math.max(0, totalWorkDaysInMonth - workDays)
    const absenceValue = absenceDays * (baseSalary / 30)

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

    // Vale-transporte (se habilitado)
    let transportVoucher = 0
    if (config.enableTransportVoucher) {
      const vtRate = Number(config.transportVoucherRate) || 6
      transportVoucher = baseSalary * (vtRate / 100)
    }

    // Vale-refeição (se habilitado)
    let mealVoucher = 0
    if (config.enableMealVoucher && config.mealVoucherDiscount > 0) {
      mealVoucher = Number(config.mealVoucherValue) * (Number(config.mealVoucherDiscount) / 100)
    }

    // Plano de saúde (se habilitado)
    let healthInsurance = 0
    if (config.enableHealthInsurance) {
      healthInsurance = Number(config.healthInsuranceValue) || 0
    }

    // Plano odontológico (se habilitado)
    let dentalInsurance = 0
    if (config.enableDentalInsurance) {
      dentalInsurance = Number(config.dentalInsuranceValue) || 0
    }

    // Total de descontos
    const totalDeductions = absenceValue + lateValue + inssValue + irValue + 
                           transportVoucher + mealVoucher + healthInsurance + 
                           dentalInsurance + customDeductions

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
      lateMinutes,
      lateValue,
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
      advancePayment: 0,
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
    const payroll = await this.prisma.payroll.findUnique({
      where: { id: payrollId },
    })

    if (!payroll) {
      throw new NotFoundException('Folha de pagamento não encontrada')
    }

    if (payroll.status !== 'REVIEW') {
      throw new BadRequestException('Folha de pagamento precisa estar em revisão para ser aprovada')
    }

    // Aprovar todos os holerites
    await this.prisma.payslip.updateMany({
      where: { payrollId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: userId,
      },
    })

    const updatedPayroll = await this.prisma.payroll.update({
      where: { id: payrollId },
      data: {
        status: 'APPROVED',
        closedAt: new Date(),
        closedBy: userId,
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
      // Adiantamento salarial
      salaryAdvancePercentage: config.salaryAdvancePercentage ? Number(config.salaryAdvancePercentage) : null,
      // Vale avulso
      maxExtraAdvancePercentage: config.maxExtraAdvancePercentage ? Number(config.maxExtraAdvancePercentage) : null,
      // Benefícios
      transportVoucherRate: Number(config.transportVoucherRate),
      mealVoucherValue: Number(config.mealVoucherValue),
      mealVoucherDiscount: Number(config.mealVoucherDiscount),
      healthInsuranceValue: Number(config.healthInsuranceValue),
      dentalInsuranceValue: Number(config.dentalInsuranceValue),
      workHoursPerDay: Number(config.workHoursPerDay),
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
    }
  }

  // Listar holerites de um funcionário
  async listEmployeePayslips(employeeId: string) {
    const payslips = await this.prisma.payslip.findMany({
      where: { employeeId },
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
}
