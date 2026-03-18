'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface User {
  id: number
  email: string
  nome?: string
  name?: string  // Backend usa 'name'
  role: string
  companyId: number
  avatarUrl?: string | null  // URL do avatar no MinIO
  company?: {
    id: number
    tradeName: string
    cnpj: string
    slug?: string
    logoUrl?: string | null
  }
  employee?: {
    id: number
    name: string
    registrationId: string
  }
  empresa?: {
    id: number
    nomeFantasia: string
    cnpj: string
  }
  funcionario?: {
    id: number
    nome: string
    matricula: string
  }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, senha: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  updateUser: (updates: Partial<User>) => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Carregar usuário autenticado ao iniciar (com retry para conexões lentas/tunnel)
  useEffect(() => {
    const loadUser = async (attempt = 1): Promise<void> => {
      const token = localStorage.getItem('token')
      
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })

        if (response.ok) {
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const userData = await response.json()
            setUser(userData)
            setLoading(false)
            return
          }
          // Resposta OK mas não é JSON (ex: Cloudflare HTML de aviso) — tenta novamente
          if (attempt < 4) {
            setTimeout(() => loadUser(attempt + 1), attempt * 1500)
            return
          }
        } else if (response.status === 401 || response.status === 403) {
          // Token inválido/expirado — remove e desiste
          localStorage.removeItem('token')
        }
        // Outros erros ou esgotou tentativas
        setLoading(false)
      } catch (error) {
        // Erro de rede — tenta novamente até 3 vezes
        if (attempt < 4) {
          setTimeout(() => loadUser(attempt + 1), attempt * 1500)
          return
        }
        console.error('Erro de rede ao carregar usuário (desistindo):', error)
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  const login = async (email: string, senha: string) => {
    try {
      // Conectar com backend
      const response = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password: senha }),
      })

      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json()
          throw new Error(error.message || 'Erro ao fazer login')
        } else {
          throw new Error('Erro ao conectar com o servidor')
        }
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Erro ao conectar com o servidor')
      }

      const data = await response.json()
      
      // Salvar token e usuário
      localStorage.setItem('token', data.accessToken)
      setUser(data.user)

      toast.success(`Bem-vindo, ${data.user.name || data.user.nome}!`)
      
      // Redirecionar por papel (um único login para todos) com URLs amigáveis
      const role = data.user.role

      // Utilitário local para gerar slugs seguros na URL
      const slugify = (value?: string) => {
        if (!value) return ''
        return value
          .toString()
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '') // remove acentos
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')
      }

      const companyName = data.user.company?.tradeName || data.user.empresa?.nomeFantasia
      const employeeName = data.user.employee?.name || data.user.funcionario?.nome || data.user.name || data.user.nome
      const companySlug = slugify(companyName) || (data.user.companyId ? `empresa-${data.user.companyId}` : 'empresa')
      const employeeSlug = slugify(employeeName) || (data.user.employee?.id || data.user.funcionario?.id ? `func-${data.user.employee?.id || data.user.funcionario?.id}` : 'colaborador')

      // SUPER_ADMIN → Admin do sistema
      if (role === 'SUPER_ADMIN') {
        router.push('/admin-webponto')
        return
      }
      
      // COMPANY_ADMIN → Direto para admin da empresa
      if (role === 'COMPANY_ADMIN') {
        router.push(`/admin/${companySlug}`)
        return
      }
      
      // MANAGER/HR/FINANCIAL → Fica na página de login para mostrar modal de escolha
      // O useEffect na página de login vai detectar isAuthenticated e mostrar o modal
      if (role === 'MANAGER' || role === 'HR' || role === 'FINANCIAL') {
        // Não redireciona - deixa a página de login mostrar o modal
        return
      }
      
      // EMPLOYEE → Direto para painel pessoal
      if (role === 'EMPLOYEE' || !!data.user.employee || !!data.user.funcionario) {
        router.push(`/${companySlug}/${employeeSlug}`)
        return
      }
      
      // Fallback
      router.push('/dashboard')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer login')
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    toast.info('Você saiu da sua conta')
    router.push('/login')
  }

  // Recarregar dados do usuário do backend
  const refreshUser = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const response = await fetch(`/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      }
    } catch (error) {
      console.error('Erro ao recarregar usuário:', error)
    }
  }

  // Atualizar dados do usuário localmente (sem fazer request)
  const updateUser = (updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
        updateUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}
