'use client'

import * as React from 'react'
import { useState } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================
// Componentes estilo shadcn/ui (Radix UI)
// ============================================

const RadixTabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

// ============================================
// Componente Tabs customizado (legado)
// ============================================

// Tipos para o componente de Tabs
export interface TabItem {
  id: string
  label: string
  icon?: React.ReactNode
  content: React.ReactNode
}

export interface TabsProps {
  tabs: TabItem[]
  defaultTab?: string
  onClose?: () => void
  showCloseButton?: boolean
  className?: string
  /** Padding interno do conteúdo das tabs. Default: 'p-4' (16px). Use 'p-6' para 24px, 'p-3' para 12px, etc. */
  contentPadding?: string
}

/**
 * Componente de Tabs reutilizável (legado)
 * Baseado no estilo CSS puro com animação de scale
 * Suporta tema dark/light automaticamente
 */
export function LegacyTabs({
  tabs,
  defaultTab,
  onClose,
  showCloseButton = true,
  className = '',
  contentPadding = 'p-4',
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '')

  if (!tabs.length) return null

  return (
    <div className={`tabs-container relative ${className}`}>
      {/* Header das tabs */}
      <div className="tabs-header flex flex-wrap gap-1 mb-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              tabs-label relative inline-flex items-center gap-2 px-4 py-3
              rounded-t-lg transition-all duration-100 ease-in-out
              text-sm font-medium border
              ${activeTab === tab.id
                ? 'bg-card text-primary z-10 rounded-b-none border-border border-b-card -mb-[1px]'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted/80 opacity-80 hover:opacity-100 border-transparent'
              }
            `}
          >
            {tab.icon && (
              <span className="tabs-icon text-base">
                {tab.icon}
              </span>
            )}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Conteúdo das tabs - com borda ao redor */}
      <div className="tabs-content relative bg-card rounded-lg rounded-tl-none border border-border shadow-sm overflow-hidden">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`
              tabs-panel ${contentPadding} transition-all duration-300 ease-in-out
              ${activeTab === tab.id
                ? 'opacity-100 scale-100 relative'
                : 'opacity-0 scale-95 absolute inset-0 pointer-events-none'
              }
            `}
          >
            {tab.content}
          </div>
        ))}

        {/* Botão de fechar - na parte de baixo, centralizado */}
        {showCloseButton && onClose && (
          <div className="tabs-close-container flex justify-center py-4 border-t border-border">
            <button
              onClick={onClose}
              className="
                tabs-close-button
                w-10 h-10 rounded-full
                bg-muted hover:bg-muted/80
                border border-border
                flex items-center justify-center
                transition-all duration-200
                hover:scale-110 active:scale-95
                text-muted-foreground hover:text-foreground
                shadow-sm
              "
              aria-label="Fechar painel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default LegacyTabs
export { RadixTabs as Tabs, TabsList, TabsTrigger, TabsContent }
