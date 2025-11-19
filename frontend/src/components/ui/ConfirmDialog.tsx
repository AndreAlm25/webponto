// Componente: Modal de confirmação reutilizável
// - Usado para confirmar ações destrutivas (excluir, desativar, etc)
// - Props personalizáveis (título, descrição, nome do item, ícone, cor)

"use client"

import React from 'react'
import { LucideIcon, AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  itemName?: string
  message: string
  confirmText?: string
  cancelText?: string
  icon?: LucideIcon
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  icon: Icon = AlertTriangle,
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const variantStyles = {
    danger: {
      bg: 'bg-red-100',
      icon: 'text-red-600',
      title: 'text-red-900',
      button: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      bg: 'bg-yellow-100',
      icon: 'text-yellow-600',
      title: 'text-yellow-900',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    },
    info: {
      bg: 'bg-blue-100',
      icon: 'text-blue-600',
      title: 'text-blue-900',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
  }

  const styles = variantStyles[variant]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md relative z-[10000]">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-4">
            <div className={`w-10 h-10 ${styles.bg} rounded-full flex items-center justify-center`}>
              <Icon className={`h-5 w-5 ${styles.icon}`} />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${styles.title}`}>{title}</h3>
              <p className="text-sm text-gray-500">{description}</p>
            </div>
          </div>

          {/* Message */}
          <p className="text-sm text-gray-600 mb-6">
            {message}
            {itemName && (
              <>
                {' '}
                <strong>{itemName}</strong>?
              </>
            )}
          </p>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${styles.button}`}
            >
              {loading ? 'Processando...' : confirmText}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
