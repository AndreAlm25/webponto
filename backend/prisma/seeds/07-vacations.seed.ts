/**
 * 07 - Vacations Seed
 * Gera períodos aquisitivos e férias para funcionários
 * 
 * CENÁRIOS DE TESTE (baseado nas datas de admissão do seed.json):
 * 
 * ACME TECH:
 * - João Silva (2024-01-15): 1 período adquirido, pode solicitar férias
 * - Maria Souza (2023-11-10): 2 períodos (1º regularizado, 2º adquirido pode solicitar)
 * - Carlos Pereira (2022-06-01): 3 períodos (1º e 2º regularizados, 3º adquirido)
 * - Ana Oliveira (2023-03-20): 2 períodos (1º regularizado, 2º com férias AGENDADAS aguardando assinatura)
 * - Paulo Santos (2024-05-10): Ainda em período aquisitivo (não pode solicitar)
 * 
 * BETA SOLUTIONS:
 * - Lucas Ferreira (2024-02-01): 1 período adquirido com férias AGENDADAS aguardando assinatura
 * - Juliana Costa (2023-08-15): 2 períodos (1º VENCIDO pode solicitar, 2º adquirido pode solicitar)
 * - Roberto Almeida (2022-01-10): 4 períodos (1º, 2º, 3º regularizados, 4º adquirido pode solicitar)
 * 
 * DATA DE REFERÊNCIA: Janeiro/2026
 */

import { PrismaClient, VacationStatus } from '@prisma/client'
import { addDays, subDays, addYears, differenceInYears, isBefore, isAfter } from 'date-fns'

// Data de referência para cálculos (simula "hoje")
const REFERENCE_DATE = new Date('2026-01-29')

// Configuração específica de férias por funcionário
interface VacationScenario {
  // Períodos que devem ser marcados como REGULARIZED (já gozaram férias no passado)
  regularizedPeriods?: number[] // índices dos períodos (1-based)
  // Período com férias AGENDADAS (aguardando assinatura do funcionário)
  scheduledPeriod?: {
    periodIndex: number // índice do período (1-based)
    startDate: string   // data de início das férias
    days: number        // dias de gozo
    soldDays?: number   // dias vendidos (abono)
  }
  // Período VENCIDO (passou do prazo concessivo sem gozar)
  expiredPeriod?: number // índice do período (1-based)
}

const EMPLOYEE_SCENARIOS: Record<string, VacationScenario> = {
  // ACME TECH
  'joao.silva@acmetech.com.br': {
    // 1 período adquirido (2024-01-15 a 2025-01-14) - pode solicitar
    // Nenhuma configuração especial = período disponível para solicitar
  },
  
  'maria.souza@acmetech.com.br': {
    // 2 períodos: 1º (2023-11-10 a 2024-11-09) regularizado, 2º adquirido
    regularizedPeriods: [1],
  },
  
  'carlos.pereira@acmetech.com.br': {
    // 3 períodos: 1º e 2º regularizados, 3º adquirido
    regularizedPeriods: [1, 2],
  },
  
  'ana.oliveira@acmetech.com.br': {
    // 2 períodos: 1º regularizado, 2º com férias agendadas
    regularizedPeriods: [1],
    scheduledPeriod: {
      periodIndex: 2,
      startDate: '2026-03-01', // Março/2026
      days: 30,
      soldDays: 0,
    },
  },
  
  'paulo.santos@acmetech.com.br': {
    // Admitido em 2024-05-10 - ainda em período aquisitivo
    // Não terá nenhum período completo até 2025-05-09
    // Nenhuma configuração = sem períodos disponíveis
  },
  
  // BETA SOLUTIONS
  'lucas.ferreira@betasolutions.com.br': {
    // 1 período adquirido com férias agendadas aguardando assinatura
    scheduledPeriod: {
      periodIndex: 1,
      startDate: '2026-02-15', // Fevereiro/2026
      days: 20,
      soldDays: 10, // Vendeu 10 dias
    },
  },
  
  'juliana.costa@betasolutions.com.br': {
    // 2 períodos: 1º VENCIDO (passou prazo concessivo), 2º adquirido
    expiredPeriod: 1,
  },
  
  'roberto.almeida@betasolutions.com.br': {
    // 4 períodos: 1º, 2º, 3º regularizados, 4º adquirido
    regularizedPeriods: [1, 2, 3],
  },
}

interface AcquisitionPeriod {
  periodNumber: number
  acquisitionStart: Date
  acquisitionEnd: Date
  concessionStart: Date
  concessionEnd: Date
  isAcquired: boolean  // Período aquisitivo completo
  isExpired: boolean   // Passou do prazo concessivo
  isInAcquisition: boolean // Ainda em aquisição
}

/**
 * Calcula todos os períodos aquisitivos desde a admissão até a data de referência
 */
function calculateAcquisitionPeriods(hireDate: Date, referenceDate: Date): AcquisitionPeriod[] {
  const periods: AcquisitionPeriod[] = []
  let periodNumber = 1
  let currentStart = new Date(hireDate)
  
  while (isBefore(currentStart, referenceDate)) {
    const acquisitionEnd = addDays(addYears(currentStart, 1), -1)
    const concessionStart = addDays(acquisitionEnd, 1)
    const concessionEnd = addDays(addYears(concessionStart, 1), -1)
    
    // Período aquisitivo completo se acquisitionEnd já passou
    const isAcquired = isBefore(acquisitionEnd, referenceDate)
    
    // Período vencido se concessionEnd já passou
    const isExpired = isBefore(concessionEnd, referenceDate)
    
    // Ainda em aquisição se acquisitionEnd ainda não chegou
    const isInAcquisition = isAfter(acquisitionEnd, referenceDate) || 
      acquisitionEnd.getTime() === referenceDate.getTime()
    
    periods.push({
      periodNumber,
      acquisitionStart: currentStart,
      acquisitionEnd,
      concessionStart,
      concessionEnd,
      isAcquired,
      isExpired,
      isInAcquisition,
    })
    
    // Próximo período começa no dia seguinte ao fim do anterior
    currentStart = addDays(acquisitionEnd, 1)
    periodNumber++
    
    // Limite de segurança
    if (periodNumber > 10) break
  }
  
  return periods
}

export async function seedVacations(prisma: PrismaClient): Promise<void> {
  console.log(`  → Gerando períodos aquisitivos e férias`)
  console.log(`    📅 Data de referência: ${REFERENCE_DATE.toLocaleDateString('pt-BR')}`)

  // Buscar funcionários com dados completos
  const employees = await prisma.employee.findMany({
    include: {
      user: true,
      company: true,
    },
  })

  let totalVacations = 0
  let totalRequests = 0

  for (const employee of employees) {
    if (!employee.user) continue
    
    const scenario = EMPLOYEE_SCENARIOS[employee.user.email]
    const hireDate = new Date(employee.hireDate)
    
    // Calcular todos os períodos aquisitivos
    const periods = calculateAcquisitionPeriods(hireDate, REFERENCE_DATE)
    
    if (periods.length === 0) {
      console.log(`    ⚠ ${employee.user.name}: Sem períodos aquisitivos completos`)
      continue
    }
    
    console.log(`    → ${employee.user.name} (admissão: ${hireDate.toLocaleDateString('pt-BR')}): ${periods.length} período(s)`)
    
    const baseSalary = Number(employee.baseSalary)
    const dailyRate = baseSalary / 30
    
    for (const period of periods) {
      // Pular períodos ainda em aquisição
      if (period.isInAcquisition) {
        console.log(`      ${period.periodNumber}º período: Em aquisição (${period.acquisitionStart.toLocaleDateString('pt-BR')} - ${period.acquisitionEnd.toLocaleDateString('pt-BR')})`)
        continue
      }
      
      // Verificar se já existe vacation para este período
      const existingVacation = await prisma.vacation.findFirst({
        where: {
          employeeId: employee.id,
          acquisitionStart: period.acquisitionStart,
        },
      })
      
      if (existingVacation) {
        console.log(`      ${period.periodNumber}º período: Já existe`)
        continue
      }
      
      // Determinar status do período
      let status: VacationStatus = 'PENDING'
      let usedDays = 0
      let soldDays = 0
      let remainingDays = 30
      let notes = ''
      
      // Verificar se é período regularizado
      if (scenario?.regularizedPeriods?.includes(period.periodNumber)) {
        status = 'REGULARIZED'
        usedDays = 30
        remainingDays = 0
        notes = 'Férias gozadas integralmente no período concessivo'
      }
      // Verificar se é período vencido
      else if (scenario?.expiredPeriod === period.periodNumber || 
               (period.isExpired && !scenario?.regularizedPeriods?.includes(period.periodNumber))) {
        status = 'PENDING' // Vencido mas ainda pode solicitar
        notes = 'PERÍODO VENCIDO - Ultrapassou prazo concessivo'
      }
      // Verificar se tem férias agendadas
      else if (scenario?.scheduledPeriod?.periodIndex === period.periodNumber) {
        status = 'SCHEDULED'
        soldDays = scenario.scheduledPeriod.soldDays || 0
        usedDays = 0
        remainingDays = 30 - soldDays
        notes = `Férias agendadas para ${scenario.scheduledPeriod.startDate}`
      }
      
      // Criar vacation
      const vacation = await prisma.vacation.create({
        data: {
          companyId: employee.companyId,
          employeeId: employee.id,
          acquisitionStart: period.acquisitionStart,
          acquisitionEnd: period.acquisitionEnd,
          concessionStart: period.concessionStart,
          concessionEnd: period.concessionEnd,
          totalDays: 30,
          soldDays,
          usedDays,
          remainingDays,
          status,
          notes,
        },
      })
      
      totalVacations++
      
      // Se tem férias agendadas, criar os períodos de gozo e VacationRequest
      if (scenario?.scheduledPeriod?.periodIndex === period.periodNumber) {
        const schedConfig = scenario.scheduledPeriod
        const startDate = new Date(schedConfig.startDate)
        const endDate = addDays(startDate, schedConfig.days - 1)
        const paymentDueDate = subDays(startDate, 2)
        
        const baseValue = schedConfig.days * dailyRate
        const bonusValue = baseValue / 3
        const totalValue = baseValue + bonusValue
        
        // Criar período de gozo
        await prisma.vacationPeriod.create({
          data: {
            vacationId: vacation.id,
            periodNumber: 1,
            startDate,
            endDate,
            days: schedConfig.days,
            paymentDueDate,
            baseValue,
            bonusValue,
            totalValue,
            status: 'SCHEDULED',
          },
        })
        
        // Criar VacationRequest com status AWAITING_SIGNATURE
        await prisma.vacationRequest.create({
          data: {
            employeeId: employee.id,
            companyId: employee.companyId,
            vacationId: vacation.id,
            requestedStartDate: startDate,
            requestedDays: schedConfig.days,
            sellDays: schedConfig.soldDays || 0,
            status: 'AWAITING_SIGNATURE',
            employeeNotes: 'Férias agendadas pelo sistema - aguardando assinatura do funcionário',
          },
        })
        
        totalRequests++
        
        let abonoInfo = ''
        if (schedConfig.soldDays && schedConfig.soldDays > 0) {
          const abonoBase = schedConfig.soldDays * dailyRate
          const abonoBonus = abonoBase / 3
          const abonoTotal = abonoBase + abonoBonus
          abonoInfo = ` | Abono: R$ ${abonoTotal.toFixed(2)}`
        }
        
        console.log(`      ${period.periodNumber}º período: AGENDADO (${schedConfig.startDate}, ${schedConfig.days} dias${abonoInfo}) - Aguardando assinatura`)
      }
      // Se é período regularizado
      else if (status === 'REGULARIZED') {
        // Criar período de gozo fictício (já gozou no passado)
        const startDate = addDays(period.concessionStart, 30) // Simula que gozou 1 mês após início concessivo
        const endDate = addDays(startDate, 29)
        const paymentDueDate = subDays(startDate, 2)
        
        const baseValue = 30 * dailyRate
        const bonusValue = baseValue / 3
        const totalValue = baseValue + bonusValue
        
        await prisma.vacationPeriod.create({
          data: {
            vacationId: vacation.id,
            periodNumber: 1,
            startDate,
            endDate,
            days: 30,
            paymentDueDate,
            baseValue,
            bonusValue,
            totalValue,
            status: 'COMPLETED',
          },
        })
        
        console.log(`      ${period.periodNumber}º período: REGULARIZADO (${period.acquisitionStart.toLocaleDateString('pt-BR')} - ${period.acquisitionEnd.toLocaleDateString('pt-BR')})`)
      }
      // Período disponível para solicitar
      else {
        const statusLabel = period.isExpired ? 'VENCIDO' : 'DISPONÍVEL'
        console.log(`      ${period.periodNumber}º período: ${statusLabel} (${period.acquisitionStart.toLocaleDateString('pt-BR')} - ${period.acquisitionEnd.toLocaleDateString('pt-BR')})`)
      }
    }
  }

  console.log(`  ✓ ${totalVacations} períodos de férias criados`)
  console.log(`  ✓ ${totalRequests} solicitações aguardando assinatura`)
  
  // Resumo por empresa
  console.log('\n  📊 Resumo de cenários:')
  console.log('  ┌─────────────────────────────────────────────────────────────────────┐')
  console.log('  │ ACME TECH                                                           │')
  console.log('  │ • João Silva: 1 período DISPONÍVEL para solicitar                   │')
  console.log('  │ • Maria Souza: 1 REGULARIZADO + 1 DISPONÍVEL                        │')
  console.log('  │ • Carlos Pereira: 2 REGULARIZADOS + 1 DISPONÍVEL                    │')
  console.log('  │ • Ana Oliveira: 1 REGULARIZADO + 1 AGENDADO (aguarda assinatura)    │')
  console.log('  │ • Paulo Santos: Em período aquisitivo (não pode solicitar)          │')
  console.log('  ├─────────────────────────────────────────────────────────────────────┤')
  console.log('  │ BETA SOLUTIONS                                                      │')
  console.log('  │ • Lucas Ferreira: 1 AGENDADO (20 dias + 10 vendidos, aguarda assin.)│')
  console.log('  │ • Juliana Costa: 1 VENCIDO + 1 DISPONÍVEL (pode solicitar ambos)    │')
  console.log('  │ • Roberto Almeida: 3 REGULARIZADOS + 1 DISPONÍVEL                   │')
  console.log('  └─────────────────────────────────────────────────────────────────────┘')
}
