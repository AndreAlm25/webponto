'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { useMessages, Message } from '@/hooks/useMessages'
import { ArrowLeft, Send, Loader2, MessageCircleMore, CheckCheck, Paperclip, X } from 'lucide-react'
import { Comfortaa, Roboto } from 'next/font/google'
import Image from 'next/image'
import { getFileUrl } from '@/utils/files'
import { toast } from 'sonner'
import AttachmentPreview from '@/components/AttachmentPreview'
import AttachmentViewer from '@/components/AttachmentViewer'

const comfortaa = Comfortaa({ subsets: ['latin'], weight: ['400', '700'] })
const roboto = Roboto({ subsets: ['latin'], weight: ['400', '700', '900'] })

// Componente para renderizar conteúdo da mensagem com "Ler mais"
function MessageContent({ content, className }: { content: string; className?: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const MAX_LENGTH = 300 // Caracteres antes de mostrar "Ler mais"
  
  const needsTruncate = content.length > MAX_LENGTH
  const displayContent = needsTruncate && !isExpanded 
    ? content.substring(0, MAX_LENGTH) + '...' 
    : content

  return (
    <div className={`${className} leading-snug`}>
      <div className="whitespace-pre-wrap break-words">{displayContent}</div>
      {needsTruncate && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-1 text-xs underline opacity-80 hover:opacity-100 transition-opacity"
        >
          {isExpanded ? 'Ler menos' : 'Ler mais'}
        </button>
      )}
    </div>
  )
}

export default function ThreadPage() {
  const router = useRouter()
  const params = useParams<{ company: string; threadId: string }>()
  const { user } = useAuth()
  const { connected, socket } = useWebSocket()
  const { fetchMessages, sendMessage, markAsRead, loading } = useMessages()
  
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [sending, setSending] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [viewerAttachment, setViewerAttachment] = useState<any>(null)
  const [employeeInfo, setEmployeeInfo] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)

  // Scroll instantâneo para última mensagem (sem animação)
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
  }

  // Carregar mensagens
  useEffect(() => {
    if (!user || !params.threadId) return

    const loadMessages = async () => {
      try {
        const data = await fetchMessages(params.threadId)
        setMessages(data.messages || [])

        // Extrair info do funcionário de qualquer mensagem
        let employeeFound = false
        if (data.messages && data.messages.length > 0) {
          // Buscar a primeira mensagem que tem senderEmployee
          const employeeMsg = data.messages.find((m: Message) => m.senderEmployee)
          if (employeeMsg?.senderEmployee) {
            setEmployeeInfo({
              name: employeeMsg.senderEmployee.user?.name || 'Funcionário',
              position: employeeMsg.senderEmployee.position?.name || '',
              avatarUrl: employeeMsg.senderEmployee.user?.avatarUrl,
            })
            employeeFound = true
          }
        }
        
        // Se não encontrou info do funcionário nas mensagens, buscar da thread
        if (!employeeFound) {
          const token = localStorage.getItem('token')
          const api = process.env.NEXT_PUBLIC_API_URL
          const threadResponse = await fetch(`${api}/api/messages/threads`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })
          
          if (threadResponse.ok) {
            const threads = await threadResponse.json()
            const currentThread = threads.find((t: any) => t.id === params.threadId)
            if (currentThread) {
              setEmployeeInfo({
                name: currentThread.employeeName,
                position: currentThread.employeePosition,
                avatarUrl: currentThread.employeeAvatar,
              })
            }
          }
        }

        // Marcar mensagens não lidas como lidas
        const unreadIds = data.messages
          .filter((m: Message) => !m.isRead && m.senderEmployeeId)
          .map((m: Message) => m.id)
        
        if (unreadIds.length > 0) {
          await markAsRead(unreadIds)
        }

        // Scroll instantâneo para o final (sem animação)
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
        }, 100)
      } catch (error) {
        console.error('[ThreadPage] Erro ao carregar mensagens:', error)
        toast.error('Erro ao carregar mensagens')
      }
    }

    loadMessages()
  }, [user, params.threadId, fetchMessages, markAsRead])

  // Selecionar arquivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Apenas arquivos PDF, JPG e PNG são permitidos')
      return
    }

    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Tamanho máximo: 10MB')
      return
    }

    setSelectedFile(file)
  }

  // Remover arquivo selecionado
  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Enviar mensagem
  const handleSend = async () => {
    if ((!inputValue.trim() && !selectedFile) || sending) return

    setSending(true)
    try {
      const message = await sendMessage(params.threadId, inputValue, selectedFile || undefined)
      if (message) {
        setMessages(prev => [...prev, message])
        setInputValue('')
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        // Scroll instantâneo para a mensagem enviada
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
        }, 50)
        // Manter foco no input após enviar
        setTimeout(() => {
          messageInputRef.current?.focus()
        }, 100)
      } else {
        toast.error('Erro ao enviar mensagem')
      }
    } catch (error) {
      console.error('[ThreadPage] Erro ao enviar:', error)
      toast.error('Erro ao enviar mensagem')
    } finally {
      setSending(false)
    }
  }

  // Enter para enviar
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Listener WebSocket para novas mensagens
  useEffect(() => {
    if (!connected || !socket || !params.threadId) return

    const handleNewMessage = (data: any) => {
      console.log('[ThreadPage] Nova mensagem recebida:', data)
      
      if (data.threadId === params.threadId) {
        setMessages(prev => [...prev, data.message])
        
        // Scroll instantâneo para a nova mensagem
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
        }, 50)
        
        // Marcar como lida automaticamente se for do funcionário
        if (data.message.senderEmployeeId) {
          markAsRead([data.message.id])
        }
      }
    }

    const handleMessageRead = (data: any) => {
      console.log('[ThreadPage] Mensagem marcada como lida:', data)
      
      if (data.threadId === params.threadId) {
        setMessages(prev => 
          prev.map(m => 
            data.messageIds.includes(m.id) ? { ...m, isRead: true } : m
          )
        )
      }
    }

    socket.on('message-received', handleNewMessage)
    socket.on('message-read', handleMessageRead)

    return () => {
      socket.off('message-received', handleNewMessage)
      socket.off('message-read', handleMessageRead)
    }
  }, [connected, socket, params.threadId, markAsRead])

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/admin/${params.company}/mensagens`)}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {employeeInfo && (
            <>
              <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-muted">
                {employeeInfo.avatarUrl ? (
                  <Image
                    src={getFileUrl(employeeInfo.avatarUrl)}
                    alt={employeeInfo.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground font-bold">
                    {employeeInfo.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h1 className={`${comfortaa.className} text-lg font-bold`}>{employeeInfo.name}</h1>
                <p className="text-sm text-muted-foreground">{employeeInfo.position || 'Funcionário'}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mensagens */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-6 py-4 flex flex-col">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div className="text-muted-foreground">
              <MessageCircleMore className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className={`${comfortaa.className} text-sm`}>Nenhuma mensagem ainda</p>
              <p className={`${roboto.className} text-xs mt-1`}>Envie uma mensagem para começar</p>
            </div>
          </div>
        ) : (
          <>
            {/* Spacer para empurrar mensagens para baixo */}
            <div className="flex-1" />
            <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full">
              {messages.map((m) => {
              const isMine = !!m.senderUserId
              const time = new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

              return (
                <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[70%] px-4 py-3 ${
                      isMine
                        ? 'bg-[#2563EB] text-white rounded-[10px] rounded-br-none'
                        : 'bg-card text-foreground rounded-[10px] rounded-bl-none border border-border'
                    }`}
                  >
                    {m.content && (
                      <MessageContent content={m.content} className={comfortaa.className} />
                    )}
                    
                    {/* Anexos */}
                    {m.attachments && m.attachments.length > 0 && (
                      <div className={m.content ? 'mt-2' : ''}>
                        {m.attachments.map((att) => (
                          <AttachmentPreview
                            key={att.id}
                            attachment={att}
                            onClick={() => setViewerAttachment(att)}
                          />
                        ))}
                      </div>
                    )}
                    
                    <div className="mt-2 flex items-center gap-1 text-[11px] opacity-80">
                      <span>{time}</span>
                      {isMine && (
                        <CheckCheck
                          className={`w-4 h-4 ${m.isRead ? 'text-white' : 'text-zinc-400'}`}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Preview do arquivo selecionado */}
          {selectedFile && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Paperclip className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="flex-1 text-sm text-blue-900 dark:text-blue-100 truncate">
                {selectedFile.name}
              </span>
              <button
                onClick={handleRemoveFile}
                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                title="Remover anexo"
              >
                <X className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={!!selectedFile || sending}
              className="p-3 border border-border rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={selectedFile ? "Apenas um anexo por vez" : "Anexar arquivo (PDF, JPG, PNG)"}
            >
              <Paperclip className="w-5 h-5 text-muted-foreground" />
            </button>
            <input
              ref={messageInputRef}
              type="text"
              placeholder="Digite sua mensagem..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sending}
              className={`${comfortaa.className} flex-1 px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50`}
            />
            <button 
              onClick={handleSend}
              disabled={(!inputValue.trim() && !selectedFile) || sending}
              className="px-6 py-3 bg-[#2563EB] text-white rounded-lg hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
            {sending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className={`${roboto.className} font-semibold`}>Enviando...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span className={`${roboto.className} font-semibold`}>Enviar</span>
              </>
            )}
          </button>
          </div>
        </div>
      </div>

      {/* Visualizador de anexos */}
      {viewerAttachment && (
        <AttachmentViewer
          attachment={viewerAttachment}
          onClose={() => setViewerAttachment(null)}
        />
      )}
    </div>
  )
}
