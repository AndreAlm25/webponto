// Componente: Botão com ícone (redondo ou quadrado)
// - Usado para ações rápidas (editar, excluir, etc)
// - Variantes: primary, secondary, danger, ghost
// - Tamanhos: sm, md, lg

"use client"

import React from 'react'
import { LucideIcon } from 'lucide-react'

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  rounded?: boolean
  tooltip?: string
}

export function IconButton({
  icon: Icon,
  variant = 'outline',
  size = 'md',
  rounded = false,
  tooltip,
  className = '',
  ...props
}: IconButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    danger: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:border-red-300 focus:ring-red-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
    outline: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
  }

  const sizeStyles = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  }

  const iconSizeStyles = {
    sm: 'h-4 w-4',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  const roundedStyle = rounded ? 'rounded-full' : 'rounded-lg'

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${roundedStyle} ${className}`}
      title={tooltip}
      {...props}
    >
      <Icon className={iconSizeStyles[size]} />
    </button>
  )
}
