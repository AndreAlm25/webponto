'use client'

import { useState, useEffect } from 'react'
import { useCompanySlug } from '@/hooks/useCompanySlug'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { 
  Palmtree, Plus, Search, Filter, Check, X, Calendar, 
  User, Clock, AlertCircle, Eye, Trash2, ChevronDown, 
  CalendarDays, DollarSign, AlertTriangle, CheckCircle2,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogContentScrollable,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import PageHeader from '@/components/admin/PageHeader'
import { toast } from 'sonner'
import { format, addDays, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface VacationPeriod {
  id: string
  periodNumber: number
  startDate: string
  endDate: string
  days: number
  baseValue: number
  bonusValue: number
  totalValue: number
  status: string
  paidAt: string | null
}

interface Vacation {
  id: string
  employeeId: string
  employeeName: string
  positionName: string | null
  departmentName: string | null
  acquisitionStart: string
  acquisitionEnd: string
  concessionStart: string
  concessionEnd: string
  totalDays: number
  soldDays: number
  usedDays: number
  remainingDays: number
  status: string
  approverName: string | null
  approvedAt: string | null
  notes: string | null
  periods: VacationPeriod[]
  isExpired: boolean
  isExpiringSoon: boolean
  daysUntilExpiration: number
  // Campos de regularização
  regularizedAt: string | null
  regularizedBy: string | null
  regularizationType: string | null
  regularizationDate: string | null
}

interface EmployeeWithVacation {
  id: string
  registrationId: string
  name: string
  avatarUrl: string | null
  positionName: string | null
  departmentName: string | null
  hireDate: string
  baseSalary: number
  acquisitivePeriods: Array<{
    periodNumber: number
    acquisitionStart: string
    acquisitionEnd: string
    concessionStart: string
    concessionEnd: string
    isAcquired: boolean
    isExpired: boolean
    daysUntilAcquisition: number
    daysUntilExpiration: number
    hasVacation: boolean
    vacation: Vacation | null
    status: string
  }>
  pendingVacations: number
  expiredVacations: number
  totalVacationDaysAvailable: number
}

interface PeriodForm {
  startDate: string
  days: number
}

interface VacationRequest {
  id: string
  employeeId: string
  vacationId: string | null
  status: string
  requestedStartDate: string
  requestedDays: number
  requestedPeriods?: Array<{ startDate: string; days: number }>
  sellDays: number
  employeeNotes?: string
  counterProposal?: { startDate: string; days: number; periods?: Array<{ startDate: string; days: number }>; sellDays?: number }
  counterProposalNotes?: string
  counterProposalAt?: string
  counterAccepted?: boolean
  rejectionReason?: string
  cltViolations?: Array<{ code: string; message: string; severity: string }>
  createdAt: string
  employee?: { user?: { name: string } }
  vacation?: {
    id: string
    acquisitionStart: string
    acquisitionEnd: string
  }
}

export default function FeriasPage() {
  const { companyId, loading: companyLoading } = useCompanySlug()
  const { onVacationRequestCreated, onVacationRequestUpdated } = useWebSocket()

  const [vacations, setVacations] = useState<Vacation[]>([])
  const [employees, setEmployees] = useState<EmployeeWithVacation[]>([])
  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'vacations' | 'employees'>('employees')
  
  // Modal states
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showRegularizeModal, setShowRegularizeModal] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [selectedVacation, setSelectedVacation] = useState<Vacation | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithVacation | null>(null)
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState<number>(0)
  const [selectedRequest, setSelectedRequest] = useState<VacationRequest | null>(null)
  
  // Modal de rejeição
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  
  // Regularization form state
  const [regularizationType, setRegularizationType] = useState<'ENJOYED' | 'PAID_DOUBLE'>('ENJOYED')
  const [regularizationDate, setRegularizationDate] = useState('')
  const [regularizationNotes, setRegularizationNotes] = useState('')
  const [regularizationStartDate, setRegularizationStartDate] = useState('')
  const [regularizationEndDate, setRegularizationEndDate] = useState('')
  // Estados para Pagas em Dobro (formulário completo)
  const [regSellDays, setRegSellDays] = useState(false)
  const [regSoldDays, setRegSoldDays] = useState(0)
  const [regNumberOfPeriods, setRegNumberOfPeriods] = useState(1)
  const [regPeriods, setRegPeriods] = useState<PeriodForm[]>([{ startDate: '', days: 30 }])
  
  // Form state
  const [numberOfPeriods, setNumberOfPeriods] = useState(1)
  const [sellDays, setSellDays] = useState(false)
  const [soldDays, setSoldDays] = useState(0)
  const [periods, setPeriods] = useState<PeriodForm[]>([{ startDate: '', days: 30 }])
  const [notes, setNotes] = useState('')
  const [formErrors, setFormErrors] = useState<string[]>([])

  const api = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => {
    if (!companyId) return
    fetchData()
  }, [companyId])

  // WebSocket: atualizar quando funcionário solicitar férias
  useEffect(() => {
    const unsubCreate = onVacationRequestCreated((request) => {
      console.log('[FÉRIAS WS] Nova solicitação recebida:', request)
      // Adicionar à lista de solicitações
      setVacationRequests(prev => [request as unknown as VacationRequest, ...prev])
      toast.info('Nova solicitação de férias recebida!')
    })

    const unsubUpdate = onVacationRequestUpdated((request) => {
      console.log('[FÉRIAS WS] Solicitação atualizada:', request)
      // Atualizar na lista
      setVacationRequests(prev => 
        prev.map(r => r.id === request.id ? { ...r, ...request } : r)
      )
      // Mostrar toast baseado no novo status
      if (request.status === 'EMPLOYEE_SIGNED') {
        toast.success('Funcionário assinou as férias! Aguardando aprovação final.')
      }
    })

    return () => {
      unsubCreate()
      unsubUpdate()
    }
  }, [onVacationRequestCreated, onVacationRequestUpdated])

  const fetchData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      
      // Buscar férias existentes
      const vacRes = await fetch(`${api}/api/vacations`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (vacRes.ok) {
        const data = await vacRes.json()
        setVacations(data.vacations || [])
      }

      // Buscar funcionários com status de férias
      const empRes = await fetch(`${api}/api/vacations/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (empRes.ok) {
        const data = await empRes.json()
        setEmployees(data.employees || [])
      }

      // Buscar solicitações de férias pendentes
      const reqRes = await fetch(`${api}/api/vacation-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (reqRes.ok) {
        const data = await reqRes.json()
        setVacationRequests(data || [])
      }
    } catch (e) {
      console.error('Erro ao buscar dados:', e)
      toast.error('Erro ao carregar dados de férias')
    } finally {
      setLoading(false)
    }
  }

  // Buscar solicitação pendente para um funcionário/período
  const getRequestForEmployee = (employeeId: string, periodAcquisitionStart?: string): VacationRequest | null => {
    return vacationRequests.find(r => {
      // Deve ser do mesmo funcionário e status pendente
      if (r.employeeId !== employeeId) return false
      if (r.status !== 'PENDING' && r.status !== 'COUNTER_PROPOSAL') return false
      
      // Se não temos data do período para comparar, não mostrar (evita mostrar em todos)
      if (!periodAcquisitionStart) return false
      
      // Se a solicitação tem vacation vinculada, comparar as datas de aquisição
      if (r.vacation?.acquisitionStart) {
        const reqAcqStart = new Date(r.vacation.acquisitionStart).toISOString().split('T')[0]
        const periodAcqStart = new Date(periodAcquisitionStart).toISOString().split('T')[0]
        return reqAcqStart === periodAcqStart
      }
      
      return false
    }) || null
  }

  // Abrir modal de análise de solicitação
  const openRequestModal = (request: VacationRequest) => {
    setSelectedRequest(request)
    setShowRequestModal(true)
  }

  // Aprovar solicitação (PENDING -> AWAITING_SIGNATURE)
  const handleApproveRequest = async () => {
    if (!selectedRequest) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${api}/api/vacation-requests/${selectedRequest.id}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        toast.success('Solicitação aprovada! Aguardando assinatura do funcionário.')
        setShowRequestModal(false)
        setSelectedRequest(null)
        fetchData()
      } else {
        const error = await res.json()
        toast.error(error.message || 'Erro ao aprovar')
      }
    } catch (e) {
      toast.error('Erro ao aprovar solicitação')
    }
  }

  // Aprovação final do admin (EMPLOYEE_SIGNED -> COMPLETED)
  const handleFinalApprove = async () => {
    if (!selectedRequest) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${api}/api/vacation-requests/${selectedRequest.id}/final-approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        toast.success('Férias confirmadas com sucesso!')
        setShowRequestModal(false)
        setSelectedRequest(null)
        fetchData()
      } else {
        const error = await res.json()
        toast.error(error.message || 'Erro ao confirmar')
      }
    } catch (e) {
      toast.error('Erro ao confirmar férias')
    }
  }

  // Rejeitar solicitação
  const handleRejectRequest = async (reason: string) => {
    if (!selectedRequest || !reason.trim()) {
      toast.error('Informe o motivo da rejeição')
      return
    }
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${api}/api/vacation-requests/${selectedRequest.id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      })
      if (res.ok) {
        toast.success('Solicitação rejeitada')
        setShowRequestModal(false)
        setSelectedRequest(null)
        fetchData()
      } else {
        const error = await res.json()
        toast.error(error.message || 'Erro ao rejeitar')
      }
    } catch (e) {
      toast.error('Erro ao rejeitar solicitação')
    }
  }

  // Atualizar períodos quando muda número de períodos ou dias vendidos
  useEffect(() => {
    const totalDaysToUse = 30 - (sellDays ? soldDays : 0)
    const newPeriods: PeriodForm[] = []
    
    if (numberOfPeriods === 1) {
      newPeriods.push({ startDate: periods[0]?.startDate || '', days: totalDaysToUse })
    } else if (numberOfPeriods === 2) {
      // Primeiro período: mínimo 14 dias
      const firstDays = Math.max(14, Math.floor(totalDaysToUse / 2))
      const secondDays = totalDaysToUse - firstDays
      newPeriods.push({ startDate: periods[0]?.startDate || '', days: firstDays })
      newPeriods.push({ startDate: periods[1]?.startDate || '', days: secondDays })
    } else if (numberOfPeriods === 3) {
      // Primeiro: 14, Segundo: 10, Terceiro: resto
      const firstDays = 14
      const secondDays = Math.max(5, Math.floor((totalDaysToUse - 14) / 2))
      const thirdDays = totalDaysToUse - firstDays - secondDays
      newPeriods.push({ startDate: periods[0]?.startDate || '', days: firstDays })
      newPeriods.push({ startDate: periods[1]?.startDate || '', days: secondDays })
      newPeriods.push({ startDate: periods[2]?.startDate || '', days: thirdDays })
    }
    
    setPeriods(newPeriods)
  }, [numberOfPeriods, sellDays, soldDays])

  const validateForm = (): boolean => {
    const errors: string[] = []
    const totalDaysToUse = 30 - (sellDays ? soldDays : 0)
    const totalPeriodDays = periods.reduce((sum, p) => sum + p.days, 0)

    // Validar total de dias
    if (totalPeriodDays !== totalDaysToUse) {
      errors.push(`Total de dias (${totalPeriodDays}) deve ser igual a ${totalDaysToUse}`)
    }

    // Validar primeiro período (mínimo 14 dias)
    if (periods[0]?.days < 14) {
      errors.push('O primeiro período deve ter no mínimo 14 dias')
    }

    // Validar demais períodos (mínimo 5 dias)
    for (let i = 1; i < periods.length; i++) {
      if (periods[i]?.days < 5) {
        errors.push(`O ${i + 1}º período deve ter no mínimo 5 dias`)
      }
    }

    // Validar datas preenchidas
    for (let i = 0; i < periods.length; i++) {
      if (!periods[i]?.startDate) {
        errors.push(`Preencha a data de início do ${i + 1}º período`)
      }
    }

    // Validar dias vendidos
    if (sellDays && (soldDays < 1 || soldDays > 10)) {
      errors.push('Dias vendidos deve ser entre 1 e 10')
    }

    setFormErrors(errors)
    return errors.length === 0
  }

  const handleScheduleVacation = async () => {
    if (!selectedEmployee || selectedPeriodIndex < 0) return
    if (!validateForm()) return

    const acquisitivePeriod = selectedEmployee.acquisitivePeriods[selectedPeriodIndex]
    if (!acquisitivePeriod) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${api}/api/vacations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeId: selectedEmployee.id,
          acquisitionStart: acquisitivePeriod.acquisitionStart,
          soldDays: sellDays ? soldDays : 0,
          periods: periods.map(p => ({
            startDate: p.startDate,
            days: p.days,
          })),
          notes,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(data.message || 'Férias programadas com sucesso!')
        if (data.abonoValue > 0) {
          toast.info(`Abono pecuniário: R$ ${data.abonoValue.toFixed(2)}`)
        }
        setShowScheduleModal(false)
        resetForm()
        fetchData()
      } else {
        const error = await res.json()
        toast.error(error.message || 'Erro ao programar férias')
      }
    } catch (e) {
      console.error('Erro:', e)
      toast.error('Erro ao programar férias')
    }
  }

  const handleCancelVacation = async (vacationId: string) => {
    if (!confirm('Tem certeza que deseja cancelar estas férias?')) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${api}/api/vacations/${vacationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        toast.success('Férias canceladas com sucesso!')
        fetchData()
      } else {
        const error = await res.json()
        toast.error(error.message || 'Erro ao cancelar férias')
      }
    } catch (e) {
      toast.error('Erro ao cancelar férias')
    }
  }

  const resetForm = () => {
    setNumberOfPeriods(1)
    setSellDays(false)
    setSoldDays(0)
    setPeriods([{ startDate: '', days: 30 }])
    setNotes('')
    setFormErrors([])
  }

  const openScheduleModal = (employee: EmployeeWithVacation, periodIndex: number) => {
    // Resetar formulário ANTES de definir o funcionário
    resetForm()
    setSelectedEmployee(employee)
    setSelectedPeriodIndex(periodIndex)
    setShowScheduleModal(true)
  }
  
  const closeScheduleModal = () => {
    setShowScheduleModal(false)
    setSelectedEmployee(null)
    setSelectedPeriodIndex(0)
  }

  // Funções para modal de regularização
  const openRegularizeModal = (employee: EmployeeWithVacation, periodIndex: number) => {
    setSelectedEmployee(employee)
    setSelectedPeriodIndex(periodIndex)
    setRegularizationType('ENJOYED')
    setRegularizationDate('')
    setRegularizationNotes('')
    setRegularizationStartDate('')
    setRegularizationEndDate('')
    // Reset estados de Pagas em Dobro
    setRegSellDays(false)
    setRegSoldDays(0)
    setRegNumberOfPeriods(1)
    setRegPeriods([{ startDate: '', days: 30 }])
    setShowRegularizeModal(true)
  }

  const closeRegularizeModal = () => {
    setShowRegularizeModal(false)
    setSelectedEmployee(null)
    setSelectedPeriodIndex(0)
  }

  const handleRegularizeVacation = async () => {
    if (!selectedEmployee) return

    // Validação para "Gozadas" - só precisa data início (30 dias automático)
    if (regularizationType === 'ENJOYED') {
      if (!regularizationStartDate) {
        toast.error('Informe a data de início das férias')
        return
      }
    }
    
    // Validação para "Pagas em Dobro" - precisa da data de pagamento e períodos
    if (regularizationType === 'PAID_DOUBLE') {
      if (!regularizationDate) {
        toast.error('Informe a data em que as férias foram pagas em dobro')
        return
      }
      // Validar que todos os períodos têm data de início
      const missingDates = regPeriods.some(p => !p.startDate)
      if (missingDates) {
        toast.error('Informe a data de início de todos os períodos de gozo')
        return
      }
    }

    const period = selectedEmployee.acquisitivePeriods[selectedPeriodIndex]
    
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${api}/api/vacations/regularize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeId: selectedEmployee.id,
          acquisitionStart: period.acquisitionStart,
          regularizationType,
          regularizationDate: regularizationType === 'PAID_DOUBLE' ? regularizationDate : regularizationStartDate,
          startDate: regularizationType === 'ENJOYED' ? regularizationStartDate : undefined,
          // Dados adicionais para Pagas em Dobro
          soldDays: regularizationType === 'PAID_DOUBLE' ? regSoldDays : undefined,
          periods: regularizationType === 'PAID_DOUBLE' ? regPeriods : undefined,
          notes: regularizationNotes,
        }),
      })

      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data?.message || 'Erro ao regularizar férias')
      }

      toast.success('Férias regularizadas com sucesso!')
      closeRegularizeModal()
      fetchData()
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao regularizar férias')
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR })
  }

  const getStatusBadge = (status: string, isExpired?: boolean, isExpiringSoon?: boolean, regularizationType?: string) => {
    // Se for regularizado, mostrar badge específico por tipo
    if (status === 'REGULARIZED') {
      if (regularizationType === 'ENJOYED') {
        return <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-600 font-medium">Gozadas</span>
      }
      if (regularizationType === 'PAID_DOUBLE') {
        return <span className="px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-600 font-medium">Pagas em Dobro</span>
      }
      return <span className="px-2 py-1 text-xs rounded-full bg-amber-500/20 text-amber-600 font-medium">Regularizado</span>
    }
    
    if (isExpired) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-600 font-medium">Vencido</span>
    }
    if (isExpiringSoon) {
      return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-600 font-medium">Vencendo</span>
    }
    
    const badges: Record<string, JSX.Element> = {
      PENDING: <span className="px-2 py-1 text-xs rounded-full bg-gray-500/20 text-gray-600 font-medium">Pendente</span>,
      SCHEDULED: <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-600 font-medium">Agendado</span>,
      IN_PROGRESS: <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-600 font-medium">Em andamento</span>,
      COMPLETED: <span className="px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-600 font-medium">Concluído</span>,
      CANCELLED: <span className="px-2 py-1 text-xs rounded-full bg-gray-500/20 text-gray-500 font-medium">Cancelado</span>,
    }
    return badges[status] || badges.PENDING
  }

  // Filtrar funcionários
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.registrationId.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (statusFilter === 'all') return matchesSearch
    if (statusFilter === 'pending') return matchesSearch && emp.pendingVacations > 0
    if (statusFilter === 'expired') return matchesSearch && emp.expiredVacations > 0
    return matchesSearch
  })

  // Filtrar férias
  const filteredVacations = vacations.filter(vac => {
    const matchesSearch = vac.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (statusFilter === 'all') return matchesSearch
    return matchesSearch && vac.status === statusFilter
  })

  if (companyLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Férias"
        description="Gerencie as férias dos funcionários"
        icon={<Palmtree className="h-6 w-6" />}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{employees.filter(e => e.pendingVacations > 0).length}</p>
              <p className="text-sm text-muted-foreground">Férias pendentes</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{employees.filter(e => e.expiredVacations > 0).length}</p>
              <p className="text-sm text-muted-foreground">Férias vencidas</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <CalendarDays className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{vacations.filter(v => v.status === 'SCHEDULED').length}</p>
              <p className="text-sm text-muted-foreground">Agendadas</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{vacations.filter(v => v.status === 'COMPLETED').length}</p>
              <p className="text-sm text-muted-foreground">Concluídas</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Check className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{vacationRequests.filter(r => r.status === 'EMPLOYEE_SIGNED').length}</p>
              <p className="text-sm text-muted-foreground">Aguardando sua aprovação</p>
            </div>
          </div>
        </div>
      </div>

      {/* Solicitações Aguardando Aprovação Final */}
      {vacationRequests.filter(r => r.status === 'EMPLOYEE_SIGNED').length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border bg-purple-500/10">
            <h3 className="font-semibold flex items-center gap-2 text-purple-700 dark:text-purple-400">
              <Check className="h-5 w-5" />
              Aguardando Sua Aprovação Final ({vacationRequests.filter(r => r.status === 'EMPLOYEE_SIGNED').length})
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Funcionários que já assinaram o aviso de férias e aguardam sua confirmação
            </p>
          </div>
          <div className="divide-y divide-border">
            {vacationRequests.filter(r => r.status === 'EMPLOYEE_SIGNED').map((request) => (
              <div key={request.id} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <User className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">{request.employee?.user?.name || 'Funcionário'}</p>
                      <p className="text-sm text-muted-foreground">
                        Período: {format(new Date(request.requestedStartDate), 'dd/MM/yyyy', { locale: ptBR })} - {request.requestedDays} dias
                        {request.sellDays > 0 && ` (${request.sellDays} dias vendidos)`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-600 font-medium">
                      ✍️ Assinado pelo funcionário
                    </span>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => openRequestModal(request)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Aprovar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'employees' ? 'default' : 'outline'}
            onClick={() => setViewMode('employees')}
            size="sm"
          >
            <User className="h-4 w-4 mr-2" />
            Por Funcionário
          </Button>
          <Button
            variant={viewMode === 'vacations' ? 'default' : 'outline'}
            onClick={() => setViewMode('vacations')}
            size="sm"
          >
            <Palmtree className="h-4 w-4 mr-2" />
            Férias Agendadas
          </Button>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar funcionário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                Todos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('pending')}>
                Pendentes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('expired')}>
                Vencidas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('SCHEDULED')}>
                Agendadas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'employees' ? (
        <div className="space-y-4">
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum funcionário encontrado
            </div>
          ) : (
            filteredEmployees.map(employee => (
              <div key={employee.id} className="bg-card rounded-xl border border-border overflow-hidden">
                {/* Employee Header */}
                <div className="p-4 border-b border-border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{employee.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {employee.positionName || 'Sem cargo'} • Admissão: {formatDate(employee.hireDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {employee.expiredVacations > 0 && (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-600 font-medium">
                          {employee.expiredVacations} vencida(s)
                        </span>
                      )}
                      {employee.pendingVacations > 0 && (
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-600 font-medium">
                          {employee.pendingVacations} pendente(s)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acquisitive Periods */}
                <div className="divide-y divide-border">
                  {employee.acquisitivePeriods.map((period, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {period.periodNumber}º Período Aquisitivo
                          </span>
                          {getStatusBadge(
                            period.status, 
                            period.isExpired, 
                            !period.isExpired && period.daysUntilExpiration <= 60 && period.isAcquired && period.status !== 'REGULARIZED',
                            period.vacation?.regularizationType || undefined
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Aquisitivo: {formatDate(period.acquisitionStart)} a {formatDate(period.acquisitionEnd)}
                        </p>
                        {/* Só mostrar concessivo e dias restantes se NÃO for regularizado */}
                        {period.status !== 'REGULARIZED' && (
                          <p className="text-xs text-muted-foreground">
                            Concessivo: {formatDate(period.concessionStart)} a {formatDate(period.concessionEnd)}
                            {period.isAcquired && !period.isExpired && period.daysUntilExpiration > 0 && (
                              <span className="ml-2 text-yellow-600">
                                ({period.daysUntilExpiration} dias restantes)
                              </span>
                            )}
                          </p>
                        )}
                        {/* Info adicional para férias programadas (não regularizadas) */}
                        {period.hasVacation && period.vacation && period.vacation.status !== 'REGULARIZED' && (
                          <div className="mt-2 text-xs">
                            <span className="text-blue-600">
                              ✓ Férias programadas: {period.vacation.periods?.length || 0} período(s)
                              {period.vacation.soldDays > 0 && ` • ${period.vacation.soldDays} dias vendidos`}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Verificar se há solicitação pendente do funcionário para ESTE período */}
                        {(() => {
                          const request = getRequestForEmployee(employee.id, period.acquisitionStart)
                          if (request) {
                            return (
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700 font-medium">
                                  📋 Solicitado
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                                  onClick={() => openRequestModal(request)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Analisar
                                </Button>
                              </div>
                            )
                          }
                          return null
                        })()}
                        
                        {!getRequestForEmployee(employee.id, period.acquisitionStart) && (
                          period.hasVacation && period.vacation && period.vacation.status !== 'PENDING' ? (
                            // Férias já programadas/agendadas - mostrar Ver e opção de cancelar
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedVacation(period.vacation)
                                  setShowViewModal(true)
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                              {period.vacation.status === 'SCHEDULED' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => handleCancelVacation(period.vacation!.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          ) : period.isExpired ? (
                            // Período vencido - apenas regularizar (pagar em dobro)
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-red-600 font-medium">
                                ⚠️ Vencido
                              </span>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openRegularizeModal(employee, idx)}
                              >
                                <DollarSign className="h-4 w-4 mr-1" />
                                Regularizar
                              </Button>
                            </div>
                          ) : period.isAcquired ? (
                            <Button
                              size="sm"
                              onClick={() => openScheduleModal(employee, idx)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Programar
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Adquire em {period.daysUntilAcquisition} dias
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Vacations List View */
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">Funcionário</th>
                <th className="text-left p-4 font-medium">Períodos</th>
                <th className="text-left p-4 font-medium">Dias</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-right p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredVacations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhuma férias encontrada
                  </td>
                </tr>
              ) : (
                filteredVacations.map(vacation => (
                  <tr key={vacation.id} className="hover:bg-muted/20">
                    <td className="p-4">
                      <div className="font-medium">{vacation.employeeName}</div>
                      <div className="text-sm text-muted-foreground">{vacation.positionName}</div>
                    </td>
                    <td className="p-4">
                      {vacation.periods.map((p, i) => (
                        <div key={i} className="text-sm">
                          {formatDate(p.startDate)} - {formatDate(p.endDate)} ({p.days}d)
                        </div>
                      ))}
                    </td>
                    <td className="p-4">
                      <div>{vacation.remainingDays} dias</div>
                      {vacation.soldDays > 0 && (
                        <div className="text-xs text-muted-foreground">
                          +{vacation.soldDays} vendidos
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(vacation.status, vacation.isExpired, vacation.isExpiringSoon)}
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedVacation(vacation)
                          setShowViewModal(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {vacation.status === 'SCHEDULED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleCancelVacation(vacation.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Schedule Vacation Modal */}
      <Dialog open={showScheduleModal} onOpenChange={(open) => !open && closeScheduleModal()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palmtree className="h-5 w-5" />
              Programar Férias
            </DialogTitle>
          </DialogHeader>

          {selectedEmployee && selectedEmployee.acquisitivePeriods[selectedPeriodIndex] && (
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{selectedEmployee.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedEmployee.positionName} • Salário: {formatCurrency(selectedEmployee.baseSalary)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Selected Period Info */}
              {(() => {
                const period = selectedEmployee.acquisitivePeriods[selectedPeriodIndex]
                return (
                  <div className={`rounded-lg p-4 ${period.isExpired ? 'bg-red-500/10 border border-red-500/30' : 'bg-blue-500/10 border border-blue-500/30'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarDays className={`h-5 w-5 ${period.isExpired ? 'text-red-600' : 'text-blue-600'}`} />
                      <span className={`font-medium ${period.isExpired ? 'text-red-600' : 'text-blue-600'}`}>
                        {period.periodNumber}º Período Aquisitivo
                        {period.isExpired && ' (VENCIDO)'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Aquisitivo: {formatDate(period.acquisitionStart)} a {formatDate(period.acquisitionEnd)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Concessivo: {formatDate(period.concessionStart)} a {formatDate(period.concessionEnd)}
                    </p>
                    {period.isExpired && (
                      <p className="text-sm text-red-600 font-medium mt-2">
                        ⚠️ Período vencido! As férias devem ser pagas em dobro conforme CLT Art. 137.
                      </p>
                    )}
                  </div>
                )
              })()}

              {/* Sell Days Option */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="sellDays"
                    checked={sellDays}
                    onChange={(e) => setSellDays(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="sellDays">Vender dias (Abono Pecuniário)</Label>
                </div>
                
                {sellDays && (
                  <div className="ml-6 space-y-2">
                    <Label>Quantos dias vender? (máx. 10)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={soldDays}
                      onChange={(e) => setSoldDays(Math.min(10, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-32"
                    />
                    {soldDays > 0 && (
                      <p className="text-sm text-green-600">
                        Abono estimado: {formatCurrency((selectedEmployee.baseSalary / 30) * soldDays * (4/3))}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Number of Periods */}
              <div className="space-y-3">
                <Label>Quantos períodos?</Label>
                <div className="flex gap-2">
                  {[1, 2, 3].map(n => (
                    <Button
                      key={n}
                      variant={numberOfPeriods === n ? 'default' : 'outline'}
                      onClick={() => setNumberOfPeriods(n)}
                      className="flex-1"
                    >
                      {n} {n === 1 ? 'período' : 'períodos'}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total de dias a gozar: {30 - (sellDays ? soldDays : 0)} dias
                </p>
              </div>

              {/* Periods Configuration */}
              <div className="space-y-4">
                <Label>Configurar períodos</Label>
                {periods.map((period, idx) => (
                  <div key={idx} className="bg-muted/20 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{idx + 1}º Período</span>
                      <span className="text-sm text-muted-foreground">
                        {idx === 0 ? '(mín. 14 dias)' : '(mín. 5 dias)'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Data de início</Label>
                        <Input
                          type="date"
                          value={period.startDate}
                          onChange={(e) => {
                            const newPeriods = [...periods]
                            newPeriods[idx].startDate = e.target.value
                            setPeriods(newPeriods)
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Dias</Label>
                        <Input
                          type="number"
                          min={idx === 0 ? 14 : 5}
                          value={period.days}
                          onChange={(e) => {
                            const newPeriods = [...periods]
                            newPeriods[idx].days = parseInt(e.target.value) || 0
                            setPeriods(newPeriods)
                          }}
                        />
                      </div>
                    </div>
                    {period.startDate && (
                      <p className="text-xs text-muted-foreground">
                        Término: {format(addDays(new Date(period.startDate), period.days - 1), 'dd/MM/yyyy')}
                        {' • '}Pagamento até: {format(addDays(new Date(period.startDate), -2), 'dd/MM/yyyy')}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Viagem em família"
                />
              </div>

              {/* Errors */}
              {formErrors.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="font-medium text-red-600 mb-2">Corrija os erros:</p>
                  <ul className="list-disc list-inside text-sm text-red-600">
                    {formErrors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Summary */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="font-medium text-blue-600 mb-2">Resumo</h4>
                <div className="text-sm space-y-1">
                  <p>Dias de férias: {30 - (sellDays ? soldDays : 0)} dias</p>
                  {sellDays && soldDays > 0 && (
                    <p>Dias vendidos: {soldDays} dias (abono pecuniário)</p>
                  )}
                  <p>Períodos: {numberOfPeriods}</p>
                  <p className="font-medium mt-2">
                    Valor estimado por período:
                  </p>
                  {periods.map((p, i) => (
                    <p key={i} className="ml-2">
                      {i + 1}º: {formatCurrency((selectedEmployee.baseSalary / 30) * p.days * (4/3))}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeScheduleModal}>
              Cancelar
            </Button>
            <Button onClick={handleScheduleVacation}>
              <Check className="h-4 w-4 mr-2" />
              Programar Férias
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Vacation Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palmtree className="h-5 w-5" />
              Detalhes das Férias
            </DialogTitle>
          </DialogHeader>

          {selectedVacation && (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="font-semibold">{selectedVacation.employeeName}</h3>
                <p className="text-sm text-muted-foreground">{selectedVacation.positionName}</p>
              </div>

              {/* Período Aquisitivo/Concessivo */}
              <div className="bg-muted/20 rounded-lg p-3">
                <p className="text-sm font-medium mb-2">Período Aquisitivo</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(selectedVacation.acquisitionStart)} a {formatDate(selectedVacation.acquisitionEnd)}
                </p>
                <p className="text-sm font-medium mt-2 mb-1">Período Concessivo</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(selectedVacation.concessionStart)} a {formatDate(selectedVacation.concessionEnd)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p>{getStatusBadge(selectedVacation.status)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total de dias de direito</p>
                  <p className="font-medium">{selectedVacation.totalDays} dias</p>
                </div>
                {selectedVacation.soldDays > 0 && (
                  <>
                    <div>
                      <p className="text-muted-foreground">Dias vendidos</p>
                      <p className="font-medium text-green-600">{selectedVacation.soldDays} dias</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Dias a gozar</p>
                      <p className="font-medium">{selectedVacation.remainingDays} dias</p>
                    </div>
                  </>
                )}
              </div>

              {/* Se for regularizado, mostrar informações de regularização */}
              {selectedVacation.status === 'REGULARIZED' && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-amber-600" />
                    <span className="font-medium text-amber-600">Férias Regularizadas</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Tipo</p>
                      <p className="font-medium">
                        {selectedVacation.regularizationType === 'ENJOYED' ? 'Gozadas' : 'Pagas em Dobro'}
                      </p>
                    </div>
                    {selectedVacation.regularizationDate && (
                      <div>
                        <p className="text-muted-foreground">Data da regularização</p>
                        <p className="font-medium">{formatDate(selectedVacation.regularizationDate)}</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Registrado em {selectedVacation.regularizedAt ? formatDate(selectedVacation.regularizedAt) : '-'}
                  </p>
                </div>
              )}

              {/* Períodos de gozo - mostrar sempre que houver períodos */}
              {selectedVacation.periods && selectedVacation.periods.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Períodos de Gozo</p>
                  <div className="space-y-2">
                    {selectedVacation.periods.map((period, i) => (
                      <div key={i} className="bg-muted/20 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{i + 1}º Período</span>
                          <span className="text-sm">{period.days} dias</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(period.startDate)} a {formatDate(period.endDate)}
                        </p>
                        {period.totalValue && (
                          <p className="text-sm text-green-600">
                            Valor: {formatCurrency(Number(period.totalValue))}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mensagem quando não há períodos e não é regularizado */}
              {selectedVacation.status !== 'REGULARIZED' && (!selectedVacation.periods || selectedVacation.periods.length === 0) && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Períodos de Gozo</p>
                  <p className="text-sm text-muted-foreground italic">Nenhum período de gozo programado</p>
                </div>
              )}

              {selectedVacation.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Observações</p>
                  <p className="text-sm">{selectedVacation.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewModal(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Regularização de Férias - Estrutura igual ao modal de funcionário */}
      {showRegularizeModal && (
        <div className="fixed inset-0 bg-black/80 flex items-start justify-center z-[9999] p-4 overflow-y-auto">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-md my-8 mx-auto border">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-amber-600" />
                <h2 className="text-lg font-semibold">Regularizar Férias</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={closeRegularizeModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            {selectedEmployee && (
              <div className="p-6 space-y-4">
                {/* Informações do funcionário */}
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="font-medium">{selectedEmployee.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedEmployee.positionName}</p>
                </div>

                {/* Informações do período */}
                {(() => {
                  const period = selectedEmployee.acquisitivePeriods[selectedPeriodIndex]
                  return (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CalendarDays className="h-5 w-5 text-amber-600" />
                        <span className="font-medium text-amber-600">
                          {period.periodNumber}º Período Aquisitivo
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Aquisitivo: {formatDate(period.acquisitionStart)} a {formatDate(period.acquisitionEnd)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Concessivo: {formatDate(period.concessionStart)} a {formatDate(period.concessionEnd)}
                      </p>
                    </div>
                  )
                })()}

                {/* Explicação */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    <strong>ℹ️ Para que serve?</strong><br />
                    Use esta opção para registrar férias que já foram pagas ou gozadas antes da migração para este sistema.
                  </p>
                </div>

                {/* Tipo de regularização */}
                <div className="space-y-2">
                  <Label>Como as férias foram tratadas? *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={regularizationType === 'ENJOYED' ? 'default' : 'outline'}
                      className="w-full"
                      onClick={() => setRegularizationType('ENJOYED')}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Gozadas
                    </Button>
                    <Button
                      type="button"
                      variant={regularizationType === 'PAID_DOUBLE' ? 'default' : 'outline'}
                      className="w-full"
                      onClick={() => setRegularizationType('PAID_DOUBLE')}
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Pagas em Dobro
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {regularizationType === 'ENJOYED' 
                      ? 'O funcionário tirou as férias normalmente (30 dias corridos).'
                      : 'As férias venceram e foram pagas em dobro (CLT Art. 137). O funcionário deve obrigatoriamente gozar 30 dias de férias.'}
                  </p>
                </div>

                {/* Campos para GOZADAS - só data início (30 dias automático) */}
                {regularizationType === 'ENJOYED' && (
                  <div className="space-y-3 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-600">✓ Férias Gozadas</p>
                    <p className="text-xs text-muted-foreground">
                      O funcionário tirou os 30 dias de férias normalmente.
                    </p>
                    <div className="space-y-1">
                      <Label htmlFor="regularizationStartDate" className="text-xs">Data de Início das Férias *</Label>
                      <Input
                        id="regularizationStartDate"
                        type="date"
                        value={regularizationStartDate}
                        onChange={(e) => setRegularizationStartDate(e.target.value)}
                        className="[&::-webkit-calendar-picker-indicator]:dark:invert [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground">A data fim será calculada automaticamente (30 dias)</p>
                    </div>
                  </div>
                )}

                {/* Campos para PAGAS EM DOBRO - formulário completo */}
                {regularizationType === 'PAID_DOUBLE' && (
                  <div className="space-y-4">
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                      <p className="text-sm font-medium text-purple-600">💰 Pagamento em Dobro</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Conforme CLT Art. 137, quando as férias não são concedidas no período concessivo, 
                        a empresa deve pagar o valor em dobro. O funcionário ainda tem direito a gozar os 30 dias.
                      </p>
                      <div className="space-y-1 mt-3">
                        <Label htmlFor="regularizationDate" className="text-xs">Data do Pagamento em Dobro *</Label>
                        <Input
                          id="regularizationDate"
                          type="date"
                          value={regularizationDate}
                          onChange={(e) => setRegularizationDate(e.target.value)}
                          className="[&::-webkit-calendar-picker-indicator]:dark:invert [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Vender dias (abono pecuniário) */}
                    <div className="bg-muted/20 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Vender dias (Abono Pecuniário)</p>
                          <p className="text-xs text-muted-foreground">Máximo de 10 dias podem ser vendidos</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={regSellDays}
                          onChange={(e) => {
                            setRegSellDays(e.target.checked)
                            if (!e.target.checked) {
                              setRegSoldDays(0)
                              setRegPeriods([{ startDate: regPeriods[0]?.startDate || '', days: 30 }])
                            }
                          }}
                          className="h-4 w-4"
                        />
                      </div>
                      {regSellDays && (
                        <div className="space-y-1">
                          <Label className="text-xs">Quantos dias vender?</Label>
                          <select
                            value={regSoldDays}
                            onChange={(e) => {
                              const sold = Number(e.target.value)
                              setRegSoldDays(sold)
                              const remaining = 30 - sold
                              setRegPeriods([{ startDate: regPeriods[0]?.startDate || '', days: remaining }])
                            }}
                            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                          >
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                              <option key={n} value={n}>{n} dias</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Dividir em períodos */}
                    <div className="bg-muted/20 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="text-sm font-medium">Períodos de Gozo</p>
                        <p className="text-xs text-muted-foreground">
                          {30 - regSoldDays} dias a gozar (pode dividir em até 3 períodos)
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Quantos períodos?</Label>
                        <select
                          value={regNumberOfPeriods}
                          onChange={(e) => {
                            const num = Number(e.target.value)
                            setRegNumberOfPeriods(num)
                            const remaining = 30 - regSoldDays
                            if (num === 1) {
                              setRegPeriods([{ startDate: regPeriods[0]?.startDate || '', days: remaining }])
                            } else if (num === 2) {
                              setRegPeriods([
                                { startDate: regPeriods[0]?.startDate || '', days: 14 },
                                { startDate: regPeriods[1]?.startDate || '', days: remaining - 14 }
                              ])
                            } else {
                              setRegPeriods([
                                { startDate: regPeriods[0]?.startDate || '', days: 14 },
                                { startDate: regPeriods[1]?.startDate || '', days: 8 },
                                { startDate: regPeriods[2]?.startDate || '', days: remaining - 22 }
                              ])
                            }
                          }}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value={1}>1 período</option>
                          <option value={2}>2 períodos</option>
                          <option value={3}>3 períodos</option>
                        </select>
                      </div>

                      {/* Campos de cada período */}
                      {regPeriods.map((period, idx) => (
                        <div key={idx} className="bg-background rounded-lg p-3 border space-y-2">
                          <p className="text-xs font-medium">{idx + 1}º Período - {period.days} dias</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Data Início</Label>
                              <Input
                                type="date"
                                value={period.startDate}
                                onChange={(e) => {
                                  const newPeriods = [...regPeriods]
                                  newPeriods[idx].startDate = e.target.value
                                  setRegPeriods(newPeriods)
                                }}
                                className="[&::-webkit-calendar-picker-indicator]:dark:invert [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Dias</Label>
                              <Input
                                type="number"
                                min={idx === 0 ? 14 : 5}
                                max={30 - regSoldDays}
                                value={period.days}
                                onChange={(e) => {
                                  const newPeriods = [...regPeriods]
                                  newPeriods[idx].days = Number(e.target.value)
                                  setRegPeriods(newPeriods)
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Observações */}
                <div className="space-y-2">
                  <Label htmlFor="regularizationNotes">Observações (opcional)</Label>
                  <Input
                    id="regularizationNotes"
                    placeholder="Ex: Férias registradas na folha de pagamento de janeiro/2024"
                    value={regularizationNotes}
                    onChange={(e) => setRegularizationNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-2 p-6 border-t">
              <Button variant="outline" onClick={closeRegularizeModal}>
                Cancelar
              </Button>
              <Button onClick={handleRegularizeVacation}>
                <Check className="h-4 w-4 mr-2" />
                Regularizar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Análise de Solicitação */}
      {showRequestModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-600" />
                <h2 className="text-lg font-semibold">Solicitação de Férias</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setShowRequestModal(false); setSelectedRequest(null) }}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Info do funcionário */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="font-medium">{selectedRequest.employee?.user?.name || 'Funcionário'}</p>
                <p className="text-sm text-muted-foreground">
                  Solicitado em {format(new Date(selectedRequest.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>

              {/* Detalhes da solicitação */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground">PERÍODO SOLICITADO</h3>
                
                <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Data início:</span>
                      <p className="font-medium">{format(new Date(selectedRequest.requestedStartDate), 'dd/MM/yyyy', { locale: ptBR })}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Dias de gozo:</span>
                      <p className="font-medium">{selectedRequest.requestedDays} dias</p>
                    </div>
                    {selectedRequest.sellDays > 0 && (
                      <div>
                        <span className="text-muted-foreground">Dias vendidos:</span>
                        <p className="font-medium text-green-600">{selectedRequest.sellDays} dias (abono)</p>
                      </div>
                    )}
                  </div>

                  {selectedRequest.requestedPeriods && selectedRequest.requestedPeriods.length > 1 && (
                    <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-800">
                      <p className="text-xs text-muted-foreground mb-2">Dividido em {selectedRequest.requestedPeriods.length} períodos:</p>
                      {selectedRequest.requestedPeriods.map((p, i) => (
                        <p key={i} className="text-sm">
                          {i + 1}º: {format(new Date(p.startDate), 'dd/MM/yyyy', { locale: ptBR })} ({p.days} dias)
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {selectedRequest.employeeNotes && (
                  <div>
                    <span className="text-sm text-muted-foreground">Observações do funcionário:</span>
                    <p className="text-sm mt-1 p-2 bg-muted/50 rounded">{selectedRequest.employeeNotes}</p>
                  </div>
                )}

                {/* Alertas CLT */}
                {selectedRequest.cltViolations && selectedRequest.cltViolations.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1 mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      Alertas CLT
                    </p>
                    {selectedRequest.cltViolations.map((v, i) => (
                      <p key={i} className={`text-xs ${v.severity === 'error' ? 'text-red-600' : 'text-amber-600'}`}>
                        • {v.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Ações - baseado no status */}
            <div className="flex justify-between gap-2 p-6 border-t">
              {selectedRequest.status === 'EMPLOYEE_SIGNED' ? (
                <>
                  {/* Funcionário já assinou - mostrar aprovação final */}
                  <div className="flex-1">
                    <p className="text-sm text-purple-600 dark:text-purple-400 mb-2">
                      ✍️ O funcionário já assinou este aviso de férias
                    </p>
                  </div>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={handleFinalApprove}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Confirmar Férias
                  </Button>
                </>
              ) : (
                <>
                  {/* Solicitação pendente - mostrar aprovar/rejeitar */}
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => setShowRejectModal(true)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Rejeitar
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={handleApproveRequest}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Aprovar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Rejeição */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h2 className="text-lg font-semibold">Rejeitar Solicitação</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => {
                setShowRejectModal(false)
                setRejectReason('')
              }}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Informe o motivo da rejeição para que o funcionário saiba por que sua solicitação foi negada.
              </p>
              
              <div>
                <label className="block text-sm font-medium mb-2">Motivo da rejeição *</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background resize-none"
                  rows={3}
                  placeholder="Ex: Período solicitado conflita com demandas do setor..."
                  autoFocus
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 p-6 border-t">
              <Button variant="outline" onClick={() => {
                setShowRejectModal(false)
                setRejectReason('')
              }}>
                Cancelar
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                disabled={!rejectReason.trim()}
                onClick={() => {
                  handleRejectRequest(rejectReason)
                  setShowRejectModal(false)
                  setRejectReason('')
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Confirmar Rejeição
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
