'use client'
// Preview de anexo na mensagem (código em inglês; textos em português)
import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { FileText, File } from 'lucide-react'
import { getFileUrl } from '@/utils/files'
import { MessageAttachment } from '@/hooks/useMessages'

interface AttachmentPreviewProps {
  attachment: MessageAttachment
  onClick: () => void
}

// Cache global de thumbnails de PDF (em memória)
const pdfThumbnailCache = new Map<string, { thumbnail: string; pageCount: number }>()

export default function AttachmentPreview({ attachment, onClick }: AttachmentPreviewProps) {
  const fileUrl = getFileUrl(attachment.url)
  const isPDF = attachment.mimeType === 'application/pdf'
  const isImage = attachment.mimeType?.startsWith('image/')
  const [pdfThumbnail, setPdfThumbnail] = useState<string | null>(null)
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null)
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false)

  // Formatar tamanho do arquivo
  const formatSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Gerar thumbnail do PDF
  useEffect(() => {
    if (!isPDF) return

    // Verificar se já existe no cache
    const cacheKey = attachment.url
    const cached = pdfThumbnailCache.get(cacheKey)
    
    if (cached) {
      setPdfThumbnail(cached.thumbnail)
      setPdfPageCount(cached.pageCount)
      return
    }

    setIsGeneratingThumbnail(true)

    const generatePdfThumbnail = async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.mjs'

        const pdf = await pdfjsLib.getDocument(fileUrl).promise
        const pageCount = pdf.numPages
        setPdfPageCount(pageCount)

        const page = await pdf.getPage(1)
        const viewport = page.getViewport({ scale: 0.5 })
        
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.height = viewport.height
        canvas.width = viewport.width

        if (context) {
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise

          const thumbnail = canvas.toDataURL()
          pdfThumbnailCache.set(cacheKey, { thumbnail, pageCount })
          setPdfThumbnail(thumbnail)
        }
      } catch (error) {
        console.error('Erro ao gerar thumbnail do PDF:', error)
      } finally {
        setIsGeneratingThumbnail(false)
      }
    }

    generatePdfThumbnail()
  }, [isPDF, fileUrl, attachment.url])

  return (
    <div
      onClick={onClick}
      className="mt-2 cursor-pointer group relative overflow-hidden rounded-lg border border-border hover:border-blue-500 transition-all"
    >
      {isImage ? (
        <div className="relative w-full max-w-xs">
          <Image
            src={fileUrl}
            alt={attachment.filename}
            width={300}
            height={200}
            className="w-full h-auto max-h-48 object-cover rounded-lg"
            unoptimized
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg" />
        </div>
      ) : isPDF ? (
        <div className="relative w-full max-w-xs bg-white dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
          {/* Thumbnail da primeira página */}
          {pdfThumbnail ? (
            <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-800">
              <img
                src={pdfThumbnail}
                alt="PDF Preview"
                className="w-full h-full object-contain"
              />
              {/* Overlay com ícone PDF */}
              <div className="absolute top-2 left-2 w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          ) : (
            <div className="relative w-full h-48 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 flex items-center justify-center">
              <FileText className="w-20 h-20 text-red-600 opacity-20" />
              <div className="absolute inset-0 flex items-center justify-center">
                {isGeneratingThumbnail ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center shadow-lg animate-pulse">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-xs text-red-700 dark:text-red-400 font-medium">Gerando preview...</p>
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center shadow-lg">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Informações do arquivo */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
              {attachment.filename}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              {pdfPageCount && (
                <>
                  <span className="font-medium">{pdfPageCount} página{pdfPageCount > 1 ? 's' : ''}</span>
                  <span>•</span>
                </>
              )}
              <span className="font-medium">PDF</span>
              {attachment.sizeBytes && (
                <>
                  <span>•</span>
                  <span>{formatSize(attachment.sizeBytes)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
          <div className="flex-shrink-0 w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
            <File className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {attachment.filename}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {attachment.sizeBytes && formatSize(attachment.sizeBytes)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
