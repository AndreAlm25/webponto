import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Backend URL
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'

/**
 * GET /api/timeclock/status-today
 * Retorna status do dia do funcionário autenticado
 * 
 * Retorna:
 * {
 *   lastType: 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END' | null
 *   records: Array de registros de hoje
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    console.log('[STATUS-TODAY] Consultando status do dia:', {
      hasAuth: !!authHeader
    })

    // TODO: Buscar pontos de hoje do backend REAL
    // Por enquanto, retornar vazio (primeira versão - sem persistência)
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // NOTA: localStorage NÃO funciona em API routes (servidor)
    // A lógica de persistência DEVE ser movida para o CLIENTE
    // ou integrada com o backend REAL
    
    const response = {
      lastType: null, // Sempre null = sempre ENTRADA (primeira)
      records: [],
      date: today.toISOString()
    }

    console.log('[STATUS-TODAY] ✅ Status:', response)

    return NextResponse.json(response, { status: 200 })
    
  } catch (err) {
    console.error('[STATUS-TODAY] Erro:', err)
    const msg = err instanceof Error ? err.message : 'Erro ao consultar status'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
