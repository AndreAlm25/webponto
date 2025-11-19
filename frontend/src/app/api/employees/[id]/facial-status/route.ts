import { NextRequest, NextResponse } from 'next/server'

// Proxy server-side para obter status facial do funcionário
// GET /api/employees/:id/facial-status
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const backendUrl = process.env.BACKEND_URL || 'http://backend:4000'

    const response = await fetch(`${backendUrl}/api/employees/${id}/facial-status`, {
      method: 'GET',
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    console.error('[PROXY] Erro no facial-status:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Erro ao consultar status facial' },
      { status: 500 }
    )
  }
}
