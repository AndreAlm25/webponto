/**
 * 03 - Time Entries Seed
 * Gera batidas de ponto para os últimos 4 meses
 * com diferentes cenários de teste para validar cálculos
 * 
 * CENÁRIOS GERADOS:
 * - Mês completo sem faltas
 * - Mês com faltas (algumas justificadas por atestado)
 * - Mês com atrasos
 * - Mês com horas extras (50% e 100%)
 * - Mês com adicional noturno
 * - Batidas com reconhecimento facial (sucesso e falha)
 * 
 * IMPORTANTE: Gera 4 meses de dados para simular empresa em uso
 */

import { PrismaClient } from '@prisma/client'

// Tipos de cenário de batida
type TimeEntryScenario = 
  | 'full-month'           // Mês completo, sem problemas
  | 'with-absences'        // Com faltas
  | 'with-late'            // Com atrasos
  | 'with-overtime'        // Com horas extras
  | 'with-night-shift'     // Com adicional noturno
  | 'half-month'           // Só metade do mês
  | 'vacation'             // Férias (sem batidas)

// Cenários por funcionário (identificado pelo email)
const EMPLOYEE_SCENARIOS: Record<string, EmployeeScenarioConfig> = {
  // ==========================================
  // ACME TECH - Empresa com desconto de atrasos
  // ==========================================
  
  // Paulo Santos - Mês completo com horas extras
  'paulo.santos@acmetech.com.br': {
    scenario: 'with-overtime',
    absences: 0,
    lateCount: 0,
    overtimeHours50: 15,
    overtimeHours100: 8,
    nightShiftHours: 0,
    facialRecognition: {
      enabled: true,
      successRate: 0.95,
      avgSimilarity: 0.92,
    },
  },

  // João da Silva - Com faltas e atrasos
  'joao.silva@acmetech.com.br': {
    scenario: 'with-absences',
    absences: 4,
    lateCount: 3,
    lateMinutesAvg: 30,
    overtimeHours50: 0,
    overtimeHours100: 0,
    nightShiftHours: 0,
    facialRecognition: {
      enabled: true,
      successRate: 0.85,
      avgSimilarity: 0.78,
    },
  },

  // Maria Souza - Perfeito + Noturno
  'maria.souza@acmetech.com.br': {
    scenario: 'with-night-shift',
    absences: 0,
    lateCount: 0,
    overtimeHours50: 0,
    overtimeHours100: 0,
    nightShiftHours: 20,
    facialRecognition: {
      enabled: true,
      successRate: 1.0,
      avgSimilarity: 0.95,
    },
  },

  // Carlos Pereira - Só metade do mês
  'carlos.pereira@acmetech.com.br': {
    scenario: 'half-month',
    absences: 0,
    lateCount: 1,
    lateMinutesAvg: 15,
    overtimeHours50: 5,
    overtimeHours100: 0,
    nightShiftHours: 0,
    facialRecognition: {
      enabled: false,
    },
  },

  // Ana Oliveira - Férias (sem batidas no mês)
  'ana.oliveira@acmetech.com.br': {
    scenario: 'vacation',
    absences: 0,
    lateCount: 0,
    overtimeHours50: 0,
    overtimeHours100: 0,
    nightShiftHours: 0,
    facialRecognition: {
      enabled: true,
      successRate: 0.90,
      avgSimilarity: 0.88,
    },
  },

  // ==========================================
  // BETA SOLUTIONS - Empresa SEM desconto de atrasos
  // ==========================================
  
  // Lucas Ferreira - Mês completo com alguns atrasos (NÃO serão descontados)
  'lucas.ferreira@betasolutions.com.br': {
    scenario: 'with-late',
    absences: 0,
    lateCount: 5,
    lateMinutesAvg: 20,
    overtimeHours50: 0,
    overtimeHours100: 0,
    nightShiftHours: 0,
    facialRecognition: {
      enabled: true,
      successRate: 0.90,
      avgSimilarity: 0.85,
    },
  },

  // Juliana Costa - Mês completo perfeito
  'juliana.costa@betasolutions.com.br': {
    scenario: 'full-month',
    absences: 0,
    lateCount: 0,
    overtimeHours50: 0,
    overtimeHours100: 0,
    nightShiftHours: 0,
    facialRecognition: {
      enabled: true,
      successRate: 0.95,
      avgSimilarity: 0.90,
    },
  },

  // Roberto Almeida - Com horas extras
  'roberto.almeida@betasolutions.com.br': {
    scenario: 'with-overtime',
    absences: 0,
    lateCount: 2,
    lateMinutesAvg: 10,
    overtimeHours50: 10,
    overtimeHours100: 5,
    nightShiftHours: 0,
    facialRecognition: {
      enabled: true,
      successRate: 0.92,
      avgSimilarity: 0.88,
    },
  },
}

interface EmployeeScenarioConfig {
  scenario: TimeEntryScenario
  absences: number
  lateCount: number
  lateMinutesAvg?: number
  overtimeHours50: number
  overtimeHours100: number
  nightShiftHours: number
  facialRecognition: {
    enabled: boolean
    successRate?: number
    avgSimilarity?: number
  }
}

interface TimeEntryData {
  employeeId: string
  companyId: string
  timestamp: Date
  type: 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END'
  method: 'MANUAL' | 'FACIAL_RECOGNITION'
  status: 'VALID' | 'PENDING' | 'INVALID' | 'ADJUSTED'
  recognitionValid?: boolean
  similarity?: number
  livenessScore?: number
  livenessValid?: boolean
  isLate?: boolean
  lateMinutes?: number
  isOvertime?: boolean
  overtimeMinutes?: number
  overtimeType?: 'BEFORE' | 'AFTER' | 'HOLIDAY'
  overtimeRate?: number
}

export async function seedTimeEntries(prisma: PrismaClient): Promise<void> {
  // Buscar todos os funcionários com seus usuários
  const employees = await prisma.employee.findMany({
    include: {
      user: true,
      company: true,
    },
  })

  console.log(`  → Gerando batidas para ${employees.length} funcionários (4 meses)`)

  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  // Calcular os 4 meses (mês atual + 3 anteriores)
  const months: Array<{ month: number; year: number }> = []
  for (let i = 3; i >= 0; i--) {
    let m = currentMonth - i
    let y = currentYear
    if (m < 0) {
      m += 12
      y -= 1
    }
    months.push({ month: m, year: y })
  }

  let totalEntries = 0

  for (const employee of employees) {
    if (!employee.user) continue

    const config = EMPLOYEE_SCENARIOS[employee.user.email] || getDefaultScenario()
    let employeeEntries = 0

    // Gerar batidas para cada um dos 4 meses
    for (let i = 0; i < months.length; i++) {
      const { month, year } = months[i]
      const isCurrentMonth = i === months.length - 1

      const entries = await generateMonthEntries(
        prisma,
        employee,
        year,
        month,
        config,
        isCurrentMonth, // Só até hoje se for mês atual
      )
      employeeEntries += entries
      totalEntries += entries
    }

    // Log de desenvolvimento
    if (process.env.NODE_ENV !== 'production') {
      console.log(`    ✓ ${employee.user.name}: ${employeeEntries} batidas (${config.scenario})`)
    }
  }

  console.log(`  → Total: ${totalEntries} batidas geradas em 4 meses`)
}

function getDefaultScenario(): EmployeeScenarioConfig {
  return {
    scenario: 'full-month',
    absences: 0,
    lateCount: 0,
    overtimeHours50: 0,
    overtimeHours100: 0,
    nightShiftHours: 0,
    facialRecognition: {
      enabled: true,
      successRate: 0.95,
      avgSimilarity: 0.90,
    },
  }
}

async function generateMonthEntries(
  prisma: PrismaClient,
  employee: any,
  year: number,
  month: number,
  config: EmployeeScenarioConfig,
  onlyUntilToday: boolean = false,
): Promise<number> {
  // Se é cenário de férias, não gera batidas
  if (config.scenario === 'vacation') {
    return 0
  }

  const workDays = getWorkDays(year, month, onlyUntilToday)
  
  // Se é cenário de metade do mês, pega só metade dos dias
  const daysToProcess = config.scenario === 'half-month' 
    ? workDays.slice(0, Math.floor(workDays.length / 2))
    : workDays

  // Dias de falta (FIXOS - dias 3, 8, 15, 22 do mês)
  const absenceDays = selectFixedDays(daysToProcess, config.absences, [3, 8, 15, 22])
  
  // Dias de atraso (FIXOS - dias 5, 12, 19, 26 do mês, excluindo faltas)
  const lateDays = selectFixedDays(
    daysToProcess.filter(d => !absenceDays.includes(d)),
    config.lateCount,
    [5, 12, 19, 26, 7],
  )

  // Dias com hora extra (FIXOS - dias 6, 13, 20, 27)
  const overtimeDays50 = selectFixedDays(
    daysToProcess.filter(d => !absenceDays.includes(d)),
    Math.ceil(config.overtimeHours50 / 2), // ~2h por dia
    [6, 13, 20, 27],
  )
  const overtimeDays100 = selectFixedDays(
    daysToProcess.filter(d => !absenceDays.includes(d) && !overtimeDays50.includes(d)),
    Math.ceil(config.overtimeHours100 / 4), // ~4h por dia (fim de semana)
    [4, 11, 18, 25],
  )

  const entries: TimeEntryData[] = []

  for (const day of daysToProcess) {
    // Pular dias de falta
    if (absenceDays.includes(day)) {
      continue
    }

    const isLateDay = lateDays.includes(day)
    const isOvertime50Day = overtimeDays50.includes(day)
    const isOvertime100Day = overtimeDays100.includes(day)
    // Dias de adicional noturno (FIXOS - dias 2, 9, 16, 23)
    const nightShiftFixedDays = [2, 9, 16, 23]
    const isNightShiftDay = config.nightShiftHours > 0 && nightShiftFixedDays.includes(day.getDate())

    // Determinar método de batida (FIXO - facial nos dias pares, manual nos ímpares)
    const useFacial = config.facialRecognition.enabled && day.getDate() % 2 === 0
    const method = useFacial ? 'FACIAL_RECOGNITION' : 'MANUAL'

    // Simular resultado do reconhecimento facial
    let recognitionValid = true
    let similarity = config.facialRecognition.avgSimilarity || 0.90
    let livenessScore = 0.95
    let livenessValid = true
    let status: 'VALID' | 'PENDING' | 'INVALID' = 'VALID'

    if (useFacial) {
      // FIXO - falha de reconhecimento apenas no dia 10 de cada mês
      recognitionValid = day.getDate() !== 10

      if (!recognitionValid) {
        similarity = 0.55 // Valor fixo para falha
        status = 'INVALID'
      } else {
        // Similaridade fixa baseada na config
        similarity = config.facialRecognition.avgSimilarity || 0.90
      }

      // FIXO - falha de liveness apenas no dia 20 de cada mês
      if (day.getDate() === 20) {
        livenessValid = false
        livenessScore = 0.45
        status = 'PENDING'
      }
    }

    // Horários base
    let clockInHour = 8
    let clockInMinute = 0
    let clockOutHour = 18
    let clockOutMinute = 0

    // Aplicar atraso (FIXO - sempre o valor configurado, sem variação)
    if (isLateDay) {
      clockInMinute = config.lateMinutesAvg || 30
    }

    // Aplicar hora extra (FIXO - sem variação de minutos)
    if (isOvertime50Day) {
      clockOutHour = 20
      clockOutMinute = 0
    }
    if (isOvertime100Day) {
      clockOutHour = 22
      clockOutMinute = 0
    }

    // Horário noturno
    if (isNightShiftDay) {
      clockInHour = 22
      clockOutHour = 6
      // Ajustar para o dia seguinte
    }

    // Criar entrada (CLOCK_IN) - segundos fixos em 0
    const clockIn = new Date(day)
    clockIn.setHours(clockInHour, clockInMinute, 0)

    entries.push({
      employeeId: employee.id,
      companyId: employee.companyId,
      timestamp: clockIn,
      type: 'CLOCK_IN',
      method: method as any,
      status,
      recognitionValid: useFacial ? recognitionValid : undefined,
      similarity: useFacial ? similarity : undefined,
      livenessScore: useFacial ? livenessScore : undefined,
      livenessValid: useFacial ? livenessValid : undefined,
      isLate: isLateDay,
      lateMinutes: isLateDay ? clockInMinute : undefined,
    })

    // Criar intervalo (BREAK_START e BREAK_END) - horários fixos
    if (!isNightShiftDay) {
      const breakStart = new Date(day)
      breakStart.setHours(12, 0, 0)
      
      const breakEnd = new Date(day)
      breakEnd.setHours(13, 0, 0)

      entries.push({
        employeeId: employee.id,
        companyId: employee.companyId,
        timestamp: breakStart,
        type: 'BREAK_START',
        method: method as any,
        status: 'VALID',
      })

      entries.push({
        employeeId: employee.id,
        companyId: employee.companyId,
        timestamp: breakEnd,
        type: 'BREAK_END',
        method: method as any,
        status: 'VALID',
      })
    }

    // Criar saída (CLOCK_OUT)
    const clockOut = new Date(day)
    if (isNightShiftDay) {
      clockOut.setDate(clockOut.getDate() + 1)
    }
    clockOut.setHours(clockOutHour, clockOutMinute, 0)

    const overtimeMinutes = isOvertime50Day || isOvertime100Day
      ? (clockOutHour - 18) * 60 + clockOutMinute
      : undefined

    entries.push({
      employeeId: employee.id,
      companyId: employee.companyId,
      timestamp: clockOut,
      type: 'CLOCK_OUT',
      method: method as any,
      status: 'VALID',
      isOvertime: isOvertime50Day || isOvertime100Day,
      overtimeMinutes,
      overtimeType: isOvertime100Day ? 'HOLIDAY' : isOvertime50Day ? 'AFTER' : undefined,
      overtimeRate: isOvertime100Day ? 2.0 : isOvertime50Day ? 1.5 : undefined,
    })
  }

  // Inserir todas as batidas no banco
  if (entries.length > 0) {
    await prisma.timeEntry.createMany({
      data: entries.map(e => ({
        ...e,
        synchronized: true,
      })),
    })
  }

  return entries.length
}

function getWorkDays(year: number, month: number, onlyUntilToday: boolean): Date[] {
  const days: Date[] = []
  const today = new Date()
  
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const lastDay = onlyUntilToday && year === today.getFullYear() && month === today.getMonth()
    ? Math.min(daysInMonth, today.getDate() - 1) // Até ontem
    : daysInMonth

  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month, day)
    const dayOfWeek = date.getDay()
    
    // Pular fins de semana
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days.push(date)
    }
  }

  return days
}

// Seleciona dias FIXOS baseado nos dias do mês especificados
function selectFixedDays(days: Date[], count: number, preferredDays: number[]): Date[] {
  if (count <= 0) return []
  if (count >= days.length) return [...days]
  
  // Selecionar dias que correspondem aos dias preferidos do mês
  const selected: Date[] = []
  for (const preferredDay of preferredDays) {
    if (selected.length >= count) break
    const found = days.find(d => d.getDate() === preferredDay)
    if (found && !selected.includes(found)) {
      selected.push(found)
    }
  }
  
  // Se não conseguiu preencher, pega os primeiros dias disponíveis
  for (const day of days) {
    if (selected.length >= count) break
    if (!selected.includes(day)) {
      selected.push(day)
    }
  }
  
  return selected
}
