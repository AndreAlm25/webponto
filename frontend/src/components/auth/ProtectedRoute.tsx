// Componente: Protege rotas que requerem autenticação
// - Redireciona para /login se não estiver autenticado
// - Exibe loading enquanto verifica autenticação

"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
}

export function ProtectedRoute({ children, requireAuth = true }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Verifica se há token no localStorage (para evitar redirect prematuro em conexões lentas)
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('token')

  useEffect(() => {
    // Só redireciona se: terminou de carregar E não há usuário E não há token salvo
    if (!loading && requireAuth && !user && !hasToken) {
      router.push('/login')
    }
  }, [user, loading, requireAuth, router, hasToken])

  // Exibe loading enquanto verifica autenticação OU enquanto há token mas user ainda não carregou
  if (loading || (requireAuth && !user && hasToken)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  // Sem token e sem usuário — não renderiza nada (useEffect já redirecionou)
  if (requireAuth && !user) {
    return null
  }

  return <>{children}</>
}
