/**
 * 04 - Payroll Seed
 * Gera folha de pagamento e holerites para 4 MESES
 * incluindo o mês atual e 3 meses anteriores
 * 
 * CENÁRIOS POR MÊS:
 * - Mês -3 (3 meses atrás): Todos PAID e assinados
 * - Mês -2 (2 meses atrás): Todos PAID e assinados
 * - Mês -1 (mês anterior): Mistura de status (PAID, APPROVED, CALCULATED)
 * - Mês atual: CALCULATED (aguardando aprovação/pagamento)
 * 
 * IMPORTANTE: Gera dados para o MÊS ATUAL para testar o dashboard do funcionário
 */

import { PrismaClient, PayrollStatus, PayslipStatus } from '@prisma/client'
import * as crypto from 'crypto'

// Status de holerite por funcionário para o MÊS ANTERIOR (mês -1)
// Meses anteriores (-2, -3) são todos PAID
// Mês atual é CALCULATED para todos
const PAYSLIP_STATUS_PREV_MONTH: Record<string, PayslipStatusConfig> = {
  // ==========================================
  // ACME TECH
  // ==========================================
  
  // Paulo Santos - Assinado e pago
  'paulo.santos@acmetech.com.br': {
    status: 'PAID',
    signed: true,
    signedDaysAgo: 5,
  },

  // João da Silva - Aprovado mas não assinado (aguardando assinatura)
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

  // ==========================================
  // BETA SOLUTIONS
  // ==========================================
  
  // Lucas Ferreira - Assinado e pago
  'lucas.ferreira@betasolutions.com.br': {
    status: 'PAID',
    signed: true,
    signedDaysAgo: 4,
  },

  // Juliana Costa - Aprovado (aguardando assinatura)
  'juliana.costa@betasolutions.com.br': {
    status: 'APPROVED',
    signed: false,
  },

  // Roberto Almeida - Assinado e pago
  'roberto.almeida@betasolutions.com.br': {
    status: 'PAID',
    signed: true,
    signedDaysAgo: 2,
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

  // Calcular os 4 meses (mês atual + 3 anteriores)
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  const months: Array<{ month: number; year: number; monthIndex: number }> = []
  for (let i = 3; i >= 0; i--) {
    let m = currentMonth - i
    let y = currentYear
    if (m < 0) {
      m += 12
      y -= 1
    }
    months.push({ month: m + 1, year: y, monthIndex: i }) // month é 1-12
  }

  console.log(`  → Gerando folhas de pagamento para 4 meses:`)
  months.forEach(m => console.log(`    - ${getMonthName(m.month - 1)}/${m.year}`))

  for (const company of companies) {
    if (company.employees.length === 0) continue

    let totalPayslips = 0

    // Gerar folha para cada mês
    for (const { month, year, monthIndex } of months) {
      const isCurrentMonth = monthIndex === 0
      const isPrevMonth = monthIndex === 1
      const isOlderMonth = monthIndex >= 2

      // Determinar status da folha
      // PayrollStatus: DRAFT, CALCULATING, REVIEW, APPROVED, PAID, CANCELLED
      let payrollStatus: PayrollStatus = 'PAID'
      let closedAt: Date | null = new Date(year, month - 1, 28)
      let paidAt: Date | null = new Date(year, month, 5)

      if (isCurrentMonth) {
        payrollStatus = 'DRAFT' // Mês atual: em elaboração
        closedAt = null
        paidAt = null
      } else if (isPrevMonth) {
        payrollStatus = 'APPROVED' // Mês anterior: aprovada mas não paga
        paidAt = null
      }

      // Criar folha de pagamento
      const payroll = await prisma.payroll.create({
        data: {
          companyId: company.id,
          referenceMonth: month,
          referenceYear: year,
          status: payrollStatus,
          totalGross: 0,
          totalDeductions: 0,
          totalNet: 0,
          totalEmployees: company.employees.length,
          closedAt,
          closedBy: null,
          paidAt,
        },
      })

      let totalGross = 0
      let totalDeductions = 0
      let totalNet = 0

      // Criar holerites para cada funcionário
      for (const employee of company.employees) {
        if (!employee.user) continue

        // Determinar status do holerite baseado no mês
        let config: PayslipStatusConfig
        if (isCurrentMonth) {
          // Mês atual: CALCULATED (aguardando aprovação)
          config = { status: 'CALCULATED', signed: false }
        } else if (isPrevMonth) {
          // Mês anterior: usar configuração específica
          config = PAYSLIP_STATUS_PREV_MONTH[employee.user.email] || { status: 'CALCULATED', signed: false }
        } else {
          // Meses mais antigos: todos PAID e assinados
          config = { status: 'PAID', signed: true, signedDaysAgo: 30 + (monthIndex * 30) }
        }

        const payrollConfig = company.payrollConfig

        // Calcular valores do holerite
        const payslipData = calculatePayslip(employee, payrollConfig, month - 1, year)

        // Dados de assinatura
        let signatureData = {}
        if (config.signed) {
          const signedAt = new Date()
          signedAt.setDate(signedAt.getDate() - (config.signedDaysAgo || 1))
          
          const documentHash = crypto
            .createHash('sha256')
            .update(`${employee.id}-${month}-${year}-${payslipData.netSalary}`)
            .digest('hex')

          signatureData = {
            viewedAt: new Date(signedAt.getTime() - 60000),
            scrolledToEnd: true,
            scrolledAt: new Date(signedAt.getTime() - 30000),
            signedAt,
            signedByIp: '192.168.1.' + Math.floor(Math.random() * 255),
            signedByDevice: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            documentHash,
            signatureTerms: true,
          }
        }

        await prisma.payslip.create({
          data: {
            companyId: company.id,
            employeeId: employee.id,
            payrollId: payroll.id,
            referenceMonth: month,
            referenceYear: year,
            status: config.status as PayslipStatus,
            
            // Dados do funcionário (snapshot)
            employeeName: employee.user.name,
            employeePosition: employee.position?.name || null,
            employeeDepartment: employee.department?.name || null,
            employeeRegistration: employee.registrationId,
            
            // Valores calculados
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
            lateDiscounted: payslipData.lateDiscounted,
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
        totalPayslips++

        // Log apenas para mês atual
        if (isCurrentMonth && process.env.NODE_ENV !== 'production') {
          console.log(`    📊 ${employee.user.name}: R$ ${payslipData.netSalary.toFixed(2)} (${config.status})`)
        }
      }

      // Atualizar totais da folha
      await prisma.payroll.update({
        where: { id: payroll.id },
        data: { totalGross, totalDeductions, totalNet },
      })
    }

    console.log(`    ✓ ${company.tradeName}: ${totalPayslips} holerites gerados (4 meses)`)
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
  const inssCalc = calculateInss(inssBase)
  const inssValue = config?.enableInss ? inssCalc.value : 0
  const inssRate = inssCalc.rate

  const irrfBase = grossSalary - inssValue
  const irrfCalc = calculateIrrf(irrfBase)
  const irrfValue = config?.enableIrrf ? irrfCalc.value : 0
  const irrfRate = irrfCalc.rate

  const transportVoucher = config?.enableTransportVoucher 
    ? baseSalary * (parseFloat(config.transportVoucherRate?.toString() || '6') / 100)
    : 0

  const healthInsurance = config?.enableHealthInsurance 
    ? parseFloat(config.healthInsuranceValue?.toString() || '0')
    : 0

  const dentalInsurance = config?.enableDentalInsurance 
    ? parseFloat(config.dentalInsuranceValue?.toString() || '0')
    : 0

  // Atrasos: só desconta se enableLateDiscount === true
  const lateDiscounted = config?.enableLateDiscount === true
  const lateDeductionFinal = lateDiscounted ? lateDeduction : 0

  const totalDeductions = inssValue + irrfValue + transportVoucher + healthInsurance + dentalInsurance + lateDeductionFinal + absenceDeduction

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
    inssRate, // Já vem como percentual (ex: 9.97)
    inssValue,
    irrfBase,
    irrfRate, // Já vem como percentual (ex: 5.12)
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
    lateDiscounted,
    totalDeductions,
    fgtsBase,
    fgtsValue,
    netSalary,
  }
}

function calculateInss(salary: number): { value: number; rate: number } {
  // Tabela INSS 2024 - Cálculo PROGRESSIVO por faixas
  const faixas = [
    { limite: 1412.00, aliquota: 0.075 },
    { limite: 2666.68, aliquota: 0.09 },
    { limite: 4000.03, aliquota: 0.12 },
    { limite: 7786.02, aliquota: 0.14 }, // Teto INSS
  ]
  
  let inssTotal = 0
  let salarioRestante = Math.min(salary, 7786.02) // Teto INSS
  let faixaAnterior = 0
  
  for (const faixa of faixas) {
    if (salarioRestante <= 0) break
    const baseCalculo = Math.min(salarioRestante, faixa.limite - faixaAnterior)
    inssTotal += baseCalculo * faixa.aliquota
    salarioRestante -= baseCalculo
    faixaAnterior = faixa.limite
  }
  
  // Alíquota efetiva
  const aliquotaEfetiva = salary > 0 ? (inssTotal / salary) * 100 : 0
  
  return { value: inssTotal, rate: aliquotaEfetiva }
}

function calculateIrrf(baseCalculo: number): { value: number; rate: number } {
  // Tabela IRRF 2024 - Base de cálculo = Salário Bruto - INSS
  // Faixas e parcelas a deduzir
  const faixas = [
    { limite: 2259.20, aliquota: 0, deducao: 0 },
    { limite: 2826.65, aliquota: 0.075, deducao: 169.44 },
    { limite: 3751.05, aliquota: 0.15, deducao: 381.44 },
    { limite: 4664.68, aliquota: 0.225, deducao: 662.77 },
    { limite: Infinity, aliquota: 0.275, deducao: 896.00 },
  ]
  
  for (const faixa of faixas) {
    if (baseCalculo <= faixa.limite) {
      const irrf = Math.max(0, baseCalculo * faixa.aliquota - faixa.deducao)
      const aliquotaEfetiva = baseCalculo > 0 ? (irrf / baseCalculo) * 100 : 0
      return { value: irrf, rate: aliquotaEfetiva }
    }
  }
  
  return { value: 0, rate: 0 }
}

function getMonthName(month: number): string {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]
  return months[month]
}
