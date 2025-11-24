'use client'

import { useState, useEffect } from 'react'
import { Bell, AlertTriangle, Clock, BedDouble, ClockAlert } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'

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

interface AlertsSummary {
  total: number
  high: number
  medium: number
  low: number
  byType: Record<string, number>
}

export default function AlertsDropdown() {
  const params = useParams()
  const router = useRouter()
  const company = params?.company as string
  
  const [isOpen, setIsOpen] = useState(false)
  const [summary, setSummary] = useState<AlertsSummary | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(false)

  // Buscar resumo de alertas (para badge)
  useEffect(() => {
    if (!company) return

    const fetchSummary = async () => {
      try {
        const token = localStorage.getItem('token')
        const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        
        const res = await fetch(`${api}/api/alerts/summary?companyId=${company}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        
        if (res.ok) {
          const data = await res.json()
          setSummary(data)
        }
      } catch (error) {
        console.error('Erro ao buscar resumo de alertas:', error)
      }
    }

    fetchSummary()
    const interval = setInterval(fetchSummary, 30000) // Atualiza a cada 30s
    return () => clearInterval(interval)
  }, [company])

  // Buscar alertas detalhados quando abrir dropdown
  useEffect(() => {
    if (!isOpen || !company) return

    const fetchAlerts = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem('token')
        const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        
        const res = await fetch(`${api}/api/alerts?companyId=${company}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        
        if (res.ok) {
          const data = await res.json()
          setAlerts(data.slice(0, 10)) // Mostrar apenas 10 mais recentes
        }
      } catch (error) {
        console.error('Erro ao buscar alertas:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
  }, [isOpen, company])

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'OVERTIME_EXCEEDS':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'LATE':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'REST_VIOLATION':
        return <BedDouble className="h-4 w-4 text-red-500" />
      case 'OVERTIME_PENDING':
        return <ClockAlert className="h-4 w-4 text-blue-500" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      case 'MEDIUM':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      case 'LOW':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      default:
        return 'bg-muted'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Agora'
    if (diffMins < 60) return `${diffMins}min atrás`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h atrás`
    return `${Math.floor(diffMins / 1440)}d atrás`
  }

  const handleViewAll = () => {
    setIsOpen(false)
    router.push(`/admin/${company}/alertas`)
  }

  const totalAlerts = summary?.high || 0

  return (
    <div className="relative">
      {/* Botão do sino */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-muted/50 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {totalAlerts > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {totalAlerts > 9 ? '9+' : totalAlerts}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Overlay para fechar ao clicar fora */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Conteúdo do dropdown */}
          <div className="absolute right-0 mt-2 w-96 bg-background border border-border rounded-lg shadow-lg z-50">
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Alertas</h3>
                {summary && (
                  <div className="flex gap-2 text-xs">
                    {summary.high > 0 && (
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                        {summary.high} críticos
                      </span>
                    )}
                    {summary.medium > 0 && (
                      <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded">
                        {summary.medium} médios
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Lista de alertas */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">
                  Carregando...
                </div>
              ) : alerts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum alerta</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 border-b border-border hover:bg-muted/50 cursor-pointer transition-colors ${getSeverityColor(alert.severity)}`}
                    onClick={() => {
                      setIsOpen(false)
                      router.push(`/admin/${company}/alertas?id=${alert.timeEntryId}`)
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getAlertIcon(alert.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {alert.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTimestamp(alert.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {alerts.length > 0 && (
              <div className="p-3 border-t border-border">
                <button
                  onClick={handleViewAll}
                  className="w-full text-sm text-primary hover:underline"
                >
                  Ver todos os alertas
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
