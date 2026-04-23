'use client'

import { useState, useCallback, useRef } from 'react'

interface Socio {
  nome: string
  qualificacao: string
}

interface CNPJData {
  cnpj: string
  razaoSocial: string
  nomeFantasia: string
  situacao: string
  cnae: string
  cnaeDescricao: string
  endereco: {
    logradouro: string
    numero: string
    complemento: string | null
    bairro: string
    cidade: string
    uf: string
    cep: string
  }
  telefone: string | null
  email: string | null
  capitalSocial: number | null
  naturezaJuridica: string
  porte: string
  dataInicioAtividade: string
  socios: Socio[]
}

interface UseCnpjLookupReturn {
  data: CNPJData | null
  loading: boolean
  error: string | null
  lookup: (cnpj: string) => Promise<void>
  clear: () => void
}

export function useCnpjLookup(): UseCnpjLookupReturn {
  const [data, setData] = useState<CNPJData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const lookup = useCallback(async (cnpj: string) => {
    // Cancelar requisição anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const cleanCNPJ = cnpj.replace(/\D/g, '')
    
    if (cleanCNPJ.length !== 14) {
      setError('CNPJ deve ter 14 dígitos')
      setData(null)
      return
    }

    // Validar dígitos verificadores do CNPJ
    if (!isValidCNPJ(cleanCNPJ)) {
      setError('CNPJ inválido (dígitos verificadores não conferem)')
      setData(null)
      return
    }

    setLoading(true)
    setError(null)
    
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(`/api/cnpj/${cleanCNPJ}`, {
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao consultar CNPJ')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return // Ignorar erros de abort
      }
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const clear = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  return { data, loading, error, lookup, clear }
}

// Função para validar dígitos verificadores do CNPJ
function isValidCNPJ(cnpj: string): boolean {
  // Remove caracteres não numéricos
  cnpj = cnpj.replace(/\D/g, '')

  if (cnpj.length !== 14) return false

  // Elimina CNPJs inválidos conhecidos
  if (/^(\d)\1+$/.test(cnpj)) return false

  // Validação do primeiro dígito verificador
  let sum = 0
  let weight = 5
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cnpj.charAt(i)) * weight
    weight = weight === 2 ? 9 : weight - 1
  }
  let checkDigit1 = 11 - (sum % 11)
  if (checkDigit1 > 9) checkDigit1 = 0
  if (parseInt(cnpj.charAt(12)) !== checkDigit1) return false

  // Validação do segundo dígito verificador
  sum = 0
  weight = 6
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cnpj.charAt(i)) * weight
    weight = weight === 2 ? 9 : weight - 1
  }
  let checkDigit2 = 11 - (sum % 11)
  if (checkDigit2 > 9) checkDigit2 = 0
  if (parseInt(cnpj.charAt(13)) !== checkDigit2) return false

  return true
}

// Função para formatar CNPJ para exibição
export function formatCNPJ(cnpj: string): string {
  const clean = cnpj.replace(/\D/g, '')
  return clean.replace(
    /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
    '$1.$2.$3/$4-$5'
  )
}

// Função para limpar CNPJ (remover formatação)
export function cleanCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '')
}
