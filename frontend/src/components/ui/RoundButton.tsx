"use client"

import React from "react"
import { cn } from "@/lib/utils"

export type RoundButtonProps = {
  // Cor do conteúdo (ícone) e, por padrão, da borda
  color?: string
  // Exibe borda circular
  withBorder?: boolean
  // Estilo e espessura da borda
  borderStyle?: 'solid' | 'dashed' | 'dotted'
  borderWidth?: number
  borderColor?: string
  // Ícone central
  icon?: React.ReactNode
  // Classe para dimensionar o ícone com Tailwind (ex.: w-7 h-7 sm:w-8 ...)
  iconClassName?: string
  // Tamanho base do botão. Se quiser controlar com Tailwind (h-*, w-*), não informe.
  size?: number | string
  // Cores de fundo
  bgColor?: string
  hoverBgColor?: string // se não passar, deriva de bgColor com opacidade
  // Acessibilidade e comportamento
  tooltip?: string
  ariaLabel?: string
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  disabled?: boolean
  className?: string
}

/**
 * Botão redondo reutilizável controlável por Tailwind.
 * - Se você passar classes de tamanho (h-*, w-*), o componente usa aspect-square e não aplica width/height inline.
 * - Se não passar tamanho por classes, usa `size` (default 68px).
 * - Cor de fundo e hover configuráveis; se hover não for informado, derivamos do bgColor com opacidade.
 */
export default function RoundButton({
  color = "#3C83F6",
  withBorder = false,
  borderStyle = 'solid',
  borderWidth = 4,
  borderColor,
  icon,
  iconClassName,
  size = 68,
  bgColor = "#FFFFFF",
  hoverBgColor,
  tooltip,
  ariaLabel,
  onClick,
  disabled,
  className = "",
}: RoundButtonProps): JSX.Element {
  // Detecta se o usuário quer controlar tamanho via classes Tailwind
  const hasSizeClass = /(^|\s)(h-|w-|min-h-|min-w-|max-h-|max-w)/.test(className)

  const diameter = typeof size === "number" ? `${size}px` : size

  // Quando o tamanho é controlado por classes Tailwind, extraímos um tamanho base (não responsivo)
  // do padrão com colchetes px (ex.: h-[80px] / w-[80px]) para estabilizar a primeira pintura.
  const extractBasePx = (cls?: string) => {
    if (!cls) return undefined
    const h = cls.match(/(^|\s)h-\[(\d+(?:\.\d+)?)px\]/)
    const w = cls.match(/(^|\s)w-\[(\d+(?:\.\d+)?)px\]/)
    const hPx = h ? parseFloat(h[2]) : undefined
    const wPx = w ? parseFloat(w[2]) : undefined
    return {
      hPx,
      wPx,
    }
  }

  const baseBtn = hasSizeClass ? extractBasePx(className) : undefined
  const baseIcon = extractBasePx(iconClassName)

  // Mapeia alguns tamanhos comuns do Tailwind (em rem) para px, para estabilizar a primeira pintura
  // Referência (default Tailwind): 1=0.25rem(4px), 2=8px, 3=12px, 4=16px, 5=20px, 6=24px, 8=32px, 10=40px, 12=48px, 16=64px
  const scaleToPx: Record<string, number> = {
    "1": 4, "2": 8, "3": 12, "4": 16, "5": 20, "6": 24, "7": 28, "8": 32, "9": 36, "10": 40, "11": 44, "12": 48, "14": 56, "16": 64, "20": 80, "24": 96, "28": 112, "32": 128,
  }
  const extractScalePx = (cls?: string) => {
    if (!cls) return undefined
    const h = cls.match(/(^|\s)h-(\d{1,2})(\s|$)/)
    const w = cls.match(/(^|\s)w-(\d{1,2})(\s|$)/)
    const hPx = h && scaleToPx[h[2]] ? scaleToPx[h[2]] : undefined
    const wPx = w && scaleToPx[w[2]] ? scaleToPx[w[2]] : undefined
    return { hPx, wPx }
  }
  const baseIconScale = extractScalePx(iconClassName)

  // Define borda
  const finalBorderColor = borderColor || color
  const border = withBorder ? `${borderWidth}px ${borderStyle} ${finalBorderColor}` : 'none'

  // Deriva hover a partir do bgColor se não informado (opacidade perceptível)
  const deriveHover = (c: string): string => {
    // Se vier em hex #RRGGBB, converte para rgba com alpha 0.9; caso contrário, usa a mesma cor
    const hex = c.trim()
    const m = /^#?([a-fA-F0-9]{6})$/.exec(hex)
    if (!m) return c
    const int = parseInt(m[1], 16)
    const r = (int >> 16) & 255
    const g = (int >> 8) & 255
    const b = int & 255
    // opacidade mais perceptível para diferenciar do bg
    return `rgba(${r}, ${g}, ${b}, 0.75)`
  }
  const finalHoverBg = hoverBgColor || deriveHover(bgColor)

  // Classe única para aplicar hover por CSS, sem depender de tokens globais
  const uid = React.useId().replace(/[:]/g, "")
  const uniqueClass = `rb-${uid}`

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel || tooltip}
        title={tooltip}
        className={cn(
          uniqueClass,
          "group inline-flex items-center justify-center rounded-full",
          // Cor do texto/ícone vem de `color`
          className,
          hasSizeClass ? "aspect-square" : ""
        )}
        style={hasSizeClass ? {
          // tamanho controlado por classes (primeira pintura estabilizada com minWidth/minHeight)
          border,
          color,
          backgroundColor: bgColor,
          minWidth: baseBtn?.wPx ? `${baseBtn.wPx}px` : baseBtn?.hPx ? `${baseBtn.hPx}px` : undefined,
          minHeight: baseBtn?.hPx ? `${baseBtn.hPx}px` : baseBtn?.wPx ? `${baseBtn.wPx}px` : undefined,
        } : {
          // tamanho via prop size
          width: diameter,
          height: diameter,
          border,
          color,
          backgroundColor: bgColor,
        }}
      >
        {/* Wrapper que controla o tamanho do ÍCONE via Tailwind (w-/h- por breakpoint) */}
        <span
          className={cn("inline-flex items-center justify-center", iconClassName)}
          style={{
            // Estabiliza primeira pintura para o ícone
            minWidth: (baseIcon?.wPx ?? baseIconScale?.wPx ?? (baseIcon?.hPx ?? baseIconScale?.hPx)) ? `${(baseIcon?.wPx ?? baseIconScale?.wPx ?? (baseIcon?.hPx ?? baseIconScale?.hPx))}px` : undefined,
            minHeight: (baseIcon?.hPx ?? baseIconScale?.hPx ?? (baseIcon?.wPx ?? baseIconScale?.wPx)) ? `${(baseIcon?.hPx ?? baseIconScale?.hPx ?? (baseIcon?.wPx ?? baseIconScale?.wPx))}px` : undefined,
          }}
        >
          {/* rb-icon-wrap ocupa 100% do wrapper externo para o SVG herdar corretamente */}
          <span className="rb-icon-wrap inline-flex w-full h-full">
            {React.isValidElement(icon)
              ? React.cloneElement(icon as React.ReactElement<any>, {
                  width: "100%",
                  height: "100%",
                  style: { display: "block", ...(icon as any)?.props?.style },
                })
              : icon}
          </span>
        </span>
      </button>

      <style jsx>{`
        .${uniqueClass} { background-color: ${bgColor}; }
        .${uniqueClass}:not(:disabled):hover { background-color: ${finalHoverBg} !important; }
        .${uniqueClass}:disabled { opacity: 0.6; cursor: not-allowed; }
        /* O SVG sempre ocupa 100% do espaço do wrapper do ícone */
        .${uniqueClass} .rb-icon-wrap :global(svg) { width: 100% !important; height: 100% !important; display: block; }
      `}</style>
    </>
  )
}
