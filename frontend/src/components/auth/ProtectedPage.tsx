'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { usePermissions, PERMISSIONS } from '@/hooks/usePermissions'
import { toast } from 'sonner'

interface ProtectedPageProps {
  children: React.ReactNode
  permission: string
  redirectTo?: string
  showError?: boolean
}

// Função para encontrar a primeira página com permissão
function getFirstAllowedPage(hasPermission: (perm: string) => boolean, company: string): string {
  // Ordem de prioridade para redirecionamento
  const routes = [
    { path: `/admin/${company}`, permission: PERMISSIONS.DASHBOARD_VIEW },
    { path: `/admin/${company}/funcionarios`, permission: PERMISSIONS.EMPLOYEES_VIEW },
    { path: `/admin/${company}/analises/registros`, permission: PERMISSIONS.TIME_ENTRIES_VIEW },
    { path: `/admin/${company}/analises/hora-extra`, permission: PERMISSIONS.OVERTIME_VIEW },
    { path: `/admin/${company}/cargos`, permission: PERMISSIONS.POSITIONS_VIEW },
    { path: `/admin/${company}/departamentos`, permission: PERMISSIONS.DEPARTMENTS_VIEW },
    { path: `/admin/${company}/folha-pagamento`, permission: PERMISSIONS.PAYROLL_VIEW },
    { path: `/admin/${company}/vales`, permission: PERMISSIONS.ADVANCES_VIEW },
    { path: `/admin/${company}/terminal-de-ponto`, permission: PERMISSIONS.TERMINAL_VIEW },
    { path: `/admin/${company}/cercas-geograficas`, permission: PERMISSIONS.GEOFENCES_VIEW },
    { path: `/admin/${company}/alertas`, permission: PERMISSIONS.ALERTS_VIEW },
    { path: `/admin/${company}/analises/conformidade-clt`, permission: PERMISSIONS.COMPLIANCE_VIEW },
    { path: `/admin/${company}/configuracoes/dashboard`, permission: PERMISSIONS.SETTINGS_VIEW },
  ]

  for (const route of routes) {
    if (hasPermission(route.permission)) {
      return route.path
    }
  }

  // Se não tem nenhuma permissão, vai para login
  return '/login'
}

export function ProtectedPage({ 
  children, 
  permission, 
  redirectTo,
  showError = true 
}: ProtectedPageProps) {
  const router = useRouter()
  const params = useParams()
  const { hasPermission, loading } = usePermissions()
  const [shouldRedirect, setShouldRedirect] = useState(false)

  useEffect(() => {
    if (!loading && !hasPermission(permission)) {
      setShouldRedirect(true)
      if (showError) {
        toast.error('Você não tem permissão para acessar esta página')
      }
      
      // Redirecionamento inteligente
      let targetRoute = redirectTo
      if (!targetRoute) {
        // Se não especificou redirectTo, encontrar a primeira página permitida
        const company = params.company as string || 'empresa'
        targetRoute = getFirstAllowedPage(hasPermission, company)
      }
      
      // Redirecionar imediatamente sem passar por outras páginas
      router.replace(targetRoute)
    }
  }, [hasPermission, permission, redirectTo, router, loading, showError, params])

  // NUNCA renderizar o conteúdo se não tem permissão
  // Mostrar loading enquanto verifica OU se vai redirecionar
  if (loading || shouldRedirect || !hasPermission(permission)) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {loading ? 'Verificando permissões...' : 'Redirecionando...'}
          </p>
        </div>
      </div>
    )
  }

  // Só renderizar se TEM permissão
  return <>{children}</>
}
