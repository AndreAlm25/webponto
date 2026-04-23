import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      tradeName,
      legalName,
      cnpj,
      email,
      adminName,
      adminEmail,
      adminPassword
    } = body

    // Validações básicas
    if (!tradeName || !legalName || !cnpj || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { message: 'Todos os campos obrigatórios devem ser preenchidos' },
        { status: 400 }
      )
    }

    if (adminPassword.length < 6) {
      return NextResponse.json(
        { message: 'Senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Validar formato CNPJ
    const cleanCNPJ = cnpj.replace(/\D/g, '')
    if (cleanCNPJ.length !== 14) {
      return NextResponse.json(
        { message: 'CNPJ inválido' },
        { status: 400 }
      )
    }

    // Verificar se a API backend está configurada (server-side usa URL interna)
    const apiUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    
    // Fazer requisição para o backend
    const response = await fetch(`${apiUrl}/api/auth/register-company`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tradeName,
        legalName,
        cnpj: cleanCNPJ,
        email: email || adminEmail,
        adminName,
        adminEmail,
        adminPassword,
        plan: 'TRIAL' // Plano trial de 14 dias
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: 'Erro ao comunicar com servidor'
      }))
      
      return NextResponse.json(
        { message: errorData.message || 'Erro ao criar empresa' },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      message: 'Empresa cadastrada com sucesso',
      company: data.company,
      admin: data.admin
    })

  } catch (error) {
    console.error('Erro no registro:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
