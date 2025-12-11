"use client"
// Página de gerenciamento de hora extra
import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ClockAlert, Check, X, Users, Calendar, Filter, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useCompanySlug } from '@/hooks/useCompanySlug'
import { SlugMismatchError } from '@/components/admin/SlugMismatchError'
import PageHeader from '@/components/admin/PageHeader'
import { useParams } from 'next/navigation'
import { ProtectedPage } from '@/components/auth/ProtectedPage'
import { PERMISSIONS, Can } from '@/hooks/usePermissions'

interface OvertimeEntry {
  id: string
  timestamp: string
  type: string
  overtimeMinutes: number
  overtimeType: 'BEFORE' | 'AFTER' | 'HOLIDAY'
  overtimeStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  overtimeNotes?: string
  employee: {
    id: string
    registrationId: string
    user: {
      name: string
      avatarUrl?: string
    }
  }
}

interface Stats {
  pending: number
  approved: number
  rejected: number
  total: number
}

export default function OvertimePage() {
  const params = useParams<{ company: string }>()
  const { company } = params
  const { companyId, loading } = useCompanySlug()
  
  const [entries, setEntries] = useState<OvertimeEntry[]>([])
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0, total: 0 })
  const [loadingData, setLoadingData] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<string>('PENDING')
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all')
  const [employees, setEmployees] = useState<any[]>([])
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  const api = process.env.NEXT_PUBLIC_API_URL
  const base = `/admin/${company}`

  useEffect(() => {
    if (companyId) {
      loadData()
      loadEmployees()
    }
  }, [companyId, selectedStatus, selectedEmployee])

  const loadData = async () => {
    try {
      setLoadingData(true)
      const token = localStorage.getItem('token')
      
      // Buscar estatísticas
      const statsRes = await fetch(`${api}/api/overtime/stats?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      // Buscar entradas
      let url = `${api}/api/overtime?companyId=${companyId}`
      if (selectedStatus !== 'all') url += `&status=${selectedStatus}`
      if (selectedEmployee !== 'all') url += `&employeeId=${selectedEmployee}`

      const entriesRes = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (entriesRes.ok) {
        const entriesData = await entriesRes.json()
        setEntries(entriesData)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoadingData(false)
    }
  }

  const loadEmployees = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${api}/api/employees?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setEmployees(data)
      }
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      setProcessingIds(prev => new Set(prev).add(id))
      const token = localStorage.getItem('token')
      const res = await fetch(`${api}/api/overtime/${id}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.ok) {
        toast.success('Hora extra aprovada!')
        loadData()
      } else {
        toast.error('Erro ao aprovar hora extra')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao aprovar hora extra')
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  const handleReject = async (id: string) => {
    try {
      setProcessingIds(prev => new Set(prev).add(id))
      const token = localStorage.getItem('token')
      const res = await fetch(`${api}/api/overtime/${id}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.ok) {
        toast.success('Hora extra rejeitada!')
        loadData()
      } else {
        toast.error('Erro ao rejeitar hora extra')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao rejeitar hora extra')
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}min`
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      BEFORE: 'Antes do expediente',
      AFTER: 'Depois do expediente',
      HOLIDAY: 'Feriado/DSR',
    }
    return labels[type] || type
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-500/10 text-yellow-500',
      APPROVED: 'bg-green-500/10 text-green-500',
      REJECTED: 'bg-red-500/10 text-red-500',
    }
    return colors[status] || ''
  }

  if (loading) {
    return <div className="p-6">Carregando...</div>
  }

  return (
    <ProtectedPage permission={PERMISSIONS.OVERTIME_VIEW}>
      <PageHeader
        title="Hora Extra"
        description="Gerencie as horas extras dos funcionários"
        icon={<ClockAlert className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Admin', href: base },
          { label: 'Análises' },
          { label: 'Hora Extra' }
        ]}
      />

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500/10 text-yellow-500">
              <ClockAlert className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Aprovadas</p>
              <p className="text-2xl font-bold">{stats.approved}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10 text-green-500">
              <Check className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Rejeitadas</p>
              <p className="text-2xl font-bold">{stats.rejected}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 text-red-500">
              <X className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="PENDING">Pendentes</SelectItem>
                <SelectItem value="APPROVED">Aprovadas</SelectItem>
                <SelectItem value="REJECTED">Rejeitadas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Funcionário</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.user?.name || emp.registrationId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button variant="outline" className="w-full" onClick={loadData}>
              <Filter className="h-4 w-4 mr-2" />
              Filtrar
            </Button>
          </div>
        </div>
      </Card>

      {/* Lista de Horas Extras */}
      <Card>
        <div className="p-4 border-b">
          <h3 className="font-semibold">Registros de Hora Extra</h3>
        </div>
        <div className="divide-y">
          {loadingData ? (
            <div className="p-8 text-center text-muted-foreground">
              Carregando...
            </div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhuma hora extra encontrada
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {entry.employee.user.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(entry.timestamp)} • {getTypeLabel(entry.overtimeType)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatMinutes(entry.overtimeMinutes)}</p>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(entry.overtimeStatus)}`}>
                        {entry.overtimeStatus === 'PENDING' && 'Pendente'}
                        {entry.overtimeStatus === 'APPROVED' && 'Aprovada'}
                        {entry.overtimeStatus === 'REJECTED' && 'Rejeitada'}
                      </span>
                    </div>
                  </div>
                  {entry.overtimeStatus === 'PENDING' && (
                    <div className="flex gap-2 ml-4">
                      {/* Aprovar - requer overtime.approve */}
                      <Can permission={PERMISSIONS.OVERTIME_APPROVE}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:bg-green-50"
                          onClick={() => handleApprove(entry.id)}
                          disabled={processingIds.has(entry.id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Aprovar
                        </Button>
                      </Can>
                      {/* Rejeitar - requer overtime.reject */}
                      <Can permission={PERMISSIONS.OVERTIME_REJECT}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleReject(entry.id)}
                          disabled={processingIds.has(entry.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Rejeitar
                        </Button>
                      </Can>
                    </div>
                  )}
                </div>
                {entry.overtimeNotes && (
                  <div className="mt-2 text-sm text-muted-foreground pl-14">
                    <strong>Observações:</strong> {entry.overtimeNotes}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </ProtectedPage>
  )
}
