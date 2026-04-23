import { NextResponse } from 'next/server'

interface QSASocio {
  nome_socio: string
  qualificacao_socio: string
  identificador_socio: number
}

interface BrasilAPICNPJResponse {
  cnpj: string
  razao_social: string
  nome_fantasia: string | null
  situacao_cadastral: string
  descricao_situacao_cadastral: string
  cnae_fiscal: string
  cnae_fiscal_descricao: string
  logradouro: string
  numero: string
  complemento: string | null
  bairro: string
  municipio: string
  uf: string
  cep: string
  ddd_telefone_1: string | null
  email: string | null
  qtd_funcionarios: number | null
  capital_social: number | null
  natureza_juridica: string
  porte: string
  data_inicio_atividade: string
  qsa: QSASocio[] | null
}

export async function GET(
  request: Request,
  { params }: { params: { cnpj: string } }
) {
  try {
    const { cnpj } = params
    
    // Remover caracteres não numéricos
    const cleanCNPJ = cnpj.replace(/\D/g, '')
    
    // Validar formato
    if (cleanCNPJ.length !== 14) {
      return NextResponse.json(
        { error: 'CNPJ deve ter 14 dígitos' },
        { status: 400 }
      )
    }

    // Consultar BrasilAPI
    const response = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (WebPonto/1.0; +https://ponto.conectarmais.com.br)',
        }
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'CNPJ não encontrado na Receita Federal' },
          { status: 404 }
        )
      }
      if (response.status === 400) {
        return NextResponse.json(
          { error: 'CNPJ inválido ou não encontrado na base da Receita Federal' },
          { status: 400 }
        )
      }
      throw new Error(`BrasilAPI retornou ${response.status}`)
    }

    const data: BrasilAPICNPJResponse = await response.json()

    // Verificar se está ativa (BrasilAPI: 2 = ATIVA)
    if (String(data.situacao_cadastral) !== '2') {
      return NextResponse.json(
        { 
          error: `CNPJ com situação ${data.descricao_situacao_cadastral}. Empresa deve estar ativa para cadastro.`,
          situacao: data.descricao_situacao_cadastral
        },
        { status: 400 }
      )
    }

    // Formatar resposta
    return NextResponse.json({
      cnpj: cleanCNPJ,
      razaoSocial: data.razao_social,
      nomeFantasia: data.nome_fantasia || data.razao_social,
      situacao: data.descricao_situacao_cadastral,
      cnae: data.cnae_fiscal,
      cnaeDescricao: data.cnae_fiscal_descricao,
      endereco: {
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        cidade: data.municipio,
        uf: data.uf,
        cep: data.cep?.replace(/\D/g, '')
      },
      telefone: data.ddd_telefone_1,
      email: data.email,
      capitalSocial: data.capital_social,
      naturezaJuridica: data.natureza_juridica,
      porte: data.porte,
      dataInicioAtividade: data.data_inicio_atividade,
      socios: data.qsa?.map(s => ({
        nome: s.nome_socio,
        qualificacao: s.qualificacao_socio
      })) || []
    })

  } catch (error) {
    console.error('Erro ao consultar CNPJ:', error)
    return NextResponse.json(
      { error: 'Erro ao consultar CNPJ. Tente novamente.' },
      { status: 500 }
    )
  }
}
