'use client'

import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision'

export interface FaceBox {
  x: number
  y: number
  width: number
  height: number
}

export interface FaceDetectionResult {
  box: FaceBox
  confidence: number
}

export class MediaPipeFaceDetection {
  private detector: any | null = null
  private isInitialized = false

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
      )
      
      this.detector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.5,
        minSuppressionThreshold: 0.3
      })

      this.isInitialized = true
      console.log('✅ [MediaPipe] Face Detection inicializado com sucesso')
    } catch (error) {
      console.error('❌ [MediaPipe] Erro ao inicializar:', error)
      throw error
    }
  }

  async detectFaces(
    videoElement: HTMLVideoElement,
    timestamp?: number
  ): Promise<FaceDetectionResult[]> {
    if (!this.detector || !this.isInitialized) {
      throw new Error('MediaPipe não foi inicializado')
    }

    try {
      const detections = this.detector.detectForVideo(
        videoElement,
        timestamp || performance.now()
      )

      return detections.detections.map((detection: any) => {
        const bbox = detection.boundingBox!
        return {
          box: {
            x: bbox.originX,
            y: bbox.originY,
            width: bbox.width,
            height: bbox.height
          },
          confidence: detection.categories?.[0]?.score || 0
        }
      })
    } catch (error) {
      console.error('❌ [MediaPipe] Erro na detecção facial:', error)
      return []
    }
  }

  async detectSingleFace(
    videoElement: HTMLVideoElement,
    timestamp?: number
  ): Promise<FaceDetectionResult | null> {
    const faces = await this.detectFaces(videoElement, timestamp)
    
    if (faces.length === 0) return null
    
    // Retorna a face com maior confiança
    return faces.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    )
  }

  dispose(): void {
    if (this.detector) {
      this.detector.close()
      this.detector = null
    }
    this.isInitialized = false
    console.log('🔄 [MediaPipe] Detector desligado')
  }
}

// Instância singleton
let mediapiperInstance: MediaPipeFaceDetection | null = null

export async function getMediaPipeFaceDetection(): Promise<MediaPipeFaceDetection> {
  if (!mediapiperInstance) {
    mediapiperInstance = new MediaPipeFaceDetection()
    await mediapiperInstance.initialize()
  }
  return mediapiperInstance
}

// Função para validar posicionamento do rosto
export function isWellPositioned(
  faceBox: FaceBox,
  videoWidth: number,
  videoHeight: number,
  guideConfig = { centerTolerance: 0.3, sizeTolerance: 0.4 }
): boolean {
  const { centerTolerance, sizeTolerance } = guideConfig
  
  // Centro do vídeo
  const videoCenterX = videoWidth / 2
  const videoCenterY = videoHeight / 2
  
  // Centro da face detectada
  const faceCenterX = faceBox.x + faceBox.width / 2
  const faceCenterY = faceBox.y + faceBox.height / 2
  
  // Distância do centro
  const centerDistance = Math.hypot(
    faceCenterX - videoCenterX,
    faceCenterY - videoCenterY
  )
  
  // Tolerância baseada no tamanho do vídeo
  const maxCenterDistance = Math.min(videoWidth, videoHeight) * centerTolerance
  const centerOk = centerDistance < maxCenterDistance
  
  // Validação de tamanho (face deve ocupar uma porção razoável)
  const faceArea = faceBox.width * faceBox.height
  const videoArea = videoWidth * videoHeight
  const faceRatio = faceArea / videoArea
  
  // Face deve ocupar entre 5% e 60% da tela
  const sizeOk = faceRatio > 0.05 && faceRatio < 0.6
  
  // Face não pode ser muito pequena em pixels absolutos
  const minSize = Math.min(videoWidth, videoHeight) * 0.15
  const notTooSmall = faceBox.width > minSize && faceBox.height > minSize
  
  return centerOk && sizeOk && notTooSmall
}

// Função auxiliar para desenhar feedback visual no canvas
export function drawFaceGuide(
  ctx: CanvasRenderingContext2D,
  faceBox: FaceBox,
  isWellPositioned: boolean,
  videoWidth: number,
  videoHeight: number
): void {
  // Desenha o círculo guia no centro
  const centerX = videoWidth / 2
  const centerY = videoHeight / 2
  const guideRadius = Math.min(videoWidth, videoHeight) * 0.25

  // Círculo guia (onde o rosto deve estar)
  ctx.strokeStyle = isWellPositioned ? '#22c55e' : '#ef4444'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(centerX, centerY, guideRadius, 0, 2 * Math.PI)
  ctx.stroke()

  // Retângulo ao redor do rosto detectado
  if (faceBox) {
    ctx.strokeStyle = isWellPositioned ? '#22c55e' : '#f59e0b'
    ctx.lineWidth = 2
    ctx.strokeRect(faceBox.x, faceBox.y, faceBox.width, faceBox.height)
  }
}
