/**
 * 04 - Payroll Seed
 * Gera folha de pagamento e holerites para o mês anterior
 * com diferentes status de assinatura
 * 
 * CENÁRIOS:
 * - Holerite assinado (com PDF)
 * - Holerite pendente de assinatura
 * - Holerite calculado mas não aprovado
 * - Holerite de funcionário em férias
 */

import { PrismaClient, PayrollStatus, PayslipStatus } from '@prisma/client'
import * as crypto from 'crypto'

// Status de holerite por funcionário
const PAYSLIP_STATUS: Record<string, PayslipStatusConfig> = {
  // Paulo Santos - Assinado e pago
  'paulo.santos@acmetech.com.br': {
    status: 'PAID',
    signed: true,
    signedDaysAgo: 5,
  },

  // João da Silva - Aprovado mas não assinado
  'joao.silva@acmetech.com.br': {
    status: 'APPROVED',
    signed: false,
  },

  // Maria Souza - Assinado e pago
  'maria.souza@acmetech.com.br': {
    status: 'PAID',
    signed: true,
    signedDaysAgo: 3,
  },

  // Carlos Pereira - Calculado (aguardando aprovação)
  'carlos.pereira@acmetech.com.br': {
    status: 'CALCULATED',
    signed: false,
  },

  // Ana Oliveira - Pendente (férias)
  'ana.oliveira@acmetech.com.br': {
    status: 'PENDING',
    signed: false,
  },
}

interface PayslipStatusConfig {
  status: 'PENDING' | 'CALCULATED' | 'APPROVED' | 'PAID' | 'CANCELLED'
  signed: boolean
  signedDaysAgo?: number
}

export async function seedPayroll(prisma: PrismaClient): Promise<void> {
  // Buscar empresas com configuração de folha
  const companies = await prisma.company.findMany({
    include: {
      payrollConfig: true,
      employees: {
        include: {
          user: true,
          position: true,
          department: true,
          timeEntries: true,
        },
      },
    },
  })

  // Mês anterior
  const today = new Date()
  const prevMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1
  const prevYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear()

  console.log(`  → Gerando folha de ${getMonthName(prevMonth)}/${prevYear}`)

  for (const company of companies) {
    if (company.employees.length === 0) continue

    // Criar folha de pagamento
    const payroll = await prisma.payroll.create({
      data: {
        companyId: company.id,
        referenceMonth: prevMonth + 1, // 1-12
        referenceYear: prevYear,
        status: 'PAID',
        totalGross: 0,
        totalDeductions: 0,
        totalNet: 0,
        totalEmployees: company.employees.length,
        closedAt: new Date(prevYear, prevMonth, 28),
        closedBy: null,
        paidAt: new Date(prevYear, prevMonth + 1, 5),
      },
    })

    let totalGross = 0
    let totalDeductions = 0
    let totalNet = 0
    let totalFgts = 0

    // Criar holerites para cada funcionário
    for (const employee of company.employees) {
      if (!employee.user) continue

      const config = PAYSLIP_STATUS[employee.user.email] || { status: 'CALCULATED', signed: false }
      const payrollConfig = company.payrollConfig

      // Calcular valores do holerite
      const payslipData = calculatePayslip(employee, payrollConfig, prevMonth, prevYear)

      // Dados de assinatura
      let signatureData = {}
      if (config.signed) {
        const signedAt = new Date()
        signedAt.setDate(signedAt.getDate() - (config.signedDaysAgo || 1))
        
        const documentHash = crypto
          .createHash('sha256')
          .update(`${employee.id}-${prevMonth}-${prevYear}-${payslipData.netSalary}`)
          .digest('hex')

        signatureData = {
          viewedAt: new Date(signedAt.getTime() - 60000), // 1 min antes
          scrolledToEnd: true,
          scrolledAt: new Date(signedAt.getTime() - 30000), // 30s antes
          signedAt,
          signedByIp: '192.168.1.' + Math.floor(Math.random() * 255),
          signedByDevice: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          documentHash,
          signatureTerms: true,
        }
      }

      const payslip = await prisma.payslip.create({
        data: {
          companyId: company.id,
          employeeId: employee.id,
          payrollId: payroll.id,
          referenceMonth: prevMonth + 1,
          referenceYear: prevYear,
          status: config.status as PayslipStatus,
          
          // Dados do funcionário (snapshot)
          employeeName: employee.user.name,
          employeePosition: employee.position?.name || null,
          employeeDepartment: employee.department?.name || null,
          employeeRegistration: employee.registrationId,
          
          // Valores calculados (campos que existem no schema)
          baseSalary: payslipData.baseSalary,
          workedDays: payslipData.workedDays,
          overtimeHours50: payslipData.overtime50Hours,
          overtimeValue50: payslipData.overtime50Value,
          overtimeHours100: payslipData.overtime100Hours,
          overtimeValue100: payslipData.overtime100Value,
          nightShiftHours: payslipData.nightShiftHours,
          nightShiftValue: payslipData.nightShiftValue,
          hazardPay: payslipData.hazardPay,
          unhealthyPay: payslipData.unhealthyPay,
          bonus: payslipData.bonus,
          otherEarnings: payslipData.otherEarnings,
          totalEarnings: payslipData.grossSalary,
          absenceDays: payslipData.absenceDays,
          absenceValue: payslipData.absenceValue,
          lateMinutes: payslipData.lateMinutes,
          lateValue: payslipData.lateValue,
          inssBase: payslipData.inssBase,
          inssValue: payslipData.inssValue,
          inssRate: payslipData.inssRate,
          irBase: payslipData.irrfBase,
          irValue: payslipData.irrfValue,
          irRate: payslipData.irrfRate,
          transportVoucher: payslipData.transportVoucher,
          mealVoucher: payslipData.mealVoucher,
          healthInsurance: payslipData.healthInsurance,
          dentalInsurance: payslipData.dentalInsurance,
          totalDeductions: payslipData.totalDeductions,
          fgtsBase: payslipData.fgtsBase,
          fgtsValue: payslipData.fgtsValue,
          grossSalary: payslipData.grossSalary,
          netSalary: payslipData.netSalary,
          
          // Assinatura
          ...signatureData,
        },
      })

      totalGross += payslipData.grossSalary
      totalDeductions += payslipData.totalDeductions
      totalNet += payslipData.netSalary
      totalFgts += payslipData.fgtsValue

      // Log de desenvolvimento
      if (process.env.NODE_ENV !== 'production') {
        const statusIcon = config.signed ? '✅' : config.status === 'PAID' ? '💰' : '⏳'
        console.log(`    ${statusIcon} ${employee.user.name}: R$ ${payslipData.netSalary.toFixed(2)} (${config.status})`)
      }
    }

    // Atualizar totais da folha
    await prisma.payroll.update({
      where: { id: payroll.id },
      data: {
        totalGross,
        totalDeductions,
        totalNet,
      },
    })

    console.log(`    ✓ ${company.tradeName}: ${company.employees.length} holerites gerados`)
  }
}

function calculatePayslip(employee: any, config: any, month: number, year: number): any {
  const baseSalary = parseFloat(employee.baseSalary.toString())
  
  // Buscar batidas do mês
  const timeEntries = employee.timeEntries.filter((te: any) => {
    const date = new Date(te.timestamp)
    return date.getMonth() === month && date.getFullYear() === year
  })

  // Calcular dias trabalhados
  const workDays = new Set(
    timeEntries
      .filter((te: any) => te.type === 'CLOCK_IN')
      .map((te: any) => new Date(te.timestamp).toDateString())
  ).size

  // Calcular horas extras
  const overtimeEntries = timeEntries.filter((te: any) => te.isOvertime)
  const overtimeMinutes50 = overtimeEntries
    .filter((te: any) => te.overtimeType === 'REGULAR_50')
    .reduce((sum: number, te: any) => sum + (te.overtimeMinutes || 0), 0)
  const overtimeMinutes100 = overtimeEntries
    .filter((te: any) => te.overtimeType === 'REGULAR_100')
    .reduce((sum: number, te: any) => sum + (te.overtimeMinutes || 0), 0)

  const hourlyRate = baseSalary / 220 // 220 horas mensais
  const overtime50Value = (overtimeMinutes50 / 60) * hourlyRate * 1.5
  const overtime100Value = (overtimeMinutes100 / 60) * hourlyRate * 2.0

  // Calcular atrasos
  const lateEntries = timeEntries.filter((te: any) => te.isLate)
  const totalLateMinutes = lateEntries.reduce((sum: number, te: any) => sum + (te.lateMinutes || 0), 0)
  const lateDeduction = (totalLateMinutes / 60) * hourlyRate

  // Calcular faltas (22 dias úteis - dias trabalhados)
  const expectedWorkDays = 22
  const absences = Math.max(0, expectedWorkDays - workDays)
  const dailyRate = baseSalary / 30
  const absenceDeduction = absences * dailyRate

  // Proventos
  const grossSalary = baseSalary + overtime50Value + overtime100Value

  // Descontos
  const inssBase = grossSalary
  const inssRate = calculateInssRate(inssBase)
  const inssValue = config?.enableInss ? inssBase * inssRate : 0

  const irrfBase = grossSalary - inssValue
  const irrfRate = calculateIrrfRate(irrfBase)
  const irrfValue = config?.enableIrrf ? Math.max(0, irrfBase * irrfRate - getIrrfDeduction(irrfBase)) : 0

  const transportVoucher = config?.enableTransportVoucher 
    ? baseSalary * (parseFloat(config.transportVoucherRate?.toString() || '6') / 100)
    : 0

  const healthInsurance = config?.enableHealthInsurance 
    ? parseFloat(config.healthInsuranceValue?.toString() || '0')
    : 0

  const dentalInsurance = config?.enableDentalInsurance 
    ? parseFloat(config.dentalInsuranceValue?.toString() || '0')
    : 0

  const totalDeductions = inssValue + irrfValue + transportVoucher + healthInsurance + dentalInsurance + lateDeduction + absenceDeduction

  const netSalary = grossSalary - totalDeductions

  // FGTS (não desconta do funcionário)
  const fgtsBase = grossSalary
  const fgtsValue = config?.enableFgts ? fgtsBase * 0.08 : 0

  return {
    baseSalary,
    workedDays: workDays,
    overtime50Hours: overtimeMinutes50 / 60,
    overtime50Value,
    overtime100Hours: overtimeMinutes100 / 60,
    overtime100Value,
    nightShiftHours: 0,
    nightShiftValue: 0,
    hazardPay: 0,
    unhealthyPay: 0,
    bonus: 0,
    otherEarnings: 0,
    grossSalary,
    inssBase,
    inssRate: inssRate * 100,
    inssValue,
    irrfBase,
    irrfRate: irrfRate * 100,
    irrfValue,
    transportVoucher,
    mealVoucher: 0,
    healthInsurance,
    dentalInsurance,
    unionContribution: 0,
    loanPayment: 0,
    advancePayment: 0,
    otherDeductions: 0,
    absenceDays: absences,
    absenceValue: absenceDeduction,
    lateMinutes: totalLateMinutes,
    lateValue: lateDeduction,
    totalDeductions,
    fgtsBase,
    fgtsValue,
    netSalary,
  }
}

function calculateInssRate(salary: number): number {
  // Tabela INSS 2024
  if (salary <= 1412.00) return 0.075
  if (salary <= 2666.68) return 0.09
  if (salary <= 4000.03) return 0.12
  return 0.14
}

function calculateIrrfRate(salary: number): number {
  // Tabela IRRF 2024
  if (salary <= 2259.20) return 0
  if (salary <= 2826.65) return 0.075
  if (salary <= 3751.05) return 0.15
  if (salary <= 4664.68) return 0.225
  return 0.275
}

function getIrrfDeduction(salary: number): number {
  // Parcela a deduzir IRRF 2024
  if (salary <= 2259.20) return 0
  if (salary <= 2826.65) return 169.44
  if (salary <= 3751.05) return 381.44
  if (salary <= 4664.68) return 662.77
  return 896.00
}

function getMonthName(month: number): string {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]
  return months[month]
}
