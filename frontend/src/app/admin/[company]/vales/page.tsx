"use client"
// Código em INGLÊS; textos da UI em PORTUGUÊS
import React, { useEffect, useState, useCallback } from 'react'
import { notFound, useRouter } from 'next/navigation'
import { useCompanySlug } from '@/hooks/useCompanySlug'
import { SlugMismatchError } from '@/components/admin/SlugMismatchError'
import PageHeader from '@/components/admin/PageHeader'
import PageContainer from '@/components/admin/PageContainer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { PERMISSIONS, Can } from '@/hooks/usePermissions'
import { ProtectedPage } from '@/components/auth/ProtectedPage'
import {
  Wallet,
  CreditCard,
  Search,
  Filter,
  Check,
  X,
  Clock,
  AlertTriangle,
  DollarSign,
  Users,
  Calendar,
  Plus,
  RefreshCw,
  ChevronDown,
  Ban,
  CheckCircle,
  XCircle,
  Banknote,
} from 'lucide-react'

// Tipos
interface Advance {
  id: string
  employeeId: string
  type: 'SALARY_ADVANCE' | 'EXTRA_ADVANCE'
  amount: number
  percentage: number | null
  referenceMonth: number
  referenceYear: number
  requestDate: string
  paymentDate: string | null
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'DISCOUNTED' | 'REJECTED'
  reason: string | null
  approvedAt: string | null
  rejectedReason: string | null
  employeeName: string
  employeePosition: string
}

interface AdvanceStats {
  pending: number
  approved: number
  paid: number
  rejected: number
}

interface AdvanceAlert {
  employeeId: string
  employeeName: string
  totalAdvances: number
  salary: number
  percentage: number
}

interface Employee {
  id: string
  user: { name: string } | null
  position: { name: string } | null
  baseSalary: number
}

// Labels de status
const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <Clock className="h-4 w-4" /> },
  APPROVED: { label: 'Aprovado', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: <CheckCircle className="h-4 w-4" /> },
  PAID: { label: 'Pago', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: <Banknote className="h-4 w-4" /> },
  DISCOUNTED: { label: 'Descontado', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: <Check className="h-4 w-4" /> },
  REJECTED: { label: 'Rejeitado', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle className="h-4 w-4" /> },
}

// Labels de tipo
const TYPE_LABELS: Record<string, { label: string; description: string }> = {
  SALARY_ADVANCE: { label: 'Adiantamento Salarial', description: '% automático do salário' },
  EXTRA_ADVANCE: { label: 'Vale Avulso', description: 'Valor fixo sob demanda' },
}

// Meses
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export default function AdvancesPage({ params }: { params: { company: string } }) {
  const { company } = params
  const { companyId, companySlug, slugMismatch, loading } = useCompanySlug()
  
  // Estado
  const [advances, setAdvances] = useState<Advance[]>([])
  const [stats, setStats] = useState<AdvanceStats | null>(null)
  const [alerts, setAlerts] = useState<AdvanceAlert[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Filtros
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1)
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear())
  const [searchTerm, setSearchTerm] = useState('')
  
  // Modal de novo vale
  const [showNewModal, setShowNewModal] = useState(false)
  const [newAdvance, setNewAdvance] = useState({
    employeeId: '',
    type: 'EXTRA_ADVANCE' as 'SALARY_ADVANCE' | 'EXTRA_ADVANCE',
    amount: 0,
    reason: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  
  // Modal de rejeição
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectingAdvance, setRejectingAdvance] = useState<Advance | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  
  if (!company) notFound()
  
  if (slugMismatch) {
    return <SlugMismatchError urlSlug={company} correctSlug={companySlug} currentPath={`/admin/${company}/vales`} />
  }

  const base = company ? `/admin/${encodeURIComponent(company)}` : '/admin'

  // Buscar dados
  const fetchData = useCallback(async () => {
    if (!companyId) return
    
    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      
      // Buscar adiantamentos, estatísticas e funcionários
      const [advancesRes, statsRes, employeesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payroll/advances?companyId=${companyId}&month=${filterMonth}&year=${filterYear}${filterStatus ? `&status=${filterStatus}` : ''}${filterType ? `&type=${filterType}` : ''}`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payroll/advances/stats?companyId=${companyId}`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/employees?companyId=${companyId}`, { headers }),
      ])
      
      if (advancesRes.ok) {
        const data = await advancesRes.json()
        setAdvances(data.advances || [])
      }
      
      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data.stats || null)
        setAlerts(data.alerts || [])
      }
      
      if (employeesRes.ok) {
        const data = await employeesRes.json()
        setEmployees(data.employees || [])
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setIsLoading(false)
    }
  }, [companyId, filterMonth, filterYear, filterStatus, filterType])

  useEffect(() => {
    if (companyId) {
      fetchData()
    }
  }, [companyId, fetchData])

  // Filtrar por busca
  const filteredAdvances = advances.filter(a => 
    a.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Criar novo vale
  const handleCreateAdvance = async () => {
    if (!newAdvance.employeeId || newAdvance.amount <= 0) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    
    setIsSaving(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payroll/advances?companyId=${companyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newAdvance,
          referenceMonth: filterMonth,
          referenceYear: filterYear,
        }),
      })
      
      const data = await res.json()
      
      if (res.ok) {
        toast.success(data.message || 'Vale criado com sucesso')
        setShowNewModal(false)
        setNewAdvance({ employeeId: '', type: 'EXTRA_ADVANCE', amount: 0, reason: '' })
        fetchData()
      } else {
        toast.error(data.message || 'Erro ao criar vale')
      }
    } catch (error) {
      toast.error('Erro ao criar vale')
    } finally {
      setIsSaving(false)
    }
  }

  // Aprovar vale
  const handleApprove = async (advance: Advance) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payroll/advances/${advance.id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (res.ok) {
        toast.success('Vale aprovado com sucesso')
        fetchData()
      } else {
        toast.error('Erro ao aprovar vale')
      }
    } catch (error) {
      toast.error('Erro ao aprovar vale')
    }
  }

  // Rejeitar vale
  const handleReject = async () => {
    if (!rejectingAdvance) return
    
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payroll/advances/${rejectingAdvance.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectReason }),
      })
      
      if (res.ok) {
        toast.success('Vale rejeitado')
        setShowRejectModal(false)
        setRejectingAdvance(null)
        setRejectReason('')
        fetchData()
      } else {
        toast.error('Erro ao rejeitar vale')
      }
    } catch (error) {
      toast.error('Erro ao rejeitar vale')
    }
  }

  // Marcar como pago
  const handleMarkAsPaid = async (advance: Advance) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payroll/advances/${advance.id}/pay`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (res.ok) {
        toast.success('Vale marcado como pago')
        fetchData()
      } else {
        toast.error('Erro ao marcar como pago')
      }
    } catch (error) {
      toast.error('Erro ao marcar como pago')
    }
  }

  // Cancelar vale
  const handleCancel = async (advance: Advance) => {
    if (!confirm('Tem certeza que deseja cancelar este vale?')) return
    
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payroll/advances/${advance.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (res.ok) {
        toast.success('Vale cancelado')
        fetchData()
      } else {
        toast.error('Erro ao cancelar vale')
      }
    } catch (error) {
      toast.error('Erro ao cancelar vale')
    }
  }

  // Formatar valor
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  // Formatar data
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR')
  }

  return (
    <ProtectedPage permission={PERMISSIONS.ADVANCES_VIEW} redirectTo={`/admin/${company}`}>
      {(loading || isLoading) ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
      <PageContainer>
        <PageHeader
          title="Gestão de Vales"
          description="Gerencie adiantamentos e vales dos funcionários"
          icon={<Wallet className="h-6 w-6" />}
          breadcrumbs={[
            { label: 'Admin', href: base },
            { label: 'G. de Colaboradores' },
            { label: 'Vales' },
          ]}
        />

      <div className="mt-6">
        {/* Cards de estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.pending || 0}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.approved || 0}</p>
                <p className="text-sm text-muted-foreground">Aprovados</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Banknote className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.paid || 0}</p>
                <p className="text-sm text-muted-foreground">Pagos (mês)</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.rejected || 0}</p>
                <p className="text-sm text-muted-foreground">Rejeitados</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alertas */}
        {alerts.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Alertas de Limite</h3>
            </div>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.employeeId} className="flex items-center justify-between text-sm">
                  <span className="text-yellow-700 dark:text-yellow-300">
                    <strong>{alert.employeeName}</strong> já utilizou {alert.percentage}% do salário em vales ({formatCurrency(alert.totalAdvances)} de {formatCurrency(alert.salary)})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filtros e ações */}
        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Busca */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por funcionário ou motivo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Filtro de mês/ano */}
            <div className="flex gap-2">
              <select
                className="px-3 py-2 border border-border rounded-md bg-background text-sm"
                value={filterMonth}
                onChange={(e) => setFilterMonth(parseInt(e.target.value))}
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                className="px-3 py-2 border border-border rounded-md bg-background text-sm"
                value={filterYear}
                onChange={(e) => setFilterYear(parseInt(e.target.value))}
              >
                {[2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            
            {/* Filtro de status */}
            <select
              className="px-3 py-2 border border-border rounded-md bg-background text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Todos os status</option>
              <option value="PENDING">Pendentes</option>
              <option value="APPROVED">Aprovados</option>
              <option value="PAID">Pagos</option>
              <option value="DISCOUNTED">Descontados</option>
              <option value="REJECTED">Rejeitados</option>
            </select>
            
            {/* Filtro de tipo */}
            <select
              className="px-3 py-2 border border-border rounded-md bg-background text-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">Todos os tipos</option>
              <option value="SALARY_ADVANCE">Adiantamento Salarial</option>
              <option value="EXTRA_ADVANCE">Vale Avulso</option>
            </select>
            
            {/* Botões */}
            <Button variant="outline" size="icon" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Can permission={PERMISSIONS.ADVANCES_CREATE}>
              <Button onClick={() => setShowNewModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Vale
              </Button>
            </Can>
          </div>
        </div>

        {/* Lista de vales */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Funcionário</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Tipo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Valor</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Referência</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Solicitação</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAdvances.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum vale encontrado para o período selecionado
                    </td>
                  </tr>
                ) : (
                  filteredAdvances.map((advance) => (
                    <tr key={advance.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{advance.employeeName}</p>
                          <p className="text-sm text-muted-foreground">{advance.employeePosition}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {advance.type === 'SALARY_ADVANCE' ? (
                            <Wallet className="h-4 w-4 text-blue-500" />
                          ) : (
                            <CreditCard className="h-4 w-4 text-green-500" />
                          )}
                          <div>
                            <p className="text-sm">{TYPE_LABELS[advance.type]?.label}</p>
                            {advance.reason && (
                              <p className="text-xs text-muted-foreground truncate max-w-[150px]" title={advance.reason}>
                                {advance.reason}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{formatCurrency(advance.amount)}</p>
                        {advance.percentage && (
                          <p className="text-xs text-muted-foreground">{advance.percentage}% do salário</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {MONTHS[advance.referenceMonth - 1]}/{advance.referenceYear}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatDate(advance.requestDate)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[advance.status]?.color}`}>
                          {STATUS_LABELS[advance.status]?.icon}
                          {STATUS_LABELS[advance.status]?.label}
                        </span>
                        {advance.rejectedReason && (
                          <p className="text-xs text-red-500 mt-1" title={advance.rejectedReason}>
                            Motivo: {advance.rejectedReason.substring(0, 30)}...
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {advance.status === 'PENDING' && (
                            <>
                              <Can permission={PERMISSIONS.ADVANCES_APPROVE}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleApprove(advance)}
                                  title="Aprovar"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              </Can>
                              <Can permission={PERMISSIONS.ADVANCES_REJECT}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    setRejectingAdvance(advance)
                                    setShowRejectModal(true)
                                  }}
                                  title="Rejeitar"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </Can>
                            </>
                          )}
                          {advance.status === 'APPROVED' && (
                            <Can permission={PERMISSIONS.ADVANCES_PAY}>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => handleMarkAsPaid(advance)}
                                title="Marcar como pago"
                              >
                                <Banknote className="h-4 w-4" />
                              </Button>
                            </Can>
                          )}
                          {['PENDING', 'APPROVED'].includes(advance.status) && (
                            <Can permission={PERMISSIONS.ADVANCES_DELETE}>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                                onClick={() => handleCancel(advance)}
                                title="Cancelar"
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            </Can>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* Modal de novo vale */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-md">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Novo Vale</h2>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <Label>Funcionário *</Label>
                <select
                  className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background"
                  value={newAdvance.employeeId}
                  onChange={(e) => setNewAdvance({ ...newAdvance, employeeId: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.user?.name || 'Sem nome'} - {emp.position?.name || 'Sem cargo'}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label>Tipo</Label>
                <select
                  className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background"
                  value={newAdvance.type}
                  onChange={(e) => setNewAdvance({ ...newAdvance, type: e.target.value as any })}
                >
                  <option value="EXTRA_ADVANCE">Vale Avulso (valor fixo)</option>
                  <option value="SALARY_ADVANCE">Adiantamento Salarial (% do salário)</option>
                </select>
              </div>
              
              <div>
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={newAdvance.amount}
                  onChange={(e) => setNewAdvance({ ...newAdvance, amount: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label>Motivo</Label>
                <Input
                  value={newAdvance.reason}
                  onChange={(e) => setNewAdvance({ ...newAdvance, reason: e.target.value })}
                  placeholder="Ex: Emergência médica"
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-border flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateAdvance} disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Criar Vale'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de rejeição */}
      {showRejectModal && rejectingAdvance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-md">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Rejeitar Vale</h2>
            </div>
            
            <div className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Você está rejeitando o vale de <strong>{rejectingAdvance.employeeName}</strong> no valor de <strong>{formatCurrency(rejectingAdvance.amount)}</strong>.
              </p>
              
              <div>
                <Label>Motivo da rejeição</Label>
                <Input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ex: Limite excedido"
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-border flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowRejectModal(false)
                setRejectingAdvance(null)
                setRejectReason('')
              }}>
                Cancelar
              </Button>
              <Button variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950" onClick={handleReject}>
                Rejeitar
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
      </PageContainer>
      )}
    </ProtectedPage>
  )
}
