"use client"
import { notFound, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { useMessages } from '@/hooks/useMessages'
import React from 'react'
import { X, MessageCircleMore, MapPin, MapPinCheck, ScanFace, ClockArrowUp, ClockArrowDown, Clock12, Clock2, UserRound, Clock, Clock11, ChartBarStacked, Calendar } from 'lucide-react'
import { ActionButton } from '@/components/ActionButton'
import { MessageModal } from '@/components/MessageModal'
import AvatarCircle from '@/components/facial/AvatarCircle'
import FacialRecognitionFlow from '@/components/facial/FacialRecognitionFlow'
import { Comfortaa, Roboto } from 'next/font/google'
import { toast } from 'sonner'
import { ThemeToggle } from '@/components/theme-toggle'

const comfortaa = Comfortaa({ subsets: ['latin'], weight: ['400', '700'] })
const roboto = Roboto({ subsets: ['latin'], weight: ['400', '700', '900'] })

export default function EmployeeCompanyPage({ params }: { params: { company: string, employee: string } }) {
  const router = useRouter()
  const { logout, user, refreshUser, loading: authLoading, isAuthenticated } = useAuth()
  const { onTimeEntryCreated, onEmployeeUpdated, onFaceRegistered, onFaceDeleted, connected } = useWebSocket()
  const { unreadCount } = useMessages()
  const { company, employee } = params
  
  // Proteção de rota: redirecionar para login se não autenticado
  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log('[AUTH] Usuário não autenticado, redirecionando para login...')
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])
  
  // Estado do user
  React.useEffect(() => {
    // User state atualizado
  }, [user])
  
  if (!company || !employee) notFound()
  
  // Mostrar loading enquanto verifica autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    )
  }
  
  // Não renderizar nada se não estiver autenticado (vai redirecionar)
  if (!isAuthenticated) {
    return null
  }

  const [now, setNow] = React.useState<Date | null>(null)
  const [mounted, setMounted] = React.useState(false)
  const [geoPermission, setGeoPermission] = React.useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown')
  const [lastLocation, setLastLocation] = React.useState<{ latitude: number; longitude: number; accuracy?: number; capturedAt?: string } | null>(null)
  const [employeeData, setEmployeeData] = React.useState<any>(null)
  const [companyData, setCompanyData] = React.useState<any>(null)
  const [todayEntries, setTodayEntries] = React.useState<any[]>([])
  const [loadingData, setLoadingData] = React.useState(true)
  const [showFacialCamera, setShowFacialCamera] = React.useState(false)
  const [facialCameraMode, setFacialCameraMode] = React.useState<'registration' | 'recognition'>('recognition')
  const [hasFaceRegistered, setHasFaceRegistered] = React.useState(false)
  const [checkingFaceStatus, setCheckingFaceStatus] = React.useState(true)

  React.useEffect(() => {
    setMounted(true)
    setNow(new Date())
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Setar companyData assim que user estiver disponível
  React.useEffect(() => {
    if (user && (user as any)?.company) {
      setCompanyData((user as any).company)
    }
  }, [user])

  React.useEffect(() => {
    let cancelled = false
    const checkPerm = async () => {
      try {
        if (!('permissions' in navigator) || !(navigator as any).permissions?.query) {
          if (!cancelled) setGeoPermission('unknown')
          return
        }
        const status = await (navigator as any).permissions.query({ name: 'geolocation' as PermissionName })
        if (!cancelled) setGeoPermission(status.state as any)
        try {
          status.onchange = () => setGeoPermission((status as any).state as any)
        } catch {}
      } catch {
        if (!cancelled) setGeoPermission('unknown')
      }
    }
    checkPerm()
    return () => { cancelled = true }
  }, [])

  // Verificar se funcionário tem face cadastrada
  const checkFaceStatus = React.useCallback(async () => {
    if (!user) return
    
    try {
      const employeeId = (user as any)?.employee?.id || (user as any)?.funcionario?.id
      if (!employeeId) return

      const token = localStorage.getItem('token')
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/time-entries/facial/status/${employeeId}`
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setHasFaceRegistered(!!data?.hasFace)
      }
    } catch (error) {
      console.error('Erro ao verificar status facial:', error)
    } finally {
      setCheckingFaceStatus(false)
    }
  }, [user])

  // Atualizar apenas dados do funcionário (sem loading, sem piscada)
  const updateEmployeeDataSilently = React.useCallback(async () => {
    if (!user) return
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL
      const employeeId = (user as any)?.employee?.id || (user as any)?.funcionario?.id
      const companyId = (user as any)?.company?.id || (user as any)?.empresa?.id
      if (!employeeId || !backendUrl) return

      const token = localStorage.getItem('token')
      const resEmployees = await fetch(`${backendUrl}/api/employees?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (resEmployees.ok) {
        const employees = await resEmployees.json()
        const empData = employees.find((emp: any) => emp.id === employeeId)
        if (empData) {
          setEmployeeData(empData)
        }
      }
    } catch (e) {
      console.error('Erro ao atualizar dados do funcionário:', e)
    }
  }, [user])

  // Buscar dados do funcionário e pontos do dia
  const fetchEmployeeData = React.useCallback(async (isInitialLoad = false) => {
    
    // Buscar token diretamente do localStorage
    const token = localStorage.getItem('token')
    if (!token) {
      if (isInitialLoad) {
        setLoadingData(false)
      }
      return
    }
    try {
      // Só mostrar loading na carga inicial, não no polling
      if (isInitialLoad) {
        setLoadingData(true)
      }
      const backendUrl = process.env.NEXT_PUBLIC_API_URL
      
      // Buscar dados do usuário autenticado
      const meResponse = await fetch(`${backendUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (!meResponse.ok) {
        if (isInitialLoad) {
          setLoadingData(false)
        }
        return
      }
      
      const userData = await meResponse.json()
      const employeeId = userData?.employee?.id || userData?.funcionario?.id
      const companyId = userData?.company?.id || userData?.empresa?.id
      
      if (!employeeId || !backendUrl) {
        if (isInitialLoad) {
          setLoadingData(false)
        }
        return
      }

      // Buscar dados do funcionário da lista
      const resEmployees = await fetch(`${backendUrl}/api/employees?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (resEmployees.ok) {
        const employees = await resEmployees.json()
        const empData = employees.find((emp: any) => emp.id === employeeId)
        if (empData) {
          setEmployeeData(empData)
        }
      }

      // Dados da empresa já vêm do user.company (incluindo logo)
      if ((user as any)?.company) {
        setCompanyData((user as any).company)
      }

      // Buscar pontos do dia
      const today = new Date().toISOString().split('T')[0]
      const resEntries = await fetch(`${backendUrl}/api/time-entries/${employeeId}?dataInicio=${today}&dataFim=${today}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (resEntries.ok) {
        const entries = await resEntries.json()
        setTodayEntries(Array.isArray(entries) ? entries : [])
      } else {
        const errorText = await resEntries.text()
        console.error('[EmployeePage] Erro ao buscar pontos:', errorText)
      }
    } catch (e) {
      console.error('[fetchEmployeeData] ❌ ERRO:', e)
    } finally {
      if (isInitialLoad) {
        setLoadingData(false)
      }
    }
  }, [user])

  // Carregar dados apenas UMA VEZ na montagem
  // Não reagir a mudanças no user para evitar piscada
  const initialLoadDone = React.useRef(false)
  
  React.useEffect(() => {
    if (mounted && !initialLoadDone.current) {
      initialLoadDone.current = true
      checkFaceStatus()
      fetchEmployeeData(true) // isInitialLoad = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  // WebSocket: Atualizar quando novo ponto for registrado
  React.useEffect(() => {
    if (!connected) return

    const employeeId = (user as any)?.employee?.id || (user as any)?.funcionario?.id
    if (!employeeId) return

    const unsubscribe = onTimeEntryCreated((timeEntry) => {
      
      // Atualizar apenas se for do funcionário atual
      if (timeEntry.employeeId === employeeId) {
        fetchEmployeeData(false) // Atualizar sem loading
        // Não mostrar toast aqui - já mostra na função de registro
      }
    })

    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, onTimeEntryCreated, user])

  // WebSocket: Atualizar quando funcionário for editado
  React.useEffect(() => {
    if (!connected) return

    const employeeId = (user as any)?.employee?.id || (user as any)?.funcionario?.id
    if (!employeeId) return

    const unsubscribe = onEmployeeUpdated(async (employee) => {
      if (employee.id === employeeId) {
        if (employee.active === false) {
          toast.error('Sua conta foi desativada', {
            description: 'Entre em contato com o administrador',
            duration: 5000,
          })
          setTimeout(() => {
            logout()
          }, 2000) // 2 segundos para ler a mensagem
          return
        }

        await refreshUser()
        await updateEmployeeDataSilently()
        checkFaceStatus()
        
        toast.info('Seus dados foram atualizados', {
          description: 'As configurações foram alteradas pelo administrador'
        })
      }
    })

    return unsubscribe
  }, [connected, onEmployeeUpdated, user, updateEmployeeDataSilently, checkFaceStatus, refreshUser, logout])

  // WebSocket: Atualizar quando face for cadastrada/removida
  React.useEffect(() => {
    if (!connected) return

    const employeeId = (user as any)?.employee?.id || (user as any)?.funcionario?.id
    if (!employeeId) return

    const unsubscribeFaceRegistered = onFaceRegistered((data) => {
      if (data.employeeId === employeeId) {
        checkFaceStatus()
      }
    })

    const unsubscribeFaceDeleted = onFaceDeleted((data) => {
      if (data.employeeId === employeeId) {
        checkFaceStatus()
      }
    })

    return () => {
      unsubscribeFaceRegistered()
      unsubscribeFaceDeleted()
    }
  }, [connected, onFaceRegistered, onFaceDeleted, user, checkFaceStatus])

  function getCurrentPositionOnce(options?: PositionOptions): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) return reject(new Error('Geolocalização não suportada'))
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        ...(options || {}),
      })
    })
  }

  async function handleLocationTest() {
    try {
      const pos = await getCurrentPositionOnce()
      const { latitude, longitude, accuracy } = pos.coords
      const capturedAt = new Date(pos.timestamp).toISOString()
      setLastLocation({ latitude, longitude, accuracy, capturedAt })
      toast.success('Localização obtida', { description: `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)} • ±${Math.round(accuracy || 0)}m` })
    } catch (e: any) {
      if (e?.code === 1) toast.error('Permissão de localização negada. Ative nas configurações do navegador.')
      else if (e?.code === 2) toast.error('Localização indisponível. Verifique GPS/Internet e tente novamente.')
      else if (e?.code === 3) toast.error('Tempo esgotado para obter a localização. Tente novamente.')
      else toast.error(e?.message || 'Erro ao obter localização')
    }
  }

  const handleClock = React.useCallback(async (type: 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END') => {
    try {
      const pos = await getCurrentPositionOnce()
      const { latitude, longitude, accuracy } = pos.coords
      const capturedAt = new Date(pos.timestamp).toISOString()

      const backendUrl = process.env.NEXT_PUBLIC_API_URL
      if (!backendUrl) {
        toast.error('Configuração ausente', { description: 'NEXT_PUBLIC_API_URL não definida' })
        return
      }

      const employeeId = (user as any)?.employee?.id || (user as any)?.funcionario?.id
      if (!employeeId) {
        toast.error('Funcionário não identificado')
        return
      }

      const token = localStorage.getItem('token')
      const res = await fetch(`${backendUrl}/api/time-entries`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          employeeId,
          type,
          latitude,
          longitude,
          accuracy,
          clientCapturedAt: capturedAt,
          geoMethod: 'html5',
          source: 'web',
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.message || 'Falha ao registrar ponto')
      }

      // Mensagens iguais ao reconhecimento facial
      const typeLabels: Record<string, string> = {
        'CLOCK_IN': 'Entrada',
        'CLOCK_OUT': 'Saída',
        'BREAK_START': 'Início do intervalo',
        'BREAK_END': 'Fim do intervalo',
      }
      const label = typeLabels[type] || 'Ponto'
      
      toast.success(`✅ ${label} registrada!`, {
        description: `${employeeName} • ${new Date().toLocaleTimeString('pt-BR')}`,
        duration: 5000,
      })
      
      // Recarregar dados do funcionário e pontos do dia
      await fetchEmployeeData()
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao registrar ponto')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Evitar flicker: usar apenas dados vindos do user; não cair no slug da URL.
  const employeeName = user?.employee?.name || user?.name || ''
  const companyName = user?.company?.tradeName || ''
  const jobTitle: string | undefined = (user as any)?.employee?.position?.name || undefined
  // avatarKey é a chave salva no banco (ex.: companyId/users/userId/profile.jpg|png)
  const avatarKey = (user as any)?.avatarUrl as string | undefined || (user as any)?.employee?.photoUrl as string | undefined || undefined

  // Handlers da câmera facial
  const handleFacialSuccess = React.useCallback(async (result: any) => {
    setShowFacialCamera(false)
    
    if (facialCameraMode === 'registration') {
      // Cadastro bem-sucedido
      toast.success('✅ Face cadastrada com sucesso!', {
        description: 'Agora você pode usar reconhecimento facial para bater ponto',
        duration: 5000,
      })
      setHasFaceRegistered(true)
    } else {
      // Reconhecimento bem-sucedido (ponto registrado)
      const typeLabels: Record<string, string> = {
        'CLOCK_IN': 'Entrada',
        'CLOCK_OUT': 'Saída',
        'BREAK_START': 'Início do intervalo',
        'BREAK_END': 'Fim do intervalo',
      }
      const label = typeLabels[result.type] || 'Ponto'
      
      toast.success(`✅ ${label} registrada!`, {
        description: `${result.employeeData?.name || employeeName} • ${new Date().toLocaleTimeString('pt-BR')}`,
        duration: 5000,
      })
      
      // Recarregar dados
      await fetchEmployeeData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facialCameraMode, employeeName])

  const handleFacialError = React.useCallback((error: string) => {
    setShowFacialCamera(false)
    
    // Detectar tipo de erro pela mensagem
    let title = '❌ Erro no reconhecimento facial'
    
    if (error.includes('fora da área') || error.includes('Distância')) {
      title = '📍 Fora da área permitida'
    } else if (error.includes('Face não cadastrada') || error.includes('não reconhecida')) {
      title = '👤 Face não reconhecida'
    } else if (error.includes('Foto') || error.includes('obrigatória')) {
      title = '📸 Erro na captura'
    }
    
    toast.error(title, {
      description: error,
      duration: 5000,
    })
  }, [])

  const openFacialCamera = React.useCallback((mode: 'registration' | 'recognition') => {
    setFacialCameraMode(mode)
    setShowFacialCamera(true)
  }, [])

  // Função handleDeleteFace removida - exclusão de face agora é feita apenas pelo admin

  const timeStr = now ? now.toLocaleTimeString('pt-BR', { hour12: false }) : ''
  const dateStr = now ? new Intl.DateTimeFormat('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: '2-digit' }).format(now) : ''
  const dateShort = now ? now.toLocaleDateString('pt-BR') : ''

  // Logo da empresa - usar companyData ao invés de user.company
  const companyLogoKey = companyData?.logoUrl || (user as any)?.company?.logoUrl
  const companyLogoUrl = companyLogoKey ? `${process.env.NEXT_PUBLIC_API_URL}/api/files/employees/${companyLogoKey}` : undefined

  const [showMessage, setShowMessage] = React.useState(false)

  // Verificar quais botões devem aparecer
  // Ordenar por timestamp (mais recente primeiro)
  const sortedEntries = [...todayEntries].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
  
  // Encontrar o índice do último CLOCK_OUT
  const lastClockOutIndex = sortedEntries.findIndex(e => e.type === 'CLOCK_OUT')
  
  // Considerar apenas pontos APÓS o último CLOCK_OUT (ciclo atual)
  const currentCycleEntries = lastClockOutIndex >= 0 
    ? sortedEntries.slice(0, lastClockOutIndex)
    : sortedEntries
  
  const hasClockIn = currentCycleEntries.some(e => e.type === 'CLOCK_IN')
  const hasBreakStart = currentCycleEntries.some(e => e.type === 'BREAK_START')
  const hasBreakEnd = currentCycleEntries.some(e => e.type === 'BREAK_END')
  const hasClockOut = currentCycleEntries.some(e => e.type === 'CLOCK_OUT')

  // Verificar se reconhecimento facial está habilitado
  const facialRecognitionEnabled = employeeData?.allowFacialRecognition || false

  // Verificar se está no horário permitido (10 minutos antes do horário de entrada)
  // TODO: Reativar validação de horário quando sistema estiver pronto
  const isWithinAllowedTime = true // React.useMemo(() => {
  //   if (!employeeData?.workStartTime || !now) return false
  //   const [hours, minutes] = employeeData.workStartTime.split(':').map(Number)
  //   const workStart = new Date(now)
  //   workStart.setHours(hours, minutes, 0, 0)
  //   const tenMinutesBefore = new Date(workStart.getTime() - 10 * 60 * 1000)
  //   return now >= tenMinutesBefore
  // }, [employeeData?.workStartTime, now])

  // Determinar quais botões mostrar
  // Se já bateu saída, reinicia o ciclo (permite bater entrada novamente)
  const showClockInButton = !facialRecognitionEnabled && (!hasClockIn || hasClockOut) && isWithinAllowedTime
  const showBreakStartButton = !facialRecognitionEnabled && hasClockIn && !hasBreakStart && !hasClockOut
  const showBreakEndButton = !facialRecognitionEnabled && hasBreakStart && !hasBreakEnd
  const showClockOutButton = !facialRecognitionEnabled && hasClockIn && !hasClockOut && (!hasBreakStart || hasBreakEnd)

  // Verificar se deve mostrar o botão de localização
  // Só mostra se o funcionário tem permissão de ponto remoto
  const allowRemoteClockIn = employeeData?.allowRemoteClockIn ?? false
  const showLocationButton = allowRemoteClockIn && geoPermission !== 'granted'

  // Dados dos pontos para o resumo (apenas do ciclo atual)
  const clockInEntry = currentCycleEntries.find(e => e.type === 'CLOCK_IN')
  const breakStartEntry = currentCycleEntries.find(e => e.type === 'BREAK_START')
  const breakEndEntry = currentCycleEntries.find(e => e.type === 'BREAK_END')
  const clockOutEntry = currentCycleEntries.find(e => e.type === 'CLOCK_OUT')
  const showSummary = currentCycleEntries.length > 0 && !hasClockOut

  // Loading centralizado - exibir APENAS na carga inicial
  // Removido checkingFaceStatus para evitar piscada ao atualizar
  // REMOVIDO: dependência de !user para evitar loading infinito
  
  // Estado de loading
  React.useEffect(() => {
    // Loading state atualizado
  }, [mounted, loadingData, user])
  
  if (!mounted || loadingData) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <UserRound className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground font-medium">Carregando dados do funcionário...</p>
          <p className="text-sm text-muted-foreground mt-2">Preparando sua interface</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen w-full grid place-items-start pt-0 pb-10 bg-background text-foreground">
      {/* Frame central fixo */}
      <div className="w-full px-4">
        <div className="mx-auto w-full max-w-[400px] px-5 py-5">
          {/* Linha superior: ThemeToggle à esquerda e botão fechar à direita */}
          <div className="flex items-center justify-between">
            <div title="Alterar tema">
              <ThemeToggle />
            </div>
            <button
              onClick={logout}
              aria-label="Sair"
              title="Sair"
              className="p-2 text-muted-foreground hover:text-red-500 transition rounded-full hover:bg-red-50 dark:hover:bg-red-950"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

        {/* Modal de mensagens */}
        <MessageModal
          open={showMessage}
          onClose={() => {
            setShowMessage(false)
          }}
          employee={{
            name: employeeName,
            position: jobTitle,
            // Passa a CHAVE crua; o componente MessageModal monta a URL via getFileUrl
            avatarUrl: avatarKey,
          }}
        />

          {/* Bloco do usuário */}
          <div className="mt-2 flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="relative rounded-full overflow-hidden">
              <AvatarCircle name={employeeName || ' '} photoUrl={avatarKey} sizeClass="w-[150px] h-[150px]" />
            </div>

            {/* Nome */}
            <h1 className={`${comfortaa.className} mt-5 text-[32px] leading-tight tracking-[-0.015em] text-black dark:text-white`}>
              {employeeName}
            </h1>

            {/* Cargo */}
            <p className={`${roboto.className} mt-1 text-[16px] leading-snug text-muted-foreground`}>
              {jobTitle || ''}
            </p>
          </div>

          {/* Ícones de status (reconhecimento + localização + mensagens) */}
          <div className="mt-6 flex items-center justify-center gap-[10px]">
            {facialRecognitionEnabled && (
              <span title="Reconhecimento facial ativado" role="img" aria-label="Reconhecimento facial ativado">
                <ScanFace className="w-6 h-6" style={{ color: '#01BB74' }} />
              </span>
            )}
            {/* Ícone de geolocalização - só mostra se tem permissão de ponto remoto */}
            {allowRemoteClockIn && (
              <>
                {geoPermission === 'granted' ? (
                  <span title="Geolocalização ativada" role="img" aria-label="Geolocalização ativada">
                    <MapPinCheck className="w-6 h-6" style={{ color: '#01BB74' }} />
                  </span>
                ) : geoPermission === 'denied' ? (
                  <span title="Geolocalização bloqueada" role="img" aria-label="Geolocalização bloqueada">
                    <MapPin className="w-6 h-6" style={{ color: '#BA2C2E' }} />
                  </span>
                ) : (
                  <span title="Autorize a geolocalização" role="img" aria-label="Autorize a geolocalização">
                    <MapPin className="w-6 h-6" style={{ color: '#FFB703' }} />
                  </span>
                )}
              </>
            )}
            {/* Ícone de mensagens não lidas - pisca em amarelo */}
            {unreadCount > 0 && (
              <button
                onClick={() => {
                  setShowMessage(true)
                }}
                className="relative animate-pulse"
                title={`${unreadCount} mensagem${unreadCount > 1 ? 's' : ''} não lida${unreadCount > 1 ? 's' : ''}`}
                aria-label={`${unreadCount} mensagem${unreadCount > 1 ? 's' : ''} não lida${unreadCount > 1 ? 's' : ''}`}
              >
                <MessageCircleMore className="w-6 h-6" style={{ color: '#FFB703' }} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </button>
            )}
          </div>

          {/* Botão de localização (se necessário) */}
          {showLocationButton && (
            <div className="mt-6">
              <ActionButton
                label="LOCALIZAÇÃO"
                icon={<MapPin className="w-5 h-5" />}
                bgColor="#FFB703"
                textColor="#000"
                border
                borderColor="#EBAA05"
                className={`${roboto.className}`}
                onClick={handleLocationTest}
              />
            </div>
          )}

          {/* Resumo do dia - Só aparece se houver pontos e não tiver saído */}
          {showSummary && (
            <div className="mt-6">
              <div className="flex items-center gap-2">
                <ChartBarStacked className="w-5 h-5 text-foreground" />
                <div className={`${comfortaa.className} text-foreground text-[20px] font-semibold`}>Resumo do dia</div>
              </div>
              <div className={`${comfortaa.className} text-muted-foreground text-[14px] mt-1`}>Qual a etapa do dia você está</div>

              <div className="mt-4 space-y-3">
                {clockInEntry && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-2">
                        <ClockArrowUp className="w-5 h-5" style={{ color: '#01BB74' }} />
                        <span className={`${comfortaa.className} text-[14px] font-semibold`} style={{ color: '#01BB74' }}>ENTRADA</span>
                      </div>
                      <span className={`${comfortaa.className} text-[14px] text-muted-foreground`}>
                        {new Date(clockInEntry.timestamp).toLocaleDateString('pt-BR')} - {new Date(clockInEntry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="h-px w-full bg-border" />
                  </>
                )}

                {breakStartEntry && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-2">
                        <Clock12 className="w-5 h-5" style={{ color: '#FFB703' }} />
                        <span className={`${comfortaa.className} text-[14px] font-semibold`} style={{ color: '#FFB703' }}>INÍCIO DO INTERVALO</span>
                      </div>
                      <span className={`${comfortaa.className} text-[14px] text-muted-foreground`}>
                        {new Date(breakStartEntry.timestamp).toLocaleDateString('pt-BR')} - {new Date(breakStartEntry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="h-px w-full bg-border" />
                  </>
                )}

                {breakEndEntry && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-2">
                        <Clock2 className="w-5 h-5" style={{ color: '#FF6F31' }} />
                        <span className={`${comfortaa.className} text-[14px] font-semibold`} style={{ color: '#FF6F31' }}>VOLTA DO INTERVALO</span>
                      </div>
                      <span className={`${comfortaa.className} text-[14px] text-muted-foreground`}>
                        {new Date(breakEndEntry.timestamp).toLocaleDateString('pt-BR')} - {new Date(breakEndEntry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="h-px w-full bg-border" />
                  </>
                )}
              </div>
            </div>
          )}

          {/* Cards de Data e Hora */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            {/* Card de Data - Esquerda */}
            <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border bg-card">
              <Calendar className="w-5 h-5 text-white flex-shrink-0" />
              <span className={`${comfortaa.className} text-foreground text-[14px] font-semibold leading-tight`} suppressHydrationWarning>{mounted ? dateShort : ''}</span>
            </div>
            
            {/* Card de Relógio - Direita */}
            <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border bg-card">
              <Clock11 className="w-5 h-5 text-white flex-shrink-0" />
              <span className={`${roboto.className} text-foreground text-[18px] font-bold tabular-nums leading-tight`} suppressHydrationWarning>{mounted ? timeStr : ''}</span>
            </div>
          </div>

          {/* Bloco de Ponto - só mostra se tem permissão de ponto remoto */}
          {allowRemoteClockIn && (
            <>
              {/* Ponto */}
              <div className="mt-4">
            <div className="grid grid-cols-[auto_1fr] grid-rows-[auto_auto] gap-x-2">
              <Clock className="w-6 h-6 text-foreground mt-0.5 col-[1] row-[1]" />
              <div className="col-[2] row-[1]">
                <div className={`${comfortaa.className} text-foreground text-[20px] font-semibold`}>
                  {facialRecognitionEnabled ? 'Ponto Facial' : 'Ponto Manual'}
                </div>
              </div>
              <div className="col-[1_/_span_2] row-[2] mt-1">
                <div className={`${comfortaa.className} text-muted-foreground text-[14px]`}>
                  {facialRecognitionEnabled 
                    ? 'Registre seu ponto com reconhecimento facial'
                    : 'Registre seu ponto manualmente'}
                </div>
              </div>
            </div>
          </div>

          {/* Botões de ponto - Ordem correta: ENTRADA, INÍCIO INTERVALO, FIM INTERVALO, SAÍDA */}
          <div className="mt-3 flex flex-col gap-[10px]">
            {/* Botões de reconhecimento facial */}
            {facialRecognitionEnabled && !checkingFaceStatus && !hasFaceRegistered && (
              <ActionButton
                label="CADASTRAR FACE"
                icon={<ScanFace className="w-5 h-5" />}
                bgColor="#18A0FB"
                textColor="#fff"
                border
                borderColor="#1286D4"
                className={`${roboto.className}`}
                onClick={() => openFacialCamera('registration')}
              />
            )}
            {facialRecognitionEnabled && !checkingFaceStatus && hasFaceRegistered && (
              <ActionButton
                label="RECONHECIMENTO FACIAL"
                icon={<ScanFace className="w-5 h-5" />}
                bgColor="#01BB74"
                textColor="#fff"
                border
                borderColor="#008D57"
                className={`${roboto.className}`}
                onClick={() => openFacialCamera('recognition')}
              />
            )}
            
            {/* Botões de ponto manual (só aparecem se reconhecimento facial NÃO estiver ativo) */}
            {(!facialRecognitionEnabled && showClockInButton) && (
              <ActionButton
                label="ENTRADA"
                icon={<ClockArrowUp className="w-5 h-5" />}
                bgColor="#01BB74"
                textColor="#fff"
                border
                borderColor="#008D57"
                className={`${roboto.className}`}
                onClick={() => handleClock('CLOCK_IN')}
              />
            )}
            {(!facialRecognitionEnabled && showBreakStartButton) && (
              <ActionButton
                label="INÍCIO DO INTERVALO"
                icon={<Clock12 className="w-5 h-5" />}
                bgColor="#FFB703"
                textColor="#000"
                border
                borderColor="#EBAA05"
                className={`${roboto.className}`}
                onClick={() => handleClock('BREAK_START')}
              />
            )}
            {(!facialRecognitionEnabled && showBreakEndButton) && (
              <ActionButton
                label="FIM DO INTERVALO"
                icon={<Clock2 className="w-5 h-5" />}
                bgColor="#FF6F31"
                textColor="#fff"
                border
                borderColor="#BF5716"
                className={`${roboto.className}`}
                onClick={() => handleClock('BREAK_END')}
              />
            )}
            {(!facialRecognitionEnabled && showClockOutButton) && (
              <ActionButton
                label="SAÍDA"
                icon={<ClockArrowDown className="w-5 h-5" />}
                bgColor="#BA2C2E"
                textColor="#fff"
                border
                borderColor="#A10003"
                className={`${roboto.className}`}
                onClick={() => handleClock('CLOCK_OUT')}
              />
            )}
          </div>
            </>
          )}

          {/* Botão de mensagem - SEMPRE visível, independente de ponto remoto */}
          <div className="mt-6">
            <ActionButton
              label="MESSAGE"
              icon={<MessageCircleMore className="w-5 h-5" />}
              border
              borderColor="currentColor"
              className={`${roboto.className} text-foreground`}
              onClick={() => {
                setShowMessage(true)
              }}
              textColor="currentColor"
              hoverClass="hover:bg-accent"
            />
          </div>

          {/* Logo da empresa */}
          <div className="mt-6 flex items-center justify-center">
            {companyLogoUrl ? (
              <div className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={companyLogoUrl} 
                  alt={companyName || 'Logo da empresa'} 
                  className="max-h-[60px] max-w-[200px] object-contain mx-auto"
                />
                {companyName && (
                  <div className={`${comfortaa.className} text-muted-foreground text-xs mt-2`}>
                    {companyName}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-sm">
                <div className={`${comfortaa.className} text-foreground font-semibold text-lg`}>
                  {companyName || 'Empresa'}
                </div>
                <div className="text-muted-foreground text-xs mt-1">Sistema de Ponto</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal da câmera facial */}
      {showFacialCamera && (
        <FacialRecognitionFlow
          mode={facialCameraMode}
          authMode="employee"
          userId={(user as any)?.employee?.id || (user as any)?.funcionario?.id || ''}
          userEmail={(user as any)?.email || ''}
          onRecognitionSuccess={handleFacialSuccess}
          onRecognitionError={handleFacialError}
          onRegistrationSuccess={handleFacialSuccess}
          onRegistrationError={handleFacialError}
          autoOpenCamera={true}
          showButton={false}
        />
      )}
    </main>
  )
}
