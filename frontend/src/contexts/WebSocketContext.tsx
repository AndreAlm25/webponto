"use client"
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'

// Tipos dos eventos WebSocket
interface TimeEntry {
  id: string
  employeeId: string
  type: string
  timestamp: string
  [key: string]: any
}

interface Employee {
  id: string
  companyId: string
  [key: string]: any
}

interface DashboardConfig {
  id: string
  dashboardShowRecentEntries: boolean
  dashboardRecentEntriesLimit: number
}

interface WebSocketContextType {
  socket: Socket | null
  connected: boolean
  // Callbacks para eventos
  onTimeEntryCreated: (callback: (timeEntry: TimeEntry) => void) => () => void
  onTimeEntryUpdated: (callback: (timeEntry: TimeEntry) => void) => () => void
  onTimeEntryDeleted: (callback: (data: { id: string }) => void) => () => void
  onEmployeeCreated: (callback: (employee: Employee) => void) => () => void
  onEmployeeUpdated: (callback: (employee: Employee) => void) => () => void
  onEmployeeDeleted: (callback: (data: { id: string }) => void) => () => void
  onFaceRegistered: (callback: (data: { employeeId: string }) => void) => () => void
  onFaceDeleted: (callback: (data: { employeeId: string }) => void) => () => void
  onDashboardConfigUpdated: (callback: (config: DashboardConfig) => void) => () => void
  onPermissionsUpdated: (callback: (data: { userId: string, role: string }) => void) => () => void
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    // Só conectar se tiver usuário autenticado com ID
    if (!user || !(user as any)?.id) {
      if (socket) {
        socket.disconnect()
        setSocket(null)
        setConnected(false)
      }
      return
    }

    // Se já tem socket conectado, não criar outro
    if (socket?.connected) {
      return
    }

    // Obter URL do backend e token JWT
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    const token = localStorage.getItem('token')
    

    // Criar conexão WebSocket com autenticação
    const newSocket = io(backendUrl, {
      transports: ['polling', 'websocket'], // Polling primeiro para evitar falhas
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      timeout: 20000,
      auth: {
        token: token
      }
    })

    // Eventos de conexão
    newSocket.on('connect', () => {
      setConnected(true)

      // Entrar na sala da empresa
      const companyId = (user as any)?.company?.id || (user as any)?.companyId
      const userId = (user as any)?.id

      if (companyId) {
        newSocket.emit('join-company', { companyId, userId })
      }
    })

    newSocket.on('disconnect', () => {
      setConnected(false)
    })

    newSocket.on('connect_error', () => {
      // Silenciar erro de conexão
    })

    newSocket.on('reconnect', () => {
      // Reconectado
    })

    setSocket(newSocket)

    // Cleanup ao desmontar
    return () => {
      if (newSocket) {
        const companyId = (user as any)?.company?.id || (user as any)?.companyId
        if (companyId) {
          newSocket.emit('leave-company', { companyId })
        }
        newSocket.disconnect()
      }
    }
  }, [user])

  // Função helper para registrar listeners
  const registerListener = useCallback(
    (event: string, callback: (...args: any[]) => void) => {
      if (!socket) {
        return () => {}
      }

      socket.on(event, callback)

      // Retornar função de cleanup
      return () => {
        socket.off(event, callback)
      }
    },
    [socket]
  )

  // Métodos para registrar callbacks
  const onTimeEntryCreated = useCallback(
    (callback: (timeEntry: TimeEntry) => void) => {
      return registerListener('time-entry-created', callback)
    },
    [registerListener]
  )

  const onTimeEntryUpdated = useCallback(
    (callback: (timeEntry: TimeEntry) => void) => {
      return registerListener('time-entry-updated', callback)
    },
    [registerListener]
  )

  const onTimeEntryDeleted = useCallback(
    (callback: (data: { id: string }) => void) => {
      return registerListener('time-entry-deleted', callback)
    },
    [registerListener]
  )

  const onEmployeeCreated = useCallback(
    (callback: (employee: Employee) => void) => {
      return registerListener('employee-created', callback)
    },
    [registerListener]
  )

  const onEmployeeUpdated = useCallback(
    (callback: (employee: Employee) => void) => {
      return registerListener('employee-updated', callback)
    },
    [registerListener]
  )

  const onEmployeeDeleted = useCallback(
    (callback: (data: { id: string }) => void) => {
      return registerListener('employee-deleted', callback)
    },
    [registerListener]
  )

  const onFaceRegistered = useCallback(
    (callback: (data: { employeeId: string }) => void) => {
      return registerListener('face-registered', callback)
    },
    [registerListener]
  )

  const onFaceDeleted = useCallback(
    (callback: (data: { employeeId: string }) => void) => {
      return registerListener('face-deleted', callback)
    },
    [registerListener]
  )

  const onDashboardConfigUpdated = useCallback(
    (callback: (config: DashboardConfig) => void) => {
      return registerListener('dashboard-config-updated', callback)
    },
    [registerListener]
  )

  const onPermissionsUpdated = useCallback(
    (callback: (data: { userId: string, role: string }) => void) => {
      return registerListener('permissions-updated', callback)
    },
    [registerListener]
  )

  const value: WebSocketContextType = {
    socket,
    connected,
    onTimeEntryCreated,
    onTimeEntryUpdated,
    onTimeEntryDeleted,
    onEmployeeCreated,
    onEmployeeUpdated,
    onEmployeeDeleted,
    onFaceRegistered,
    onFaceDeleted,
    onDashboardConfigUpdated,
    onPermissionsUpdated,
  }

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket deve ser usado dentro de WebSocketProvider')
  }
  return context
}
