/**
 * 02 - Payroll Config Seed
 * Cria configurações de folha de pagamento para cada empresa
 * com diferentes cenários de permissões para testes
 */

import { PrismaClient } from '@prisma/client'

// Configurações por empresa (identificada pelo tradeName)
const PAYROLL_CONFIGS: Record<string, PayrollConfigData> = {
  // WebPonto Global - Super Admin (configuração mínima)
  'WebPonto Global': {
    enableInss: true,
    enableIrrf: true,
    enableFgts: true,
    enableNightShift: false,
    enableExtraAdvance: false,
    enableTransportVoucher: false,
    enableMealVoucher: false,
    enableHealthInsurance: false,
    enableDentalInsurance: false,
  },

  // Acme Tech - Empresa completa (todos os benefícios)
  'Acme Tech': {
    // Modo de pagamento: FULL (mensal no dia 5)
    paymentMode: 'FULL',
    fullPaymentDay: 5,
    
    // Encargos
    enableInss: true,
    enableIrrf: true,
    enableFgts: true,
    
    // Desconto de atrasos (padrão: true = desconta)
    enableLateDiscount: true,
    
    // Adicional noturno
    enableNightShift: true,
    nightShiftPercentage: 20,
    
    // Vale avulso
    enableExtraAdvance: true,
    maxExtraAdvancePercentage: 50,
    
    // Benefícios
    enableTransportVoucher: true,
    transportVoucherRate: 6,
    enableMealVoucher: true,
    mealVoucherValue: 600,
    mealVoucherDiscount: 0,
    enableHealthInsurance: true,
    healthInsuranceValue: 350,
    enableDentalInsurance: true,
    dentalInsuranceValue: 50,
  },

  // Beta Solutions - Empresa com configuração diferente (SEM desconto de atrasos)
  'Beta Solutions': {
    // Modo de pagamento: ADVANCE (adiantamento + saldo)
    paymentMode: 'ADVANCE',
    advancePercent: 40,
    advancePaymentDay: 15,
    balancePaymentDay: 5,
    
    // Encargos
    enableInss: true,
    enableIrrf: true,
    enableFgts: true,
    
    // Desconto de atrasos: DESABILITADO (registra mas não desconta)
    enableLateDiscount: false,
    
    // Adicional noturno
    enableNightShift: false,
    
    // Vale avulso
    enableExtraAdvance: true,
    maxExtraAdvancePercentage: 40,
    
    // Benefícios
    enableTransportVoucher: true,
    transportVoucherRate: 6,
    enableMealVoucher: false,
    enableHealthInsurance: true,
    healthInsuranceValue: 400,
    enableDentalInsurance: false,
  },
}

interface PayrollConfigData {
  // Modo de pagamento flexível
  paymentMode?: 'FULL' | 'ADVANCE' | 'INSTALLMENTS'
  fullPaymentDay?: number
  advancePercent?: number
  advancePaymentDay?: number
  balancePaymentDay?: number
  installmentCount?: number
  installment1Percent?: number
  installment1Day?: number
  installment2Percent?: number
  installment2Day?: number
  
  // Encargos
  enableInss?: boolean
  enableIrrf?: boolean
  enableFgts?: boolean
  
  // Desconto de atrasos
  enableLateDiscount?: boolean
  
  // Adicional noturno
  enableNightShift?: boolean
  nightShiftStart?: string
  nightShiftEnd?: string
  nightShiftPercentage?: number
  
  // Vale avulso
  enableExtraAdvance?: boolean
  maxExtraAdvancePercentage?: number
  
  // Benefícios
  enableTransportVoucher?: boolean
  transportVoucherRate?: number
  enableMealVoucher?: boolean
  mealVoucherValue?: number
  mealVoucherDiscount?: number
  enableHealthInsurance?: boolean
  healthInsuranceValue?: number
  enableDentalInsurance?: boolean
  dentalInsuranceValue?: number
}

export async function seedPayrollConfig(prisma: PrismaClient): Promise<void> {
  const companies = await prisma.company.findMany()

  console.log(`  → Configurando folha para ${companies.length} empresas`)

  for (const company of companies) {
    const config = PAYROLL_CONFIGS[company.tradeName] || getDefaultConfig()

    // Verificar se já existe configuração
    const existing = await prisma.payrollConfig.findUnique({
      where: { companyId: company.id },
    })

    if (existing) {
      await prisma.payrollConfig.update({
        where: { companyId: company.id },
        data: config,
      })
      console.log(`    ✓ ${company.tradeName}: Configuração atualizada`)
    } else {
      await prisma.payrollConfig.create({
        data: {
          companyId: company.id,
          ...config,
        },
      })
      console.log(`    ✓ ${company.tradeName}: Configuração criada`)
    }

    // Log das permissões habilitadas
    logEnabledFeatures(company.tradeName, config)
  }
}

function getDefaultConfig(): PayrollConfigData {
  return {
    enableInss: true,
    enableIrrf: true,
    enableFgts: true,
    enableNightShift: true,
    enableExtraAdvance: true,
    maxExtraAdvancePercentage: 30,
    enableTransportVoucher: true,
    transportVoucherRate: 6,
    enableMealVoucher: false,
    enableHealthInsurance: false,
    enableDentalInsurance: false,
  }
}

function logEnabledFeatures(companyName: string, config: PayrollConfigData): void {
  const features: string[] = []

  if (config.enableInss) features.push('INSS')
  if (config.enableIrrf) features.push('IRRF')
  if (config.enableFgts) features.push('FGTS')
  if (config.enableNightShift) features.push('Noturno')
  if (config.enableExtraAdvance) features.push('Vale Avulso')
  if (config.enableTransportVoucher) features.push('VT')
  if (config.enableMealVoucher) features.push('VR')
  if (config.enableHealthInsurance) features.push('Saúde')
  if (config.enableDentalInsurance) features.push('Dental')

  if (process.env.NODE_ENV !== 'production') {
    console.log(`      Habilitado: ${features.join(', ')}`)
  }
}
