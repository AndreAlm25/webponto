import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Pegar o FormData da requisição
    const formData = await request.formData()
    
    // URL do backend (usa variável de ambiente para flexibilidade)
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000'
    
    // Fazer proxy para o backend
    const response = await fetch(`${backendUrl}/api/time-entries/facial`, {
      method: 'POST',
      body: formData,
    })
    
    // Pegar a resposta do backend
    const data = await response.json()
    
    // Retornar a resposta
    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    console.error('[PROXY] Erro ao fazer proxy para backend:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao conectar com backend' },
      { status: 500 }
    )
  }
}
