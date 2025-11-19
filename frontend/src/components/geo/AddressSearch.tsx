"use client";

// Componente de busca de endereço (Nominatim) com debounce
// - Código em inglês; textos em português

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { InputField } from '@/components/ui/input-field'

type Suggestion = {
  display_name: string
  lat: string
  lon: string
  address?: any
  class?: string
  type?: string
  [key: string]: any
}

export type AddressSearchProps = {
  label?: string
  showLabel?: boolean
  placeholder?: string
  value?: string // modo controlado (texto do input)
  onChangeText?: (text: string) => void // callback para modo controlado
  onSelect: (v: { lat: number; lng: number; label: string }) => void
  cityHint?: string // dica de cidade (ex.: "São Paulo")
  stateHint?: string // dica de estado (ex.: "SP")
}

export function AddressSearch({ label, showLabel = false, placeholder = 'Buscar endereço...', value, onChangeText, onSelect, cityHint, stateHint }: AddressSearchProps) {
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<any>(null)

  const normalize = (s: string) => {
    // Normaliza abreviações comuns para aumentar a assertividade do Nominatim
    return s
      .replace(/^\s*r\.?\s+/i, 'Rua ')
      .replace(/^\s*av\.?\s+/i, 'Avenida ')
      .replace(/^\s*rod\.?\s+/i, 'Rodovia ')
      .replace(/^\s*estr\.?\s+/i, 'Estrada ')
      .trim()
  }

  const fetcher = async (term: string) => {
    console.log('=== FETCHER INICIADO ===')
    console.log('Term:', term)
    console.log('Term length:', term?.length)
    
    if (!term || term.length < 3) {
      console.log('Term muito curto, abortando')
      return
    }
    
    setLoading(true)
    console.log('Loading setado para true')
    
    try {
      // Usa proxy do backend (navegador tem CORS bloqueado)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      const base = `${apiUrl}/api/geocoding/search`
      console.log('Base URL:', base)

      const tryFetch = async (build: () => URL) => {
        const url = build()
        console.log('Fetching URL:', url.toString())
        
        const res = await fetch(url.toString(), {
          headers: {
            "Accept": 'application/json',
            "Accept-Language": 'pt-BR',
            // User-Agent é recomendado pela política do Nominatim
            "User-Agent": 'WebPonto-Geocoder/1.0 (+https://webponto.local)'
          }
        })
        
        console.log('Response status:', res.status)
        console.log('Response ok:', res.ok)
        
        if (!res.ok) {
          console.error('Response not ok, returning empty array')
          return []
        }
        
        const data = await res.json()
        console.log('Response data:', data)
        return data
      }

      let results: Suggestion[] = []

      const norm = normalize(term)

      // Extrai número e rua para buscas estruturadas
      // Exemplos aceitos: "Rua X, 307", "R. X 307", "Av X 1000"
      const match = norm.match(/^(.*?)(?:,\s*|\s+)(\d{1,6})(?:.*)?$/)
      const streetOnly = match ? match[1].trim() : norm
      const numberOnly = match ? match[2].trim() : ''

      // Viewbox aproximada de São Paulo (para sesgar resultados quando SP for indicado)
      const applySaoPauloViewbox = (url: URL) => {
        if ((cityHint && /s\s*ão\s*paulo/i.test(cityHint)) || (stateHint && /^\s*SP\s*$/i.test(stateHint))) {
          // minLon,minLat,maxLon,maxLat
          url.searchParams.set('viewbox', '-46.825,-24.008,-46.365,-23.356')
          // Não usar bounded=1 para não excluir resultados válidos fora da caixa apertada
        }
      }

      // Detecta CEP (formato #####-### ou ########)
      const cepMatch = norm.match(/^\d{5}-?\d{3}$/)
      const isCep = !!cepMatch
      const cep = isCep ? norm.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2') : ''
      
      console.log('Normalized term:', norm)
      console.log('Is CEP?', isCep)
      console.log('CEP:', cep)

      if (isCep) {
        console.log('=== BUSCA POR CEP ===')
        // 1) CEP: usa APENAS ViaCEP, não busca no Nominatim
        try {
          const cepNum = cep.replace('-', '')
          console.log('Buscando ViaCEP:', cepNum)
          
          const via = await fetch(`https://viacep.com.br/ws/${cepNum}/json/`, { headers: { 'Accept': 'application/json' } })
          console.log('ViaCEP status:', via.status)
          
          const v = await via.json()
          console.log('ViaCEP response:', v)
          
          if (v && !v.erro) {
            const logradouro = String(v.logradouro || '').trim()
            const bairro = String(v.bairro || '').trim()
            const localidade = String(v.localidade || '').trim()
            const uf = String(v.uf || '').trim()
            const cepFormatted = String(v.cep || cep).trim()
            
            // Busca coordenadas APENAS para o endereço exato do ViaCEP
            const searchQuery = logradouro 
              ? `${logradouro}, ${bairro}, ${localidade}, ${uf}, Brasil`
              : `${bairro}, ${localidade}, ${uf}, Brasil`
            
            console.log('Searching Nominatim for:', searchQuery)
            
            const coordResults = await tryFetch(() => {
              const url = new URL(base)
              url.searchParams.set('q', searchQuery)
              url.searchParams.set('countrycodes', 'br')
              url.searchParams.set('format', 'json')
              url.searchParams.set('limit', '5')
              url.searchParams.set('addressdetails', '1')
              return url
            })
            
            console.log('Nominatim results:', coordResults)

            // Pega o melhor resultado (prioriza com rua)
            let bestCoord = coordResults.find((r: any) =>
              r.address?.road?.toLowerCase().includes(logradouro.toLowerCase())
            ) || coordResults.find((r: any) =>
              r.address?.suburb?.toLowerCase().includes(bairro.toLowerCase())
            ) || coordResults[0]

            // Se não achou coordenadas boas, tenta buscar só bairro + cidade
            if (!bestCoord && bairro && localidade) {
              console.log('Rua não encontrada, buscando por bairro...')
              const neighborhoodQuery = `${bairro}, ${localidade}, ${uf}, Brasil`
              console.log('Searching neighborhood:', neighborhoodQuery)

              const neighborhoodResults = await tryFetch(() => {
                const url = new URL(base)
                url.searchParams.set('q', neighborhoodQuery)
                url.searchParams.set('countrycodes', 'br')
                url.searchParams.set('format', 'json')
                url.searchParams.set('limit', '10')
                url.searchParams.set('addressdetails', '1')
                // Limita a área para São Paulo para evitar homônimos
                applySaoPauloViewbox(url)
                return url
              })

              console.log('Neighborhood results:', neighborhoodResults)

              // Normalização simples para comparar strings com/sem acento
              const norm = (s: string) => (s || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/\p{Diacritic}/gu, '')

              const alvoBairro = norm(bairro)
              const alvoCidade = norm(localidade)
              const alvoUF = norm(uf)
              const alvoCEP = (cepFormatted || '').replace(/\D/g, '').slice(0, 5) // prefixo do CEP

              // Rankeia os bairros retornados para escolher o melhor
              const ranked = [...neighborhoodResults].sort((a: any, b: any) => {
                const sa = scoreNeighborhood(a)
                const sb = scoreNeighborhood(b)
                return sb - sa
              })

              function scoreNeighborhood(item: any) {
                let s = 0
                const addr = item.address || {}
                const nBairro = norm(addr.suburb || addr.neighbourhood || addr.quarter || '')
                const nCidade = norm(addr.city || addr.town || addr.village || '')
                const nUF = norm(addr.state_code || addr.state || '')
                const pc = String(addr.postcode || '').replace(/\D/g, '')

                if (nBairro && alvoBairro && nBairro.includes(alvoBairro)) s += 4
                if (nCidade && alvoCidade && nCidade.includes(alvoCidade)) s += 3
                if (nUF && alvoUF && nUF.includes(alvoUF)) s += 2
                if (alvoCEP && pc.startsWith(alvoCEP)) s += 1

                // Preferir tipos de place de bairro
                const typ = String(item.type || '').toLowerCase()
                if (typ === 'suburb' || typ === 'neighbourhood' || typ === 'quarter') s += 1
                return s
              }

              bestCoord = ranked[0]
            }
            
            if (bestCoord) {
              // Retorna APENAS o resultado do ViaCEP com coordenadas corretas
              results = [{
                lat: bestCoord.lat,
                lon: bestCoord.lon,
                display_name: logradouro 
                  ? `${logradouro}, ${bairro} - ${localidade} - ${uf}, ${cepFormatted}`
                  : `${bairro} - ${localidade} - ${uf}, ${cepFormatted}`,
                address: {
                  road: logradouro,
                  suburb: bairro,
                  city: localidade,
                  state: uf,
                  postcode: cepFormatted,
                  country: 'Brasil'
                },
                class: 'highway',
                type: 'residential'
              }]
              
              console.log('Final CEP result:', results)
              
              // RETORNA IMEDIATAMENTE - não continua buscando
              const sorted = [...results].sort((a, b) => score(b) - score(a))
              setItems(sorted)
              setLoading(false)
              return
            }
          }
        } catch (err) {
          console.error('CEP search error:', err)
        }
      }

      if (!results.length) {
        console.log('=== BUSCA LIVRE (não é CEP ou CEP falhou) ===')
        // 2) Busca livre DIRETA (mais ampla e flexível que structured)
        // Primeiro tenta com hints
        console.log('Tentando busca com hints...')
        results = await tryFetch(() => {
          const url = new URL(base)
          const parts = [norm]
          if (cityHint) parts.push(cityHint)
          if (stateHint) parts.push(stateHint)
          parts.push('Brasil')
          url.searchParams.set('q', parts.join(', '))
          url.searchParams.set('countrycodes', 'br')
          url.searchParams.set('format', 'json')
          url.searchParams.set('limit', '20')
          url.searchParams.set('addressdetails', '1')
          applySaoPauloViewbox(url)
          return url
        })
        
        // Se não achou com hints, tenta sem viewbox (mais amplo)
        if (!results.length) {
          results = await tryFetch(() => {
            const url = new URL(base)
            url.searchParams.set('q', `${norm}, Brasil`)
            url.searchParams.set('countrycodes', 'br')
            url.searchParams.set('format', 'json')
            url.searchParams.set('limit', '20')
            url.searchParams.set('addressdetails', '1')
            return url
          })
        }
      }


      // Filtragem e priorização por hints e CEP/endereços (quando disponíveis)
      const score = (it: any) => {
        let s = 0
        const addr = it.address || {}
        const display: string = it.display_name || ''
        const cls = (it.class || '').toLowerCase()
        const typ = (it.type || '').toLowerCase()
        // Preferir itens com via/endereço concreto
        if (addr.road) s += 3
        if (addr.house_number) s += 3
        if (cls === 'building' || typ === 'house' || typ === 'residential' || typ === 'address') s += 2
        // Penalizar regiões muito amplas
        if (cls === 'boundary' || typ === 'administrative') s -= 2
        if (/\bbrasil\b/i.test(display)) s += 1
        if (stateHint) {
          if (new RegExp(`\b${stateHint}\b`, 'i').test(display)) s += 2
          if ((addr.state_code && new RegExp(`\b${stateHint}\b`, 'i').test(addr.state_code)) || (addr.state && new RegExp(stateHint, 'i').test(addr.state))) s += 2
        }
        if (cityHint) {
          if (new RegExp(cityHint, 'i').test(display)) s += 2
          if (addr.city && new RegExp(cityHint, 'i').test(addr.city)) s += 2
          if (addr.town && new RegExp(cityHint, 'i').test(addr.town)) s += 1
          if (addr.village && new RegExp(cityHint, 'i').test(addr.village)) s += 1
        }
        // Boost se CEP exato presente
        if (isCep) {
          const cepPlain = cep.replace('-', '')
          const inDisplay = display.replace(/\D/g, '').includes(cepPlain)
          if (addr.postcode && addr.postcode.replace(/\D/g, '') === cepPlain) s += 5
          if (inDisplay) s += 2
        }
        return s
      }

      const sorted = [...results].sort((a, b) => score(b) - score(a))
      
      // Filtragem INTELIGENTE: remove regiões administrativas genéricas, mas aceita cidades/bairros quando relevantes
      const keep = (it: any) => {
        const addr = it.address || {}
        const cls = (it.class || '').toLowerCase()
        const typ = (it.type || '').toLowerCase()
        const display = (it.display_name || '').toLowerCase()
        
        // SEMPRE rejeita: boundaries genéricos e regiões administrativas amplas
        if (cls === 'boundary' && typ === 'administrative') return false
        if (/região (imediata|metropolitana|geográfica|intermediária|sudeste)/i.test(display)) return false
        
        // Aceita endereços concretos (prioridade máxima)
        const hasAddress = !!addr.road || !!addr.house_number
        const isBuilding = cls === 'building' || typ === 'house' || typ === 'residential' || typ === 'address'
        const isHighway = cls === 'highway' || cls === 'amenity'
        if (hasAddress || isBuilding || isHighway) return true
        
        // Aceita cidades, bairros, subúrbios (útil quando usuário busca por eles)
        if (typ === 'city' || typ === 'town' || typ === 'village') return true
        if (typ === 'suburb' || typ === 'neighbourhood' || typ === 'quarter') return true
        if (cls === 'place' && (typ === 'city' || typ === 'town' || typ === 'suburb')) return true
        
        // Rejeita o resto (estados, países, regiões genéricas)
        return false
      }
      
      const filtered = sorted.filter(keep)
      
      // Limpa display_name: remove regiões administrativas do texto
      const cleaned = filtered.map((it: any) => {
        let display = it.display_name || ''
        // Remove todas as regiões administrativas do display_name
        display = display.replace(/, Região Imediata de [^,]+/gi, '')
        display = display.replace(/, Região Metropolitana de [^,]+/gi, '')
        display = display.replace(/, Região Geográfica Intermediária de [^,]+/gi, '')
        display = display.replace(/, Região Sudeste/gi, '')
        display = display.replace(/,\s*,/g, ',').trim()
        return { ...it, display_name: display }
      })
      
      // Agrupa por tipo para melhor apresentação
      const grouped: any[] = []
      const seen = new Set<string>()
      
      // Prioriza endereços com rua/número
      cleaned.forEach((it: any) => {
        const key = `${it.lat},${it.lon}`
        if (!seen.has(key) && (it.address?.road || it.address?.house_number)) {
          grouped.push(it)
          seen.add(key)
        }
      })
      
      // Depois bairros/subúrbios
      cleaned.forEach((it: any) => {
        const key = `${it.lat},${it.lon}`
        if (!seen.has(key) && (it.type === 'suburb' || it.type === 'neighbourhood')) {
          grouped.push(it)
          seen.add(key)
        }
      })
      
      // Por fim cidades
      cleaned.forEach((it: any) => {
        const key = `${it.lat},${it.lon}`
        if (!seen.has(key) && (it.type === 'city' || it.type === 'town')) {
          grouped.push(it)
          seen.add(key)
        }
      })
      
      // Resto
      cleaned.forEach((it: any) => {
        const key = `${it.lat},${it.lon}`
        if (!seen.has(key)) {
          grouped.push(it)
          seen.add(key)
        }
      })
      
      setItems(grouped.length > 0 ? grouped.slice(0, 10) : sorted.slice(0, 5))
    } catch (e) {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const onChange = (v: string) => {
    console.log('=== onChange CHAMADO ===')
    console.log('Valor:', v)
    console.log('onChangeText type:', typeof onChangeText)
    
    if (typeof onChangeText === 'function') onChangeText(v)
    else setQ(v)
    
    // Limpa lista de endereços imediatamente quando usuário começar a digitar
    // Evita que resultados antigos fiquem visíveis enquanto está buscando
    setItems([])
    
    if (timerRef.current) {
      console.log('Limpando timer anterior')
      clearTimeout(timerRef.current)
    }
    
    console.log('Criando novo timer (700ms)')
    timerRef.current = setTimeout(() => {
      console.log('Timer disparado, chamando fetcher')
      fetcher(v)
    }, 700)
  }

  const currentValue = value !== undefined ? value : q

  return (
    <div className="w-full">
      <InputField
        label={label}
        showLabel={showLabel}
        placeholder={placeholder}
        value={currentValue}
        onChange={(val) => onChange(val)}
      />
      {loading && <div className="text-xs text-gray-500 mt-1">Buscando...</div>}
      {items.length > 0 && (
        <div className="mt-2 border rounded divide-y max-h-60 overflow-auto bg-white dark:bg-zinc-900">
          {items.map((it, idx) => {
            const full = (it as any).display_name as string
            return (
              <button
                key={idx}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800"
                onClick={() => {
                  const lat = parseFloat((it as any).lat)
                  const lng = parseFloat((it as any).lon)
                  console.log('AddressSearch: item clicado', { lat, lng, label: full })
                  onSelect({ lat, lng, label: full })
                  setItems([])
                  if (typeof onChangeText === 'function') onChangeText(full)
                  else setQ(full)
                }}
              >
                {full}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
