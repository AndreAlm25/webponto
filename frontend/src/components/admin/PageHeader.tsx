"use client"
import React from 'react'
import Breadcrumb from './Breadcrumb'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

interface PageHeaderProps {
  title: string
  description?: string
  icon?: React.ReactNode
  breadcrumbs: BreadcrumbItem[]
}

export default function PageHeader({ title, description, icon, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbs} />
      
      {/* Título com ícone */}
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
    </div>
  )
}
