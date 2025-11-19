// Hook: Valida e retorna dados da empresa do usuário logado
// - Verifica se slug da URL corresponde ao slug do usuário
// - Retorna companyId (UUID) para usar nas APIs

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface CompanyData {
  companyId: string
  companySlug: string
  slugMismatch: boolean
  loading: boolean
}

export function useCompanySlug(): CompanyData {
  const params = useParams<{ company: string }>()
  const router = useRouter()
  const urlSlug = String(params?.company || '')
  
  const [companyId, setCompanyId] = useState<string>('')
  const [companySlug, setCompanySlug] = useState<string>('')
  const [slugMismatch, setSlugMismatch] = useState(false)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const fetchUserData = async () => {
      console.log('🔍 [useCompanySlug] Iniciando validação...')
      console.log('🔍 [useCompanySlug] URL Slug recebido:', urlSlug)
      
      try {
        // Busca token do localStorage (mesmo local que AuthContext usa)
        const token = localStorage.getItem('token')
        if (!token) {
          console.warn('⚠️ [useCompanySlug] Token não encontrado no localStorage')
          setLoading(false)
          return
        }
        
        console.log('✅ [useCompanySlug] Token encontrado:', token.substring(0, 20) + '...')
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
        console.log('🌐 [useCompanySlug] Chamando API:', `${apiUrl}/api/auth/me`)
        
        const res = await fetch(`${apiUrl}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        
        console.log('📡 [useCompanySlug] Status da resposta:', res.status)
        
        if (res.ok) {
          const data = await res.json()
          console.log('📦 [useCompanySlug] Dados completos do usuário:', JSON.stringify(data, null, 2))
          
          // Usa company.id (UUID) e company.slug
          const fetchedCompanyId = data.company?.id || data.companyId
          const fetchedSlug = data.company?.slug || ''
          
          console.log('🏢 [useCompanySlug] Company ID extraído:', fetchedCompanyId)
          console.log('🏷️ [useCompanySlug] Slug extraído do banco:', fetchedSlug)
          console.log('🔗 [useCompanySlug] Slug da URL atual:', urlSlug)
          
          setCompanyId(fetchedCompanyId)
          setCompanySlug(fetchedSlug)
          
          // Valida se slug da URL corresponde ao slug do usuário
          if (fetchedSlug && urlSlug !== fetchedSlug) {
            console.error('❌ [useCompanySlug] MISMATCH DETECTADO!')
            console.error(`   URL tem: "${urlSlug}"`)
            console.error(`   Banco tem: "${fetchedSlug}"`)
            console.error(`   Usuário deveria acessar: /admin/${fetchedSlug}`)
            setSlugMismatch(true)
          } else {
            console.log('✅ [useCompanySlug] Slug da URL corresponde ao slug do usuário!')
          }
        } else {
          console.error('❌ [useCompanySlug] Erro ao buscar dados do usuário. Status:', res.status)
          const errorText = await res.text()
          console.error('❌ [useCompanySlug] Resposta de erro:', errorText)
        }
      } catch (e) {
        console.error('❌ [useCompanySlug] Exceção ao buscar dados:', e)
      } finally {
        setLoading(false)
        console.log('🏁 [useCompanySlug] Validação finalizada')
      }
    }
    
    fetchUserData()
  }, [urlSlug])
  
  return {
    companyId,
    companySlug,
    slugMismatch,
    loading
  }
}
