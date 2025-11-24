'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import PageHeader from '@/components/admin/PageHeader'
import { Bell, AlertTriangle, Clock, BedDouble, ClockAlert, Filter } from 'lucide-react'

interface Alert {
  id: string
  type: 'OVERTIME_EXCEEDS' | 'LATE' | 'REST_VIOLATION' | 'OVERTIME_PENDING'
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  employeeId: string
  employeeName: string
  timeEntryId: string
  timestamp: string
  message: string
  details: any
}

export default function AlertsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const company = params?.company as string
  const highlightId = searchParams?.get('id')

  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('ALL')
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL')

  useEffect(() => {
    if (!company) return

    const fetchAlerts = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem('token')
        const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

        let url = `${api}/api/alerts?companyId=${company}`
        if (filterType !== 'ALL') url += `&type=${filterType}`
        if (filterSeverity !== 'ALL') url += `&severity=${filterSeverity}`

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          const data = await res.json()
          setAlerts(data)
        }
      } catch (error) {
        console.error('Erro ao buscar alertas:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
  }, [company, filterType, filterSeverity])

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'OVERTIME_EXCEEDS':
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      case 'LATE':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'REST_VIOLATION':
        return <BedDouble className="h-5 w-5 text-red-500" />
      case 'OVERTIME_PENDING':
        return <ClockAlert className="h-5 w-5 text-blue-500" />
      default:
        return <Bell className="h-5 w-5" />
    }
  }

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'OVERTIME_EXCEEDS':
        return 'Hora Extra Excedida'
      case 'LATE':
        return 'Atraso'
      case 'REST_VIOLATION':
        return 'Violação de Descanso'
      case 'OVERTIME_PENDING':
        return 'Hora Extra Pendente'
      default:
        return type
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return <span className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">Crítico</span>
      case 'MEDIUM':
        return <span className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded">Médio</span>
      case 'LOW':
        return <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">Baixo</span>
      default:
        return null
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getAlertDetails = (alert: Alert) => {
    switch (alert.type) {
      case 'OVERTIME_EXCEEDS':
        return `Excedeu ${alert.details.exceedMinutes}min do limite de ${Math.floor(alert.details.limitMinutes / 60)}h ${alert.details.limitMinutes % 60}min`
      case 'LATE':
        return `Atraso de ${alert.details.lateMinutes}min (tolerância: ${alert.details.tolerance}min)`
      case 'REST_VIOLATION':
        return `Apenas ${alert.details.restHours.toFixed(1)}h de descanso (mínimo: ${alert.details.minRestHours}h)`
      case 'OVERTIME_PENDING':
        return `${Math.floor(alert.details.overtimeMinutes / 60)}h ${alert.details.overtimeMinutes % 60}min pendentes de aprovação`
      default:
        return ''
    }
  }

  const stats = {
    total: alerts.length,
    high: alerts.filter(a => a.severity === 'HIGH').length,
    medium: alerts.filter(a => a.severity === 'MEDIUM').length,
    low: alerts.filter(a => a.severity === 'LOW').length,
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Alertas"
        description="Monitore violações e pendências"
        icon={<Bell className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Admin', href: `/admin/${company}` },
          { label: 'Alertas' },
        ]}
      />

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-background border border-border rounded-lg">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">Críticos</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.high}</p>
        </div>
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">Médios</p>
          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.medium}</p>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">Baixos</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.low}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 p-4 bg-background border border-border rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4" />
          <span className="font-semibold">Filtros</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Tipo</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="ALL">Todos</option>
              <option value="OVERTIME_EXCEEDS">Hora Extra Excedida</option>
              <option value="LATE">Atraso</option>
              <option value="REST_VIOLATION">Violação de Descanso</option>
              <option value="OVERTIME_PENDING">Hora Extra Pendente</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Severidade</label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="ALL">Todas</option>
              <option value="HIGH">Crítico</option>
              <option value="MEDIUM">Médio</option>
              <option value="LOW">Baixo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de alertas */}
      <div className="bg-background border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">
            Carregando alertas...
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Bell className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum alerta encontrado</p>
            <p className="text-sm mt-2">Tudo está funcionando perfeitamente! 🎉</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 hover:bg-muted/50 transition-colors ${
                  highlightId === alert.timeEntryId ? 'bg-primary/10' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{alert.employeeName}</span>
                      {getSeverityBadge(alert.severity)}
                      <span className="text-xs px-2 py-1 bg-muted rounded">
                        {getAlertTypeLabel(alert.type)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {getAlertDetails(alert)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimestamp(alert.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
