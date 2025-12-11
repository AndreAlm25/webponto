'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { useMessages, MessageThread } from '@/hooks/useMessages'
import { MessageSquare, Search, Loader2, MessageCircleMore, Plus, X } from 'lucide-react'
import { PERMISSIONS, Can } from '@/hooks/usePermissions'
import { ProtectedPage } from '@/components/auth/ProtectedPage'
import { Comfortaa } from 'next/font/google'
import Image from 'next/image'
import { getFileUrl } from '@/utils/files'
import { toast } from 'sonner'

const comfortaa = Comfortaa({ subsets: ['latin'], weight: ['400', '700'] })

export default function MessagesPage() {
  const router = useRouter()
  const params = useParams<{ company: string }>()
  const { user } = useAuth()
  const { connected, socket } = useWebSocket()
  const { fetchThreads, loading, fetchUnreadCount } = useMessages()
  
  const [threads, setThreads] = useState<MessageThread[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [showNewMessageModal, setShowNewMessageModal] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [stats, setStats] = useState({ totalMessages: 0, unreadMessages: 0, readMessages: 0 })

  // Carregar estatísticas
  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const api = process.env.NEXT_PUBLIC_API_URL
      const response = await fetch(`${api}/api/messages/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('[MessagesPage] Erro ao carregar estatísticas:', error)
    }
  }

  // Carregar threads
  const loadThreads = async () => {
    setLoadingThreads(true)
    try {
      const data = await fetchThreads()
      setThreads(data)
    } catch (error) {
      console.error('[MessagesPage] Erro ao carregar threads:', error)
    } finally {
      setLoadingThreads(false)
    }
  }

  useEffect(() => {
    if (!user) return
    loadThreads()
    loadStats()
  }, [user, fetchThreads])

  // WebSocket: Atualizar em tempo real
  useEffect(() => {
    if (!connected || !socket) return

    const handleNewMessage = () => {
      loadThreads()
      loadStats()
      fetchUnreadCount()
    }

    const handleMessageRead = () => {
      loadThreads()
      loadStats()
      fetchUnreadCount()
    }

    socket.on('message-received', handleNewMessage)
    socket.on('message-read', handleMessageRead)

    return () => {
      socket.off('message-received', handleNewMessage)
      socket.off('message-read', handleMessageRead)
    }
  }, [connected, socket, fetchUnreadCount])

  // Filtrar threads por busca
  const filteredThreads = threads.filter(thread =>
    thread.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.employeePosition.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Carregar funcionários
  const loadEmployees = async () => {
    setLoadingEmployees(true)
    try {
      const token = localStorage.getItem('token')
      const api = process.env.NEXT_PUBLIC_API_URL
      const response = await fetch(`${api}/api/employees`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setEmployees(data.employees || data || [])
      }
    } catch (error) {
      console.error('[MessagesPage] Erro ao carregar funcionários:', error)
      toast.error('Erro ao carregar funcionários')
    } finally {
      setLoadingEmployees(false)
    }
  }

  // Abrir modal de nova mensagem
  const handleNewMessage = () => {
    setShowNewMessageModal(true)
    loadEmployees()
  }

  // Abrir conversa
  const openThread = (threadId: string) => {
    router.push(`/admin/${params.company}/mensagens/${threadId}`)
  }

  // Criar thread com funcionário
  const createThreadWithEmployee = async (employeeId: string) => {
    try {
      const token = localStorage.getItem('token')
      const api = process.env.NEXT_PUBLIC_API_URL
      
      const response = await fetch(`${api}/api/messages/threads/employee/${employeeId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const thread = await response.json()
        setShowNewMessageModal(false)
        // Passar dados do funcionário via query params ou recarregar threads
        await loadThreads()
        router.push(`/admin/${params.company}/mensagens/${thread.id}`)
      } else {
        toast.error('Erro ao criar conversa')
      }
    } catch (error) {
      console.error('[MessagesPage] Erro ao criar thread:', error)
      toast.error('Erro ao criar conversa')
    }
  }

  // Filtrar funcionários
  const filteredEmployees = employees.filter(emp =>
    emp.name?.toLowerCase().includes(employeeSearch.toLowerCase())
  )

  return (
    <ProtectedPage permission={PERMISSIONS.MESSAGES_VIEW}>
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-primary" />
            <h1 className={`${comfortaa.className} text-2xl font-bold`}>Mensagens</h1>
          </div>
          <Can permission={PERMISSIONS.MESSAGES_CREATE}>
            <button
              onClick={handleNewMessage}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className={`${comfortaa.className} font-semibold`}>Nova Mensagem</span>
            </button>
          </Can>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="px-6 py-4 border-b border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className={`${comfortaa.className} text-2xl font-bold`}>{stats.totalMessages}</p>
              </div>
              <MessageCircleMore className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lidas</p>
                <p className={`${comfortaa.className} text-2xl font-bold text-green-600`}>{stats.readMessages}</p>
              </div>
              <MessageCircleMore className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Não lidas</p>
                <p className={`${comfortaa.className} text-2xl font-bold text-red-600`}>{stats.unreadMessages}</p>
              </div>
              <MessageCircleMore className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </div>
        </div>
      </div>

      {/* Busca */}
      <div className="px-6 py-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar funcionário..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Lista de threads */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loadingThreads ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <MessageCircleMore className="w-16 h-16 text-muted-foreground opacity-50 mb-4" />
            <p className={`${comfortaa.className} text-lg font-semibold text-muted-foreground`}>
              {searchQuery ? 'Nenhum resultado encontrado' : 'Nenhuma conversa ainda'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {searchQuery ? 'Tente buscar por outro nome' : 'As conversas aparecerão aqui quando os funcionários enviarem mensagens'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredThreads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => openThread(thread.id)}
                className="w-full flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:bg-muted/50 dark:hover:bg-white/5 transition-colors text-left"
              >
                {/* Avatar */}
                <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-muted">
                  {thread.employeeAvatar ? (
                    <Image
                      src={getFileUrl(thread.employeeAvatar)}
                      alt={thread.employeeName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground font-bold">
                      {thread.employeeName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`${comfortaa.className} font-semibold truncate`}>
                      {thread.employeeName}
                    </h3>
                    {thread.lastMessage && (
                      <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                        {new Date(thread.lastMessage.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-1">{thread.employeePosition}</p>
                  
                  {thread.lastMessage && (
                    <p className="text-sm text-muted-foreground truncate">
                      {thread.lastMessage.content}
                    </p>
                  )}
                </div>

                {/* Badge de não lidas */}
                {thread.unreadCount > 0 && (
                  <div className="flex-shrink-0 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Nova Mensagem */}
      {showNewMessageModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-md max-h-[80vh] flex flex-col">
            {/* Header do Modal */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className={`${comfortaa.className} text-xl font-bold`}>Nova Mensagem</h2>
              <button
                onClick={() => setShowNewMessageModal(false)}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Busca */}
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar funcionário..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Lista de Funcionários */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingEmployees ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhum funcionário encontrado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredEmployees.map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() => createThreadWithEmployee(emp.id)}
                      className="w-full flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:bg-muted/50 dark:hover:bg-white/5 transition-colors text-left"
                    >
                      {/* Avatar */}
                      <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-muted">
                        {emp.photoUrl ? (
                          <Image
                            src={getFileUrl(emp.photoUrl)}
                            alt={emp.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground font-bold">
                            {emp.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`${comfortaa.className} font-semibold truncate`}>
                          {emp.name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {emp.roleTitle || 'Funcionário'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </ProtectedPage>
  )
}
