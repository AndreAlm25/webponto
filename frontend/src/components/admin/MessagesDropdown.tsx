'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { MessageSquare, Loader2 } from 'lucide-react'
import { useMessages, MessageThread } from '@/hooks/useMessages'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { Comfortaa } from 'next/font/google'
import Image from 'next/image'
import { getFileUrl } from '@/utils/files'

const comfortaa = Comfortaa({ subsets: ['latin'], weight: ['400', '700'] })

export default function MessagesDropdown() {
  const router = useRouter()
  const params = useParams<{ company: string }>()
  const { connected, socket } = useWebSocket()
  const { unreadCount, fetchThreads, fetchUnreadCount } = useMessages()
  const [isOpen, setIsOpen] = useState(false)
  const [threads, setThreads] = useState<MessageThread[]>([])
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Carregar threads quando abrir dropdown
  useEffect(() => {
    if (isOpen) {
      loadThreads()
    }
  }, [isOpen])

  const loadThreads = async () => {
    setLoading(true)
    try {
      const data = await fetchThreads()
      console.log('[MessagesDropdown] 📥 Threads recebidas:', data.length)
      // Mostrar apenas as 5 mais recentes com mensagens não lidas
      const unreadThreads = data
        .filter((t: MessageThread) => t.unreadCount > 0)
        .slice(0, 5)
      console.log('[MessagesDropdown] 📊 Threads não lidas:', unreadThreads.length)
      setThreads(unreadThreads)
    } catch (error) {
      console.error('[MessagesDropdown] Erro ao carregar threads:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // WebSocket: Atualizar em tempo real
  useEffect(() => {
    if (!connected || !socket) return

    const handleNewMessage = (data: any) => {
      console.log('[MessagesDropdown] 📨 Nova mensagem recebida:', data)
      // Sempre recarregar threads para manter lista atualizada
      loadThreads()
      fetchUnreadCount()
    }

    const handleMessageRead = (data: any) => {
      console.log('[MessagesDropdown] ✅ Mensagem marcada como lida:', data)
      // Sempre recarregar threads para remover mensagens lidas
      loadThreads()
      fetchUnreadCount()
    }

    socket.on('message-received', handleNewMessage)
    socket.on('message-read', handleMessageRead)

    return () => {
      socket.off('message-received', handleNewMessage)
      socket.off('message-read', handleMessageRead)
    }
  }, [connected, socket, fetchUnreadCount])

  const openThread = (threadId: string) => {
    setIsOpen(false)
    router.push(`/admin/${params.company}/mensagens/${threadId}`)
  }

  const viewAllMessages = () => {
    setIsOpen(false)
    router.push(`/admin/${params.company}/mensagens`)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão de notificação */}
      <button
        type="button"
        aria-label="Mensagens"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors relative"
      >
        <MessageSquare className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-muted/50">
            <h3 className={`${comfortaa.className} font-bold text-sm`}>
              Mensagens {unreadCount > 0 && `(${unreadCount})`}
            </h3>
          </div>

          {/* Lista de threads */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : threads.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhuma mensagem não lida
              </div>
            ) : (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => openThread(thread.id)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-accent transition-colors text-left border-b border-border last:border-0"
                >
                  {/* Avatar */}
                  <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-muted">
                    {thread.employeeAvatar ? (
                      <Image
                        src={getFileUrl(thread.employeeAvatar)}
                        alt={thread.employeeName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground font-bold text-sm">
                        {thread.employeeName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`${comfortaa.className} font-semibold text-sm truncate`}>
                        {thread.employeeName}
                      </p>
                      {thread.unreadCount > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                          {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
                        </span>
                      )}
                    </div>
                    {thread.lastMessage && (
                      <p className="text-xs text-muted-foreground truncate">
                        {thread.lastMessage.content}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer - Link para ver todas */}
          <div className="px-4 py-3 border-t border-border bg-muted/50">
            <button
              onClick={viewAllMessages}
              className={`${comfortaa.className} w-full text-center text-sm font-semibold text-primary hover:underline`}
            >
              Ver todas as mensagens
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
