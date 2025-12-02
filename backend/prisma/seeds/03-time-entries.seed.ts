/**
 * 03 - Time Entries Seed
 * Gera batidas de ponto para o mês atual e anterior
 * com diferentes cenários de teste
 * 
 * CENÁRIOS GERADOS:
 * - Mês completo sem faltas
 * - Mês com faltas
 * - Mês com atrasos
 * - Mês com horas extras
 * - Mês com adicional noturno
 * - Batidas com reconhecimento facial (sucesso e falha)
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
      successRate: 0.95,  // 95% de sucesso
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
      successRate: 0.85,  // 85% de sucesso (algumas falhas)
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
      successRate: 1.0,  // 100% sucesso
      avgSimilarity: 0.95,
    },
  },

  // Carlos Pereira - Só metade do mês (entrou recentemente ou saiu)
  'carlos.pereira@acmetech.com.br': {
    scenario: 'half-month',
    absences: 0,
    lateCount: 1,
    lateMinutesAvg: 15,
    overtimeHours50: 5,
    overtimeHours100: 0,
    nightShiftHours: 0,
    facialRecognition: {
      enabled: false,  // Não usa reconhecimento facial
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

  console.log(`  → Gerando batidas para ${employees.length} funcionários`)

  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  // Mês anterior
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear

  let totalEntries = 0

  for (const employee of employees) {
    if (!employee.user) continue

    const config = EMPLOYEE_SCENARIOS[employee.user.email] || getDefaultScenario()

    // Gerar batidas do mês anterior
    const prevEntries = await generateMonthEntries(
      prisma,
      employee,
      prevYear,
      prevMonth,
      config,
    )
    totalEntries += prevEntries

    // Gerar batidas do mês atual (até hoje)
    const currentEntries = await generateMonthEntries(
      prisma,
      employee,
      currentYear,
      currentMonth,
      config,
      true, // Só até hoje
    )
    totalEntries += currentEntries

    // Log de desenvolvimento
    if (process.env.NODE_ENV !== 'production') {
      console.log(`    ✓ ${employee.user.name}: ${prevEntries + currentEntries} batidas (${config.scenario})`)
    }
  }

  console.log(`  → Total: ${totalEntries} batidas geradas`)
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

  // Dias de falta (aleatórios)
  const absenceDays = selectRandomDays(daysToProcess, config.absences)
  
  // Dias de atraso (aleatórios, excluindo faltas)
  const lateDays = selectRandomDays(
    daysToProcess.filter(d => !absenceDays.includes(d)),
    config.lateCount,
  )

  // Dias com hora extra (distribuídos)
  const overtimeDays50 = selectRandomDays(
    daysToProcess.filter(d => !absenceDays.includes(d)),
    Math.ceil(config.overtimeHours50 / 2), // ~2h por dia
  )
  const overtimeDays100 = selectRandomDays(
    daysToProcess.filter(d => !absenceDays.includes(d) && !overtimeDays50.includes(d)),
    Math.ceil(config.overtimeHours100 / 4), // ~4h por dia (fim de semana)
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
    const isNightShiftDay = config.nightShiftHours > 0 && Math.random() < 0.3

    // Determinar método de batida
    const useFacial = config.facialRecognition.enabled && Math.random() < 0.8
    const method = useFacial ? 'FACIAL_RECOGNITION' : 'MANUAL'

    // Simular resultado do reconhecimento facial
    let recognitionValid = true
    let similarity = config.facialRecognition.avgSimilarity || 0.90
    let livenessScore = 0.95
    let livenessValid = true
    let status: 'VALID' | 'PENDING' | 'INVALID' = 'VALID'

    if (useFacial) {
      const successRate = config.facialRecognition.successRate || 0.95
      recognitionValid = Math.random() < successRate

      if (!recognitionValid) {
        // Simular falha de reconhecimento
        similarity = 0.4 + Math.random() * 0.3 // 0.4 a 0.7 (baixa)
        status = 'INVALID'
        
        // Log de desenvolvimento para falhas
        if (process.env.NODE_ENV !== 'production') {
          console.log(`      ⚠ [DEV] Falha facial simulada: ${employee.user.name} em ${day.toLocaleDateString()} (similarity: ${similarity.toFixed(2)})`)
        }
      } else {
        // Variação normal na similaridade
        similarity = (config.facialRecognition.avgSimilarity || 0.90) + (Math.random() * 0.1 - 0.05)
        similarity = Math.min(0.99, Math.max(0.75, similarity))
      }

      // Simular falha de liveness ocasional
      if (Math.random() < 0.02) { // 2% de chance
        livenessValid = false
        livenessScore = 0.3 + Math.random() * 0.3
        status = 'PENDING'
        
        if (process.env.NODE_ENV !== 'production') {
          console.log(`      ⚠ [DEV] Falha liveness simulada: ${employee.user.name} em ${day.toLocaleDateString()}`)
        }
      }
    }

    // Horários base
    let clockInHour = 8
    let clockInMinute = 0
    let clockOutHour = 18
    let clockOutMinute = 0

    // Aplicar atraso
    if (isLateDay) {
      const lateMinutes = config.lateMinutesAvg || 30
      clockInMinute = lateMinutes + Math.floor(Math.random() * 15)
    }

    // Aplicar hora extra
    if (isOvertime50Day) {
      clockOutHour = 20
      clockOutMinute = Math.floor(Math.random() * 30)
    }
    if (isOvertime100Day) {
      clockOutHour = 22
      clockOutMinute = Math.floor(Math.random() * 30)
    }

    // Horário noturno
    if (isNightShiftDay) {
      clockInHour = 22
      clockOutHour = 6
      // Ajustar para o dia seguinte
    }

    // Criar entrada (CLOCK_IN)
    const clockIn = new Date(day)
    clockIn.setHours(clockInHour, clockInMinute, Math.floor(Math.random() * 60))

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

    // Criar intervalo (BREAK_START e BREAK_END)
    if (!isNightShiftDay) {
      const breakStart = new Date(day)
      breakStart.setHours(12, Math.floor(Math.random() * 10), 0)
      
      const breakEnd = new Date(day)
      breakEnd.setHours(13, Math.floor(Math.random() * 10), 0)

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
    clockOut.setHours(clockOutHour, clockOutMinute, Math.floor(Math.random() * 60))

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

function selectRandomDays(days: Date[], count: number): Date[] {
  if (count >= days.length) return [...days]
  
  const shuffled = [...days].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
