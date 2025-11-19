"use client"
// Componente: Input de senha com botão para mostrar/ocultar
import { useState, forwardRef } from 'react'
import { Eye, EyeOff, LucideIcon } from 'lucide-react'
import { Input } from './input'
import { cn } from '@/lib/utils'

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon
  label?: string
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, icon: Icon, label, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)

    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <Input
            type={showPassword ? 'text' : 'password'}
            className={cn(
              Icon && 'pl-10',
              'pr-10',
              className
            )}
            ref={ref}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    )
  }
)

PasswordInput.displayName = 'PasswordInput'

export { PasswordInput }
