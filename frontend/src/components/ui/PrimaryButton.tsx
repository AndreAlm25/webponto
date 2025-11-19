// Componente: Botão primário com ícone e loading
// - Estende o Button do shadcn/ui
// - Altura md (h-10) igual aos inputs
// - Suporta ícones e loading state

"use client"

import React from 'react'
import { LucideIcon, Loader2 } from 'lucide-react'
import { Button, ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PrimaryButtonProps extends Omit<ButtonProps, 'size'> {
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
  loading?: boolean
  fullWidth?: boolean
}

export function PrimaryButton({
  children,
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  className,
  disabled,
  ...props
}: PrimaryButtonProps) {
  return (
    <Button
      className={cn(
        'h-[42px] gap-2 px-3 py-2.5',
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {!loading && Icon && iconPosition === 'left' && <Icon className="h-4 w-4" />}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon className="h-4 w-4" />}
    </Button>
  )
}
