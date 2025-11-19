"use client"
import React, { useState as useStateReact, useRef } from 'react'
import Image from 'next/image'
import { getFileUrl } from '@/utils/files'
import { ArrowLeft, MessageCircleMore, Paperclip, Send, CheckCheck, Loader2, X } from 'lucide-react'
import { Comfortaa, Roboto } from 'next/font/google'
import { useMessages, Message } from '@/hooks/useMessages'
import { useAuth } from '@/contexts/AuthContext'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { toast } from 'sonner'
import AttachmentPreview from './AttachmentPreview'
import AttachmentViewer from './AttachmentViewer'

const comfortaa = Comfortaa({ subsets: ['latin'], weight: ['400', '700'] })
const roboto = Roboto({ subsets: ['latin'], weight: ['400', '700', '900'] })

// Componente para renderizar conteúdo da mensagem com "Ler mais"
function MessageContent({ content, className }: { content: string; className?: string }) {
  const [isExpanded, setIsExpanded] = React.useState(false)
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

export type MessageModalProps = {
  open: boolean
  onClose: () => void
  employee?: {
    name: string
    position?: string
    avatarUrl?: string
  }
}

export function MessageModal({ open, onClose, employee }: MessageModalProps) {
  const { user } = useAuth()
  const { connected, socket } = useWebSocket()
  const { fetchMyThread, fetchMessages, sendMessage, markAsRead, loading } = useMessages()
  const [messages, setMessages] = React.useState<Message[]>([])
  const [threadId, setThreadId] = React.useState<string | null>(null)
  const [inputValue, setInputValue] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [viewerAttachment, setViewerAttachment] = React.useState<any>(null)
  const messagesContainerRef = React.useRef<HTMLDivElement>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Scroll instantâneo para última mensagem (sem animação)
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
  }

  // Carregar thread e mensagens ao abrir
  React.useEffect(() => {
    if (!open || !user) {
      return
    }

    const loadThread = async () => {
      try {
        // Buscar/criar thread do funcionário (backend cria automaticamente)
        const thread = await fetchMyThread()
        
        if (!thread) {
          toast.error('Não foi possível carregar a conversa')
          return
        }

        setThreadId(thread.id)

        // Buscar mensagens
        const data = await fetchMessages(thread.id)
        if (data.messages) {
          // Log para verificar ordem
          console.log('📨 ORDEM DAS MENSAGENS:', data.messages.map((m: Message, i: number) => 
            `${i+1}. ${new Date(m.createdAt).toLocaleTimeString()} - ${m.content?.substring(0, 30) || '[anexo]'}`
          ))
          setMessages(data.messages)

          // Marcar mensagens não lidas como lidas
          const unreadMessages = data.messages.filter((m: Message) => !m.isRead && m.senderUserId)
          if (unreadMessages.length > 0) {
            const messageIds = unreadMessages.map((m: Message) => m.id)
            await markAsRead(messageIds)
          }

          // Scroll instantâneo para o final (sem animação)
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
          }, 100)
        }
      } catch (error) {
        console.error('[MessageModal] ❌ Erro ao carregar mensagens:', error)
        toast.error('Erro ao carregar mensagens')
      }
    }

    loadThread()
  }, [open, user, fetchMyThread, fetchMessages, markAsRead])

  // Desabilita o scroll da página quando o modal está aberto
  React.useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

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
    if ((!inputValue.trim() && !selectedFile) || sending || !threadId) return

    setSending(true)
    try {
      const message = await sendMessage(threadId, inputValue, selectedFile || undefined)
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
          inputRef.current?.focus()
        }, 50)
      } else {
        toast.error('Erro ao enviar mensagem')
      }
    } catch (error) {
      console.error('[MessageModal] Erro ao enviar:', error)
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
  React.useEffect(() => {
    if (!connected || !socket || !open || !threadId) {
      return
    }

    const handleNewMessage = (data: any) => {
      // Adicionar mensagem se for da thread atual
      if (data.threadId === threadId) {
        setMessages(prev => {
          // Evitar duplicatas
          const exists = prev.some(m => m.id === data.message.id)
          if (exists) {
            return prev
          }
          return [...prev, data.message]
        })
        
        // Scroll instantâneo para a nova mensagem
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
        }, 50)
        
        // Marcar como lida automaticamente se for do admin
        if (data.message.senderUserId) {
          markAsRead([data.message.id])
        }
      }
    }

    const handleMessageRead = (data: any) => {
      console.log('[MessageModal] Mensagem marcada como lida:', data)
      
      // Atualizar status de lida nas mensagens
      if (data.threadId === threadId) {
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
  }, [connected, socket, open, threadId, markAsRead])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Card central (full-screen em mobile) */}
      <div className="absolute inset-0 grid place-items-stretch sm:place-items-center px-0 sm:px-4">
        <div className="w-full h-[100svh] sm:h-[640px] sm:max-w-[540px] rounded-none sm:rounded-2xl bg-background shadow-lg">
          <div className="flex h-full flex-col gap-5 p-5">
            {/* 1) Header */}
            <div className="flex items-center justify-between text-foreground">
              <button aria-label="Fechar" onClick={onClose} className="p-2 -ml-2">
                <ArrowLeft className="w-[30px] h-[30px]" />
              </button>
              <div className="flex items-center text-foreground">
                <MessageCircleMore className="w-[32px] h-[32px] mr-[10px]" />
                <div className={`${comfortaa.className} text-[28px] font-bold tracking-wide text-foreground`}>MENSAGENS</div>
              </div>
              <div className="w-8" />
            </div>

            {/* 2) Perfil */}
            <div className="flex items-center gap-3 border-b border-dotted pb-3">
              <div className="relative w-[48px] h-[48px] rounded-full overflow-hidden">
                <Image
                  src={getFileUrl(employee?.avatarUrl) || 'https://placehold.co/96x96.png'}
                  alt={employee?.name || 'Avatar'}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
              <div>
                <div className={`${comfortaa.className} text-[24px] text-foreground`}>{employee?.name || 'Nome Funcionário'}</div>
                <div className={`${roboto.className} text-[14px] text-muted-foreground`}>{employee?.position || 'CARGO FUNCIONÁRIO'}</div>
              </div>
            </div>

            {/* 3) Lista de mensagens */}
            <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto rounded-xl bg-muted p-4 no-scrollbar flex flex-col">
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
                  <div className="flex flex-col gap-4">
                    {messages.map((m) => {
                    const isMine = !!m.senderEmployeeId
                    const senderName = m.senderUser?.name || m.senderEmployee?.user?.name || 'Desconhecido'
                    const time = new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

                    return (
                      <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] px-4 py-3 ${
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

            {/* 4) Input e anexos */}
            <div className="space-y-2">
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

              <div className="flex items-center gap-3 rounded-[5px] border border-border p-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button 
                  aria-label="Anexar" 
                  className="p-2 hover:bg-accent rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!!selectedFile || sending || !threadId}
                  title={selectedFile ? "Apenas um anexo por vez" : "Anexar arquivo (PDF, JPG, PNG)"}
                >
                  <Paperclip className="w-6 h-6 text-muted-foreground" />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Enviar mensagem"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={sending || !threadId}
                  autoFocus
                  className={`${comfortaa.className} flex-1 outline-none bg-transparent text-foreground placeholder:text-muted-foreground disabled:opacity-50`}
                />
                <button 
                  aria-label="Enviar" 
                  className="p-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  onClick={handleSend}
                  disabled={(!inputValue.trim() && !selectedFile) || sending || !threadId}
                >
                  {sending ? (
                    <Loader2 className="w-6 h-6 text-[#2563EB] animate-spin" />
                  ) : (
                    <Send className="w-6 h-6 text-[#2563EB]" />
                  )}
                </button>
              </div>
            </div>
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
