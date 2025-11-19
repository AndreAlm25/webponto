import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Usar URL interna do Docker (servidor) ou fallback para localhost
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://backend:4000'

// PROXY: Redireciona para o backend real
export async function POST(request: NextRequest) {
  try {
    console.log('[RECOGNIZE] BACKEND_URL:', BACKEND_URL)
    
    const form = await request.formData()
    const file = form.get('photo') as File | null

    if (!file) {
      return NextResponse.json({ error: 'photo é obrigatório' }, { status: 400 })
    }

    // Criar FormData para enviar ao backend
    const backendForm = new FormData()
    backendForm.append('foto', file)

    const backendUrl = `${BACKEND_URL}/api/time-entries/facial`
    console.log('[RECOGNIZE] Chamando backend:', backendUrl)
    
    // Chamar backend real - POST /api/time-entries/facial
    const response = await fetch(backendUrl, {
      method: 'POST',
      body: backendForm as any,
    })

    if (!response.ok) {
      const error = await response.text()
      
      // Tratar erros específicos
      if (error.includes('não reconhecido')) {
        return NextResponse.json({ 
          success: false,
          error: 'Rosto não reconhecido'
        }, { status: 404 })
      }
      
      if (error.includes('baixa confiança')) {
        return NextResponse.json({ 
          success: false,
          error: error
        }, { status: 404 })
      }
      
      throw new Error(error || 'Erro ao reconhecer face')
    }

    const result = await response.json()
    
    // O backend retorna { ponto, funcionario, tipo }
    // Precisamos adaptar para o formato que o frontend espera
    const funcionario = result.funcionario || {}
    const ponto = result.ponto || {}

    return NextResponse.json({ 
      success: true, 
      userId: funcionario.email || funcionario.matricula || funcionario.id?.toString(),
      similarity: ponto.similarity || 1,
      data: {
        userId: funcionario.email || funcionario.matricula || funcionario.id?.toString(),
        similarity: ponto.similarity || 1,
        funcionario,
        ponto,
        tipo: result.tipo
      },
      // Adicionar dados para compatibilidade com componente antigo
      employeeData: {
        id: funcionario.id?.toString(),
        name: funcionario.nome,
        email: funcionario.email || `func${funcionario.id}@empresa.com`,
        position: 'Funcionário',
        role: 'FUNCIONARIO'
      },
      type: result.tipo,
      timestamp: ponto.dataHora || new Date().toISOString(),
      clockResult: {
        success: true,
        message: `Ponto registrado: ${result.tipo}`
      }
    })
  } catch (err) {
    console.error('[face-test/recognize-one] erro:', err)
    const msg = err instanceof Error ? err.message : 'Erro interno do servidor'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
