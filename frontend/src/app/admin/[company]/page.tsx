"use client"
// Código em INGLÊS; textos da UI em PORTUGUÊS
import React, { useEffect, useState } from 'react'
import { notFound } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Users, Camera, Clock, Bell, MapPin, TrendingUp, AlertCircle, CheckCircle2, ClockArrowUp, ClockArrowDown, LayoutDashboard } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useCompanySlug } from '@/hooks/useCompanySlug'
import { SlugMismatchError } from '@/components/admin/SlugMismatchError'
import PageHeader from '@/components/admin/PageHeader'

export default function CompanyAdminSlugPage({ params }: { params: { company: string } }) {
  const { user } = useAuth()
  const { company } = params
  const [recentEntries, setRecentEntries] = useState<any[]>([])
  const [loadingEntries, setLoadingEntries] = useState(true)
  
  // Log detalhado do slug da URL
  useEffect(() => {
    console.log('🏠 [Dashboard] Página carregada')
    console.log('🏠 [Dashboard] Slug da URL (params.company):', company)
    console.log('🏠 [Dashboard] window.location.pathname:', window.location.pathname)
    console.log('🏠 [Dashboard] window.location.href:', window.location.href)
  }, [company])
  
  // Hook que valida slug
  const { companyId, companySlug, slugMismatch, loading } = useCompanySlug()
  
  useEffect(() => {
    console.log('🏠 [Dashboard] Hook useCompanySlug retornou:')
    console.log('   - companyId:', companyId)
    console.log('   - companySlug:', companySlug)
    console.log('   - slugMismatch:', slugMismatch)
    console.log('   - loading:', loading)
  }, [companyId, companySlug, slugMismatch, loading])
  
  if (!company) notFound()
  
  // Exibe erro se slug não corresponde
  if (slugMismatch) {
    return <SlugMismatchError urlSlug={company} correctSlug={companySlug} currentPath={`/admin/${company}`} />
  }

  // Buscar registros recentes
  useEffect(() => {
    const fetchRecentEntries = async () => {
      if (!companyId) return
      
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/time-entries?companyId=${companyId}&limit=5`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        
        if (response.ok) {
          const data = await response.json()
          setRecentEntries(data.slice(0, 5))
        }
      } catch (error) {
        console.error('Erro ao buscar registros:', error)
      } finally {
        setLoadingEntries(false)
      }
    }
    
    fetchRecentEntries()
  }, [companyId])

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral do sistema</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cards principais - 2 colunas */}
        <div className="lg:col-span-2 space-y-6">
          {/* Grid de 6 cards (3x2) */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard 
              title="Total Funcionários" 
              icon={<Users className="h-5 w-5" />} 
              value="—" 
              subtitle="Ativos" 
              color="blue"
            />
            <StatCard 
              title="Registros Hoje" 
              icon={<Clock className="h-5 w-5" />} 
              value="—" 
              subtitle="Últimas 24h" 
              color="green"
            />
            <StatCard 
              title="Com Reconhecimento" 
              icon={<Camera className="h-5 w-5" />} 
              value="—" 
              subtitle="Facial ativo" 
              color="purple"
            />
            <StatCard 
              title="Ponto Remoto" 
              icon={<MapPin className="h-5 w-5" />} 
              value={(user as any)?.company?.allowRemoteClockIn ? 'Ativo' : 'Inativo'} 
              subtitle="Configuração" 
              color="orange"
            />
            <StatCard 
              title="Hora Extra" 
              icon={<TrendingUp className="h-5 w-5" />} 
              value="—" 
              subtitle="Pendentes" 
              color="yellow"
            />
            <StatCard 
              title="Alertas" 
              icon={<AlertCircle className="h-5 w-5" />} 
              value="—" 
              subtitle="Requer atenção" 
              color="red"
            />
          </section>
        </div>

        {/* Sidebar direita: registros recentes */}
        <div className="space-y-4">
          <div className="border border-border rounded-lg bg-card">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Registros Recentes
              </h3>
              <p className="text-sm text-muted-foreground">Últimos registros de ponto</p>
            </div>
            <div className="p-4 space-y-3">
              {loadingEntries ? (
                <EmptyText>Carregando...</EmptyText>
              ) : recentEntries.length === 0 ? (
                <EmptyText>Sem registros</EmptyText>
              ) : (
                recentEntries.map((entry: any) => (
                  <div key={entry.id} className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5">
                      {entry.type === 'CLOCK_IN' && <ClockArrowUp className="h-4 w-4 text-green-500" />}
                      {entry.type === 'CLOCK_OUT' && <ClockArrowDown className="h-4 w-4 text-red-500" />}
                      {entry.type === 'BREAK_START' && <Clock className="h-4 w-4 text-yellow-500" />}
                      {entry.type === 'BREAK_END' && <Clock className="h-4 w-4 text-blue-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{entry.employee?.name || 'Funcionário'}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.type === 'CLOCK_IN' && 'Entrada'}
                        {entry.type === 'CLOCK_OUT' && 'Saída'}
                        {entry.type === 'BREAK_START' && 'Início intervalo'}
                        {entry.type === 'BREAK_END' && 'Fim intervalo'}
                        {' • '}
                        {new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border border-border rounded-lg bg-card">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notificações
              </h3>
              <p className="text-sm text-muted-foreground">Últimas atualizações</p>
            </div>
            <div className="p-4 space-y-3">
              <EmptyText>Nenhuma notificação</EmptyText>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function StatCard({ title, value, subtitle, icon, color = 'blue' }: { 
  title: string; 
  value: string; 
  subtitle?: string; 
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'yellow' | 'red'
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    purple: 'bg-purple-500/10 text-purple-500',
    orange: 'bg-orange-500/10 text-orange-500',
    yellow: 'bg-yellow-500/10 text-yellow-500',
    red: 'bg-red-500/10 text-red-500',
  }
  
  return (
    <div className="border border-border rounded-lg bg-card hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
        <p className="text-2xl font-bold leading-tight mb-1">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  )
}


function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground text-center py-6">{children}</p>
}

