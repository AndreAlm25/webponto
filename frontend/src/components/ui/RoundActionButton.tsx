"use client"

import React from "react"
import RoundButton from "./RoundButton"

export type RoundActionButtonProps = {
  onClick?: () => void | Promise<void>
  title?: string
  ariaLabel?: string
  bgClass?: string
  hoverBgClass?: string
  border?: boolean
  ring?: boolean
  ringClass?: string
  icon?: React.ReactNode
  disabled?: boolean
  className?: string
}

/**
 * Wrapper para RoundButton com interface compatível com o código antigo
 */
export default function RoundActionButton({
  onClick,
  title,
  ariaLabel,
  bgClass = "bg-primary",
  hoverBgClass = "hover:bg-primary/90",
  border = false,
  ring = false,
  ringClass = "",
  icon,
  disabled,
  className = "",
}: RoundActionButtonProps) {
  // Extrai cor do bgClass (Tailwind)
  const extractColor = (bgClass: string): string => {
    // Mapeamento básico de cores Tailwind
    const colorMap: Record<string, string> = {
      'bg-rose-600': '#e11d48',
      'bg-rose-500': '#f43f5e',
      'bg-emerald-600': '#059669',
      'bg-emerald-500': '#10b981',
      'bg-amber-500': '#f59e0b',
      'bg-amber-400': '#fbbf24',
      'bg-red-600': '#dc2626',
      'bg-red-500': '#ef4444',
      'bg-primary': '#3b82f6',
      'bg-white': '#ffffff',
    }
    
    return colorMap[bgClass] || '#3b82f6'
  }

  const extractHoverColor = (hoverClass: string): string => {
    const colorMap: Record<string, string> = {
      'hover:bg-rose-500': '#f43f5e',
      'hover:bg-rose-400': '#fb7185',
      'hover:bg-emerald-500': '#10b981',
      'hover:bg-emerald-400': '#34d399',
      'hover:bg-amber-400': '#fbbf24',
      'hover:bg-amber-300': '#fcd34d',
      'hover:bg-red-500': '#ef4444',
      'hover:bg-red-400': '#f87171',
      'hover:bg-primary/90': '#60a5fa',
    }
    
    return colorMap[hoverClass] || '#60a5fa'
  }

  const bgColor = extractColor(bgClass)
  const hoverBgColor = extractHoverColor(hoverBgClass)

  return (
    <RoundButton
      onClick={onClick as any}
      tooltip={title}
      ariaLabel={ariaLabel}
      bgColor={bgColor}
      hoverBgColor={hoverBgColor}
      withBorder={border}
      icon={icon}
      disabled={disabled}
      className={`${ring ? 'ring-2' : ''} ${ringClass} ${className}`}
      size={68}
      iconClassName="w-6 h-6"
    />
  )
}
