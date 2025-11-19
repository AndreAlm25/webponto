'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useWebSocket } from '@/contexts/WebSocketContext'

// Tipos para mensagens
export interface MessageAttachment {
  id: string
  url: string
  filename: string
  mimeType?: string
  sizeBytes?: number
}

export interface Message {
  id: string
  content: string
  createdAt: string
  isRead: boolean
  senderUserId?: string
  senderEmployeeId?: string
  senderUser?: {
    id: string
    name: string
    avatarUrl?: string
  }
  senderEmployee?: {
    user?: {
      id: string
      name: string
      avatarUrl?: string
    }
    position?: {
      name: string
    }
  }
  attachments?: MessageAttachment[]
}

export interface MessageThread {
  id: string
  employeeId: string
  employeeName: string
  employeePosition: string
  employeeAvatar?: string
  lastMessage?: Message
  unreadCount: number
  status: string
  updatedAt: string
}

// Hook para gerenciar mensagens
export function useMessages() {
  const { user } = useAuth()
  const { connected, socket } = useWebSocket()
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

  // Buscar contador de não lidas
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${apiUrl}/api/messages/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('[useMessages] Erro ao buscar contador:', error)
    }
  }, [user, apiUrl])

  // Buscar threads (admin)
  const fetchThreads = useCallback(async () => {
    if (!user) return []

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${apiUrl}/api/messages/threads`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const threads = await response.json()
        return threads
      }
      return []
    } catch (error) {
      console.error('[useMessages] Erro ao buscar threads:', error)
      return []
    } finally {
      setLoading(false)
    }
  }, [user, apiUrl])

  // Buscar thread do funcionário
  const fetchMyThread = useCallback(async () => {
    try {
      if (!user) {
        return null
      }

      const token = localStorage.getItem('token')
      const url = `${apiUrl}/api/messages/my-thread`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('[useMessages] Erro ao buscar thread:', error)
      return null
    }
  }, [user, apiUrl])

  // Buscar mensagens de uma thread
  const fetchMessages = useCallback(async (threadId: string, page = 1, limit = 50) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        return { messages: [], total: 0, page: 1, limit: 50, hasMore: false }
      }

      const url = `${apiUrl}/api/messages/threads/${threadId}/messages?page=${page}&limit=${limit}`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('[useMessages] Erro ao buscar mensagens:', error)
      return { messages: [], total: 0, page: 1, limit: 50, hasMore: false }
    } finally {
      setLoading(false)
    }
  }, [apiUrl])

  // Enviar mensagem
  const sendMessage = useCallback(async (threadId: string, content: string, attachment?: File) => {
    console.log('[sendMessage] 📤 Enviando...', { 
      threadId, 
      hasContent: !!content.trim(), 
      hasAttachment: !!attachment,
      attachmentName: attachment?.name,
      attachmentType: attachment?.type,
      attachmentSize: attachment?.size
    })
    
    if (!user || (!content.trim() && !attachment)) return null

    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      
      // Sempre enviar content (vazio se não houver texto)
      formData.append('content', content.trim() || '')
      
      if (attachment) {
        console.log('[sendMessage] 📎 Anexando arquivo:', attachment.name)
        formData.append('attachment', attachment)
      }
      
      const url = `${apiUrl}/api/messages/threads/${threadId}/messages`
      console.log('[sendMessage] 🌐 URL:', url)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      console.log('[sendMessage] 📡 Response status:', response.status)
      
      if (response.ok) {
        const message = await response.json()
        console.log('[sendMessage] ✅ Mensagem enviada:', message)
        return message
      } else {
        const errorText = await response.text()
        console.error('[sendMessage] ❌ Erro na resposta:', response.status, errorText)
        return null
      }
    } catch (error) {
      console.error('[sendMessage] ❌ Erro ao enviar mensagem:', error)
      return null
    }
  }, [user, apiUrl])

  // Marcar mensagens como lidas
  const markAsRead = useCallback(async (messageIds: string[]) => {
    if (!user || messageIds.length === 0) return false

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${apiUrl}/api/messages/mark-read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageIds }),
      })

      if (response.ok) {
        // Atualizar contador local
        await fetchUnreadCount()
        return true
      }
      return false
    } catch (error) {
      console.error('[useMessages] Erro ao marcar como lida:', error)
      return false
    }
  }, [user, apiUrl, fetchUnreadCount])

  // Listener WebSocket para novas mensagens
  useEffect(() => {
    if (!connected || !socket) return

    const handleNewMessage = (data: any) => {
      console.log('[useMessages] Nova mensagem recebida:', data)
      // Atualizar contador
      fetchUnreadCount()
    }

    const handleMessageRead = (data: any) => {
      console.log('[useMessages] Mensagem marcada como lida:', data)
      // Atualizar contador
      fetchUnreadCount()
    }

    socket.on('message-received', handleNewMessage)
    socket.on('message-read', handleMessageRead)

    return () => {
      socket.off('message-received', handleNewMessage)
      socket.off('message-read', handleMessageRead)
    }
  }, [connected, socket, fetchUnreadCount])

  // Buscar contador inicial
  useEffect(() => {
    if (user) {
      fetchUnreadCount()
    }
  }, [user, fetchUnreadCount])

  return {
    unreadCount,
    loading,
    fetchThreads,
    fetchMyThread,
    fetchMessages,
    sendMessage,
    markAsRead,
    fetchUnreadCount,
  }
}
