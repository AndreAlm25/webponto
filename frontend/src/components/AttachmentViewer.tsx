'use client'
// Visualizador de anexos (código em inglês; textos em português)
import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, Download, FileText, Printer } from 'lucide-react'
import { getFileUrl } from '@/utils/files'
import { MessageAttachment } from '@/hooks/useMessages'
import { toast } from 'sonner'

interface AttachmentViewerProps {
  attachment: MessageAttachment
  onClose: () => void
}

export default function AttachmentViewer({ attachment, onClose }: AttachmentViewerProps) {
  const fileUrl = getFileUrl(attachment.url)
  const isPDF = attachment.mimeType === 'application/pdf'
  const isImage = attachment.mimeType?.startsWith('image/')
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Carregar arquivo como blob para evitar expor URL da API
  useEffect(() => {
    const loadFile = async () => {
      try {
        setLoading(true)
        const response = await fetch(fileUrl)
        if (!response.ok) throw new Error('Erro ao carregar arquivo')
        
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setBlobUrl(url)
      } catch (error) {
        console.error('Erro ao carregar arquivo:', error)
        toast.error('Erro ao carregar arquivo')
      } finally {
        setLoading(false)
      }
    }

    loadFile()

    // Limpar blob URL ao desmontar
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [fileUrl])

  const handleDownload = async () => {
    try {
      const response = await fetch(fileUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = attachment.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(url)
      toast.success('Download iniciado')
    } catch (error) {
      console.error('Erro ao baixar:', error)
      toast.error('Erro ao baixar arquivo')
    }
  }

  const handlePrint = () => {
    if (!blobUrl) return
    
    const printWindow = window.open(blobUrl, '_blank')
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print()
      }
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="relative max-w-6xl max-h-[90vh] w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 text-white">
            {isPDF ? (
              <FileText className="w-5 h-5" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
            <span className="font-medium truncate max-w-md">{attachment.filename}</span>
          </div>
          <div className="flex items-center gap-2">
            {isPDF && (
              <button
                onClick={handlePrint}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Imprimir"
                disabled={!blobUrl}
              >
                <Printer className="w-5 h-5 text-white" />
              </button>
            )}
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Baixar arquivo"
            >
              <Download className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="mt-16 bg-white rounded-lg overflow-hidden max-h-[calc(90vh-5rem)]">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : !blobUrl ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Erro ao carregar arquivo
              </p>
              <button
                onClick={handleDownload}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Baixar arquivo
              </button>
            </div>
          ) : isImage ? (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <Image
                src={blobUrl}
                alt={attachment.filename}
                width={1200}
                height={800}
                className="max-w-full max-h-[calc(90vh-10rem)] object-contain"
                unoptimized
              />
            </div>
          ) : isPDF ? (
            <iframe
              src={blobUrl}
              className="w-full h-[calc(90vh-5rem)]"
              title={attachment.filename}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                {attachment.filename}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Tipo de arquivo não suportado para visualização
              </p>
              <button
                onClick={handleDownload}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Baixar arquivo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
