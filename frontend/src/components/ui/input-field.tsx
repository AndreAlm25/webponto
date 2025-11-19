"use client"
// Componente de Input padronizado (código em inglês; textos em português nos consumidores)
// - Label opcional
// - Placeholder opcional
// - Foco: borda azul muito fina, sem deslocar layout (ring inset)
// - Altura/padding confortáveis
// - Cores configuráveis via props e/ou className

import React from 'react'

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export type InputFieldProps = {
  label?: string
  showLabel?: boolean
  placeholder?: string
  showPlaceholder?: boolean
  value: string
  onChange: (value: string) => void
  name?: string
  id?: string
  type?: React.HTMLInputTypeAttribute
  disabled?: boolean
  required?: boolean
  autoComplete?: string
  className?: string // classes aplicadas no wrapper
  inputClassName?: string // classes adicionais aplicadas diretamente no input
  labelClassName?: string
}

export function InputField({
  label,
  showLabel = true,
  placeholder,
  showPlaceholder = true,
  value,
  onChange,
  name,
  id,
  type = 'text',
  disabled,
  required,
  autoComplete,
  className,
  inputClassName,
  labelClassName,
}: InputFieldProps) {
  const inputId = id || name || undefined
  const ph = showPlaceholder ? placeholder : undefined

  return (
    <div className={cx('w-full', className)}>
      {showLabel && label ? (
        <label htmlFor={inputId} className={cx('mb-1 block text-sm font-medium', labelClassName)}>
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        name={name}
        type={type}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        placeholder={ph}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cx(
          // Base
          'block w-full rounded border bg-background text-foreground',
          // Tamanho/espaçamento
          'px-3 py-2.5 text-sm',
          // Borda e estados
          'border-input outline-none transition-colors',
          // Foco: borda azul fina + glow interno sutil, sem mudar largura
          'focus:border-primary-600 focus:ring-1 focus:ring-inset focus:ring-primary-500/40',
          // Placeholder discreto
          'placeholder:text-muted-foreground/70',
          // Disabled
          'disabled:opacity-50 disabled:cursor-not-allowed',
          inputClassName,
        )}
      />
    </div>
  )
}

export default InputField
