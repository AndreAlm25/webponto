"use client"

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Camera, User, CheckCircle, Clock, Coffee, LogOut, Home } from 'lucide-react'
import FacialRecognitionEnhanced from '@/components/facial/FacialRecognitionEnhanced'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Comfortaa, Roboto } from 'next/font/google'

// Fontes
const comfortaa = Comfortaa({ subsets: ['latin'], weight: ['300', '400', '700'] })
const roboto = Roboto({ subsets: ['latin'], weight: ['400', '500', '700'] })

// Tipos para o resultado do ponto
interface ClockResult {
  success: boolean
  type: 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END'
  timestamp: string
  message: string
  employeeData: any
  clockResult?: any
}

// Configuração das Cores e Textos Baseado no Tipo (fora do componente para evitar recriação)
// Cores baseadas na imagem de referência - fundo claro com borda escura
const typeConfig: Record<string, { label: string, bgColor: string, borderColor: string, textColor: string, icon: any }> = {
  'CLOCK_IN': { 
    label: 'ENTRADA', 
    bgColor: '#22C55E', // Verde
    borderColor: '#16A34A', // Verde escuro
    textColor: '#FFFFFF',
    icon: Clock 
  },
  'CLOCK_OUT': { 
    label: 'SAÍDA', 
    bgColor: '#A63D40', // Vermelho escuro/bordô
    borderColor: '#7F2D2F', // Bordô mais escuro
    textColor: '#FFFFFF',
    icon: Clock 
  },
  'BREAK_START': { 
    label: 'INÍCIO DO INTERVALO', 
    bgColor: '#FACC15', // Amarelo
    borderColor: '#CA8A04', // Amarelo escuro
    textColor: '#000000', // Texto preto
    icon: Clock 
  },
  'BREAK_END': { 
    label: 'FIM DO INTERVALO', 
    bgColor: '#F97316', // Laranja
    borderColor: '#C2410C', // Laranja escuro
    textColor: '#FFFFFF',
    icon: Clock 
  },
}

export default function TerminalDePontoPage({ params }: { params: { company: string } }) {
  const [step, setStep] = useState<'IDLE' | 'SCANNING' | 'SUCCESS' | 'ERROR'>('IDLE')
  const [result, setResult] = useState<ClockResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessageDuration, setSuccessMessageDuration] = useState(10) // Tempo configurável em segundos
  const [countdown, setCountdown] = useState(10)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  
  // Buscar configurações do app ao montar
  useEffect(() => {
    const fetchAppSettings = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/companies/settings/app`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (response.ok) {
          const settings = await response.json()
          if (settings.successMessageDuration) {
            setSuccessMessageDuration(settings.successMessageDuration)
            setCountdown(settings.successMessageDuration)
          }
        }
      } catch (e) {
        console.log('Usando tempo padrão de 10 segundos')
      }
    }
    fetchAppSettings()
  }, [])
  
  // Ref para o container principal para solicitar fullscreen
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Ref para rastrear se o usuário já entrou em fullscreen pelo menos uma vez
  // Se já entrou, não mostramos mais o overlay mesmo que saia do fullscreen
  const hasEnteredFullscreenRef = useRef(false)

  // Logo da empresa (memoizado para evitar recálculo)
  const { companyLogoUrl, companyName } = useMemo(() => {
    const companyData = (user as any)?.company
    const companyLogoKey = companyData?.logoUrl || companyData?.logo
    const logoUrl = companyLogoKey ? `${process.env.NEXT_PUBLIC_API_URL}/api/files/employees/${companyLogoKey}` : null
    const name = companyData?.tradeName || companyData?.name || 'Ponto Conecta Mais'
    return { companyLogoUrl: logoUrl, companyName: name }
  }, [user])

  // Dados do funcionário e configuração do card (memoizado)
  const { emp, avatarUrl, config, Icon } = useMemo(() => {
    const defaultConfig = typeConfig['CLOCK_IN']
    if (!result) return { emp: {}, avatarUrl: null, config: defaultConfig, Icon: defaultConfig.icon }
    
    // Dados do funcionário vêm de employeeData
    const empData = result.employeeData || {}
    
    // O cargo vem de clockResult.employee.position (retornado pelo backend)
    const clockResultEmployee = result.clockResult?.employee
    
    // Extrair nome
    const name = empData.name || empData.user?.name || clockResultEmployee?.user?.name || 'Funcionário'
    
    // Extrair avatar
    const rawAvatar = empData.photoUrl || empData.avatarUrl || empData.user?.avatarUrl || clockResultEmployee?.user?.avatarUrl
    const avatar = rawAvatar ? `${process.env.NEXT_PUBLIC_API_URL}/api/files/employees/${rawAvatar}` : null
    
    // Extrair cargo - PRIORIDADE: clockResult.employee.position (vem do backend com include)
    const position = clockResultEmployee?.position?.name || empData.position?.name || empData.positionName || ''
    
    console.log('📋 [Terminal] Cargo extraído:', position, 'de clockResult.employee.position:', clockResultEmployee?.position)
    
    const cfg = typeConfig[result.type] || defaultConfig
    
    return { 
      emp: { ...empData, name, position: { name: position } }, 
      avatarUrl: avatar, 
      config: cfg, 
      Icon: cfg.icon 
    }
  }, [result])

  // Monitorar estado de fullscreen - APENAS pelo evento fullscreenchange
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement
      console.log('🖥️ [Fullscreen] Evento fullscreenchange - estado:', isFs)
      setIsFullscreen(isFs)
      
      // Se entrou em fullscreen, marcar que já entrou uma vez
      if (isFs) {
        hasEnteredFullscreenRef.current = true
        console.log('🖥️ [Fullscreen] Marcado como já entrou em fullscreen')
      }
    }
    
    // Verificar estado inicial
    const initialFs = !!document.fullscreenElement
    console.log('🖥️ [Fullscreen] Estado inicial:', initialFs)
    setIsFullscreen(initialFs)
    if (initialFs) {
      hasEnteredFullscreenRef.current = true
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])


  // Resetar para o estado inicial
  const resetToIdle = useCallback(() => {
    setStep('IDLE')
    setResult(null)
    setErrorMessage(null)
    setCountdown(successMessageDuration)
  }, [successMessageDuration])

  // Timer para voltar ao início após sucesso ou erro (tempo configurável)
  useEffect(() => {
    if (step !== 'SUCCESS' && step !== 'ERROR') return
    
    setCountdown(successMessageDuration)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          resetToIdle()
          return successMessageDuration
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [step, resetToIdle, successMessageDuration])

  // Handler para tentar fullscreen ao clicar
  const handleInteraction = useCallback(() => {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(e => console.log('Erro ao tentar fullscreen:', e))
    }
  }, [])

  // Handler para sair do fullscreen com duplo clique
  const handleDoubleClick = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(e => console.log('Erro ao sair do fullscreen:', e))
    }
  }, [])

  // Handler de sucesso do reconhecimento
  const handleRecognitionSuccess = useCallback((data: any) => {
    console.log('✅ [Terminal] Sucesso Recebido:', data)
    console.log('✅ [Terminal] employeeData:', data.employeeData)
    console.log('✅ [Terminal] clockResult:', data.clockResult)
    console.log('✅ [Terminal] clockResult.employee:', data.clockResult?.employee)
    
    // Se não tiver employeeData completo, tentar usar o que veio no reconhecimento
    if (!data.employeeData && data.clockResult?.employee) {
      console.log('✅ [Terminal] Usando employee do clockResult')
      data.employeeData = data.clockResult.employee
    }
    
    // Se ainda não tiver, tentar outras fontes
    if (!data.employeeData) {
      console.log('✅ [Terminal] employeeData ainda vazio, tentando outras fontes...')
      data.employeeData = data.employee || data.user || {}
    }
    
    console.log('✅ [Terminal] employeeData final:', data.employeeData)
    setResult(data)
    setStep('SUCCESS')
    setCountdown(successMessageDuration) // Usar tempo configurável
  }, [])

  // Handler de erro do reconhecimento
  const handleRecognitionError = useCallback((error: string) => {
    console.error('❌ [Terminal] Erro:', error)
    setErrorMessage(error)
    setStep('ERROR')
  }, [])

  // Handler para fechar câmera - NÃO fazer nada aqui
  // O onRecognitionSuccess vai mudar para SUCCESS
  // O onRecognitionError vai mudar para IDLE
  const handleCloseCamera = useCallback(() => {
    // Não fazer nada - deixar os handlers de sucesso/erro controlarem o fluxo
    console.log('📷 [Terminal] Câmera fechada')
  }, [])

  // Handler para abrir scanner
  const handleOpenScanner = useCallback(() => {
    handleInteraction() // Tenta fullscreen
    setStep('SCANNING')
  }, [handleInteraction])

  // --- RENDERIZAÇÃO CONDICIONAL (sem retorno antecipado para evitar erro de hooks) ---
  
  // TELA DE SCANNER
  if (step === 'SCANNING') {
    return (
      <FacialRecognitionEnhanced
        mode="reconhecimento"
        authMode="admin" // Modo 1:N
        onClose={handleCloseCamera}
        onRecognitionSuccess={handleRecognitionSuccess}
        onRecognitionError={handleRecognitionError}
        onRegistrationSuccess={() => {}} 
        onRegistrationError={() => {}} 
      />
    )
  }

  // ============================================================================
  // TELA DE SUCESSO
  // ============================================================================
  // O conteúdo fica centralizado verticalmente na tela, dentro de uma "caixa"
  // que ocupa ~75% da altura da viewport, posicionada sobre o "V" do fundo.
  // 
  // ESTRUTURA DOS ELEMENTOS (de cima para baixo):
  // 1. Avatar (foto do funcionário)
  // 2. Nome do funcionário
  // 3. Cargo do funcionário
  // 4. "HORÁRIO DO PONTO" (título azul)
  // 5. Horário (ex: 08:22:30)
  // 6. Data (ex: Quinta-Feira, 27 De Novembro De 2025)
  // 7. Card de mensagem (ENTRADA, SAÍDA, etc)
  // 8. Contador "Voltando em Xs..."
  // 9. Botão "Voltar"
  //
  // Para ajustar espaçamentos, modifique os valores de 'gap' e 'height' abaixo.
  // ============================================================================
  if (step === 'SUCCESS' && result) {
    return (
      <div 
        className="relative h-screen w-full flex items-center justify-center overflow-hidden"
        onDoubleClick={handleDoubleClick}
        style={{
          backgroundImage: `url('/pontoBg.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* 
          CONTAINER PRINCIPAL DA MENSAGEM
          - Centralizado vertical e horizontalmente
          - Altura máxima de 85% da viewport para caber tudo
          - Largura responsiva
        */}
        <div 
          className="z-10 flex flex-col items-center justify-between px-4"
          style={{
            height: '85vh',        // Altura do container (ajuste aqui se precisar)
            maxHeight: '900px',    // Altura máxima em telas muito grandes
            width: '100%',
            maxWidth: '500px',     // Largura máxima do conteúdo
            paddingTop: '2vh',     // Padding superior
            paddingBottom: '2vh',  // Padding inferior
          }}
        >
          
          {/* SEÇÃO SUPERIOR: Avatar + Nome + Cargo */}
          <div className="flex flex-col items-center" style={{ gap: '0.8vh' }}>
            {/* 1. AVATAR */}
            <div 
              className="relative rounded-full border-white shadow-lg overflow-hidden bg-slate-100"
              style={{
                width: 'min(18vh, 150px)',   // Tamanho do avatar
                height: 'min(18vh, 150px)',
                borderWidth: '4px',
                borderStyle: 'solid',
              }}
            >
              {avatarUrl ? (
                <Image 
                  src={avatarUrl} 
                  alt={emp.name || 'Funcionário'} 
                  fill 
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <User style={{ width: '50%', height: '50%' }} />
                </div>
              )}
            </div>

            {/* 2. NOME - Espaçamento: 3vh do avatar */}
            <h2 
              className={`${comfortaa.className} font-bold text-black text-center leading-tight`}
              style={{ 
                fontSize: 'clamp(22px, 4vh, 36px)',
                marginTop: '2vh',
              }}
            >
              {emp.name || 'Funcionário'}
            </h2>
            
            {/* 3. CARGO - Espaçamento: 0.5vh do nome */}
            <p 
              className={`${comfortaa.className} font-light text-slate-500 text-center`}
              style={{ fontSize: 'clamp(14px, 2vh, 18px)' }}
            >
              {emp.position?.name || ''}
            </p>
          </div>

          {/* SEÇÃO CENTRAL: Horário do Ponto */}
          <div className="flex flex-col items-center" style={{ gap: '0.5vh' }}>
            {/* 4. TÍTULO "HORÁRIO DO PONTO" */}
            <h3 
              className={`${roboto.className} font-bold text-[#00A3FF]`}
              style={{ fontSize: 'clamp(20px, 3.5vh, 32px)' }}
            >
              HORÁRIO DO PONTO
            </h3>
            
            {/* 5. HORA */}
            <div 
              className={`${roboto.className} font-bold text-black tabular-nums`}
              style={{ fontSize: 'clamp(24px, 4vh, 36px)' }}
            >
              {result?.clockResult?.timestamp 
                ? new Date(result.clockResult.timestamp).toLocaleTimeString('pt-BR')
                : result?.timestamp 
                  ? new Date(result.timestamp).toLocaleTimeString('pt-BR')
                  : '--:--:--'}
            </div>
            
            {/* 6. DATA */}
            <div 
              className={`${roboto.className} font-normal text-slate-500 capitalize text-center`}
              style={{ fontSize: 'clamp(14px, 2.2vh, 22px)' }}
            >
              {result?.clockResult?.timestamp 
                ? new Date(result.clockResult.timestamp).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                : result?.timestamp 
                  ? new Date(result.timestamp).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                  : ''}
            </div>
          </div>

          {/* SEÇÃO INFERIOR: Card + Contador + Botão */}
          <div className="flex flex-col items-center" style={{ gap: '2vh' }}>
            {/* 7. CARD DE MENSAGEM */}
            <div 
              className="rounded-[5px] shadow-lg flex flex-col items-center justify-center"
              style={{
                width: 'min(28vh, 180px)',     // Largura do card
                height: 'min(20vh, 130px)',    // Altura do card
                padding: 'min(3vh, 25px)',
                backgroundColor: config.bgColor,
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: config.borderColor,
                color: config.textColor,
              }}
            >
              {/* Ícone */}
              <Icon style={{ 
                width: 'min(4vh, 30px)', 
                height: 'auto', 
                strokeWidth: 2,
                marginBottom: 'min(1.5vh, 10px)',
              }} />
              {/* Texto */}
              <span 
                className={`${roboto.className} font-semibold text-center leading-tight`}
                style={{ fontSize: 'clamp(14px, 2.5vh, 22px)' }}
              >
                {config.label}
              </span>
            </div>

            {/* 8. CONTADOR */}
            <p 
              className={`${comfortaa.className} text-slate-400`}
              style={{ fontSize: 'clamp(12px, 1.8vh, 16px)' }}
            >
              Voltando em {countdown}s...
            </p>

            {/* 9. BOTÃO VOLTAR */}
            <button
              onClick={resetToIdle}
              className={`${comfortaa.className} bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors`}
              style={{
                padding: 'min(1.2vh, 10px) min(3vh, 24px)',
                fontSize: 'clamp(12px, 1.8vh, 16px)',
              }}
            >
              Voltar
            </button>
          </div>

        </div>
      </div>
    )
  }

  // TELA DE ERRO - Mesmo layout centralizado da tela de sucesso
  if (step === 'ERROR' && errorMessage) {
    return (
      <div 
        className="relative h-screen w-full flex items-center justify-center overflow-hidden"
        onDoubleClick={handleDoubleClick}
        style={{
          backgroundImage: `url('/pontoBg.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div 
          className="z-10 flex flex-col items-center justify-between px-4"
          style={{
            height: '70vh',
            maxHeight: '700px',
            width: '100%',
            maxWidth: '500px',
            paddingTop: '2vh',
            paddingBottom: '2vh',
          }}
        >
          
          {/* SEÇÃO SUPERIOR: Ícone + Título */}
          <div className="flex flex-col items-center" style={{ gap: '2vh' }}>
            <div 
              className="rounded-full border-white shadow-lg overflow-hidden bg-red-100 flex items-center justify-center"
              style={{
                width: 'min(18vh, 150px)',
                height: 'min(18vh, 150px)',
                borderWidth: '4px',
                borderStyle: 'solid',
              }}
            >
              <span style={{ fontSize: 'min(8vh, 60px)' }}>❌</span>
            </div>

            <h2 
              className={`${comfortaa.className} font-bold text-black text-center leading-tight`}
              style={{ fontSize: 'clamp(22px, 4vh, 36px)' }}
            >
              Erro no Ponto
            </h2>
          </div>

          {/* SEÇÃO CENTRAL: Card de erro */}
          <div 
            className="rounded-[5px] shadow-lg flex flex-col items-center justify-center"
            style={{
              width: 'min(28vh, 180px)',
              minHeight: 'min(18vh, 120px)',
              padding: 'min(3vh, 25px)',
              backgroundColor: '#A63D40',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: '#7F2D2F',
              color: '#FFFFFF',
            }}
          >
            <span 
              className={`${roboto.className} font-semibold text-center leading-tight`}
              style={{ fontSize: 'clamp(14px, 2.2vh, 20px)' }}
            >
              {errorMessage}
            </span>
          </div>

          {/* SEÇÃO INFERIOR: Contador + Botão */}
          <div className="flex flex-col items-center" style={{ gap: '2vh' }}>
            <p 
              className={`${comfortaa.className} text-slate-400`}
              style={{ fontSize: 'clamp(12px, 1.8vh, 16px)' }}
            >
              Voltando em {countdown}s...
            </p>

            <button
              onClick={resetToIdle}
              className={`${comfortaa.className} bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors`}
              style={{
                padding: 'min(1.2vh, 10px) min(3vh, 24px)',
                fontSize: 'clamp(12px, 1.8vh, 16px)',
              }}
            >
              Voltar
            </button>
          </div>

        </div>
      </div>
    )
  }

  // TELA INICIAL (IDLE) - Padrão
  // - 1 clique: entra em fullscreen
  // - 2 cliques (duplo clique): sai do fullscreen
  return (
    <div 
      ref={containerRef}
      onClick={handleInteraction}
      onDoubleClick={handleDoubleClick}
      className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden cursor-pointer"
      style={{
        backgroundImage: `url('/pontoBg.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Overlay pedindo para entrar em fullscreen - só aparece se:
          1. Não está em fullscreen
          2. Está na tela IDLE
          3. NUNCA entrou em fullscreen antes (se já entrou uma vez, não mostra mais) */}
      {!isFullscreen && step === 'IDLE' && !hasEnteredFullscreenRef.current && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center text-white cursor-pointer">
          <div className="text-6xl mb-6">🖥️</div>
          <h2 className="text-2xl font-bold mb-2">Clique para entrar em tela cheia</h2>
          <p className="text-slate-300 text-sm">O terminal funciona melhor em modo fullscreen</p>
        </div>
      )}

      {/* Conteúdo centralizado sobre a imagem de fundo */}
      <div className="z-10 flex flex-col items-center w-full max-w-lg px-4 -mt-20">
        
        {/* Logo da Empresa */}
        <div className="mb-6 flex flex-col items-center">
          {companyLogoUrl ? (
            <div className="relative w-[280px] h-[100px]">
              <Image 
                src={companyLogoUrl} 
                alt={companyName}
                fill
                className="object-contain"
                priority
              />
            </div>
          ) : (
            <div className="text-center">
              {/* Fallback: Ponto Conecta Mais (igual imagem de referência) */}
              <h1 className="text-[4rem] font-bold text-[#1D4ED8] leading-none tracking-tight" style={{ fontFamily: 'sans-serif' }}>
                P<span className="text-[#FBBF24]">o</span>nto
              </h1>
              <h2 className="text-xl text-[#1D4ED8] font-medium italic -mt-1">Conecta Mais</h2>
            </div>
          )}
        </div>

        {/* Instruções (Lista com ícones/emojis) */}
        <div className="mb-4 space-y-2 text-center">
          <div className="flex items-center justify-center gap-2 text-base">
            <span className="text-slate-500">⚪</span>
            <span className="text-[#00A3FF] font-medium">Pressione o botão.</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-base">
            <span className="text-slate-500">📷</span>
            <span className="text-[#00A3FF] font-medium">A câmera será iniciada.</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-base">
            <span>😎</span>
            <span className="text-[#00A3FF] font-medium">Olhe para frente.</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-base">
            <span>👋</span>
            <span className="text-[#00A3FF] font-medium">Bem no meio, fechou?</span>
          </div>
        </div>

        {/* Texto de espera */}
        <div className="text-center text-[#00A3FF] text-sm font-medium mb-6 px-4 max-w-sm">
           Espere até que a mensagem apareça com seu nome e etapa do processo.
        </div>

        {/* BOTÃO CENTRAL (Redondo, Azul, sobre o V) - w-20 h-20 = 80px */}
        <button
          onClick={(e) => {
            e.stopPropagation() // Impede propagação para o container
            handleOpenScanner()
          }}
          className="w-20 h-20 rounded-full bg-[#1D4ED8] hover:bg-blue-700 text-white flex items-center justify-center shadow-lg transition-all transform hover:scale-110 active:scale-95"
          aria-label="Bater Ponto"
        >
          <Camera className="w-9 h-9" />
        </button>

        {/* BOTÃO VOLTAR - Só aparece quando NÃO está em fullscreen */}
        {!isFullscreen && (
          <button
            onClick={(e) => {
              e.stopPropagation() // Impede que o clique propague para o container (que ativa fullscreen)
              router.push(`/admin/${params.company}`)
            }}
            className="mt-6 flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Voltar ao Dashboard</span>
          </button>
        )}

      </div>
    </div>
  )
}
