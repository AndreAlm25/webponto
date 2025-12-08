"use client"
import React, { useEffect, useState } from 'react'
import { notFound, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { ThemeToggle } from '@/components/theme-toggle'
import UserProfileMenu from '@/components/admin/UserProfileMenu'
import AdminSidebar from '@/components/admin/AdminSidebar'
import MessagesDropdown from '@/components/admin/MessagesDropdown'
import AlertsDropdown from '@/components/admin/AlertsDropdown'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getFileUrl } from '@/utils/files'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export default function CompanyAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { company: string }
}) {
  const { user } = useAuth()
  const { company } = params
  const pathname = usePathname()

  // TODOS OS HOOKS DEVEM VIR ANTES DE QUALQUER RETORNO CONDICIONAL
  
  // Estado do sidebar com persistência no localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed')
      return saved === 'true'
    }
    return false
  })
  
  // Salva estado do sidebar no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed))
  }, [sidebarCollapsed])

  // Se for rota do terminal de ponto, renderiza sem layout de admin (fullscreen)
  const isTerminal = pathname?.includes('/terminal-de-ponto')
  
  const companyName = decodeURIComponent(company)
  const sidebarWidth = sidebarCollapsed ? '64px' : '250px'

  // Se for terminal de ponto, renderiza apenas o children (fullscreen, sem layout)
  if (isTerminal) {
    return (
      <ProtectedRoute requireAuth={true}>
        {children}
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requireAuth={true}>
      <div
        className="h-screen overflow-hidden bg-background text-foreground grid relative"
        style={{
          gridTemplateColumns: `${sidebarWidth} 1fr`,
          gridTemplateRows: '80px 1fr',
          gridTemplateAreas: '"brand header" "sidebar main"',
        }}
      >
      <button
        type="button"
        aria-label="Alternar menu"
        onClick={() => setSidebarCollapsed(v => !v)}
        className="absolute z-50 -translate-x-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-full border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
        style={{ left: sidebarWidth, top: 'calc(80px + (100vh - 80px) / 2)' }}
      >
        {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <div
        style={{ gridArea: 'brand' }}
        className="flex items-center gap-3 pl-4 pr-3 border-b border-r border-border bg-background"
      >
        {(() => {
          const raw = (user as any)?.company?.logoUrl || (user as any)?.company?.logo || (user as any)?.company?.imageUrl
          const name = (user as any)?.company?.tradeName || (user as any)?.company?.name || companyName
          const src = typeof raw === 'string' && raw.length > 0 ? (/^https?:\/\//i.test(raw) ? raw : getFileUrl(raw)) : ''
          return (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {src ? <img src={src} alt={name} className="h-8 w-8 rounded-full object-cover" /> : <div className="h-8 w-8 rounded-full bg-muted" />}
              {!sidebarCollapsed && <p className="truncate font-medium">{name}</p>}
            </>
          )
        })()}
      </div>

      <div style={{ gridArea: 'header' }} className="sticky top-0 z-40 bg-background border-b border-border shadow-sm">
        <div className="relative h-20 flex items-center justify-end px-4">
          <div className="flex items-center gap-2 ml-auto">
            <ThemeToggle className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors" />
            
            {/* Dropdown de Mensagens */}
            <MessagesDropdown />
            
            {/* Dropdown de Alertas */}
            <AlertsDropdown />
            
            <UserProfileMenu onEditProfile={() => { /* TODO: abrir página de perfil */ }} />
          </div>
        </div>
      </div>

      <div style={{ gridArea: 'sidebar' }} className="bg-card border-r border-border overflow-hidden">
        <AdminSidebar collapsed={sidebarCollapsed} />
      </div>

      <main style={{ gridArea: 'main' }} className="px-6 py-6 overflow-auto min-h-0 admin-main">
        {children}
      </main>
    </div>
    </ProtectedRoute>
  )
}
