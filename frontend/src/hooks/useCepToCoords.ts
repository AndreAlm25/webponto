// Código em inglês; comentários em português
// Hook: useCepToCoords(cep)
// - Fluxo: ViaCEP -> Geocoding backend (/api/geocoding/search)
// - Retorna: { endereco, lat, lng }

import { useCallback, useEffect, useMemo, useState } from 'react'

export type CepToCoordsResult = {
  endereco: string | null
  lat: number | null
  lng: number | null
}

export function useCepToCoords(cep: string | null) {
  // Estado do hook
  const [loading, setLoading] = useState(false) // pt: carregando
  const [error, setError] = useState<string | null>(null) // pt: erro
  const [data, setData] = useState<CepToCoordsResult>({ endereco: null, lat: null, lng: null }) // pt: dados

  const cleanedCep = useMemo(() => (cep || '').replace(/\D/g, ''), [cep])

  const fetcher = useCallback(async () => {
    if (!cleanedCep || cleanedCep.length !== 8) return
    setLoading(true)
    setError(null)
    try {
      // 1) ViaCEP: obter logradouro/bairro/cidade/UF
      const viaRes = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`)
      if (!viaRes.ok) throw new Error(`ViaCEP status ${viaRes.status}`)
      const via = await viaRes.json()
      if (via.erro) throw new Error('CEP não encontrado no ViaCEP')

      // Monta endereço completo e legível
      const logradouro = (via.logradouro || '').trim()
      const bairro = (via.bairro || '').trim()
      const cidade = (via.localidade || '').trim()
      const uf = (via.uf || '').trim()
      const endereco = [logradouro, bairro, cidade, uf].filter(Boolean).join(', ')

      // 2) Backend geocoding: usar seu proxy (com Nominatim/Overpass/Photon)
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000' // pt: base da API
      const url = new URL(`${apiBase}/api/geocoding/search`)
      url.searchParams.set('q', endereco)
      url.searchParams.set('countrycodes', 'br')
      url.searchParams.set('format', 'json')
      url.searchParams.set('limit', '1')
      url.searchParams.set('addressdetails', '1')

      const geoRes = await fetch(url.toString())
      if (!geoRes.ok) throw new Error(`Geocoding status ${geoRes.status}`)
      const geoData = await geoRes.json()

      let lat: number | null = null
      let lng: number | null = null
      if (Array.isArray(geoData) && geoData.length > 0) {
        const first = geoData[0]
        const latNum = Number(first.lat)
        const lonNum = Number(first.lon)
        if (Number.isFinite(latNum) && Number.isFinite(lonNum)) {
          lat = latNum
          lng = lonNum
        }
      }

      setData({ endereco, lat, lng })
    } catch (e: any) {
      setError(e?.message || 'Erro desconhecido')
      setData({ endereco: null, lat: null, lng: null })
    } finally {
      setLoading(false)
    }
  }, [cleanedCep])

  useEffect(() => {
    fetcher()
  }, [fetcher])

  return { loading, error, ...data, refetch: fetcher }
}
