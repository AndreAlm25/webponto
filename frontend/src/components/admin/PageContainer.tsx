"use client"
import React from 'react'

interface PageContainerProps {
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '7xl' | 'full'
  className?: string
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
}

export default function PageContainer({ 
  children, 
  maxWidth = 'full',
  className = ''
}: PageContainerProps) {
  return (
    <div className={`p-2 md:p-2 ${maxWidthClasses[maxWidth]} ${className}`}>
      {children}
    </div>
  )
}
