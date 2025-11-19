"use client"

import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, CircleUser, Image as ImageIcon, X, RefreshCcw, ZoomIn, ZoomOut, FlipHorizontal, Check } from 'lucide-react'

interface AvatarUploadProps {
  initialUrl?: string
  onFileSelected: (file: File | null) => void
  size?: number // px
  shape?: 'circle' | 'rounded'
  className?: string
  ariaLabel?: string
}

export default function AvatarUpload({
  initialUrl = '',
  onFileSelected,
  size = 112, // 28 * 4 (tailwind h-28), default como no modal
  shape = 'circle',
  className = '',
  ariaLabel = 'Alterar foto',
}: AvatarUploadProps) {
  // razão do diâmetro da máscara em relação ao menor lado da viewport do editor
  const MASK_DIAMETER_RATIO = 0.8
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>(initialUrl || '')
  const [showChooser, setShowChooser] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraResolution, setCameraResolution] = useState<string>('')
  const [camZoom, setCamZoom] = useState<number>(1)
  const cameraContainerRef = useRef<HTMLDivElement | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [editorUrl, setEditorUrl] = useState<string>('')
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef<{x:number;y:number}>({ x: 0, y: 0 })
  const [mirror, setMirror] = useState(false)
  const [maskDiameterCssPx, setMaskDiameterCssPx] = useState<number>(0)
  const [brightness, setBrightness] = useState<number>(0) // -100..+100 (%), usamos -50..+50 no UI
  const resolutionRaf = useRef<number | null>(null)
  // Controle de pinch-to-zoom (dois dedos)
  const pointersRef = useRef<Map<number, {x:number;y:number}>>(new Map())
  const pinchStartDistRef = useRef<number | null>(null)
  const pinchStartScaleRef = useRef<number>(1)
  const pinchCenterRef = useRef<{x:number;y:number} | null>(null)

  useEffect(() => {
    setPreviewUrl(initialUrl || '')
  }, [initialUrl])

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      return () => {
        try { URL.revokeObjectURL(url) } catch {}
      }
    }
  }, [file])

  // Editor: desenho contínuo e interação para crop circular 512x512
  useEffect(function setupEditor() {
    if (!showEditor) return
    const canvasEl = canvasRef.current as HTMLCanvasElement | null
    if (!canvasEl) return
    const c = canvasEl as HTMLCanvasElement
    const ctx = c.getContext('2d')
    if (!ctx) return

    const img = new Image()
    imgRef.current = img
    img.crossOrigin = 'anonymous'
    img.src = editorUrl

    let raf = 0
    function draw() {
      if (!ctx || !c || !imgRef.current) return
      const dpr = window.devicePixelRatio || 1
      // ajustar tamanho do canvas para fullscreen
      c.width = Math.floor(c.clientWidth * dpr)
      c.height = Math.floor(c.clientHeight * dpr)
      ctx.setTransform(1,0,0,1,0,0)
      ctx.clearRect(0,0,c.width,c.height)
      ctx.save()
      ctx.translate(c.width/2 + offset.x * dpr, c.height/2 + offset.y * dpr)
      const m = mirror ? -1 : 1
      ctx.scale(m * scale, scale)
      const imgW = imgRef.current.width
      const imgH = imgRef.current.height
      const maxSide = Math.max(imgW, imgH)
      const renderScale = (Math.min(c.width, c.height) / maxSide)
      // aplicar brilho no preview
      const brightnessFactor = 1 + (brightness / 100)
      ctx.filter = `brightness(${brightnessFactor})`
      ctx.drawImage(imgRef.current, -imgW/2 * renderScale, -imgH/2 * renderScale, imgW * renderScale, imgH * renderScale)
      ctx.filter = 'none'
      ctx.restore()
      raf = requestAnimationFrame(draw)
    }

    function onWheel(ev: WheelEvent) {
      ev.preventDefault()
      const delta = ev.deltaY > 0 ? -0.05 : 0.05
      setScale(s => Math.max(0.2, Math.min(5, s + delta)))
    }

    function onPointerDown(ev: PointerEvent) {
      ev.preventDefault()
      c.setPointerCapture?.(ev.pointerId)
      pointersRef.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })
      if (pointersRef.current.size === 1) {
        // drag com um dedo
        setDragging(true)
        dragStart.current = { x: ev.clientX - offset.x, y: ev.clientY - offset.y }
      } else if (pointersRef.current.size === 2) {
        // iniciar pinch
        const pts = Array.from(pointersRef.current.values())
        const dx = pts[1].x - pts[0].x
        const dy = pts[1].y - pts[0].y
        pinchStartDistRef.current = Math.hypot(dx, dy)
        pinchStartScaleRef.current = scale
        pinchCenterRef.current = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
      }
    }
    function onPointerMove(ev: PointerEvent) {
      if (!pointersRef.current.has(ev.pointerId)) return
      pointersRef.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })
      if (pointersRef.current.size === 2 && pinchStartDistRef.current) {
        // pinch-to-zoom
        const pts = Array.from(pointersRef.current.values())
        const dx = pts[1].x - pts[0].x
        const dy = pts[1].y - pts[0].y
        const dist = Math.hypot(dx, dy)
        const newScale = Math.max(0.2, Math.min(5, pinchStartScaleRef.current * (dist / pinchStartDistRef.current)))
        // manter o centro do pinch fixo ajustando offset
        const center = pinchCenterRef.current!
        const dpr = window.devicePixelRatio || 1
        // calcular delta de escala e ajustar offset proporcional ao centro
        const scaleRatio = newScale / scale
        setOffset(prev => ({
          x: (prev.x + (center.x - c.clientWidth / 2)) * scaleRatio - (center.x - c.clientWidth / 2),
          y: (prev.y + (center.y - c.clientHeight / 2)) * scaleRatio - (center.y - c.clientHeight / 2)
        }))
        setScale(newScale)
        setDragging(false)
      } else if (dragging && pointersRef.current.size === 1) {
        setOffset({ x: ev.clientX - dragStart.current.x, y: ev.clientY - dragStart.current.y })
      }
    }
    function onPointerUp(ev: PointerEvent) {
      pointersRef.current.delete(ev.pointerId)
      if (pointersRef.current.size < 2) {
        pinchStartDistRef.current = null
        pinchCenterRef.current = null
      }
      if (pointersRef.current.size === 0) setDragging(false)
    }

    c.addEventListener('wheel', onWheel, { passive: false })
    c.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove, { passive: false })
    window.addEventListener('pointerup', onPointerUp)
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      c.removeEventListener('wheel', onWheel)
      c.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [showEditor, editorUrl, scale, offset, mirror, dragging, brightness])

  // Atualiza diâmetro da máscara (em px CSS) conforme tamanho do canvas na tela
  useEffect(() => {
    if (!showEditor) return
    function updateMaskPx() {
      const el = canvasRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const cssMin = Math.min(rect.width, rect.height)
      setMaskDiameterCssPx(cssMin * MASK_DIAMETER_RATIO)
    }
    updateMaskPx()
    window.addEventListener('resize', updateMaskPx)
    return () => window.removeEventListener('resize', updateMaskPx)
  }, [showEditor])

  function applyCrop() {
    const img = imgRef.current
    const canvasView = canvasRef.current
    if (!img || !canvasView) return
    // criar canvas 512x512 e desenhar a área visível do editor centralizada
    const out = document.createElement('canvas')
    const size = 512
    out.width = size
    out.height = size
    const ctx = out.getContext('2d')!
    // fundo transparente; saída quadrada (sem clip circular)
    ctx.clearRect(0,0,size,size)
    ctx.save()

    // calcular parâmetros equivalentes do editor
    // Usar dimensões reais do canvas (em pixels) para manter correspondência exata com a visualização
    const viewW = canvasView.width
    const viewH = canvasView.height
    const imgW = img.width
    const imgH = img.height
    const maxSide = Math.max(imgW, imgH)
    const baseScale = Math.min(viewW, viewH) / maxSide
    const renderScale = baseScale * scale

    // aplicar transformações: espelho, escala e offset relativos
    // Converter offset (armazenado em CSS px) para px do canvas (compensando DPR)
    const cssW = canvasView.clientWidth || viewW
    const cssH = canvasView.clientHeight || viewH
    const dprCoefX = viewW / cssW
    const dprCoefY = viewH / cssH
    const offsetCanvasX = offset.x * dprCoefX
    const offsetCanvasY = offset.y * dprCoefY

    // Fator para converter deslocamentos/escala usando o diâmetro da máscara (mesmo da UI)
    const maskDiameterCanvasPx = Math.min(viewW, viewH) * MASK_DIAMETER_RATIO
    const factor = size / maskDiameterCanvasPx
    ctx.translate(size/2 + offsetCanvasX * factor, size/2 + offsetCanvasY * factor)
    const m = mirror ? -1 : 1
    ctx.scale(m * renderScale * factor, renderScale * factor)
    // aplicar mesmo brilho no salvamento
    const brightnessFactor = 1 + (brightness / 100)
    ctx.filter = `brightness(${brightnessFactor})`
    ctx.drawImage(img, -imgW/2, -imgH/2)
    ctx.filter = 'none'
    ctx.restore()

    out.toBlob((blob) => {
      if (!blob) return
      const processed = new File([blob], 'avatar-512.jpg', { type: 'image/jpeg' })
      setFile(processed)
      onFileSelected(processed)
      const url = URL.createObjectURL(processed)
      setPreviewUrl(url)
      setShowEditor(false)
      try { URL.revokeObjectURL(editorUrl) } catch {}
    }, 'image/jpeg', 0.92)
  }

  const borderRadius = shape === 'circle' ? '9999px' : '12px'

  async function startCamera() {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
        // tentar entrar em fullscreen do SO
        try {
          await cameraContainerRef.current?.requestFullscreen?.()
        } catch {}
        // loop para monitorar SEMPRE a resolução efetiva do vídeo (ex.: rotação/orientação)
        const checkResolution = () => {
          if (!videoRef.current) return
          const w = (videoRef.current as HTMLVideoElement).videoWidth
          const h = (videoRef.current as HTMLVideoElement).videoHeight
          if (w && h) {
            const str = `${w}x${h}`
            setCameraResolution(prev => (prev === str ? prev : str))
          }
          resolutionRaf.current = requestAnimationFrame(checkResolution)
        }
        resolutionRaf.current = requestAnimationFrame(checkResolution)
      }
    } catch (e) {
      console.warn('[AvatarUpload] getUserMedia falhou:', e)
      // Fallback: abrir seletor de arquivo
      document.getElementById('avatar-upload-input')?.click()
    }
  }

  function stopCamera() {
    try {
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
      // sair do fullscreen, se ativo
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
      if (resolutionRaf.current) {
        cancelAnimationFrame(resolutionRaf.current)
        resolutionRaf.current = null
      }
    } catch {}
  }

  async function captureSnapshot() {
    if (!videoRef.current) return
    const video = videoRef.current
    const w = video.videoWidth || 480
    const h = video.videoHeight || 480
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // espelhar horizontalmente na captura para manter coerência com preview
    ctx.save()
    ctx.scale(-1, 1)
    ctx.drawImage(video, -w, 0, w, h)
    ctx.restore()
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      setEditorUrl(url)
      setShowEditor(true)
      setShowCamera(false)
      stopCamera()
      // reset editor
      setScale(1); setOffset({x:0,y:0}); setMirror(false)
    }, 'image/jpeg', 0.9)
  }

  function openEditorFromFile(f: File) {
    const url = URL.createObjectURL(f)
    setEditorUrl(url)
    setShowEditor(true)
    setScale(1); setOffset({x:0,y:0}); setMirror(false)
  }

  return (
    <div className={`flex items-center justify-center z-0 ${className}`.trim()}>
      <div
        className="group relative bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden z-0"
        style={{ width: size, height: size, borderRadius }}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Preview do avatar" className="h-full w-full object-cover" />
        ) : (
          <CircleUser className="h-10 w-10 text-gray-400 dark:text-gray-500" />
        )}
        <div className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/30">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowChooser((v) => !v)}
              className="p-2 rounded-full bg-white/90 text-gray-800 hover:bg-white"
              aria-label={ariaLabel}
            >
              <Camera className="h-5 w-5" />
            </button>
          </div>
        </div>
        <input
          id="avatar-upload-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] || null
            if (f) openEditorFromFile(f)
          }}
        />
      </div>

      {/* Popover de escolha (Arquivo x Câmera) */}
      {showChooser && (
        <div className="absolute mt-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow z-20">
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-sm"
            onClick={() => {
              setShowChooser(false)
              // Sempre abrir a galeria (input normal), inclusive no mobile
              document.getElementById('avatar-upload-input')?.click()
            }}
          >
            <ImageIcon className="h-4 w-4" /> Carregar imagem
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-sm"
            onClick={async () => {
              setShowChooser(false)
              // Sempre usar getUserMedia com câmera frontal para garantir consistência
              setShowCamera(true)
              await startCamera()
            }}
          >
            <Camera className="h-4 w-4" /> Tirar foto
          </button>
        </div>
      )}

      {/* Modal de câmera (fullscreen, sem máscara) */}
      {showCamera && (
        <div ref={cameraContainerRef} className="fixed inset-0 z-50">
          {/* vídeo em fullscreen */}
          <div className="absolute inset-0 bg-black">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
              // espelhar a imagem para parecer um espelho
              style={{ transform: `scaleX(-1) scale(${camZoom})` }}
            />
          </div>

          {/* barra superior: título e resolução */}
          <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}>
            <div className="px-2 py-1 rounded bg-white/90 text-gray-900 text-xs sm:text-sm shadow flex items-center gap-2">
              <Camera className="h-4 w-4" />
              <span>Captura de imagem de perfil</span>
            </div>
            {/* Badge branco simples com status + resolução (similar ao Fullscreen) */}
            <div className="px-3 py-2 rounded bg-white/90 text-gray-900 text-xs sm:text-sm shadow inline-flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${streamRef.current ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className="font-medium">{streamRef.current ? 'Câmera Ativa' : 'Câmera Inativa'}</span>
              {streamRef.current && (
                <>
                  <Camera className="w-4 h-4 opacity-80" />
                  <span className="text-emerald-600 font-semibold">{cameraResolution || 'carregando...'}</span>
                </>
              )}
            </div>
          </div>

          {/* barra inferior com ações (botões circulares somente ícones) */}
          <div className="absolute bottom-0 left-0 right-0 p-5 flex items-center justify-center gap-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}>
            {/* Cancelar/fechar */}
            <button
              type="button"
              onClick={() => { setShowCamera(false); stopCamera() }}
              className="h-14 w-14 rounded-full flex items-center justify-center bg-red-600 text-white hover:bg-red-700 shadow"
              aria-label="Fechar câmera"
            >
              <CameraOff className="h-6 w-6" />
            </button>
            {/* Capturar */}
            <button
              type="button"
              onClick={captureSnapshot}
              className="h-14 w-14 rounded-full flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 shadow"
              aria-label="Capturar"
            >
              <Camera className="h-7 w-7" />
            </button>
          </div>
        </div>
      )}

      {/* Editor de corte circular (máscara visual; saída quadrada 512x512) */}
      {showEditor && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black">
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              style={{ touchAction: 'none' }}
            />
            {/* Máscara circular visual para enquadrar (apenas guia) */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 50% 45%, rgba(255,255,255,0) ${maskDiameterCssPx/2}px, rgba(0,0,0,0.65) ${maskDiameterCssPx/2 + 1}px)`
              }}
            />
          </div>
          {/* Slider de brilho, posicionado entre a máscara e os botões */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-24 w-[min(90vw,600px)] px-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex items-center gap-3 bg-white/85 backdrop-blur rounded-md px-3 py-2 shadow">
              <span className="text-xs text-gray-700 whitespace-nowrap">Brilho</span>
              <input
                type="range"
                min={-50}
                max={50}
                step={1}
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="flex-1 accent-blue-600"
                aria-label="Ajustar brilho"
              />
              <span className="text-xs text-gray-700 w-10 text-right">{brightness}</span>
            </div>
          </div>
          {/* Controles */}
          <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between">
            <div className="text-white/80 text-sm">Ajuste a imagem. Arraste para mover. Use os botões para zoom e espelhamento.</div>
            <button className="p-2 rounded-md bg-white/90 text-gray-900 hover:bg-white shadow" onClick={() => { setShowEditor(false); URL.revokeObjectURL(editorUrl) }} aria-label="Fechar">
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* Controles - Mobile: botões redondos somente ícones */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:hidden flex items-center justify-center gap-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
            <button type="button" aria-label="Espelhar" className="h-12 w-12 rounded-full bg-white/90 text-gray-900 hover:bg-white shadow flex items-center justify-center" onClick={() => setMirror(m => !m)}>
              <FlipHorizontal className="h-6 w-6" />
            </button>
            <button type="button" aria-label="Zoom in" className="h-12 w-12 rounded-full bg-white/90 text-gray-900 hover:bg-white shadow flex items-center justify-center" onClick={() => setScale(s => Math.min(5, s + 0.1))}>
              <ZoomIn className="h-6 w-6" />
            </button>
            <button type="button" aria-label="Zoom out" className="h-12 w-12 rounded-full bg-white/90 text-gray-900 hover:bg-white shadow flex items-center justify-center" onClick={() => setScale(s => Math.max(0.2, s - 0.1))}>
              <ZoomOut className="h-6 w-6" />
            </button>
            <button type="button" aria-label="Resetar" className="h-12 w-12 rounded-full bg-white/90 text-gray-900 hover:bg-white shadow flex items-center justify-center" onClick={() => { setScale(1); setOffset({x:0,y:0}); setMirror(false) }}>
              <RefreshCcw className="h-6 w-6" />
            </button>
            <button type="button" aria-label="Aplicar" className="h-12 w-12 rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow flex items-center justify-center" onClick={applyCrop}>
              <Check className="h-6 w-6" />
            </button>
          </div>
          {/* Controles - Desktop: mantém botões com texto */}
          <div className="absolute bottom-0 left-0 right-0 p-4 hidden sm:flex items-center justify-center gap-2">
            <button type="button" className="px-3 py-2 rounded-md bg-white/90 text-gray-900 hover:bg-white shadow flex items-center gap-2" onClick={() => setMirror(m => !m)}>
              <FlipHorizontal className="h-4 w-4" /> Espelhar
            </button>
            <button type="button" className="px-3 py-2 rounded-md bg-white/90 text-gray-900 hover:bg-white shadow flex items-center gap-2" onClick={() => setScale(s => Math.min(5, s + 0.1))}>
              <ZoomIn className="h-4 w-4" /> Zoom +
            </button>
            <button type="button" className="px-3 py-2 rounded-md bg-white/90 text-gray-900 hover:bg-white shadow flex items-center gap-2" onClick={() => setScale(s => Math.max(0.2, s - 0.1))}>
              <ZoomOut className="h-4 w-4" /> Zoom -
            </button>
            <button type="button" className="px-3 py-2 rounded-md bg-white/90 text-gray-900 hover:bg-white shadow flex items-center gap-2" onClick={() => { setScale(1); setOffset({x:0,y:0}); setMirror(false) }}>
              <RefreshCcw className="h-4 w-4" /> Resetar
            </button>
            <button type="button" className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow" onClick={applyCrop}>Aplicar</button>
          </div>
        </div>
      )}
    </div>
  )
}
