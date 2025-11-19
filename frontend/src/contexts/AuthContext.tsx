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
  company?: {
    id: number
    tradeName: string
    cnpj: string
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

  // Carregar usuário autenticado ao iniciar
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token')
      
      if (!token) {
        setLoading(false)
        return
      }

      // Buscar dados do usuário no backend
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
        const response = await fetch(`${apiUrl}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const userData = await response.json()
            setUser(userData)
          } else {
            // Resposta inválida, remover token
            localStorage.removeItem('token')
          }
        } else {
          // Token inválido, remover
          localStorage.removeItem('token')
        }
      } catch (error) {
        console.error('Erro ao carregar usuário:', error)
        localStorage.removeItem('token')
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  const login = async (email: string, senha: string) => {
    try {
      // Conectar com backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      const response = await fetch(`${apiUrl}/api/auth/login`, {
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

      let nextRoute = '/dashboard'
      if (role === 'SUPER_ADMIN') {
        nextRoute = '/admin-webponto'
      } else if (role === 'COMPANY_ADMIN' || role === 'MANAGER' || role === 'HR' || role === 'FINANCIAL') {
        nextRoute = `/admin/${companySlug}`
      } else if (role === 'EMPLOYEE' || !!data.user.employee || !!data.user.funcionario) {
        nextRoute = `/${companySlug}/${employeeSlug}`
      } else {
        nextRoute = '/dashboard'
      }
      router.push(nextRoute)
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      const response = await fetch(`${apiUrl}/api/auth/me`, {
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
