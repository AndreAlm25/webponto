"use client"

import React, { useEffect, useState, useRef, useMemo } from "react"
import RoundButton from "@/components/ui/RoundButton"
import { Camera as CameraIcon, CameraOff, UserCheck, UserPlus, Coffee, LogOut, UserX, AlertCircle } from "lucide-react"
import FacialRecognitionEnhanced from "@/components/facial/FacialRecognitionEnhanced"
import AvatarCircle from "@/components/facial/AvatarCircle"
import { Skeleton } from "@/components/ui/skeleton"

type UserProfile = {
  id: string
  name: string
  email: string
  role: string
  avatarUrl?: string | null
  avatarPath?: string | null
  companyId?: string | null
}

type AuthMode = 'employee' | 'admin' | null

type RunnerMessage = {
  kind: 'success' | 'error' | 'info'
  label: string
  timestamp?: string
}

type RecognitionResult = {
  employeeData: {
    id: string
    name: string
    email: string
    position?: string
    role?: string
    avatarUrl?: string | null
    avatarPath?: string | null
    companyId?: string | null
  }
  type: string // CLOCK_IN, CLOCK_OUT, BREAK_START, BREAK_END
  timestamp: string
  clockResult?: any
}

type RegistrationResult = {
  success: boolean
  message?: string
  employeeData?: {
    id: string
    name: string
    email: string
  }
}

export type FacialRecognitionFlowProps = {
  mode: 'recognition' | 'registration'
  authMode?: AuthMode
  userId?: string
  userEmail?: string
  onRecognitionSuccess?: (result: RecognitionResult) => void
  onRecognitionError?: (error: string) => void
  onRegistrationSuccess?: (result: RegistrationResult) => void
  onRegistrationError?: (error: string) => void
  buttonLabel?: string
  buttonIcon?: React.ReactNode
  buttonColor?: string
  buttonBgColor?: string
  messageDisplayTime?: number // Tempo em ms que a mensagem fica visível
  autoOpenCamera?: boolean // Se true, abre câmera automaticamente
  showButton?: boolean // Se false, esconde o botão (útil para autoOpenCamera)
}

// Tempo padrão que a mensagem fica visível na tela (em milissegundos)
const DEFAULT_MESSAGE_DISPLAY_TIME = 7000 // 7 segundos

export default function FacialRecognitionFlow({
  mode,
  authMode = null,
  userId,
  userEmail,
  onRecognitionSuccess,
  onRecognitionError,
  onRegistrationSuccess,
  onRegistrationError,
  buttonLabel,
  buttonIcon,
  buttonColor = "#fff",
  buttonBgColor = "#3C83F6",
  messageDisplayTime = DEFAULT_MESSAGE_DISPLAY_TIME,
  autoOpenCamera = false,
  showButton = true,
}: FacialRecognitionFlowProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [showCamera, setShowCamera] = useState(autoOpenCamera)
  const [mounted, setMounted] = useState(false)
  const [showSkeleton, setShowSkeleton] = useState(false)
  const [runnerMsg, setRunnerMsg] = useState<RunnerMessage | null>(null)
  const messageRef = useRef<HTMLDivElement | null>(null)
  const cameraCleanupTimerRef = useRef<NodeJS.Timeout | null>(null)
  const bcRef = useRef<BroadcastChannel | null>(null)
  
  useEffect(() => {
    setMounted(true)
    
    // BroadcastChannel para sincronizar entre abas
    try {
      bcRef.current = new BroadcastChannel('timeclock_updates')
    } catch (e) {
      console.warn('[FacialRecognitionFlow] BroadcastChannel não suportado')
    }
    
    return () => {
      bcRef.current?.close()
      if (cameraCleanupTimerRef.current) {
        clearTimeout(cameraCleanupTimerRef.current)
      }
    }
  }, [])

  // Data formatada
  const formattedDate = useMemo(() => {
    if (!mounted) return ""
    try {
      const now = new Date()
      const weekday = now.toLocaleDateString('pt-BR', { weekday: 'long' })
      const day = now.getDate()
      const month = now.toLocaleDateString('pt-BR', { month: 'long' })
      const year = now.getFullYear()
      return `${weekday}, ${day} de ${month} de ${year}`
    } catch {
      return ""
    }
  }, [mounted])

  const handleRecognitionSuccessInternal = (result: any) => {
    // Esconde skeleton e exibe mensagem com dados
    setShowSkeleton(false)
    
    setProfile({
      id: result.employeeData.id || '',
      name: result.employeeData.name || 'Usuário',
      email: result.employeeData.email || '',
      role: result.employeeData.position || result.employeeData.role || 'Funcionário',
      avatarUrl: result.employeeData.avatarUrl,
      avatarPath: result.employeeData.avatarPath,
      companyId: result.employeeData.companyId
    })
    
    // Definir mensagem baseada no tipo
    const typeLabels: Record<string, string> = {
      'CLOCK_IN': 'Entrada\nregistrada',
      'CLOCK_OUT': 'Saída\nregistrada',
      'BREAK_START': 'Início do\nintervalo',
      'BREAK_END': 'Fim do\nintervalo'
    }
    setRunnerMsg({
      kind: 'success',
      label: typeLabels[result.type] || 'Ponto registrado',
      timestamp: result.timestamp
    })
    
    // Notificar outras abas via BroadcastChannel
    try {
      bcRef.current?.postMessage({ 
        type: 'timeclock:created', 
        payload: result.clockResult?.timeClock || null 
      })
    } catch (e) {
      console.warn('[FacialRecognitionFlow] Erro ao enviar notificação:', e)
    }
    
    // Limpar timer anterior se existir
    if (cameraCleanupTimerRef.current) {
      clearTimeout(cameraCleanupTimerRef.current)
    }
    
    // Após messageDisplayTime, volta para tela inicial E fecha a câmera
    cameraCleanupTimerRef.current = setTimeout(() => {
      setRunnerMsg(null)
      setProfile(null)
      setShowSkeleton(false)
      setShowCamera(false)
    }, messageDisplayTime)
    
    // Callback customizado
    onRecognitionSuccess?.(result)
  }

  const handleRecognitionErrorInternal = (error: string) => {
    // Mensagem amigável de erro
    let friendlyMessage = ''
    
    if (error.includes('sendo usada') || error.includes('em uso')) {
      friendlyMessage = 'Câmera em uso\npor outro app'
    } else if (error.includes('Permissão') || error.includes('negada')) {
      friendlyMessage = 'Permissão\nnegada'
    } else if (error.includes('não identificado')) {
      friendlyMessage = 'Usuário não\nidentificado'
    } else if (error.includes('Falha na verificação')) {
      friendlyMessage = 'Rosto não\nreconhecido'
    } else if (error.includes('No face')) {
      friendlyMessage = 'Nenhum rosto\ndetectado'
    } else if (error.includes('acessar a câmera')) {
      friendlyMessage = 'Erro ao abrir\na câmera'
    } else {
      friendlyMessage = 'Erro no\nreconhecimento'
    }
    
    setRunnerMsg({ kind: 'error', label: friendlyMessage })
    setShowSkeleton(false)
    
    // Limpar timer anterior se existir
    if (cameraCleanupTimerRef.current) {
      clearTimeout(cameraCleanupTimerRef.current)
    }
    
    // Após messageDisplayTime, volta para tela inicial E fecha a câmera
    cameraCleanupTimerRef.current = setTimeout(() => {
      setRunnerMsg(null)
      setProfile(null)
      setShowCamera(false)
    }, messageDisplayTime)
    
    // Callback customizado
    onRecognitionError?.(error)
  }

  const handleRegistrationSuccessInternal = (result: any) => {
    setShowSkeleton(false)
    
    // Para cadastro, mostra mensagem simples de sucesso
    setRunnerMsg({
      kind: 'success',
      label: 'Cadastro facial\nrealizado!',
      timestamp: new Date().toISOString()
    })
    
    // Limpar timer anterior se existir
    if (cameraCleanupTimerRef.current) {
      clearTimeout(cameraCleanupTimerRef.current)
    }
    
    // Após messageDisplayTime, volta para tela inicial E fecha a câmera
    cameraCleanupTimerRef.current = setTimeout(() => {
      setRunnerMsg(null)
      setProfile(null)
      setShowCamera(false)
    }, messageDisplayTime)
    
    // Callback customizado
    onRegistrationSuccess?.(result)
  }

  const handleRegistrationErrorInternal = (error: string) => {
    // Mensagem amigável de erro
    let friendlyMessage = ''
    
    if (error.includes('sendo usada') || error.includes('em uso')) {
      friendlyMessage = 'Câmera em uso\npor outro app'
    } else if (error.includes('Permissão') || error.includes('negada')) {
      friendlyMessage = 'Permissão\nnegada'
    } else if (error.includes('acessar a câmera')) {
      friendlyMessage = 'Erro ao abrir\na câmera'
    } else {
      friendlyMessage = 'Erro no\ncadastro facial'
    }
    
    setRunnerMsg({ kind: 'error', label: friendlyMessage })
    setShowSkeleton(false)
    
    // Limpar timer anterior se existir
    if (cameraCleanupTimerRef.current) {
      clearTimeout(cameraCleanupTimerRef.current)
    }
    
    // Após messageDisplayTime, volta para tela inicial E fecha a câmera
    cameraCleanupTimerRef.current = setTimeout(() => {
      setRunnerMsg(null)
      setProfile(null)
      setShowCamera(false)
    }, messageDisplayTime)
    
    // Callback customizado
    onRegistrationError?.(error)
  }

  const handleOpenCamera = () => {
    setShowSkeleton(true)
    setShowCamera(true)
  }

  // Conversão de mode
  const cameraMode: 'cadastro' | 'reconhecimento' = mode === 'registration' ? 'cadastro' : 'reconhecimento'
  
  // Label e ícone padrão baseado no mode
  const defaultLabel = mode === 'registration' ? 'Cadastrar Face' : 'Reconhecer Face'
  const defaultIcon = mode === 'registration' ? <UserPlus className="opacity-95" /> : <CameraIcon className="opacity-95" />

  return (
    <div className="relative w-full">
      {/* Botão para abrir câmera */}
      {showButton && !runnerMsg && (
        <div className="flex justify-center mb-8">
          <RoundButton
            color={buttonColor}
            bgColor={buttonBgColor}
            ariaLabel={buttonLabel || defaultLabel}
            icon={buttonIcon || defaultIcon}
            iconClassName="w-7 h-7 md:w-10 md:h-10 2xl:w-14 2xl:h-14"
            className="h-[70px] md:h-[90px] 2xl:h-[120px]"
            onClick={handleOpenCamera}
          />
        </div>
      )}

      {/* Mensagem e Skeleton */}
      {runnerMsg && (
        <div className="relative w-[310px] md:w-[430px] 2xl:w-[690px] min-[361px]:max-[384px]:w-[95%] flex min-h-[calc(100vh-200px)] mx-auto">
          {/* Camada 1: Mensagem real (abaixo) */}
          <div ref={messageRef} className="flex flex-col items-center justify-center relative z-10 w-full">
            <div className="w-full h-full flex flex-col items-center justify-center p-4">
              
              {/* Se for ERRO, mostra apenas o card centralizado */}
              {runnerMsg.kind === 'error' ? (
                <div className="flex items-center justify-center">
                  <div className="flex flex-col items-center justify-center bg-red-600 text-white rounded-xl w-[280px] h-[200px] min-[361px]:max-[384px]:w-[300px] min-[361px]:max-[384px]:h-[220px] md:w-[320px] md:h-[240px] 2xl:w-[400px] 2xl:h-[300px] shadow-2xl">
                    {runnerMsg.label.includes('Câmera em uso') ? (
                      <CameraOff className="w-16 h-16 mb-3" strokeWidth={2.5} />
                    ) : runnerMsg.label.includes('Permissão') ? (
                      <AlertCircle className="w-16 h-16 mb-3" strokeWidth={2.5} />
                    ) : (
                      <UserX className="w-16 h-16 mb-3" strokeWidth={2.5} />
                    )}
                    <span className="font-semibold text-center text-2xl md:text-3xl 2xl:text-4xl whitespace-pre-line px-4">{runnerMsg.label}</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Avatar com anel azul (só para reconhecimento) */}
                  {mode === 'recognition' && profile && (
                    <div className="bg-[#3C83F6] rounded-full flex items-center justify-center w-[138px] h-[138px] 2xl:w-[175px] 2xl:h-[175px] mb-2">
                      <AvatarCircle
                        name={profile.name}
                        photoUrl={profile.avatarUrl ?? undefined}
                        avatarPath={profile.avatarPath ?? undefined}
                        sizeClass="w-32 h-32 2xl:w-40 2xl:h-40"
                      />
                    </div>
                  )}

                  {/* Para cadastro, mostra ícone genérico */}
                  {mode === 'registration' && (
                    <div className="bg-[#3C83F6] rounded-full flex items-center justify-center w-[138px] h-[138px] 2xl:w-[175px] 2xl:h-[175px] mb-2">
                      <UserCheck className="w-20 h-20 text-white" />
                    </div>
                  )}

                  {/* Nome e Cargo (só para reconhecimento) */}
                  {mode === 'recognition' && profile && (
                    <div className="flex flex-col items-center justify-center mb-4 min-[361px]:max-[384px]:mb-8">
                      <h1 className="text-2xl 2xl:text-3xl font-bold text-slate-900 uppercase w-[290px] h-[26px] md:w-[405px] 2xl:w-[650px] 2xl:h-[31px] min-[361px]:max-[384px]:w-[335px] mb-1 flex justify-center">
                        {profile.name}
                      </h1>
                      <p className="text-lg 2xl:text-2xl text-slate-500 w-[290px] h-[18px] md:w-[405px] 2xl:w-[650px] 2xl:h-[23px] min-[361px]:max-[384px]:w-[335px] flex items-center justify-center">{profile.role}</p>
                    </div>
                  )}

                  {/* Para cadastro, mostra texto simples */}
                  {mode === 'registration' && (
                    <div className="flex flex-col items-center justify-center mb-4 min-[361px]:max-[384px]:mb-8">
                      <h1 className="text-2xl 2xl:text-3xl font-bold text-slate-900 uppercase flex justify-center">
                        Cadastro Realizado
                      </h1>
                      <p className="text-lg 2xl:text-2xl text-slate-500 flex items-center justify-center">Com sucesso</p>
                    </div>
                  )}

                  {/* Título e Data */}
                  <div className="text-center flex flex-col items-center mb-11 min-[361px]:max-[384px]:mb-8">
                    <p className={`font-bold uppercase text-xl 2xl:text-3xl w-auto max-w-[350px] h-auto 2xl:max-w-[450px] mb-[2px] px-4 ${
                      mode === 'registration' ? 'text-sky-600' :
                      runnerMsg.label.includes('Entrada') ? 'text-green-600' :
                      runnerMsg.label.includes('Início') ? 'text-amber-500' :
                      runnerMsg.label.includes('Fim') ? 'text-green-600' :
                      runnerMsg.label.includes('Saída') ? 'text-red-600' :
                      'text-[#3C83F6]'
                    }`}>
                      {mode === 'registration' ? 'Cadastro Facial' :
                       runnerMsg.label.includes('Entrada') ? 'Horário da Entrada' :
                       runnerMsg.label.includes('Início') ? 'Horário do Intervalo' :
                       runnerMsg.label.includes('Fim') ? 'Horário do Fim do Intervalo' :
                       runnerMsg.label.includes('Saída') ? 'Horário da Saída' :
                       'Horário do Ponto'}
                    </p>
                    <p suppressHydrationWarning className="text-slate-700 font-bold text-xl md:text-2xl 2xl:text-3xl min-[361px]:max-[384px]:text-2xl mb-[2px] w-[150px] h-[28px] 2xl:w-[200px] 2xl:h-[36px]">
                      {mounted && runnerMsg.timestamp ? (() => { 
                        try { 
                          const ts = new Date(runnerMsg.timestamp)
                          return ts.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                        } catch { 
                          return '' 
                        } 
                      })() : ''}
                    </p>
                    <p className="text-slate-600 text-base md:text-lg 2xl:text-2xl min-[361px]:max-[384px]:text-lg w-[300px] h-[26px] min-[361px]:max-[384px]:w-[345px] min-[361px]:max-[384px]:h-[29px] md:w-[405px] md:h-[29px] 2xl:w-[500px] 2xl:h-[34px]">{formattedDate}</p>
                  </div>

                  {/* Card de sucesso com cores e ícones baseados no tipo */}
                  <div className="mb-8 md:mb-10 2xl:mb-20 min-[361px]:max-[384px]:mb-10">
                    {(() => {
                      const kind = runnerMsg.kind
                      const label = runnerMsg.label
                      
                      let color = 'bg-green-600'
                      let icon = <UserCheck className="w-12 h-12 mb-1" />
                      
                      if (mode === 'registration') {
                        color = 'bg-sky-600'
                        icon = <UserPlus className="w-12 h-12 mb-1" />
                      } else if (kind === 'success') {
                        if (label.includes('Início') || label.includes('intervalo')) {
                          color = 'bg-amber-500'
                          icon = <Coffee className="w-12 h-12 mb-1" />
                        } else if (label.includes('Saída')) {
                          color = 'bg-red-600'
                          icon = <LogOut className="w-12 h-12 mb-1" />
                        }
                      } else if (kind === 'info') {
                        color = 'bg-amber-500'
                      }
                      
                      return (
                        <div className={`flex flex-col items-center justify-center ${color} text-white rounded-xl w-[230px] h-[150px] min-[361px]:max-[384px]:w-[250px] min-[361px]:max-[384px]:h-[170px] md:w-[270px] md:h-[190px] 2xl:w-[350px] 2xl:h-[250px]`}>
                          {icon}
                          <span className="font-semibold text-center text-xl md:text-2xl 2xl:text-3xl whitespace-pre-line">{label}</span>
                        </div>
                      )
                    })()}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Camada 2: Esqueleto com shadcn/ui */}
          {showSkeleton && mode === 'recognition' && (
            <div className="absolute inset-0 z-20 pointer-events-none">
              <div className="flex flex-col items-center justify-center relative z-10">
                <div className="w-full h-full flex flex-col items-center justify-center p-4">
                  {/* Avatar */}
                  <Skeleton className="w-[138px] h-[138px] 2xl:w-[175px] 2xl:h-[175px] rounded-full mb-2" />

                  {/* Nome e Cargo */}
                  <div className="flex flex-col items-center justify-center mb-4 min-[361px]:max-[384px]:mb-8">
                    <Skeleton className="h-[26px] w-[290px] md:w-[405px] 2xl:w-[650px] 2xl:h-[31px] min-[361px]:max-[384px]:w-[335px] mb-1" />
                    <Skeleton className="h-[18px] w-[290px] md:w-[405px] 2xl:w-[650px] 2xl:h-[23px] min-[361px]:max-[384px]:w-[335px]" />
                  </div>

                  {/* Título e Data */}
                  <div className="text-center flex flex-col items-center mb-11 min-[361px]:max-[384px]:mb-8">
                    <Skeleton className="h-[24px] w-[250px] 2xl:w-[270px] 2xl:h-[31px] mb-[2px]" />
                    <Skeleton className="h-[28px] w-[150px] 2xl:w-[200px] 2xl:h-[36px] mb-[2px]" />
                    <Skeleton className="h-[26px] w-[300px] min-[361px]:max-[384px]:w-[345px] min-[361px]:max-[384px]:h-[29px] md:w-[405px] md:h-[29px] 2xl:w-[500px] 2xl:h-[34px]" />
                  </div>

                  {/* Card */}
                  <div className="mb-8 md:mb-10 2xl:mb-20 min-[361px]:max-[384px]:mb-10">
                    <div className="flex items-center justify-center">
                      <Skeleton className="flex flex-col items-center justify-center w-[230px] h-[150px] min-[361px]:max-[384px]:w-[250px] min-[361px]:max-[384px]:h-[170px] md:w-[270px] md:h-[190px] 2xl:w-[350px] 2xl:h-[250px]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Componente de reconhecimento/cadastro facial */}
      {showCamera && (
        <FacialRecognitionEnhanced
          mode={cameraMode}
          authMode={authMode}
          userId={userId}
          userEmail={userEmail}
          onClose={() => setShowCamera(false)}
          onRecognitionSuccess={handleRecognitionSuccessInternal}
          onRecognitionError={handleRecognitionErrorInternal}
          onRegistrationSuccess={handleRegistrationSuccessInternal}
          onRegistrationError={handleRegistrationErrorInternal}
        />
      )}
    </div>
  )
}
