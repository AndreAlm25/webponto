"use client"
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Clock, ClockArrowUp, ClockArrowDown, UserRound, Calendar, Filter, TrendingUp } from 'lucide-react'
import { useCompanySlug } from '@/hooks/useCompanySlug'
import { SlugMismatchError } from '@/components/admin/SlugMismatchError'
import Image from 'next/image'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { ProtectedPage } from '@/components/auth/ProtectedPage'
import { PERMISSIONS } from '@/hooks/usePermissions'

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

export default function RegistrosPage() {
  const params = useParams<{ company: string }>()
  const { company } = params
  const { companyId, companySlug, slugMismatch } = useCompanySlug()
  
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  // Usar data local, não UTC
const getLocalDateString = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString())
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all')
  const [employees, setEmployees] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalToday: 0,
    clockIn: 0,
    clockOut: 0,
    breaks: 0,
  })
  const { onTimeEntryCreated, onTimeEntryUpdated, onTimeEntryDeleted } = useWebSocket()

  // Validar slug
  if (slugMismatch) {
    return <SlugMismatchError urlSlug={company} correctSlug={companySlug} currentPath={`/admin/${company}/analises/registros`} />
  }

  // Buscar funcionários
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!companyId) return
      
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/employees?companyId=${companyId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        
        if (response.ok) {
          const data = await response.json()
          const emps = Array.isArray(data?.employees) ? data.employees : (Array.isArray(data) ? data : [])
          setEmployees(emps)
        }
      } catch (error) {
        console.error('Erro ao buscar funcionários:', error)
      }
    }
    
    fetchEmployees()
  }, [companyId])

  // Buscar registros
  const fetchEntries = async () => {
      if (!companyId) return
      
      setLoading(true)
      try {
        const token = localStorage.getItem('token')
        let url = `${process.env.NEXT_PUBLIC_API_URL}/api/time-entries?companyId=${companyId}`
        
        if (selectedDate) {
          const date = new Date(selectedDate)
          date.setHours(0, 0, 0, 0)
          url += `&startDate=${date.toISOString()}`
        }
        
        if (selectedEmployee !== 'all') {
          url += `&employeeId=${selectedEmployee}`
        }
        
        const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        
        if (response.ok) {
          const data = await response.json()
          const entriesData = Array.isArray(data) ? data : []
          setEntries(entriesData)
          
          // Calcular estatísticas
          const total = entriesData.length
          const clockInCount = entriesData.filter((e: any) => e.type === 'CLOCK_IN').length
          const clockOutCount = entriesData.filter((e: any) => e.type === 'CLOCK_OUT').length
          const breaksCount = entriesData.filter((e: any) => e.type === 'BREAK_START' || e.type === 'BREAK_END').length
          
          setStats({
            totalToday: total,
            clockIn: clockInCount,
            clockOut: clockOutCount,
            breaks: breaksCount,
          })
        }
      } catch (error) {
        console.error('Erro ao buscar registros:', error)
      } finally {
        setLoading(false)
      }
    }
  
  useEffect(() => {
    fetchEntries()
  }, [companyId, selectedDate, selectedEmployee])

  // WebSocket para atualização automática usando context global
  useEffect(() => {
    if (!companyId) return

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔌 [WebSocket Registros] Registrando listeners...')
    console.log('🔌 [WebSocket Registros] CompanyId:', companyId)

    // Registrar listener para novos registros
    const unsubscribeCreated = onTimeEntryCreated((timeEntry: any) => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🆕 [WebSocket Registros] EVENTO RECEBIDO: time-entry-created')
      console.log('🆕 [WebSocket Registros] Dados completos:', JSON.stringify(timeEntry, null, 2))
      console.log('🆕 [WebSocket Registros] timeEntry.id:', timeEntry.id)
      console.log('🆕 [WebSocket Registros] timeEntry.type:', timeEntry.type)
      console.log('🆕 [WebSocket Registros] timeEntry.employee?.user:', timeEntry.employee?.user)
      console.log('🆕 [WebSocket Registros] Avatar:', timeEntry.employee?.user?.avatarUrl)
      console.log('🆕 [WebSocket Registros] Nome:', timeEntry.employee?.user?.name)
      
      // Verificar se o registro pertence ao filtro atual
      // Converter para data local do navegador
const entryDateObj = new Date(timeEntry.timestamp)
const entryDate = `${entryDateObj.getFullYear()}-${String(entryDateObj.getMonth() + 1).padStart(2, '0')}-${String(entryDateObj.getDate()).padStart(2, '0')}`
      const matchesDate = entryDate === selectedDate
      const matchesEmployee = selectedEmployee === 'all' || timeEntry.employeeId === selectedEmployee
      
      if (matchesDate && matchesEmployee) {
        console.log('🆕 [WebSocket Registros] Adicionando à lista (filtros OK)')
        // Adicionar direto no state (sem piscar!)
        setEntries(prev => {
          // Verificar se já existe (evitar duplicatas)
          if (prev.some(e => e.id === timeEntry.id)) {
            console.log('🆕 [WebSocket Registros] Registro já existe na lista')
            return prev
          }
          const updated = [timeEntry, ...prev]
          console.log('🆕 [WebSocket Registros] Lista atualizada! Total:', updated.length)
          return updated
        })
        
        // Atualizar estatísticas
        setStats(prev => ({
          ...prev,
          totalToday: prev.totalToday + 1,
          clockIn: timeEntry.type === 'CLOCK_IN' ? prev.clockIn + 1 : prev.clockIn,
          clockOut: timeEntry.type === 'CLOCK_OUT' ? prev.clockOut + 1 : prev.clockOut,
          breaks: timeEntry.type === 'BREAK_START' || timeEntry.type === 'BREAK_END' ? prev.breaks + 1 : prev.breaks,
        }))
      } else {
        console.log('🆕 [WebSocket Registros] Registro não corresponde aos filtros (ignorado)')
        console.log('🆕 [WebSocket Registros] entryDate:', entryDate, 'selectedDate:', selectedDate)
        console.log('🆕 [WebSocket Registros] employeeId:', timeEntry.employeeId, 'selectedEmployee:', selectedEmployee)
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    })

    // Registrar listener para registros atualizados
    const unsubscribeUpdated = onTimeEntryUpdated((timeEntry: any) => {
      console.log('🔄 [WebSocket Registros] Registro atualizado:', timeEntry.id)
      // Atualizar direto no state (sem piscar!)
      setEntries(prev => 
        prev.map(entry => entry.id === timeEntry.id ? timeEntry : entry)
      )
    })

    // Registrar listener para registros deletados
    const unsubscribeDeleted = onTimeEntryDeleted((data: { id: string }) => {
      console.log('🗑️ [WebSocket Registros] Registro deletado:', data.id)
      // Remover direto do state (sem piscar!)
      setEntries(prev => prev.filter(entry => entry.id !== data.id))
      
      // Atualizar estatísticas (decrementar)
      setStats(prev => ({
        ...prev,
        totalToday: Math.max(0, prev.totalToday - 1),
      }))
    })

    console.log('✅ [WebSocket Registros] Listeners registrados com sucesso!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Cleanup: remover listeners ao desmontar
    return () => {
      console.log('🔌 [WebSocket Registros] Removendo listeners...')
      unsubscribeCreated()
      unsubscribeUpdated()
      unsubscribeDeleted()
    }
  }, [companyId, onTimeEntryCreated, onTimeEntryUpdated, onTimeEntryDeleted])

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      CLOCK_IN: 'ENTRADA',
      CLOCK_OUT: 'SAÍDA',
      BREAK_START: 'INÍCIO DO INTERVALO',
      BREAK_END: 'VOLTA DO INTERVALO',
    }
    return labels[type] || type
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      CLOCK_IN: 'text-green-600',
      CLOCK_OUT: 'text-red-600',
      BREAK_START: 'text-yellow-600',
      BREAK_END: 'text-orange-600',
    }
    return colors[type] || 'text-gray-600'
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CLOCK_IN':
        return <ClockArrowUp className="h-5 w-5" />
      case 'CLOCK_OUT':
        return <ClockArrowDown className="h-5 w-5" />
      default:
        return <Clock className="h-5 w-5" />
    }
  }

  return (
    <ProtectedPage permission={PERMISSIONS.TIME_ENTRIES_VIEW}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <UserRound className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Registros de Pontos</h1>
          <p className="text-muted-foreground">Dashboard completo de registros</p>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total de Registros"
          value={stats.totalToday}
          icon={<TrendingUp className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="Entradas"
          value={stats.clockIn}
          icon={<ClockArrowUp className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          title="Saídas"
          value={stats.clockOut}
          icon={<ClockArrowDown className="h-5 w-5" />}
          color="red"
        />
        <StatCard
          title="Intervalos"
          value={stats.breaks}
          icon={<Clock className="h-5 w-5" />}
          color="yellow"
        />
      </div>

      {/* Filtros */}
      <div className="border border-border rounded-lg bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5" />
          <h3 className="font-semibold">Filtros</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Data
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              <UserRound className="h-4 w-4 inline mr-1" />
              Funcionário
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            >
              <option value="all">Todos os funcionários</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name || emp.user?.name || 'Sem nome'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de registros */}
      <div className="border border-border rounded-lg bg-card">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">
            {loading ? 'Carregando...' : `${entries.length} registros encontrados`}
          </h3>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Carregando registros...
            </div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum registro encontrado
            </div>
          ) : (
            entries.map((entry) => {
              const rawAvatarUrl = entry.employee?.user?.avatarUrl
              const avatarUrl = getAvatarUrl(rawAvatarUrl)
              
              console.log('👤 [Registros] Entry:', {
                id: entry.id,
                userName: entry.employee?.user?.name,
                rawAvatarUrl,
                avatarUrl,
                employee: entry.employee
              })
              
              return (<div key={entry.id} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt={entry.employee?.name || entry.employee?.user?.name || 'Funcionário'}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <UserRound className="h-6 w-6" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {entry.employee?.name || entry.employee?.user?.name || 'Funcionário'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`flex items-center gap-1 ${getTypeColor(entry.type)}`}>
                          {getTypeIcon(entry.type)}
                          <span className="font-medium text-sm uppercase">
                            {getTypeLabel(entry.type)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-sm font-medium">
                      {new Date(entry.timestamp).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )})
          )}
        </div>
      </div>
    </div>
    </ProtectedPage>
  )
}

function StatCard({ title, value, icon, color = 'blue' }: {
  title: string
  value: number
  icon?: React.ReactNode
  color?: 'blue' | 'green' | 'red' | 'yellow'
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    green: 'bg-green-500/10 text-green-600 dark:text-green-400',
    red: 'bg-red-500/10 text-red-600 dark:text-red-400',
    yellow: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
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
        <p className="text-2xl font-bold leading-tight">{value}</p>
      </div>
    </div>
  )
}
