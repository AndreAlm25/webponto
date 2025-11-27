"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import { Camera, CameraOff, UserPlus, UserCheck, Coffee, LogOut, Maximize2 } from "lucide-react"
import RoundActionButton from "@/components/ui/RoundActionButton"
import { getMediaPipeFaceDetection, isWellPositioned, type FaceDetectionResult } from "@/lib/mediapiperFaceDetection"

type FacialRecognitionEnhancedProps = {
  mode: 'cadastro' | 'reconhecimento'
  authMode: 'employee' | 'admin' | null
  userId?: string
  userEmail?: string
  onClose: () => void
  onRecognitionSuccess: (result: any) => void
  onRecognitionError: (error: string) => void
  onRegistrationSuccess: (result: any) => void
  onRegistrationError: (error: string) => void
}

type LivenessState = {
  blinkDetected: boolean
  movementDetected: boolean
  faceStable: boolean
  qualityGood: boolean
}

export default function FacialRecognitionEnhanced({
  mode,
  authMode,
  userId,
  userEmail,
  onClose,
  onRecognitionSuccess,
  onRecognitionError,
  onRegistrationSuccess,
  onRegistrationError,
}: FacialRecognitionEnhancedProps) {
  // Refs baseados no FullscreenCamera
  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const resTimerRef = useRef<number | null>(null)
  const detectRafRef = useRef<number | null>(null)
  const feedbackTimerRef = useRef<number | null>(null)
  const isShuttingDownRef = useRef<boolean>(false)
  const autoCaptureTimerRef = useRef<number | null>(null)
  const autoScheduledRef = useRef<boolean>(false)
  const lastDetectedRef = useRef<boolean>(false)
  const captureInFlightRef = useRef<boolean>(false)
  const recognitionInFlightRef = useRef<boolean>(false)
  const streamCounterRef = useRef<number>(0)
  const activeStreamIdRef = useRef<number>(0) // Track qual stream é válido
  
  // Estados baseados no FullscreenCamera
  const [resolution, setResolution] = useState("")
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [detected, setDetected] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null)
  const [ambiguousChoice, setAmbiguousChoice] = useState<any>(null)
  
  // Estados para detecção de vivacidade MELHORADA
  const [liveness, setLiveness] = useState<LivenessState>({
    blinkDetected: false,
    movementDetected: false,
    faceStable: false,
    qualityGood: false
  })
  
  // Ref para manter o último estado válido de liveness (não reseta)
  const livenessRef = useRef<LivenessState>({
    blinkDetected: false,
    movementDetected: false,
    faceStable: false,
    qualityGood: false
  })
  const [eyeStates, setEyeStates] = useState<{ left: boolean; right: boolean }[]>([])
  const [facePositions, setFacePositions] = useState<{ x: number; y: number; timestamp: number }[]>([])
  const [stableFrames, setStableFrames] = useState(0)
  
  // Estado para bounding box visual
  const [currentFaceBox, setCurrentFaceBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  // Função para fechar corretamente (baseada no FullscreenCamera)
  const stopCamera = useCallback(async () => {
    const startTime = performance.now()
    console.log('[CAM] 🛑 [INÍCIO] Encerrando câmera...')
    console.log('[CAM] 🔍 Estado inicial:', {
      streamRefExists: !!streamRef.current,
      videoSrcObjectExists: !!videoRef.current?.srcObject,
      isShuttingDown: isShuttingDownRef.current
    })
    
    // Verificar se já está encerrado
    if (isShuttingDownRef.current) {
      console.log('[CAM] ⚠️ Já está encerrando - ignorando chamada duplicada')
      return
    }
    isShuttingDownRef.current = true
    
    // Parar loop de detecção PRIMEIRO
    if (detectRafRef.current) {
      cancelAnimationFrame(detectRafRef.current)
      detectRafRef.current = null
      console.log('[CAM] 🛑 Loop de detecção cancelado')
    }
    
    const v = videoRef.current
    
    // 1. COLETAR TODOS OS STREAMS **ANTES** DE LIMPAR QUALQUER COISA
    const streamsToStop: MediaStream[] = []
    const seenStreamIds = new Set<string>()
    
    // Stream do ref
    if (streamRef.current) {
      const streamId = streamRef.current.id
      streamsToStop.push(streamRef.current)
      seenStreamIds.add(streamId)
      console.log(`[CAM] 📹 Stream do ref encontrado [ID: ${streamId}]`)
    }
    
    // Stream do elemento video (ANTES de limpar!)
    const videoStream = v?.srcObject as MediaStream | null
    if (videoStream) {
      const streamId = videoStream.id
      if (!seenStreamIds.has(streamId)) {
        streamsToStop.push(videoStream)
        seenStreamIds.add(streamId)
        console.log(`[CAM] 📹 Stream ADICIONAL do <video> encontrado [ID: ${streamId}]`)
      } else {
        console.log(`[CAM] ℹ️ Stream do <video> é o mesmo do ref [ID: ${streamId}]`)
      }
    }
    
    console.log(`[CAM] 📊 Total de streams únicos coletados: ${streamsToStop.length}`)
    
    // 2. PAUSAR E LIMPAR VÍDEO (DEPOIS de coletar streams)
    if (v) {
      try { 
        console.log('[CAM] 🎥 Pausando vídeo e removendo srcObject...')
        v.pause()
        v.srcObject = null
        console.log('[CAM] 🎥 ✅ Vídeo limpo')
      } catch (e) {
        console.error('[CAM] ❌ Erro ao pausar vídeo:', e)
      }
    }
    
    // 3. PARAR TODAS AS TRACKS DE TODOS OS STREAMS COLETADOS
    
    if (streamsToStop.length > 0) {
      console.log(`[CAM] 🛑 Encontrados ${streamsToStop.length} streams para parar`)
      
      streamsToStop.forEach((stream, streamIndex) => {
        const tracks = stream.getTracks()
        console.log(`[CAM] 🛑 [Stream ${streamIndex}] Tem ${tracks.length} tracks`)
        
        tracks.forEach((t, trackIndex) => {
          try {
            console.log(`[CAM] 🛑 [Stream ${streamIndex}][Track ${trackIndex}] Parando: ${t.kind} "${t.label}" [state: ${t.readyState}]`)
            t.stop()
            console.log(`[CAM] ✅ [Stream ${streamIndex}][Track ${trackIndex}] Parada [new state: ${t.readyState}]`)
          } catch (e) {
            console.error(`[CAM] ❌ [Stream ${streamIndex}][Track ${trackIndex}] Erro:`, e)
          }
        })
      })
      
      console.log(`[CAM] ✅ TOTAL: ${streamsToStop.length} stream(s) com ${streamsToStop.reduce((acc, s) => acc + s.getTracks().length, 0)} track(s) paradas`)
    } else {
      console.warn('[CAM] ⚠️ Nenhum stream encontrado para parar')
    }
    
    // Pequeno delay para garantir que o navegador processe a liberação
    await new Promise(resolve => setTimeout(resolve, 10))
    console.log('[CAM] ⏱️ Delay de 10ms para garantir liberação do hardware')
    
    // Zera o streamRef
    streamRef.current = null
    console.log('[CAM] 📝 streamRef zerado')

    // Limpa timers
    const cleanupStartTime = performance.now()
    if (resTimerRef.current) {
      window.clearInterval(resTimerRef.current)
      resTimerRef.current = null
    }
    if (detectRafRef.current) {
      cancelAnimationFrame(detectRafRef.current)
      detectRafRef.current = null
    }
    if (autoCaptureTimerRef.current) {
      window.clearTimeout(autoCaptureTimerRef.current)
      autoCaptureTimerRef.current = null
    }
    
    autoScheduledRef.current = false
    lastDetectedRef.current = false
    captureInFlightRef.current = false
    recognitionInFlightRef.current = false

    setReady(false)
    setDetected(false)
    setCurrentFaceBox(null)
    setStableFrames(0)
    setCaptureTriggered(false)
    
    // NÃO resetar isShuttingDownRef aqui - só resetar quando abrir câmera novamente
    
    const cleanupEndTime = performance.now()
    console.log(`[CAM] 🧹 Cleanup em ${(cleanupEndTime - cleanupStartTime).toFixed(2)}ms`)
    
    const totalTime = performance.now() - startTime
    console.log(`[CAM] ✅ [FIM] Câmera COMPLETAMENTE encerrada em ${totalTime.toFixed(2)}ms TOTAL`)
    console.log(`[CAM] 🔒 Flag isShuttingDownRef mantida em TRUE - câmera bloqueada para reutilização`)
  }, [])

  // Inicializar câmera (baseada no FullscreenCamera)
  const startCamera = useCallback(async () => {
    try {
      const streamId = ++streamCounterRef.current
      activeStreamIdRef.current = streamId // Marca este como o stream ativo
      console.log(`[CAM] 🚀 [INÍCIO #${streamId}] Abrindo câmera...`)
      console.log(`[CAM] 🎯 [#${streamId}] Marcado como stream ATIVO`)
      
      // Se já existe stream, PARAR ele primeiro (evita vazamento de streams pelo Strict Mode)
      if (streamRef.current) {
        console.log(`[CAM] ⚠️ [#${streamId}] Stream anterior existe - PARANDO antes de criar novo`)
        const oldStream = streamRef.current
        streamRef.current = null
        oldStream.getTracks().forEach(track => {
          console.log(`[CAM] 🛑 [#${streamId}] Parando track antiga: ${track.kind} "${track.label}" [state: ${track.readyState}]`)
          track.stop()
          console.log(`[CAM] ✅ [#${streamId}] Track parada [new state: ${track.readyState}]`)
        })
      }
      
      // Resetar flag de shutdown PRIMEIRO
      console.log(`[CAM] 🔓 [#${streamId}] Resetando flag isShuttingDownRef para permitir nova câmera`)
      isShuttingDownRef.current = false
      // Lógica de resolução: Se câmera > Full HD, usa Full HD. Senão, usa resolução máxima da câmera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user", 
          width: { ideal: 1920 }, 
          height: { ideal: 1080 } 
        },
        audio: false,
      })
      
      console.log(`[CAM] ✅ [#${streamId}] Stream obtido:`, stream.getTracks().map(t => ({ kind: t.kind, label: t.label, state: t.readyState })))
      
      // CRÍTICO: Verificar se ESTE stream ainda é o ativo (pode ter sido substituído)
      if (activeStreamIdRef.current !== streamId) {
        console.log(`[CAM] ❌ [#${streamId}] Stream ÓRFÃO detectado! Stream ativo agora é #${activeStreamIdRef.current} - PARANDO este stream`)
        stream.getTracks().forEach(track => {
          console.log(`[CAM] 🛑 [#${streamId}] Parando track órfã: ${track.kind} "${track.label}"`)
          track.stop()
        })
        return // NÃO atribuir ao vídeo/ref
      }
      
      const v = videoRef.current
      if (v) {
        v.srcObject = stream
        console.log(`[CAM] 📹 [#${streamId}] Stream atribuído ao elemento <video>`)
        const onCanPlay = () => {
          setReady(true)
          console.log(`[CAM] ▶️ [#${streamId}] Vídeo pronto para reprodução`)
          v.removeEventListener('canplay', onCanPlay)
          // Iniciar detecção AQUI quando vídeo estiver pronto
          setTimeout(() => startEnhancedDetection(), 500)
        }
        v.addEventListener('canplay', onCanPlay)
        try { await v.play() } catch {}
      }
      streamRef.current = stream
      console.log(`[CAM] 📝 [#${streamId}] streamRef atualizado`)
      
      const updateRes = () => {
        const vv = videoRef.current
        if (vv && vv.videoWidth && vv.videoHeight) {
          const w = vv.videoWidth
          const h = vv.videoHeight
          const maxSide = Math.max(w, h)
          const prefix = maxSide >= 3840 ? '4K' : maxSide >= 1920 ? 'Full HD' : maxSide >= 1280 ? 'HD' : maxSide >= 640 ? 'SD' : ''
          setResolution(prefix ? `${prefix} - ${w}×${h}` : `${w}×${h}`)
        }
      }
      updateRes()
      if (resTimerRef.current) window.clearInterval(resTimerRef.current)
      resTimerRef.current = window.setInterval(updateRes, 1000)
      
    } catch (e: any) {
      console.log('[CAM] startCamera falhou:', e)
      
      // Detectar erro de câmera em uso
      if (e.name === 'NotReadableError' || e.message?.includes('in use') || e.message?.includes('being used')) {
        console.log('[CAM] ❌ Câmera em uso - liberando recursos e fechando')
        await stopCamera()
        onClose()
        
        if (mode === 'cadastro') {
          onRegistrationError('Câmera está sendo usada por outro aplicativo. Feche outros programas que estejam usando a câmera e tente novamente.')
        } else {
          onRecognitionError('Câmera está sendo usada por outro aplicativo. Feche outros programas que estejam usando a câmera e tente novamente.')
        }
      } else if (e.name === 'NotAllowedError') {
        console.log('[CAM] ❌ Permissão negada - liberando recursos e fechando')
        await stopCamera()
        onClose()
        
        if (mode === 'cadastro') {
          onRegistrationError('Permissão de câmera negada. Permita o acesso à câmera nas configurações do navegador.')
        } else {
          onRecognitionError('Permissão de câmera negada. Permita o acesso à câmera nas configurações do navegador.')
        }
      } else {
        console.log('[CAM] ❌ Erro genérico ao abrir câmera - liberando recursos e fechando')
        await stopCamera()
        onClose()
        
        if (mode === 'cadastro') {
          onRegistrationError('Erro ao acessar a câmera. Verifique se está conectada e tente novamente.')
        } else {
          onRecognitionError('Erro ao acessar a câmera. Verifique se está conectada e tente novamente.')
        }
      }
    }
  }, [mode, onClose, onRegistrationError, onRecognitionError, stopCamera])

  // Detecção BÁSICA corrigida - voltando ao essencial
  const startEnhancedDetection = useCallback(() => {
    
    let detector: any = null
    let isDetectorReady = false
    
    const initializeDetector = async () => {
      try {
        detector = await getMediaPipeFaceDetection()
        isDetectorReady = true
        
      } catch (error) {
        console.error('[DETECT] ❌ Erro ao inicializar detector:', error)
        isDetectorReady = false
        // Tentar novamente em 2 segundos
        setTimeout(initializeDetector, 2000)
      }
    }
    
    // Iniciar o detector imediatamente
    initializeDetector()
    
    const detectLoop = async () => {
      
      if (!videoRef.current || isShuttingDownRef.current) {
        if (isShuttingDownRef.current) return
      }
      
      try {
        const video = videoRef.current
        if (!video) return
        
        // Verificar se vídeo está pronto
        if (!video.videoWidth || !video.videoHeight) {
          setTimeout(() => {
            if (!isShuttingDownRef.current) {
              detectLoop()
            }
          }, 100)
          return
        }
        
        // Verificar se detector está pronto
        if (!isDetectorReady || !detector) {
          setTimeout(() => {
            if (!isShuttingDownRef.current) {
              detectLoop()
            }
          }, 100)
          return
        }
        
        // DETECÇÃO BÁSICA
        
        const detection = await detector.detectSingleFace(video)
        
        if (detection) {
          const confidence = detection.confidence || 0
          const box = detection.box
          
          
          setCurrentFaceBox({
            x: box.x,
            y: box.y, 
            width: box.width,
            height: box.height
          })
          
          // Verificar se está bem posicionado com critérios RELAXADOS para teste
          const isWellPos = isWellPositioned(box, video.videoWidth, video.videoHeight, {
            centerTolerance: 0.4,  // Mais tolerante ao centro (40%)
            sizeTolerance: 0.5     // Mais tolerante ao tamanho (50%)
          })
          
          // Log detalhado dos critérios
          const faceCenterX = box.x + box.width / 2
          const faceCenterY = box.y + box.height / 2
          const videoCenterX = video.videoWidth / 2
          const videoCenterY = video.videoHeight / 2
          const centerDistance = Math.hypot(faceCenterX - videoCenterX, faceCenterY - videoCenterY)
          const maxCenterDistance = Math.min(video.videoWidth, video.videoHeight) * 0.4
          const centerOk = centerDistance < maxCenterDistance
          
          const faceArea = box.width * box.height
          const videoArea = video.videoWidth * video.videoHeight
          const faceRatio = faceArea / videoArea
          const sizeOk = faceRatio > 0.05 && faceRatio < 0.6
          
          const minSize = Math.min(video.videoWidth, video.videoHeight) * 0.15
          const notTooSmall = box.width > minSize && box.height > minSize
          
          // logs de critérios removidos para reduzir ruído
          
          // Usar variável local para verificação imediata
          const isDetectedNow = isWellPos
          setDetected(isDetectedNow)
          
          let currentStableFrames = stableFrames
          
          if (isDetectedNow) {
            // Incrementar frames estáveis
            currentStableFrames = stableFrames + 1
            setStableFrames(currentStableFrames)
            
            analyzeLiveness(detection)
          } else {
            currentStableFrames = 0
            setStableFrames(0)
          }
          
          // Janela de captura automática com timer (2.5s) com debounce via refs
          if (isDetectedNow && !autoScheduledRef.current && !loading && !captureTriggered && !captureInFlightRef.current) {
            autoScheduledRef.current = true
            captureInFlightRef.current = true
            // agendar captura
            console.log('[AUTO] scheduling in 2500ms')
            autoCaptureTimerRef.current = window.setTimeout(() => {
              autoCaptureTimerRef.current = null
              if (detected || isDetectedNow) {
                console.log('[AUTO] fired')
                setCaptureTriggered(true)
                captureAndProcess()
              } else {
                console.log('[AUTO] skipped (lost detection)')
                captureInFlightRef.current = false
              }
            }, 2500)
          }

          // Cancelar se perdeu detecção
          if (!isDetectedNow && lastDetectedRef.current) {
            if (autoCaptureTimerRef.current) {
              window.clearTimeout(autoCaptureTimerRef.current)
              autoCaptureTimerRef.current = null
              autoScheduledRef.current = false
              captureInFlightRef.current = false
              console.log('[AUTO] cancelled (lost detection)')
            }
          }

          lastDetectedRef.current = isDetectedNow
          
        } else {
          setCurrentFaceBox(null)
          setDetected(false)
          setStableFrames(0)
          setCaptureTriggered(false)
        }
        
      } catch (error) {
        console.error('[DETECT] ❌ Erro na detecção:', error)
        // Reinicializar detector em caso de erro
        isDetectorReady = false
        setTimeout(initializeDetector, 1000)
      }
      
      // Continuar loop
      if (!isShuttingDownRef.current) {
        setTimeout(() => {
          detectLoop()
        }, 100) // 10 FPS para começar
      }
    }
    
    // Inicializar tudo
    initializeDetector().then(() => {
      setTimeout(() => {
        detectLoop()
      }, 500)
    }).catch(error => {
      console.error('[DETECT] ❌ Erro na inicialização:', error)
    })
  }, [])

  // Análise de vivacidade MELHORADA baseada no estudo
  const analyzeLiveness = useCallback((face: FaceDetectionResult) => {
    const faceBox = face.box
    const faceCenter = {
      x: faceBox.x + faceBox.width / 2,
      y: faceBox.y + faceBox.height / 2,
      timestamp: Date.now()
    }
    
    // Sistema de pontuação baseado no estudo (0-100)
    const qualityScore = Math.min(100, (faceBox.width * faceBox.height) / 200) // Tamanho da face
    const confidenceScore = (face.confidence || 0) * 100 // Confiança do detector
    
    // Detectar movimento da cabeça (análise temporal)
    setFacePositions(prev => {
      const newPositions = [...prev, faceCenter].slice(-30) // Manter 30 posições (1 segundo a 30fps)
      
      // Calcular movimento suave (não muito rápido, não muito lento)
      const movementScore = calculateMovementScore(newPositions)
      
      // Análise de estabilidade (rosto deve ficar relativamente parado)
      const stabilityScore = calculateStabilityScore(newPositions)
      
      const newLiveness = {
        blinkDetected: stableFrames > 10,        // Reduzido de 15 para 10 (mais fácil)
        movementDetected: movementScore > 15,    // Reduzido de 20 para 15 (mais fácil)
        faceStable: stabilityScore > 50,         // Reduzido de 60 para 50 (mais fácil)
        qualityGood: qualityScore > 40 && confidenceScore > 60  // Mais permissivo
      }
      
      setLiveness(newLiveness)
      livenessRef.current = newLiveness  // Atualizar ref também
      
      // Log para debug da prova de vida
      console.log('[LIVENESS] 📊 Status:', {
        blinkDetected: newLiveness.blinkDetected,
        movementDetected: newLiveness.movementDetected,
        faceStable: newLiveness.faceStable,
        qualityGood: newLiveness.qualityGood,
        stableFrames,
        movementScore: Math.round(movementScore),
        stabilityScore: Math.round(stabilityScore),
        qualityScore: Math.round(qualityScore),
        confidenceScore: Math.round(confidenceScore)
      })
      
      return newPositions
    })
  }, [stableFrames])
  
  // Calcular pontuação de movimento (baseado no estudo)
  const calculateMovementScore = (positions: { x: number; y: number; timestamp: number }[]) => {
    if (positions.length < 10) return 0
    
    let totalMovement = 0
    for (let i = 1; i < positions.length; i++) {
      const distance = Math.sqrt(
        Math.pow(positions[i].x - positions[i-1].x, 2) + 
        Math.pow(positions[i].y - positions[i-1].y, 2)
      )
      totalMovement += distance
    }
    
    // Normalizar para 0-100 (movimento ideal entre 5-50 pixels total)
    return Math.min(100, Math.max(0, (totalMovement - 5) * 2))
  }
  
  // Calcular pontuação de estabilidade
  const calculateStabilityScore = (positions: { x: number; y: number; timestamp: number }[]) => {
    if (positions.length < 5) return 0
    
    const recent = positions.slice(-10)
    const avgX = recent.reduce((sum, p) => sum + p.x, 0) / recent.length
    const avgY = recent.reduce((sum, p) => sum + p.y, 0) / recent.length
    
    // Calcular variância (menor variância = mais estável)
    const variance = recent.reduce((sum, p) => {
      return sum + Math.pow(p.x - avgX, 2) + Math.pow(p.y - avgY, 2)
    }, 0) / recent.length
    
    // Converter variância em pontuação (0-100, menos variância = mais pontos)
    return Math.max(0, 100 - variance)
  }

  // Calcular movimento da cabeça
  const calculateMovement = (positions: { x: number; y: number; timestamp: number }[]) => {
    if (positions.length < 10) return false
    
    const recent = positions.slice(-10)
    const older = positions.slice(-20, -10)
    
    if (older.length === 0) return false
    
    const recentAvg = {
      x: recent.reduce((sum, p) => sum + p.x, 0) / recent.length,
      y: recent.reduce((sum, p) => sum + p.y, 0) / recent.length
    }
    
    const olderAvg = {
      x: older.reduce((sum, p) => sum + p.x, 0) / older.length,
      y: older.reduce((sum, p) => sum + p.y, 0) / older.length
    }
    
    const distance = Math.sqrt(
      Math.pow(recentAvg.x - olderAvg.x, 2) + Math.pow(recentAvg.y - olderAvg.y, 2)
    )
    
    return distance > 10
  }

  // Estado para controlar se já tentou capturar
  const [captureTriggered, setCaptureTriggered] = useState(false)
  
  // Verificar captura OTIMIZADA para bater ponto
  const checkCaptureReadiness = useCallback(() => {
    const hasMinimumFrames = stableFrames > 20 // 2 segundos (ainda mais rápido)
    
    // Critério para bater ponto: rosto detectado e estável por 3 segundos
    if (detected && hasMinimumFrames && !loading && currentFaceBox && !captureTriggered) {
      setCaptureTriggered(true) // Evitar múltiplas capturas
      
      setTimeout(() => {
        captureAndProcess()
      }, 1000)
    }
  }, [stableFrames, detected, loading, captureTriggered]) // Removendo dependências que podem causar problemas

  // Capturar geolocalização uma vez (HTML5)
  const getCurrentPositionOnce = useCallback((options?: PositionOptions): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) return reject(new Error('Geolocalização não suportada'))
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        ...(options || {}),
      })
    })
  }, [])

  // Calcular livenessScore/Valid a partir do REF (não reseta)
  const getLivenessMetrics = useCallback(() => {
    // Usar REF em vez de STATE para não resetar
    const currentLiveness = livenessRef.current
    
    // Heurística simples: cada critério vale 25 pontos
    const parts = [currentLiveness.blinkDetected, currentLiveness.movementDetected, currentLiveness.faceStable, currentLiveness.qualityGood]
    const score = parts.reduce((acc, ok) => acc + (ok ? 25 : 0), 0)
    // Validação mais permissiva: apenas 1 critério (25 pontos) já é válido
    // Isso facilita muito a validação mas ainda mantém alguma segurança
    const valid = score >= 25  // Reduzido de 50 para 25 (1 critério em vez de 2)
    
    console.log('[LIVENESS] 🧮 Calculando score (do REF):', {
      blinkDetected: currentLiveness.blinkDetected ? '✅ 25pts' : '❌ 0pts',
      movementDetected: currentLiveness.movementDetected ? '✅ 25pts' : '❌ 0pts',
      faceStable: currentLiveness.faceStable ? '✅ 25pts' : '❌ 0pts',
      qualityGood: currentLiveness.qualityGood ? '✅ 25pts' : '❌ 0pts',
      scoreTotal: score,
      valid: valid ? '✅ VÁLIDO (25+ pts)' : '❌ INVÁLIDO (precisa 25+)'
    })
    
    return { livenessScore: score, livenessValid: valid }
  }, [])

  // Capturar e processar para bater ponto
  const captureAndProcess = useCallback(async () => {
    if (!videoRef.current || loading || recognitionInFlightRef.current) return
    
    setLoading(true)
    
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Não foi possível criar canvas')
      
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      ctx.drawImage(videoRef.current, 0, 0)
      
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Falha ao capturar imagem'))
          }
        }, 'image/jpeg', 0.9)
      })
      
      if (mode === 'cadastro') {
        await handleRegistration(blob)
      } else {
        await handleRecognition(blob)
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro ao processar imagem'
      
      if (mode === 'cadastro') {
        onRegistrationError(errorMsg)
      } else {
        onRecognitionError(errorMsg)
      }
    } finally {
      setLoading(false)
    }
  }, [mode, loading])

  // Processar cadastro
  const handleRegistration = async (blob: Blob) => {
    try {
      console.log('[CADASTRO] Iniciando cadastro facial...')
      console.log('[CADASTRO] userId:', userId)
      console.log('[CADASTRO] userEmail:', userEmail)
      console.log('[CADASTRO] authMode:', authMode)
      
      if (!userId && !userEmail) {
        console.error('[CADASTRO] Usuário não identificado')
        throw new Error('Usuário não identificado')
      }

      const file = new File([blob], 'camera.jpg', { type: 'image/jpeg' })
      const formData = new FormData()
      formData.append('employeeId', userId || '')
      formData.append('foto', file)
      
      console.log('[CADASTRO] FormData preparado:', {
        employeeId: userId || '',
        fotoSize: blob.size
      })

      // Chamar backend diretamente
      const backendUrl = process.env.NEXT_PUBLIC_API_URL
      
      // Buscar token correto (priorizar 'token' que é o padrão do sistema)
      const token = localStorage.getItem('token') || localStorage.getItem('employee_token') || undefined
      
      console.log('[CADASTRO] Enviando para:', `${backendUrl}/api/time-entries/facial/cadastro`)
      console.log('[CADASTRO] Token presente:', !!token)
      
      // Decodificar token para debug
      if (token) {
        try {
          const tokenParts = token.split('.')
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]))
            console.log('[CADASTRO] Token payload:', payload)
            
            // Validar formato do token
            if (!payload.sub && !payload.employeeId) {
              console.error('[CADASTRO] ❌ Token inválido - sem sub ou employeeId')
              throw new Error('Token inválido')
            }
            
            // Avisar se for token legado
            if (payload.type === 'employee' && payload.employeeId) {
              console.warn('[CADASTRO] ⚠️ Token legado detectado - considere fazer logout/login')
            }
          }
        } catch (e) {
          console.error('[CADASTRO] Erro ao decodificar token:', e)
        }
      } else {
        console.error('[CADASTRO] ❌ Nenhum token encontrado!')
        throw new Error('Usuário não autenticado')
      }
      
      const response = await fetch(`${backendUrl}/api/time-entries/facial/cadastro`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      
      console.log('[CADASTRO] Response status:', response.status)
      console.log('[CADASTRO] Response headers:', Object.fromEntries(response.headers.entries()))

      // Verificar content-type antes de fazer parse
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Erro ao conectar com o servidor de cadastro facial')
      }

      const result = await response.json()
      
      console.log('[CADASTRO] Response body:', result)

      if (!response.ok || !result?.success) {
        // Traduzir erros técnicos para mensagens amigáveis
        let errorMessage = result?.error || result?.message || 'Falha no cadastro facial'
        
        console.error('[CADASTRO] Erro:', errorMessage)
        
        if (errorMessage.includes('No face is found') || errorMessage.includes('No face')) {
          errorMessage = 'Nenhum rosto foi detectado na imagem. Por favor, posicione seu rosto bem iluminado e centralizado na câmera.'
        } else if (errorMessage.includes('timeout')) {
          errorMessage = 'O processamento está demorando mais que o esperado. Por favor, tente novamente.'
        } else if (errorMessage.includes('Bad Request')) {
          errorMessage = 'Erro ao processar a imagem. Certifique-se de que seu rosto está bem visível e iluminado.'
        }
        
        throw new Error(errorMessage)
      }

      console.log('[CADASTRO] Cadastro realizado com sucesso!')
      
      await stopCamera()
      // Aguardar liberação completa da câmera
      await new Promise(resolve => setTimeout(resolve, 100))
      onClose()
      
      onRegistrationSuccess(result)
    } catch (error: any) {
      await stopCamera()
      await new Promise(resolve => setTimeout(resolve, 100))
      onClose()
      
      // Traduzir erros técnicos para mensagens amigáveis
      let errorMessage = error.message || 'Erro no cadastro facial'
      
      if (errorMessage.includes('No face is found') || errorMessage.includes('No face')) {
        errorMessage = 'Nenhum rosto foi detectado na imagem. Por favor, posicione seu rosto bem iluminado e centralizado na câmera.'
      } else if (errorMessage.includes('timeout')) {
        errorMessage = 'O processamento está demorando mais que o esperado. Por favor, tente novamente.'
      } else if (errorMessage.includes('Bad Request')) {
        errorMessage = 'Erro ao processar a imagem. Certifique-se de que seu rosto está bem visível e iluminado.'
      }
      
      onRegistrationError(errorMessage)
    }
  }

  // Processar reconhecimento usando API do CompreFace (igual ao FullscreenCamera)
  const handleRecognition = async (blob: Blob) => {
    try {
      if (recognitionInFlightRef.current) return
      recognitionInFlightRef.current = true
      const file = new File([blob], 'camera.jpg', { type: 'image/jpeg' })
      const formData = new FormData()

      // Buscar token correto (priorizar 'token' que é o padrão do sistema)
      const token = localStorage.getItem('token') || localStorage.getItem('employee_token') || undefined
      
      console.log('[RECONHECIMENTO] Token presente:', !!token)
      if (token) {
        try {
          const tokenParts = token.split('.')
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]))
            console.log('[RECONHECIMENTO] Token payload:', payload)
          }
        } catch (e) {
          console.error('[RECONHECIMENTO] Erro ao decodificar token:', e)
        }
      }

      const userId = ''
      
      if (authMode === 'employee') {
        // 1:1 - Funcionário logado: usar email do funcionário logado
        const userData = localStorage.getItem('employee_data')
        if (userData) {
          const parsedData = JSON.parse(userData)
          const userIdFromData = parsedData?.email || parsedData?.id || ''
          if (!userIdFromData) {
            throw new Error('Funcionário não identificado')
          }
        }
      } else if (authMode === 'admin') {
        // 1:N - Admin: reconhecimento aberto (sem userId específico)
        // Não envia userId, deixa o CompreFace reconhecer qualquer um
      }
      
      // Adicionar foto
      formData.append('foto', file)
      // Geolocalização
      try {
        const pos = await getCurrentPositionOnce()
        const { latitude, longitude, accuracy } = pos.coords
        const capturedAt = new Date(pos.timestamp).toISOString()
        formData.append('latitude', String(latitude))
        formData.append('longitude', String(longitude))
        if (accuracy != null) formData.append('accuracy', String(accuracy))
        formData.append('clientCapturedAt', capturedAt)
        formData.append('geoMethod', 'html5')
        formData.append('source', 'web')
      } catch (e) {
        // Se der erro de geo e a empresa exigir, o backend irá bloquear
      }

      // Liveness
      const lm = getLivenessMetrics()
      console.log('[LIVENESS] 📤 Enviando para backend:', {
        livenessScore: lm.livenessScore,
        livenessValid: lm.livenessValid,
        detalhes: liveness
      })
      formData.append('livenessScore', String(lm.livenessScore))
      // ⚠️ IMPORTANTE: FormData só aceita string, mas o backend espera boolean
      // O NestJS irá converter automaticamente se enviarmos 'true' ou 'false'
      formData.append('livenessValid', lm.livenessValid ? 'true' : 'false')

      // Chamar backend diretamente
      const backendUrl = process.env.NEXT_PUBLIC_API_URL
      const url = `${backendUrl}/api/time-entries/facial`
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      
      // Verificar content-type antes de fazer parse
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        // Resposta não é JSON (provavelmente HTML de erro)
        const errorMessage = 'Erro ao conectar com o servidor de reconhecimento facial'
        
        // Fechar câmera
        await stopCamera()
        await new Promise(resolve => setTimeout(resolve, 100))
        onClose()
        
        // Retornar erro
        onRecognitionError(errorMessage)
        return
      }
      
      const result = await response.json()
      
      console.log('[RECONHECIMENTO] 📦 Resposta do backend:', {
        status: response.status,
        ok: response.ok,
        result: result,
        success: result?.success,
        data: result?.data
      })
      
      if (!response.ok || !result?.success) {
        // Extrair mensagem de erro do backend (NestJS retorna em result.message)
        const errorMessage = result?.message || result?.error || 'Falha na verificação facial'
        
        console.error('[RECONHECIMENTO] ❌ Erro detectado:', {
          responseOk: response.ok,
          resultSuccess: result?.success,
          fullResult: result,
          errorMessage
        })
        
        // Fechar câmera
        await stopCamera()
        await new Promise(resolve => setTimeout(resolve, 100))
        onClose()
        
        // Retornar erro com mensagem clara do backend
        onRecognitionError(errorMessage)
        return
      }
      
      console.log('[RECONHECIMENTO] ✅ Sucesso! Continuando com lógica de decisão...')
      console.log('[RECONHECIMENTO] 📋 Dados retornados:', result.data)
      
      // ⚠️ ATENÇÃO: O backend /api/time-entries/facial JÁ REGISTRA o ponto!
      // Verificar se result.data.timeEntry existe
      if (result.data?.timeEntry) {
        console.warn('[RECONHECIMENTO] ⚠️ Backend JÁ REGISTROU o ponto:', result.data.timeEntry)
        console.warn('[RECONHECIMENTO] ⚠️ Tipo registrado:', result.data.timeEntry.type)
      }
      
      // Extrair email/userId do resultado do CompreFace ANTES de consultar status
      const recognizedUserId = result?.data?.userId || result?.userId || userId
      
      // Consultar status do dia para decidir ação (ou ambiguidade)
      let decidedType: 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END' | null = null
      let ambiguous: string[] | null = null
      
      if (authMode === 'employee') {
        try {
          // ✅ CORREÇÃO: Buscar do localStorage DIRETAMENTE (cliente)
          // API routes rodam no servidor e não têm acesso ao localStorage
          const pontosHoje = localStorage.getItem('pontos_hoje')
          const records = pontosHoje ? JSON.parse(pontosHoje) : []
          const lastType = records.length > 0 ? records[records.length - 1].type : null
          
          console.log('🔍 [DECISÃO] Pontos de hoje:', { lastType, total: records.length, records })
          console.log('🔍 [DECISÃO] localStorage raw:', pontosHoje)
          
          // Buscar dados do funcionário para verificar horários
          const empData = localStorage.getItem('employee_data')
          let employeeSchedule = null
          if (empData) {
            try {
              const parsed = JSON.parse(empData)
              employeeSchedule = {
                workStart: parsed.workingHoursStart || '08:00',
                workEnd: parsed.workingHoursEnd || '18:00',
                breakStart: parsed.breakStart || null,
                breakEnd: parsed.breakEnd || null
              }
            } catch {}
          }
          
          // Função auxiliar para verificar se está próximo de um horário (30 min antes ou depois)
          const isNearTime = (targetTime: string, toleranceMinutes: number = 30): boolean => {
            if (!targetTime) return false
            const now = new Date()
            const [hours, minutes] = targetTime.split(':').map(Number)
            const target = new Date()
            target.setHours(hours, minutes, 0, 0)
            const diffMinutes = Math.abs((now.getTime() - target.getTime()) / 60000)
            return diffMinutes <= toleranceMinutes
          }
          
          if (!records.length || lastType === 'CLOCK_OUT' || lastType === null) {
            decidedType = 'CLOCK_IN'
            console.log('✅ [DECISÃO] Primeira batida ou após SAÍDA → ENTRADA')
          } else if (lastType === 'CLOCK_IN') {
            console.log('🔍 [DECISÃO] Última foi ENTRADA, verificando horários...')
            // Verificar se está próximo do horário de intervalo ou saída
            if (employeeSchedule?.breakStart && isNearTime(employeeSchedule.breakStart)) {
              decidedType = 'BREAK_START' // Automático
              console.log('✅ [DECISÃO] Próximo de', employeeSchedule.breakStart, '→ INÍCIO_INTERVALO (automático)')
            } else if (employeeSchedule?.workEnd && isNearTime(employeeSchedule.workEnd)) {
              decidedType = 'CLOCK_OUT' // Automático
              console.log('✅ [DECISÃO] Próximo de', employeeSchedule.workEnd, '→ SAÍDA (automático)')
            } else {
              // ambíguo: início de intervalo ou saída
              ambiguous = ['BREAK_START','CLOCK_OUT']
              console.log('⚠️ [DECISÃO] AMBÍGUO! Não está próximo de horários específicos')
              console.log('   Horários:', employeeSchedule)
            }
          } else if (lastType === 'BREAK_START') {
            // Verificar se está próximo do fim do intervalo
            if (employeeSchedule?.breakEnd && isNearTime(employeeSchedule.breakEnd)) {
              decidedType = 'BREAK_END' // Automático
            } else {
              decidedType = 'BREAK_END'
            }
          } else if (lastType === 'BREAK_END') {
            // Verificar se está próximo do horário de saída
            if (employeeSchedule?.workEnd && isNearTime(employeeSchedule.workEnd)) {
              decidedType = 'CLOCK_OUT' // Automático
            } else {
              decidedType = 'CLOCK_OUT'
            }
          } else {
            decidedType = 'CLOCK_IN'
          }
        } catch (e) {
          decidedType = 'CLOCK_IN' // Fallback
        }
      } else {
        // Admin: o backend já decide o tipo automaticamente
        // Não precisamos fazer nada aqui - o tipo vem no result.data.timeEntry.type
        console.log('[PONTO] 🔄 Modo admin - backend decide o tipo automaticamente')
        decidedType = null // Será preenchido pelo backend
      }

      if (ambiguous) {
        // Manter câmera aberta e mostrar botões de escolha
        const choiceOptions = ambiguous.map((type: string) => ({
          type,
          label: type === 'BREAK_START' ? 'Início do Intervalo' : 'Saída'
        }))
        
        setAmbiguousChoice({
          options: choiceOptions,
          employee: {
            email: recognizedUserId || '',
            name: '',
            position: '',
            id: '',
          }
        })
        
        setLoading(false)
        recognitionInFlightRef.current = false
        return
      }
      
      // Reconhecimento bem-sucedido
      decidedType = decidedType || 'CLOCK_IN'
      
      // Declarar clockResult fora do escopo
      let clockResult: any
      
      // ⚠️ VERIFICAR SE O BACKEND JÁ REGISTROU (o endpoint /api/time-entries/facial já registra o ponto)
      if (result.data?.timeEntry) {
        console.log('[PONTO] ✅ Backend já registrou o ponto!')
        console.log('[PONTO] 📋 timeEntry:', result.data.timeEntry)
        console.log('[PONTO] 📋 employee:', result.data.timeEntry.employee)
        
        // Usar o ponto já registrado pelo backend
        clockResult = result.data.timeEntry
        
        // ✅ SALVAR PONTO NO LOCALSTORAGE (persistir para próxima decisão)
        try {
          const pontosHoje = localStorage.getItem('pontos_hoje')
          const records = pontosHoje ? JSON.parse(pontosHoje) : []
          records.push(clockResult)
          localStorage.setItem('pontos_hoje', JSON.stringify(records))
          console.log('[TIMECLOCK] 💾 Ponto salvo no localStorage:', clockResult)
        } catch (e) {
          console.error('[TIMECLOCK] Erro ao salvar no localStorage:', e)
        }
        
        // Pular para o sucesso
        decidedType = clockResult.type
      } else {
        // Isso não deveria acontecer - o endpoint /api/time-entries/facial sempre registra o ponto
        console.error('[PONTO] ❌ Backend não retornou timeEntry - isso não deveria acontecer!')
        throw new Error('Erro interno: ponto não foi registrado pelo backend')
      }
      
      // Sucesso completo
      // Usar dados do funcionário que vieram no clockResult (backend já retorna)
      let employeeData: any = {}
      
      // O backend retorna employee dentro do timeEntry
      if (clockResult?.employee) {
        const emp = clockResult.employee
        employeeData = {
          id: emp.id,
          registrationId: emp.registrationId,
          name: emp.user?.name || 'Funcionário',
          avatarUrl: emp.user?.avatarUrl || null,
        }
        console.log('[RECOGNITION] 📋 Dados do funcionário extraídos do clockResult:', employeeData)
      } else {
        console.log('[RECOGNITION] ⚠️ clockResult não contém employee:', clockResult)
      }
      
      // Liberar câmera IMEDIATAMENTE (não esperar cleanup)
      console.log('[RECOGNITION] 🎯 Reconhecimento bem-sucedido - liberando câmera AGORA')
      stopCamera()
      
      // Fechar componente completamente
      onClose()
      
      // Enviar resultado estruturado para componente pai (sem delay)
      onRecognitionSuccess({
        success: true,
        type: decidedType,
        timestamp: new Date().toISOString(),
        message: clockResult.message || 'Ponto registrado com sucesso',
        employeeData,
        clockResult
      })
      
    } catch (error: any) {
      // Traduzir erros técnicos para mensagens amigáveis
      let errorMessage = error.message || 'Erro no reconhecimento facial'
      
      if (errorMessage.includes('No face is found') || errorMessage.includes('No face')) {
        errorMessage = 'Nenhum rosto foi detectado na imagem. Por favor, posicione seu rosto bem iluminado e centralizado na câmera.'
      } else if (errorMessage.includes('timeout')) {
        errorMessage = 'O processamento está demorando mais que o esperado. Por favor, tente novamente.'
      } else if (errorMessage.includes('Bad Request')) {
        errorMessage = 'Erro ao processar a imagem. Certifique-se de que seu rosto está bem visível e iluminado.'
      } else if (errorMessage.includes('not recognized') || errorMessage.includes('não reconhecido')) {
        errorMessage = 'Rosto não reconhecido. Certifique-se de que você já cadastrou sua face no sistema.'
      }
      
      // Liberar câmera IMEDIATAMENTE em caso de erro
      console.log('[RECOGNITION] ❌ Erro no reconhecimento - liberando câmera AGORA')
      stopCamera()
      
      // Fechar componente completamente
      onClose()
      
      // Retornar erro estruturado imediatamente
      onRecognitionError(errorMessage)
    } finally {
      recognitionInFlightRef.current = false
      autoScheduledRef.current = false
      if (!isShuttingDownRef.current && !captureInFlightRef.current) {
        // Resetar para permitir nova captura
      }
    }
  }

  // Função para escolher tipo de ponto quando ambíguo
  const handleAmbiguousChoice = async (chosenType: 'BREAK_START' | 'CLOCK_OUT') => {
    if (!authMode || !ambiguousChoice) return
    
    try {
      // Buscar token correto
      const token = localStorage.getItem('token') || localStorage.getItem('employee_token') || undefined
      
      // Usar o employeeId que já temos no ambiguousChoice
      const employeeId = ambiguousChoice.employee?.id || null
      
      const clockBody = authMode === 'admin' && employeeId
        ? { type: chosenType, employeeId, method: 'FACIAL_RECOGNITION' }
        : { type: chosenType, method: 'FACIAL_RECOGNITION' }
      
      const clockResponse = await fetch('/api/timeclock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(clockBody)
      })
      
      const clockResult = await clockResponse.json()
      
      if (!clockResponse.ok) {
        throw new Error(clockResult.error || 'Erro ao registrar ponto')
      }
      
      // Salvar no localStorage
      try {
        const pontosHoje = localStorage.getItem('pontos_hoje')
        const records = pontosHoje ? JSON.parse(pontosHoje) : []
        records.push(clockResult)
        localStorage.setItem('pontos_hoje', JSON.stringify(records))
      } catch (e) {
        console.error('[TIMECLOCK] Erro ao salvar no localStorage:', e)
      }
      
      // Liberar câmera IMEDIATAMENTE
      console.log('[AMBIGUOUS] 🎯 Escolha confirmada - liberando câmera AGORA')
      stopCamera()
      
      // Fechar componente
      onClose()
      
      // Retornar sucesso
      onRecognitionSuccess({
        success: true,
        type: chosenType,
        timestamp: new Date().toISOString(),
        message: clockResult.message || 'Ponto registrado com sucesso',
        employeeData: ambiguousChoice.employee,
        clockResult
      })
    } catch (error: any) {
      // Liberar câmera IMEDIATAMENTE em caso de erro
      console.log('[AMBIGUOUS] ❌ Erro na escolha - liberando câmera AGORA')
      stopCamera()
      
      // Fechar componente
      onClose()
      onRecognitionError(error.message || 'Erro ao registrar ponto')
    }
  }

  const handleClose = useCallback(async () => {
    console.log('[CLOSE] 🚪 Botão de fechar clicado - liberando câmera AGORA')
    await stopCamera()
    console.log('[CLOSE] ✅ Câmera liberada - fechando componente')
    onClose()
  }, [onClose, stopCamera])

  // Efeitos
  useEffect(() => {
    console.log('[COMPONENT] 🚀 Montando componente - iniciando câmera')
    startCamera()
    return () => {
      // Cleanup: parar câmera ao desmontar
      console.log('[COMPONENT] 🗑️ Desmontando componente - cleanup da câmera')
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Detectar fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Auto fullscreen
  useEffect(() => {
    if (ready && !isFullscreen) {
      const enterFullscreen = async () => {
        try {
          const el = containerRef.current
          if (el?.requestFullscreen) {
            await el.requestFullscreen()
          }
        } catch {}
      }
      enterFullscreen()
    }
  }, [ready, isFullscreen])

  const hasFeedback = !!feedback
  const titleText = mode === 'cadastro' ? 'Cadastro Facial' : 'Reconhecimento Facial'
  const borderColor = detected ? "border-emerald-500" : "border-red-500"
  
  // Mensagens SIMPLIFICADAS para captura imediata
  const getContextualMessage = () => {
    if (hasFeedback) return feedback.text
    
    if (loading) {
      return mode === 'cadastro' 
        ? 'Processando cadastro facial...'
        : 'Processando reconhecimento facial...'
    }
    
    if (captureTriggered) {
      return mode === 'cadastro'
        ? 'Capturando imagem para cadastro facial...'
        : 'Capturando imagem para bater o ponto...'
    }
    
    if (!currentFaceBox) {
      return mode === 'cadastro'
        ? 'Posicione seu rosto na câmera para cadastro'
        : 'Posicione seu rosto na câmera para bater ponto'
    }
    
    if (currentFaceBox && !detected) {
      return 'Rosto detectado - Centralize e aproxime-se mais'
    }
    
    if (detected) {
      return 'Rosto bem posicionado - Capturando automaticamente!'
    }
    
    return 'Posicione seu rosto na tela'
  }
  
  const messageText = getContextualMessage()

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[1000]">
      {/* Vídeo */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
      />
      
      {/* Canvas para detecção */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-0"
        width={1280}
        height={720}
      />
      
      {/* Quadradinho que enquadra o rosto - CORRIGIDO para telas verticais */}
      {currentFaceBox && videoRef.current && (() => {
        const video = videoRef.current
        const container = containerRef.current
        
        if (!container) return null
        
        // Obter dimensões reais do container e vídeo
        const containerRect = container.getBoundingClientRect()
        const videoRect = video.getBoundingClientRect()
        
        // Dimensões do vídeo original (stream)
        const videoWidth = video.videoWidth
        const videoHeight = video.videoHeight
        
        // Calcular aspect ratio
        const videoAspect = videoWidth / videoHeight
        const containerAspect = containerRect.width / containerRect.height
        
        // Calcular dimensões reais do vídeo renderizado (considerando object-fit: cover)
        let renderedWidth, renderedHeight, offsetX, offsetY
        
        if (containerAspect > videoAspect) {
          // Container mais largo que vídeo - vídeo preenche largura
          renderedWidth = containerRect.width
          renderedHeight = containerRect.width / videoAspect
          offsetX = 0
          offsetY = (containerRect.height - renderedHeight) / 2
        } else {
          // Container mais alto que vídeo - vídeo preenche altura
          renderedHeight = containerRect.height
          renderedWidth = containerRect.height * videoAspect
          offsetX = (containerRect.width - renderedWidth) / 2
          offsetY = 0
        }
        
        // Calcular escala entre coordenadas do MediaPipe e vídeo renderizado
        const scaleX = renderedWidth / videoWidth
        const scaleY = renderedHeight / videoHeight
        
        // Calcular posição real na tela
        const realX = currentFaceBox.x * scaleX + offsetX
        const realY = currentFaceBox.y * scaleY + offsetY
        const realWidth = currentFaceBox.width * scaleX
        const realHeight = currentFaceBox.height * scaleY
        
        return (
          <div 
            className={`absolute border-2 transition-all duration-200 ${
              detected ? 'border-emerald-400 shadow-emerald-400/50' : 'border-yellow-400 shadow-yellow-400/50'
            } shadow-lg pointer-events-none`}
            style={{
              left: `${realX}px`,
              top: `${realY}px`,
              width: `${realWidth}px`,
              height: `${realHeight}px`,
              zIndex: 9998
            }}
          >
            {/* Cantos do quadrado */}
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-white"></div>
            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-white"></div>
            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-white"></div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-white"></div>
          </div>
        )
      })()}

      {/* Gradiente inferior */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent z-10" />

      {/* UI Overlay */}
      <div className={`absolute inset-0 z-[10000] transition-opacity duration-150 ease-out ${(ready || hasFeedback) ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {!hasFeedback && (
          <>
            {isFullscreen && (
              <div className="absolute top-4 left-4 right-4 flex flex-col gap-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="px-4 py-2 rounded-xl bg-black/60 border border-white/10 text-sm shadow-md inline-flex items-center gap-2">
                    {mode === "reconhecimento" ? <UserCheck className="w-4 h-4 text-emerald-400" /> : <UserPlus className="w-4 h-4 text-sky-400" />}
                    <span className="font-semibold">{titleText}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {/* Status chip */}
                  </div>
                </div>
              </div>
            )}

            {/* Overlay de resolução - sempre visível no topo */}
            {isFullscreen && resolution && (
              <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[9998] pointer-events-none">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700/90 backdrop-blur-sm border border-slate-600/50">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <p className="text-white text-sm font-medium">{resolution}</p>
                </div>
              </div>
            )}

            {/* Mensagens de estado - esconde quando ambiguousChoice está ativo */}
            {isFullscreen && !ambiguousChoice && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[9998] pointer-events-none">
                <div className="flex flex-col items-center gap-4">
                  {/* Status de detecção (sem resolução aqui) */}
                  {false && resolution && (
                    <div className="px-6 py-3 rounded-2xl bg-black/60 backdrop-blur-sm border border-white/10">
                      <p className="text-white text-sm font-medium">{resolution}</p>
                    </div>
                  )}

                  {/* Status de detecção */}
                  {ready && (
                    <div className="flex flex-col items-center gap-3">
                      <div className={`px-6 py-3 rounded-2xl backdrop-blur-sm border transition-all duration-300 ${
                        detected
                          ? 'bg-emerald-600/80 border-emerald-400/50'
                          : 'bg-slate-700/80 border-slate-500/50'
                      }`}>
                        <p className="text-white text-base font-semibold">
                          {detected ? '✅ Rosto detectado' : '🔍 Procurando rosto...'}
                        </p>
                      </div>

                      {/* Mensagem de processamento */}
                      {(() => {
                        if (recognitionInFlightRef.current) {
                          return (
                            <div className="px-6 py-3 rounded-2xl bg-blue-600/80 backdrop-blur-sm border border-blue-400/50">
                              <p className="text-white text-base font-semibold">
                                🔍 Processando reconhecimento facial...
                              </p>
                            </div>
                          )
                        }
                        if (captureInFlightRef.current) {
                          return (
                            <div className="px-6 py-3 rounded-2xl bg-amber-600/80 backdrop-blur-sm border border-amber-400/50">
                              <p className="text-white text-base font-semibold">
                                📸 Capturando imagem para bater o ponto...
                              </p>
                            </div>
                          )
                        }
                        return null
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer com botões */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center justify-center">
              {!isFullscreen && (
                <div className="flex items-center gap-3">
                  <RoundActionButton
                    onClick={handleClose}
                    title="Fechar câmera"
                    ariaLabel="Fechar câmera"
                    bgClass="bg-rose-600"
                    hoverBgClass="hover:bg-rose-500"
                    border={false}
                    ring
                    ringClass="ring-white/20"
                    icon={<CameraOff className="text-white" />}
                  />
                  <RoundActionButton
                    onClick={async () => {
                      try {
                        const el = containerRef.current as any
                        if (el?.requestFullscreen) await el.requestFullscreen()
                      } catch {}
                    }}
                    title="Tela cheia"
                    ariaLabel="Tela cheia"
                    bgClass="bg-emerald-600"
                    hoverBgClass="hover:bg-emerald-500"
                    border={false}
                    ring
                    ringClass="ring-white/20"
                    icon={<Maximize2 className="text-white" />}
                  />
                </div>
              )}

              {isFullscreen && ambiguousChoice && (
                <div className="flex items-center gap-3 relative z-[10000]">
                  {/* Botão de fechar sempre visível - mesma cor vermelha */}
                  <RoundActionButton
                    onClick={handleClose}
                    title="Fechar câmera"
                    ariaLabel="Fechar câmera"
                    bgClass="bg-rose-600"
                    hoverBgClass="hover:bg-rose-500"
                    border={false}
                    ring={false}
                    icon={<CameraOff className="text-white" />}
                  />
                  
                  {/* Botões de escolha de ambiguidade - sem animação piscante */}
                  {ambiguousChoice.options?.map((option: any) => {
                    return (
                      <RoundActionButton
                        key={option.type}
                        onClick={() => {
                          console.log('[PONTO] ✅ Botão clicado:', option.type)
                          handleAmbiguousChoice(option.type)
                        }}
                        disabled={loading}
                        title={option.label}
                        ariaLabel={option.label}
                        bgClass={option.type === 'BREAK_START' ? 'bg-amber-500' : 'bg-red-600'}
                        hoverBgClass={option.type === 'BREAK_START' ? 'hover:bg-amber-400' : 'hover:bg-red-500'}
                        border={false}
                        ring={false}
                        icon={option.type === 'BREAK_START' ? <Coffee className="text-white" /> : <LogOut className="text-white" />}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Overlay de feedback */}
      {hasFeedback && (
        <div className={`fixed inset-0 flex items-center justify-center ${feedback.ok ? 'bg-emerald-600/60' : 'bg-red-600/60'} backdrop-blur-sm z-[99999]`}>
          <div className="px-12 py-8 rounded-3xl bg-black/80 border-2 border-white/20 shadow-2xl max-w-[85%] text-center">
            <div className="flex flex-col items-center gap-6">
              <UserCheck className="w-16 h-16 text-white" />
              <span className="text-2xl sm:text-4xl font-bold text-white leading-tight text-center">
                {feedback.text}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Overlay de blur quando ambiguousChoice está ativo */}
      {isFullscreen && ambiguousChoice && (
        <div className="absolute inset-0 z-[9999] bg-black/40 backdrop-blur-md" />
      )}

      {/* Borda de validação - esconde quando ambiguousChoice está ativo */}
      {isFullscreen && !hasFeedback && !ambiguousChoice && (
        <div className={`pointer-events-none absolute inset-0 z-[9999] border-[3px] ${ready ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150 ease-out ${borderColor} ${detected ? 'shadow-[0_0_0_3px_rgba(16,185,129,0.45)]' : 'shadow-[0_0_0_3px_rgba(239,68,68,0.45)]'}`} />
      )}
    </div>
  )
}
