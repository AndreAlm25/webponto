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
  const { user, isAuthenticated } = useAuth()
  const [permissions, setPermissions] = useState<string[]>([])
  const [role, setRole] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // WebSocket é opcional (pode não estar disponível)
  let onPermissionsUpdated: ((callback: (data: { userId: string, role: string }) => void) => () => void) | undefined
  try {
    const ws = useWebSocket()
    onPermissionsUpdated = ws.onPermissionsUpdated
  } catch (e) {
    // WebSocket não disponível, continuar sem ele
    onPermissionsUpdated = undefined
  }

  // Buscar permissões do usuário
  const fetchPermissions = useCallback(async () => {
    if (!isAuthenticated) {
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
        console.error('Erro ao buscar permissões:', res.status)
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
  }, [isAuthenticated])

  // Buscar permissões quando autenticar
  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  // Escutar atualizações de permissões via WebSocket
  useEffect(() => {
    if (!user?.id || !onPermissionsUpdated) return

    const unsubscribe = onPermissionsUpdated((data) => {
      // Se a atualização é para este usuário, recarregar permissões
      if (data.userId === String(user.id)) {
        console.log('[Permissions] 🔄 Permissões atualizadas via WebSocket')
        fetchPermissions()
      }
    })

    return unsubscribe
  }, [user?.id, onPermissionsUpdated, fetchPermissions])

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
