"use client"
// Código em INGLÊS; textos da UI em PORTUGUÊS
import React, { useEffect, useState } from 'react'
import { notFound, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions, PERMISSIONS } from '@/hooks/usePermissions'
import { Users, Camera, Clock, MapPin, TrendingUp, AlertCircle, CheckCircle2, ClockArrowUp, ClockArrowDown, LayoutDashboard, UserRound } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useCompanySlug } from '@/hooks/useCompanySlug'
import { SlugMismatchError } from '@/components/admin/SlugMismatchError'
import PageHeader from '@/components/admin/PageHeader'
import Image from 'next/image'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { ProtectedPage } from '@/components/auth/ProtectedPage'

// Helper para construir URL completa do avatar
const getAvatarUrl = (avatarUrl: string | null | undefined): string | null => {
  if (!avatarUrl) return null
  
  // Se já é uma URL completa, retorna como está
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl
  }
  
  // Constrói URL completa usando a API do backend
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
  return `${apiUrl}/api/files/avatars/${avatarUrl}`
}

export default function CompanyAdminSlugPage({ params }: { params: { company: string } }) {
  const router = useRouter()
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const { company } = params
  
  // Removido: agora usa ProtectedPage para redirecionamento inteligente
  const [recentEntries, setRecentEntries] = useState<any[]>([])
  const [loadingEntries, setLoadingEntries] = useState(true)
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    todayEntries: 0,
    facialRecognitionEnabled: 0,
    pendingOvertime: 0,
    alerts: 0,
  })
  const [loadingStats, setLoadingStats] = useState(true)
  const [dashboardConfig, setDashboardConfig] = useState({
    showRecentEntries: true,
    recentEntriesLimit: 10,
  })
  const { onTimeEntryCreated, onTimeEntryUpdated, onTimeEntryDeleted, onDashboardConfigUpdated } = useWebSocket()
  
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

  // Buscar estatísticas
  const fetchStats = async () => {
      if (!companyId) {
        console.log('📊 [Stats] companyId não disponível ainda')
        return
      }
      
      console.log('📊 [Stats] Iniciando busca de estatísticas para companyId:', companyId)
      
      try {
        const token = localStorage.getItem('token')
        
        // Buscar funcionários
        console.log('📊 [Stats] Buscando funcionários...')
        const employeesRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/employees?companyId=${companyId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        
        console.log('📊 [Stats] Response funcionários:', employeesRes.status)
        
        if (employeesRes.ok) {
          const employeesData = await employeesRes.json()
          console.log('📊 [Stats] Dados funcionários:', employeesData)
          
          const employees = Array.isArray(employeesData?.employees) ? employeesData.employees : (Array.isArray(employeesData) ? employeesData : [])
          console.log('📊 [Stats] Funcionários processados:', employees.length)
          
          const total = employees.length
          const active = employees.filter((e: any) => e.status === 'ACTIVE' || e.active).length
          const withFacial = employees.filter((e: any) => e.allowFacialRecognition).length
          
          console.log('📊 [Stats] Total:', total, 'Ativos:', active, 'Com facial:', withFacial)
          
          setStats(prev => ({
            ...prev,
            totalEmployees: total,
            activeEmployees: active,
            facialRecognitionEnabled: withFacial,
          }))
        }
        
        // Buscar registros de hoje (usar data local, não UTC)
        const today = new Date()
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
        
        console.log('📊 [Stats] Buscando registros de hoje...')
        console.log('📊 [Stats] Data hoje (local):', todayStr)
        
        const entriesUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/time-entries?companyId=${companyId}&startDate=${todayStr}&endDate=${todayStr}`
        console.log('📊 [Stats] URL:', entriesUrl)
        
        const entriesRes = await fetch(entriesUrl, { headers: { Authorization: `Bearer ${token}` } })
        
        console.log('📊 [Stats] Response registros:', entriesRes.status)
        
        if (entriesRes.ok) {
          const entriesData = await entriesRes.json()
          console.log('📊 [Stats] Dados registros:', entriesData)
          
          const entries = Array.isArray(entriesData) ? entriesData : []
          console.log('📊 [Stats] Total de registros hoje:', entries.length)
          
          setStats(prev => ({ ...prev, todayEntries: entries.length }))
        } else {
          console.error('📊 [Stats] Erro ao buscar registros:', await entriesRes.text())
        }
        
      } catch (error) {
        console.error('📊 [Stats] Erro ao buscar estatísticas:', error)
      } finally {
        setLoadingStats(false)
      }
    }
  
  useEffect(() => {
    fetchStats()
  }, [companyId])

  // Buscar registros recentes
  const fetchRecentEntries = async () => {
    if (!companyId) {
      console.log('📋 [Recentes] companyId não disponível ainda')
      return
    }
    
    console.log('📋 [Recentes] Buscando registros recentes para companyId:', companyId)
    
    try {
      const token = localStorage.getItem('token')
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/time-entries?companyId=${companyId}&limit=${dashboardConfig.recentEntriesLimit}`
      console.log('📋 [Recentes] URL:', url)
      
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      
      console.log('📋 [Recentes] Response:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📋 [Recentes] Dados recebidos:', data)
        console.log('📋 [Recentes] Total de registros:', Array.isArray(data) ? data.length : 0)
        
        const entries = Array.isArray(data) ? data.slice(0, dashboardConfig.recentEntriesLimit) : []
        console.log('📋 [Recentes] Registros a exibir:', entries.length)
        
        // Log detalhado de cada registro
        entries.forEach((entry, index) => {
          console.log(`📋 [Recentes] Registro ${index + 1}:`, {
            id: entry.id,
            type: entry.type,
            userName: entry.employee?.user?.name,
            avatarUrl: entry.employee?.user?.avatarUrl,
            employee: entry.employee
          })
        })
        
        setRecentEntries(entries)
      } else {
        console.error('📋 [Recentes] Erro ao buscar:', await response.text())
      }
    } catch (error) {
      console.error('📋 [Recentes] Erro ao buscar registros:', error)
    } finally {
      setLoadingEntries(false)
    }
  }
  
  // Carregar configurações do dashboard
  useEffect(() => {
    if (!companyId) return

    const fetchDashboardConfig = async () => {
      try {
        const token = localStorage.getItem('token')
        const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
        const res = await fetch(`${api}/api/dashboard-config?companyId=${companyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          const data = await res.json()
          setDashboardConfig({
            showRecentEntries: data.dashboardShowRecentEntries,
            recentEntriesLimit: data.dashboardRecentEntriesLimit,
          })
        }
      } catch (error) {
        console.error('Erro ao carregar configurações do dashboard:', error)
      }
    }

    fetchDashboardConfig()
  }, [companyId])

  useEffect(() => {
    if (dashboardConfig.showRecentEntries) {
      fetchRecentEntries()
    }
  }, [companyId, dashboardConfig.showRecentEntries, dashboardConfig.recentEntriesLimit])

  // WebSocket para atualização em tempo real usando context global
  useEffect(() => {
    if (!companyId) return

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔌 [WebSocket Dashboard] Registrando listeners...')
    console.log('🔌 [WebSocket Dashboard] CompanyId:', companyId)

    // Registrar listener para novos registros
    const unsubscribeCreated = onTimeEntryCreated((timeEntry: any) => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🆕 [WebSocket Dashboard] EVENTO RECEBIDO: time-entry-created')
      console.log('🆕 [WebSocket Dashboard] Dados completos:', JSON.stringify(timeEntry, null, 2))
      console.log('🆕 [WebSocket Dashboard] timeEntry.id:', timeEntry.id)
      console.log('🆕 [WebSocket Dashboard] timeEntry.type:', timeEntry.type)
      console.log('🆕 [WebSocket Dashboard] timeEntry.employee?.user:', timeEntry.employee?.user)
      console.log('🆕 [WebSocket Dashboard] Avatar:', timeEntry.employee?.user?.avatarUrl)
      console.log('🆕 [WebSocket Dashboard] Nome:', timeEntry.employee?.user?.name)
      
      // Atualizar lista de registros recentes
      setRecentEntries(prev => {
        const updated = [timeEntry, ...prev].slice(0, dashboardConfig.recentEntriesLimit)
        console.log('🆕 [WebSocket Dashboard] Lista atualizada! Total:', updated.length)
        return updated
      })
      
      // Atualizar estatísticas
      fetchStats()
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    })

    // Registrar listener para registros atualizados
    const unsubscribeUpdated = onTimeEntryUpdated((timeEntry: any) => {
      console.log('🔄 [WebSocket Dashboard] Registro atualizado:', timeEntry.id)
      setRecentEntries(prev => 
        prev.map(entry => entry.id === timeEntry.id ? timeEntry : entry)
      )
    })

    // Registrar listener para registros deletados
    const unsubscribeDeleted = onTimeEntryDeleted((data: { id: string }) => {
      console.log('🗑️ [WebSocket Dashboard] Registro deletado:', data.id)
      setRecentEntries(prev => prev.filter(entry => entry.id !== data.id))
      fetchStats()
    })

    // Registrar listener para configurações do dashboard atualizadas
    const unsubscribeConfig = onDashboardConfigUpdated((config: any) => {
      console.log('⚙️ [WebSocket Dashboard] Configuração atualizada:', config)
      setDashboardConfig({
        showRecentEntries: config.dashboardShowRecentEntries,
        recentEntriesLimit: config.dashboardRecentEntriesLimit,
      })
      // Se mudou o limite, recarregar registros
      if (config.dashboardRecentEntriesLimit !== dashboardConfig.recentEntriesLimit) {
        fetchRecentEntries()
      }
    })

    console.log('✅ [WebSocket Dashboard] Listeners registrados com sucesso!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Cleanup: remover listeners ao desmontar
    return () => {
      console.log('🔌 [WebSocket Dashboard] Removendo listeners...')
      unsubscribeCreated()
      unsubscribeUpdated()
      unsubscribeDeleted()
      unsubscribeConfig()
    }
  }, [companyId, onTimeEntryCreated, onTimeEntryUpdated, onTimeEntryDeleted, onDashboardConfigUpdated, dashboardConfig.recentEntriesLimit])

  return (
    <ProtectedPage permission={PERMISSIONS.DASHBOARD_VIEW}>
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

      <div className={`grid grid-cols-1 gap-6 ${dashboardConfig.showRecentEntries ? 'lg:grid-cols-3' : ''}`}>
        {/* Cards principais - 2 colunas */}
        <div className={`space-y-6 ${dashboardConfig.showRecentEntries ? 'lg:col-span-2' : ''}`}>
          {/* Grid de 6 cards (3x2) */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard 
              title="Total Funcionários" 
              icon={<Users className="h-5 w-5" />} 
              value={loadingStats ? '—' : stats.totalEmployees.toString()} 
              subtitle={`${stats.activeEmployees} Ativos`}
              color="blue"
            />
            <StatCard 
              title="Registros Hoje" 
              icon={<Clock className="h-5 w-5" />} 
              value={loadingStats ? '—' : stats.todayEntries.toString()} 
              subtitle="Últimas 24h" 
              color="green"
            />
            <StatCard 
              title="Com Reconhecimento" 
              icon={<Camera className="h-5 w-5" />} 
              value={loadingStats ? '—' : stats.facialRecognitionEnabled.toString()} 
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
              value={loadingStats ? '—' : stats.pendingOvertime.toString()} 
              subtitle="Pendentes" 
              color="yellow"
            />
            <StatCard 
              title="Alertas" 
              icon={<AlertCircle className="h-5 w-5" />} 
              value={loadingStats ? '—' : stats.alerts.toString()} 
              subtitle="Requer atenção" 
              color="red"
            />
          </section>
        </div>

        {/* Sidebar direita: registros recentes */}
        {dashboardConfig.showRecentEntries && (
          <div className="space-y-4">
            <div className="border border-border rounded-lg bg-card">
              <div className="p-4 border-b border-border">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <UserRound className="h-6 w-6" />
                  Registros recentes
                </h3>
                <p className="text-sm text-muted-foreground">
                  Últimos {dashboardConfig.recentEntriesLimit} registros de pontos
                </p>
              </div>
            <div className="p-4 space-y-3">
              {loadingEntries ? (
                <EmptyText>Carregando...</EmptyText>
              ) : recentEntries.length === 0 ? (
                <EmptyText>Sem registros</EmptyText>
              ) : (
                <>
                  {recentEntries.map((entry: any) => {
                    const rawAvatarUrl = entry.employee?.user?.avatarUrl
                    const avatarUrl = getAvatarUrl(rawAvatarUrl)
                    const userName = entry.employee?.user?.name || 'Nome funcionário'
                    
                    console.log('👤 [Avatar] Entry:', {
                      id: entry.id,
                      userName,
                      rawAvatarUrl,
                      avatarUrl,
                      employee: entry.employee,
                      user: entry.employee?.user
                    })
                    
                    return (
                    <div key={entry.id} className="space-y-1.5 pb-3 border-b border-border last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        {avatarUrl ? (
                          <Image
                            src={avatarUrl}
                            alt={userName}
                            width={16}
                            height={16}
                            className="rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <UserRound className="h-3 w-3" />
                          </div>
                        )}
                        <p className="font-medium text-sm truncate">{userName}</p>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {entry.type === 'CLOCK_IN' && (
                            <>
                              <ClockArrowUp className="h-4 w-4 text-green-600 flex-shrink-0" />
                              <span className="text-green-600 text-xs font-medium uppercase whitespace-nowrap">Entrada</span>
                            </>
                          )}
                          {entry.type === 'CLOCK_OUT' && (
                            <>
                              <ClockArrowDown className="h-4 w-4 text-red-600 flex-shrink-0" />
                              <span className="text-red-600 text-xs font-medium uppercase whitespace-nowrap">Saída</span>
                            </>
                          )}
                          {entry.type === 'BREAK_START' && (
                            <>
                              <Clock className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                              <span className="text-yellow-600 text-xs font-medium uppercase whitespace-nowrap">Início intervalo</span>
                            </>
                          )}
                          {entry.type === 'BREAK_END' && (
                            <>
                              <Clock className="h-4 w-4 text-orange-600 flex-shrink-0" />
                              <span className="text-orange-600 text-xs font-medium uppercase whitespace-nowrap">Volta intervalo</span>
                            </>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                          {new Date(entry.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          {' - '}
                          {new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  )})}
                  <div className="pt-2">
                    <a 
                      href={`/admin/${company}/analises/registros`}
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                    >
                      Ver todos os registros →
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </ProtectedPage>
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
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    green: 'bg-green-500/10 text-green-600 dark:text-green-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    yellow: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    red: 'bg-red-500/10 text-red-600 dark:text-red-400',
  }
  
  return (
    <div className="border border-border rounded-lg bg-card hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className={`p-2 rounded-lg ${colorClasses[color]} [&>svg]:w-5 [&>svg]:h-5`}>
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

