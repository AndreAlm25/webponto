"use client"
import React from 'react'
import Link from 'next/link'

// Componente reutilizável de botão de ação
// - Ícone sempre 20px (w-5 h-5)
// - Label sempre UPPERCASE
// - Suporte a href (Link) ou onClick
// - Pode ter borda on/off e cor de borda custom
// - Suporte a tooltip simples via title
// OBS: Comentários em português conforme padrão do projeto

export type ActionButtonProps = {
  label: string
  icon: React.ReactNode
  href?: string
  onClick?: () => void
  bgColor?: string // ex: '#FFB800' ou classe Tailwind bg-*
  textColor?: string // ex: '#000' ou classe Tailwind text-*
  border?: boolean
  borderColor?: string // ex: '#000' ou classe Tailwind border-*
  tooltip?: string
  className?: string
  hoverClass?: string // ex: 'hover:bg-zinc-100'
}

export function ActionButton({
  label,
  icon,
  href,
  onClick,
  bgColor,
  textColor,
  border = false,
  borderColor,
  tooltip,
  className = '',
  hoverClass = 'hover:opacity-90', // Hover padrão suave
}: ActionButtonProps) {
  // Monta estilos inline mínimos para permitir cores hex além de classes
  const style: React.CSSProperties = {}
  if (bgColor && !bgColor.startsWith('bg-')) style.backgroundColor = bgColor
  if (textColor && !textColor.startsWith('text-')) style.color = textColor
  const borderClasses = border ? 'border-2' : 'border'
  const borderStyle: React.CSSProperties = {}
  const borderClassName = borderColor?.startsWith('border-') ? borderColor : ''
  if (border && borderColor && !borderColor.startsWith('border-')) borderStyle.borderColor = borderColor

  const content = (
    <span
      className={`w-full inline-flex items-center justify-center gap-2 rounded-md p-[15px] text-sm font-black uppercase ${
        border ? borderClasses : ''
      } ${className}`.trim()}
      style={{ ...style, ...borderStyle }}
    >
      <span className="shrink-0 w-5 h-5 inline-flex items-center justify-center">{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  )

  if (href) {
    return (
      <Link href={href} title={tooltip} aria-label={tooltip} className={`w-full rounded-md ${hoverClass}`.trim()}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} title={tooltip} aria-label={tooltip} className={`w-full rounded-md transition-colors ${hoverClass}`.trim()}>
      {content}
    </button>
  )
}
