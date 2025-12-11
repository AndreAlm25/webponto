'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { useWebSocket } from './WebSocketContext'

// Tipos
export interface PermissionContextType {
  permissions: string[]
  role: string | null
  isAdmin: boolean
  loading: boolean
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  hasAllPermissions: (permissions: string[]) => boolean
  refreshPermissions: () => Promise<void>
}

// Contexto
const PermissionContext = createContext<PermissionContextType | undefined>(undefined)

// Provider
export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [permissions, setPermissions] = useState<string[]>([])
  const [role, setRole] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // WebSocket - chamar hook diretamente no nível superior
  const websocket = useWebSocket()
  const wsConnected = websocket.connected
  const onPermissionsUpdated = websocket.onPermissionsUpdated

  // Buscar permissões do usuário
  const fetchPermissions = useCallback(async () => {
    // IMPORTANTE: Esperar o AuthContext terminar de carregar
    // Se ainda está carregando, não fazer nada (manter loading = true)
    if (authLoading) {
      return
    }

    // Se não está autenticado (e auth já terminou de carregar), limpar permissões
    if (!isAuthenticated) {
      console.log('[Permissions] 🚫 Usuário não autenticado, limpando permissões')
      setPermissions([])
      setRole(null)
      setIsAdmin(false)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      if (!token) {
        console.log('[Permissions] ⚠️ Token não encontrado')
        setLoading(false)
        return
      }

      const api = process.env.NEXT_PUBLIC_API_URL
      const res = await fetch(`${api}/api/permissions/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setPermissions(data.permissions || [])
        setRole(data.role || null)
        setIsAdmin(data.isAdmin || false)
      } else {
        console.error('[Permissions] ❌ Erro ao buscar permissões:', res.status)
        setPermissions([])
        setRole(null)
        setIsAdmin(false)
      }
    } catch (error) {
      console.error('Erro ao buscar permissões:', error)
      setPermissions([])
      setRole(null)
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, authLoading])

  // Buscar permissões quando autenticar
  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  // Escutar atualizações de permissões via WebSocket
  // Importante: depende de wsConnected para re-registrar quando o WebSocket conectar
  useEffect(() => {
    if (!user?.id || !wsConnected || !onPermissionsUpdated) {
      return
    }

    // Pegar o role do usuário diretamente (pode ser do user ou do state)
    const userRole = (user as any)?.role || role

    const unsubscribe = onPermissionsUpdated((data: any) => {
      // Verificar se a atualização é para este usuário (por userId ou por role)
      const isForThisUser = data.userId === String(user.id)
      const isForThisRole = data.role && userRole && data.role === userRole
      
      if (isForThisUser || isForThisRole) {
        fetchPermissions()
      }
    })

    return () => unsubscribe()
  }, [user, role, wsConnected, onPermissionsUpdated, fetchPermissions])

  // Verificar se tem uma permissão específica
  const hasPermission = useCallback((permission: string): boolean => {
    // SUPER_ADMIN e COMPANY_ADMIN têm todas as permissões
    if (role === 'SUPER_ADMIN' || role === 'COMPANY_ADMIN') {
      return true
    }
    return permissions.includes(permission)
  }, [permissions, role])

  // Verificar se tem pelo menos uma das permissões
  const hasAnyPermission = useCallback((perms: string[]): boolean => {
    if (role === 'SUPER_ADMIN' || role === 'COMPANY_ADMIN') {
      return true
    }
    return perms.some(p => permissions.includes(p))
  }, [permissions, role])

  // Verificar se tem todas as permissões
  const hasAllPermissions = useCallback((perms: string[]): boolean => {
    if (role === 'SUPER_ADMIN' || role === 'COMPANY_ADMIN') {
      return true
    }
    return perms.every(p => permissions.includes(p))
  }, [permissions, role])

  // Atualizar permissões manualmente
  const refreshPermissions = useCallback(async () => {
    await fetchPermissions()
  }, [fetchPermissions])

  const value: PermissionContextType = {
    permissions,
    role,
    isAdmin,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions,
  }

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  )
}

// Hook para usar o contexto
export function usePermissions() {
  const context = useContext(PermissionContext)
  if (context === undefined) {
    throw new Error('usePermissions deve ser usado dentro de um PermissionProvider')
  }
  return context
}

// Componente para renderização condicional baseada em permissão
interface CanProps {
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function Can({ permission, permissions, requireAll = false, children, fallback = null }: CanProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions()

  if (loading) {
    return null // Ou um loading spinner
  }

  let hasAccess = false

  if (permission) {
    hasAccess = hasPermission(permission)
  } else if (permissions) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions)
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>
}
