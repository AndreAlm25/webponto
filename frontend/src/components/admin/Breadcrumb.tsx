"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  const router = useRouter()
  
  return (
    <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
      {/* Home */}
      <button
        onClick={() => router.push(items[0]?.href || '/')}
        className="hover:text-foreground transition-colors uppercase"
      >
        HOME
      </button>
      
      {/* Outros itens */}
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="h-4 w-4" />
          {item.href && index < items.length - 1 ? (
            <button
              onClick={() => router.push(item.href!)}
              className="hover:text-foreground transition-colors uppercase"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-foreground font-medium uppercase">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}
