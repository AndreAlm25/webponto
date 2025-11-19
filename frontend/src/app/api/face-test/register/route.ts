import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Usar URL interna do Docker (servidor) ou fallback para localhost
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://backend:4000'

// PROXY: Redireciona para o backend real
export async function POST(request: NextRequest) {
  try {
    console.log('[REGISTER] BACKEND_URL:', BACKEND_URL)
    console.log('[REGISTER] ENV BACKEND_INTERNAL_URL:', process.env.BACKEND_INTERNAL_URL)
    console.log('[REGISTER] ENV NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL)
    
    const form = await request.formData()
    const userId = (form.get('userId') as string)?.trim()
    const file = form.get('photo') as File | null

    if (!userId || !file) {
      return NextResponse.json({ error: 'userId e photo são obrigatórios' }, { status: 400 })
    }

    // O backend espera employeeId (ID numérico) mas aqui recebemos email
    // Mapear email para ID do funcionário no banco
    const employeeIdMap: Record<string, number> = {
      'joao.silva@empresateste.com.br': 2,
      'maria.santos@empresateste.com.br': 3,
      'pedro.oliveira@empresateste.com.br': 4,
      'admin@empresateste.com.br': 2  // Admin usa mesmo ID que João
    }
    
    const employeeId = employeeIdMap[userId] || 2  // Default: João Silva
    
    console.log('[REGISTER] userId:', userId, '-> employeeId:', employeeId)
    
    // Criar FormData para enviar ao backend
    const backendForm = new FormData()
    backendForm.append('employeeId', employeeId.toString())
    backendForm.append('foto', file)

    const backendUrl = `${BACKEND_URL}/api/time-entries/facial/cadastro`
    console.log('[REGISTER] Chamando backend:', backendUrl)
    
    // Chamar backend real
    const response = await fetch(backendUrl, {
      method: 'POST',
      body: backendForm as any,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || 'Erro ao cadastrar face')
    }

    const result = await response.json()

    return NextResponse.json({ 
      success: true, 
      message: 'Face cadastrada com sucesso!', 
      userId,
      data: result
    })
  } catch (err) {
    console.error('[face-test/register] erro:', err)
    const msg = err instanceof Error ? err.message : 'Erro interno do servidor'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
