"use client"
// Sidebar do Admin (código em inglês; textos em português)
import { useParams, useRouter } from 'next/navigation'
import React from 'react'
import { Briefcase, Building2, Clock, MapPin, Settings, Users } from 'lucide-react'

export default function AdminSidebar({ collapsed }: { collapsed: boolean }) {
  const router = useRouter()
  const params = useParams<{ company?: string }>()
  const company = String(params?.company || '')

  const labelClass = collapsed ? 'hidden' : 'inline'
  const itemClass = collapsed ? 'justify-center gap-0' : 'justify-start gap-3'
  const iconSize = collapsed ? 'h-5 w-5' : 'h-4 w-4'

  const base = company ? `/admin/${encodeURIComponent(company)}` : '/admin'
  const items = [
    { label: 'Funcionários', icon: Users, href: `${base}` },
    { label: 'Cargos', icon: Briefcase, href: `${base}/cargos` },
    { label: 'Departamentos', icon: Building2, href: `${base}/departamentos` },
    { label: 'Terminal de Ponto', icon: Clock, href: `${base}/terminal` },
    { label: 'Cercas geográficas', icon: MapPin, href: `${base}/geofences` },
    { label: 'Config. da Empresa', icon: Settings, href: `${base}/configuracoes` },
  ]

  return (
    <aside className={`h-full w-full bg-card shadow-sm flex flex-col`}>
      <nav className="flex-1 overflow-auto py-2">
        {items.map(({ label, icon: Icon, href }) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={`w-full flex items-center px-3 py-2 text-sm hover:bg-accent relative ${itemClass}`}
          >
            <Icon className={`${iconSize}`} />
            <span className={`${labelClass}`}>{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
