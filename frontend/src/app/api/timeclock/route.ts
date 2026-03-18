import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Backend URL (usar variável de ambiente ou fallback)
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'

/**
 * Função auxiliar para verificar se está próximo de um horário
 * @param targetTime Horário alvo (HH:MM)
 * @param toleranceMinutes Tolerância em minutos (padrão: 30)
 */
function isNearTime(targetTime: string, toleranceMinutes: number = 30): boolean {
  if (!targetTime) return false
  const now = new Date()
  const [hours, minutes] = targetTime.split(':').map(Number)
  const target = new Date()
  target.setHours(hours, minutes, 0, 0)
  const diffMinutes = Math.abs((now.getTime() - target.getTime()) / 60000)
  return diffMinutes <= toleranceMinutes
}

/**
 * Decide o próximo tipo de ponto automaticamente
 * Baseado no último registro e horário configurado do funcionário
 */
function decideNextAction(
  lastType: string | null,
  employeeSchedule: {
    workStart: string
    workEnd: string
    breakStart: string | null
    breakEnd: string | null
  }
): { next: string | null; ambiguous: string[] | null } {
  // Se não tem registro, é ENTRADA
  if (!lastType || lastType === 'CLOCK_OUT') {
    return { next: 'CLOCK_IN', ambiguous: null }
  }
  
  // Se última foi ENTRADA
  if (lastType === 'CLOCK_IN') {
    // Verificar se está próximo do horário de intervalo
    if (employeeSchedule.breakStart && isNearTime(employeeSchedule.breakStart)) {
      return { next: 'BREAK_START', ambiguous: null } // Automático
    }
    // Verificar se está próximo do horário de saída
    if (employeeSchedule.workEnd && isNearTime(employeeSchedule.workEnd)) {
      return { next: 'CLOCK_OUT', ambiguous: null } // Automático
    }
    // Ambíguo: pode ser intervalo OU saída
    return { next: null, ambiguous: ['BREAK_START', 'CLOCK_OUT'] }
  }
  
  // Se última foi INÍCIO DE INTERVALO
  if (lastType === 'BREAK_START') {
    // Verificar se está próximo do fim do intervalo
    if (employeeSchedule.breakEnd && isNearTime(employeeSchedule.breakEnd)) {
      return { next: 'BREAK_END', ambiguous: null } // Automático
    }
    return { next: 'BREAK_END', ambiguous: null } // Sempre fim de intervalo
  }
  
  // Se última foi FIM DE INTERVALO
  if (lastType === 'BREAK_END') {
    // Verificar se está próximo do horário de saída
    if (employeeSchedule.workEnd && isNearTime(employeeSchedule.workEnd)) {
      return { next: 'CLOCK_OUT', ambiguous: null } // Automático
    }
    return { next: 'CLOCK_OUT', ambiguous: null } // Sempre saída
  }
  
  // Fallback
  return { next: 'CLOCK_IN', ambiguous: null }
}

/**
 * POST /api/timeclock
 * Proxy para registrar ponto no backend
 * 
 * Body (JSON):
 *   - type: CLOCK_IN | CLOCK_OUT | BREAK_START | BREAK_END
 *   - method: FACIAL_RECOGNITION | MANUAL | QR_CODE
 *   - employeeId?: number (opcional, apenas para admin)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const body = await request.json()
    
    console.log('[TIMECLOCK] 📥 Recebendo request:', {
      type: body.type,
      method: body.method,
      employeeId: body.employeeId,
      hasAuth: !!authHeader
    })

    // Mapear tipos para o backend
    const tipoMap: Record<string, string> = {
      'CLOCK_IN': 'ENTRADA',
      'CLOCK_OUT': 'SAIDA',
      'BREAK_START': 'INICIO_INTERVALO',
      'BREAK_END': 'FIM_INTERVALO'
    }

    const tipo = tipoMap[body.type] || body.type
    const employeeId = body.employeeId || 2

    // TODO: Chamar backend real para registrar ponto
    // Por enquanto, salvar no localStorage para simular
    
    const timestamp = new Date().toISOString()
    const ponto = {
      id: Date.now(),
      employeeId,
      type: body.type,
      method: body.method || 'FACIAL_RECOGNITION',
      timestamp,
      message: `Ponto registrado: ${tipo}`
    }

    console.log('[TIMECLOCK] ✅ Ponto registrado:', ponto)

    return NextResponse.json(ponto, { status: 200 })
    
  } catch (err) {
    console.error('[TIMECLOCK] Erro:', err)
    const msg = err instanceof Error ? err.message : 'Erro ao registrar ponto'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * GET /api/timeclock
 * Buscar pontos do funcionário
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')

    console.log('[TIMECLOCK] Buscando pontos:', { employeeId })

    // TODO: Chamar backend real
    // Por enquanto, retornar array vazio
    
    return NextResponse.json([], { status: 200 })
    
  } catch (err) {
    console.error('[TIMECLOCK] Erro:', err)
    const msg = err instanceof Error ? err.message : 'Erro ao buscar pontos'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
