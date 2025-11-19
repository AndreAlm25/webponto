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

  useEffect(() => {
    console.log('🔒 [ProtectedRoute] Verificando autenticação...')
    console.log('   - loading:', loading)
    console.log('   - user:', user ? 'autenticado' : 'não autenticado')
    console.log('   - requireAuth:', requireAuth)

    if (!loading && requireAuth && !user) {
      console.error('❌ [ProtectedRoute] Usuário não autenticado! Redirecionando para /login')
      router.push('/login')
    }
  }, [user, loading, requireAuth, router])

  // Exibe loading enquanto verifica autenticação
  if (loading) {
    console.log('⏳ [ProtectedRoute] Verificando autenticação...')
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  // Se requer autenticação mas não está autenticado, não renderiza nada
  // (o useEffect já redirecionou para /login)
  if (requireAuth && !user) {
    console.log('🚫 [ProtectedRoute] Bloqueando acesso - usuário não autenticado')
    return null
  }

  // Usuário autenticado, renderiza conteúdo
  console.log('✅ [ProtectedRoute] Usuário autenticado, permitindo acesso')
  return <>{children}</>
}
