"use client"
import React, { useMemo } from 'react'
import Breadcrumb from './Breadcrumb'
import { usePermissions, PERMISSIONS } from '@/hooks/usePermissions'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
  permission?: string // Permissão necessária para mostrar o link
}

interface PageHeaderProps {
  title: string
  description?: string
  icon?: React.ReactNode
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
}

export default function PageHeader({ title, description, icon, breadcrumbs, actions }: PageHeaderProps) {
  const { hasPermission } = usePermissions()

  // Filtrar breadcrumbs baseado em permissões
  const filteredBreadcrumbs = useMemo(() => {
    if (!breadcrumbs) return undefined
    
    return breadcrumbs.map(item => {
      // Se tem permissão definida e não tem a permissão, remover o link
      if (item.permission && !hasPermission(item.permission)) {
        return {
          ...item,
          href: undefined // Remove o link mas mantém o texto
        }
      }
      return item
    })
  }, [breadcrumbs, hasPermission])

  return (
    <div className="mb-6">
      {/* Breadcrumb */}
      {filteredBreadcrumbs && <Breadcrumb items={filteredBreadcrumbs} />}
      
      {/* Título com ícone */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            {description && <p className="text-muted-foreground">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
