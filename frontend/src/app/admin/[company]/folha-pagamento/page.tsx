"use client"
// Código em INGLÊS; textos da UI em PORTUGUÊS
import React, { useEffect, useState, useCallback } from 'react'
import { notFound } from 'next/navigation'
import { useCompanySlug } from '@/hooks/useCompanySlug'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { SlugMismatchError } from '@/components/admin/SlugMismatchError'
import PageHeader from '@/components/admin/PageHeader'
import PageContainer from '@/components/admin/PageContainer'
import { ProtectedPage } from '@/components/auth/ProtectedPage'
import { PERMISSIONS, Can } from '@/hooks/usePermissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Wallet,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Calculator,
  CheckCircle,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  FileText,
  Search,
  Download,
  Eye,
  RefreshCw,
  Clock,
  AlertCircle,
  Banknote,
  Receipt,
  PiggyBank,
  Settings,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
} from 'lucide-react'

// Tipos
interface Payroll {
  id: string
  referenceMonth: number
  referenceYear: number
  status: string
  totalGross: number
  totalDeductions: number
  totalNet: number
  totalEmployees: number
  closedAt: string | null
  paidAt: string | null
  payslips: Payslip[]
}

interface Payslip {
  id: string
  employeeId: string
  employeeName: string
  employeePosition: string | null
  employeeDepartment: string | null
  employeeRegistration: string
  baseSalary: number
  workedDays: number
  workedHours: number
  // Proventos
  overtimeHours50: number
  overtimeValue50: number
  overtimeHours100: number
  overtimeValue100: number
  nightShiftHours: number
  nightShiftValue: number
  hazardPay: number
  unhealthyPay: number
  bonus: number
  otherEarnings: number
  otherEarningsDesc: string | null
  totalEarnings: number
  // Descontos
  absenceDays: number
  absenceValue: number
  lateMinutes: number
  lateValue: number
  inssBase: number
  inssValue: number
  inssRate: number
  irBase: number
  irValue: number
  irRate: number
  transportVoucher: number
  mealVoucher: number
  healthInsurance: number
  dentalInsurance: number
  unionContribution: number
  loanDeduction: number
  advancePayment: number
  salaryAdvanceValue: number
  extraAdvanceValue: number
  otherDeductions: number
  otherDeductionsDesc: string | null
  totalDeductions: number
  // FGTS
  fgtsBase: number
  fgtsValue: number
  // Totais
  grossSalary: number
  netSalary: number
  status: string
  // Campos de aceite/rejeição
  acceptedAt?: string
  rejectedAt?: string
  rejectionReason?: string
  // Campos extras
  overtimeValue?: number
  bonusValue?: number
  employee?: {
    user?: { name: string; avatarUrl: string | null }
  }
  // Parcelas de pagamento
  installments?: PayslipInstallment[]
}

interface PayslipInstallment {
  id: string
  installmentNumber: number
  totalInstallments: number
  percentage: number
  amount: number
  dueDate: string
  paidAt: string | null
  paidBy: string | null
}

// Nomes dos meses em português
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

// Status labels em português
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Rascunho', color: 'bg-gray-500/10 text-gray-500' },
  CALCULATING: { label: 'Calculando...', color: 'bg-blue-500/10 text-blue-500' },
  REVIEW: { label: 'Em Revisão', color: 'bg-yellow-500/10 text-yellow-500' },
  APPROVED: { label: 'Aprovada', color: 'bg-green-500/10 text-green-500' },
  PAID: { label: 'Paga', color: 'bg-emerald-500/10 text-emerald-500' },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-500/10 text-red-500' },
}

// Formatar valor monetário
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export default function PayrollPage({ params }: { params: { company: string } }) {
  const { company } = params
  const { companyId, companySlug, slugMismatch, loading } = useCompanySlug()
  
  // Estado
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [payroll, setPayroll] = useState<Payroll | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null)
  const [showPayslipModal, setShowPayslipModal] = useState(false)
  const [selectedPayslipIds, setSelectedPayslipIds] = useState<string[]>([])
  const [isApproving, setIsApproving] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [showRejectedModal, setShowRejectedModal] = useState(false)
  const [rejectedPayslip, setRejectedPayslip] = useState<Payslip | null>(null)
  const [isReapproving, setIsReapproving] = useState(false)
  const [overdueInstallments, setOverdueInstallments] = useState<any[]>([])
  const [overdueCount, setOverdueCount] = useState(0)
  
  if (!company) notFound()
  
  // Exibe erro se slug não corresponde
  if (slugMismatch) {
    return <SlugMismatchError urlSlug={company} correctSlug={companySlug} currentPath={`/admin/${company}/folha-pagamento`} />
  }

  const base = company ? `/admin/${encodeURIComponent(company)}` : '/admin'

  // Buscar folha de pagamento do mês
  const fetchPayroll = useCallback(async () => {
    if (!companyId) return
    
    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/current?companyId=${companyId}&month=${currentMonth}&year=${currentYear}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (response.ok) {
        const data = await response.json()
        setPayroll(data.payroll)
      } else {
        toast.error('Erro ao carregar folha de pagamento')
      }
    } catch (error) {
      console.error('Erro ao buscar folha:', error)
      toast.error('Erro ao carregar folha de pagamento')
    } finally {
      setIsLoading(false)
    }
  }, [companyId, currentMonth, currentYear])

  useEffect(() => {
    fetchPayroll()
  }, [fetchPayroll])

  // Buscar parcelas atrasadas
  const fetchOverdueInstallments = useCallback(async () => {
    if (!companyId) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/overdue-installments?companyId=${companyId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (response.ok) {
        const data = await response.json()
        setOverdueInstallments(data.installments || [])
        setOverdueCount(data.overdueCount || 0)
      }
    } catch (error) {
      console.error('Erro ao buscar parcelas atrasadas:', error)
    }
  }, [companyId])

  useEffect(() => {
    fetchOverdueInstallments()
  }, [fetchOverdueInstallments])

  // WebSocket: Atualizar quando funcionário aceitar/rejeitar holerite
  const { connected, onPayslipAccepted, onPayslipRejected, onPayslipPaid } = useWebSocket()
  
  useEffect(() => {
    if (!connected) return

    // Quando funcionário aceita holerite
    const unsubAccepted = onPayslipAccepted((payslip) => {
      console.log('[WebSocket] 📥 payslip-accepted:', payslip.id)
      fetchPayroll() // Recarregar folha
      toast.success('Holerite aceito!', {
        description: `${payslip.employeeName || 'Funcionário'} aceitou o holerite`
      })
    })

    // Quando funcionário rejeita holerite
    const unsubRejected = onPayslipRejected((payslip) => {
      console.log('[WebSocket] 📥 payslip-rejected:', payslip.id)
      fetchPayroll()
      toast.warning('Holerite rejeitado!', {
        description: `${payslip.employeeName || 'Funcionário'} rejeitou o holerite`
      })
    })

    // Quando holerite é pago
    const unsubPaid = onPayslipPaid((payslip) => {
      console.log('[WebSocket] 📥 payslip-paid:', payslip.id)
      fetchPayroll()
    })

    return () => {
      unsubAccepted()
      unsubRejected()
      unsubPaid()
    }
  }, [connected, onPayslipAccepted, onPayslipRejected, onPayslipPaid, fetchPayroll])

  // Gerar holerites
  const handleGenerate = async () => {
    if (!payroll) return
    
    setIsGenerating(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/${payroll.id}/generate`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        setPayroll(data.payroll)
        toast.success(data.message || 'Holerites gerados com sucesso!')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao gerar holerites')
      }
    } catch (error) {
      console.error('Erro ao gerar holerites:', error)
      toast.error('Erro ao gerar holerites')
    } finally {
      setIsGenerating(false)
    }
  }

  // Aprovar folha
  const handleApprove = async () => {
    if (!payroll) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/${payroll.id}/approve`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        setPayroll(data.payroll)
        toast.success('Folha de pagamento aprovada!')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao aprovar folha')
      }
    } catch (error) {
      console.error('Erro ao aprovar folha:', error)
      toast.error('Erro ao aprovar folha')
    }
  }

  // Marcar como paga
  const handleMarkAsPaid = async () => {
    if (!payroll) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/${payroll.id}/pay`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        setPayroll(data.payroll)
        toast.success('Folha marcada como paga!')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao marcar como paga')
      }
    } catch (error) {
      console.error('Erro ao marcar como paga:', error)
      toast.error('Erro ao marcar como paga')
    }
  }

  // Aprovar holerites selecionados
  const handleApproveSelected = async () => {
    if (selectedPayslipIds.length === 0) {
      toast.error('Selecione pelo menos um holerite')
      return
    }
    
    setIsApproving(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/payslips/approve`,
        {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ payslipIds: selectedPayslipIds }),
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || 'Holerites aprovados!')
        setSelectedPayslipIds([])
        fetchPayroll()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao aprovar holerites')
      }
    } catch (error) {
      console.error('Erro ao aprovar holerites:', error)
      toast.error('Erro ao aprovar holerites')
    } finally {
      setIsApproving(false)
    }
  }

  // Pagar holerites selecionados
  const handlePaySelected = async () => {
    if (selectedPayslipIds.length === 0) {
      toast.error('Selecione pelo menos um holerite')
      return
    }
    
    setIsPaying(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/payslips/pay`,
        {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ payslipIds: selectedPayslipIds }),
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || 'Holerites pagos!')
        setSelectedPayslipIds([])
        fetchPayroll()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao pagar holerites')
      }
    } catch (error) {
      console.error('Erro ao pagar holerites:', error)
      toast.error('Erro ao pagar holerites')
    } finally {
      setIsPaying(false)
    }
  }

  // Navegar entre meses
  const goToPreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  // Filtrar holerites (DEVE vir antes das variáveis que dependem dele)
  const filteredPayslips = payroll?.payslips?.filter((p) =>
    p.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.employeeRegistration.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  // Toggle seleção de holerite (só permite selecionar se não for PAID)
  const togglePayslipSelection = (payslipId: string) => {
    const payslip = filteredPayslips.find(p => p.id === payslipId)
    if (payslip?.status === 'PAID') return // Não permite selecionar PAID
    
    setSelectedPayslipIds(prev => 
      prev.includes(payslipId) 
        ? prev.filter(id => id !== payslipId)
        : [...prev, payslipId]
    )
  }

  // Holerites que podem ser selecionados (não PAID)
  const selectablePayslips = filteredPayslips.filter(p => p.status !== 'PAID')
  
  // Verificar se todos estão pagos
  const allPaid = filteredPayslips.length > 0 && filteredPayslips.every(p => p.status === 'PAID')
  
  // Holerites selecionados que podem ser aprovados (status CALCULATED)
  const selectedForApproval = selectedPayslipIds.filter(id => {
    const p = filteredPayslips.find(ps => ps.id === id)
    return p?.status === 'CALCULATED'
  })
  
  // Holerites selecionados que podem ser pagos (status ACCEPTED)
  const selectedForPayment = selectedPayslipIds.filter(id => {
    const p = filteredPayslips.find(ps => ps.id === id)
    return p?.status === 'ACCEPTED'
  })

  // Selecionar todos os holerites que podem ser selecionados
  const toggleSelectAll = () => {
    if (selectedPayslipIds.length === selectablePayslips.length) {
      setSelectedPayslipIds([])
    } else {
      setSelectedPayslipIds(selectablePayslips.map(p => p.id))
    }
  }

  // Abrir modal de holerite
  const openPayslipModal = (payslip: Payslip) => {
    setSelectedPayslip(payslip)
    setShowPayslipModal(true)
  }

  // Abrir modal de holerite rejeitado
  const openRejectedPayslipModal = (payslip: Payslip) => {
    setRejectedPayslip(payslip)
    setShowRejectedModal(true)
  }

  // Reaprovar holerite rejeitado
  const handleReapprove = async () => {
    if (!rejectedPayslip) return
    
    setIsReapproving(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/payslip/${rejectedPayslip.id}/reapprove`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      
      if (response.ok) {
        toast.success('Holerite reaprovado com sucesso!')
        setShowRejectedModal(false)
        setRejectedPayslip(null)
        fetchPayroll()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao reaprovar holerite')
      }
    } catch (error) {
      console.error('Erro ao reaprovar holerite:', error)
      toast.error('Erro ao reaprovar holerite')
    } finally {
      setIsReapproving(false)
    }
  }

  return (
    <ProtectedPage permission={PERMISSIONS.PAYROLL_VIEW}>
      <PageContainer>
        <PageHeader
          title="Folha de Pagamento"
          description="Gerencie a folha de pagamento dos funcionários"
          icon={<Wallet className="h-6 w-6" />}
          breadcrumbs={[
            { label: 'Admin', href: base },
            { label: 'G. de Colaboradores' },
            { label: 'Folha de Pagamento' }
          ]}
        />

        {/* Alerta de Parcelas Atrasadas */}
        {overdueCount > 0 && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-800 dark:text-red-400">
                  {overdueCount} parcela{overdueCount > 1 ? 's' : ''} de pagamento atrasada{overdueCount > 1 ? 's' : ''}
                </h3>
                <div className="mt-2 space-y-1">
                  {overdueInstallments.slice(0, 5).map((inst: any) => (
                    <div key={inst.id} className="text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
                      <span>
                        <strong>{inst.employeeName}</strong> - Parcela {inst.installmentNumber}/{inst.totalInstallments}
                      </span>
                      <span className="text-xs">
                        {formatCurrency(inst.amount)} • {inst.daysOverdue} dia{inst.daysOverdue > 1 ? 's' : ''} atrasado
                      </span>
                    </div>
                  ))}
                  {overdueCount > 5 && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      E mais {overdueCount - 5} parcela{overdueCount - 5 > 1 ? 's' : ''} atrasada{overdueCount - 5 > 1 ? 's' : ''}...
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navegação de Mês */}
        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="text-lg font-semibold">
              {MONTH_NAMES[currentMonth - 1]} de {currentYear}
            </span>
          </div>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Status da Folha */}
        {payroll && (
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_LABELS[payroll.status]?.color || 'bg-gray-500/10 text-gray-500'}`}>
            {STATUS_LABELS[payroll.status]?.label || payroll.status}
          </div>
        )}
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Total Bruto"
          value={formatCurrency(payroll?.totalGross || 0)}
          icon={<TrendingUp className="h-5 w-5" />}
          color="green"
          description="Proventos (salários + adicionais)"
        />
        <SummaryCard
          title="Total Descontos"
          value={formatCurrency(payroll?.totalDeductions || 0)}
          icon={<TrendingDown className="h-5 w-5" />}
          color="red"
          description="INSS + IR + outros descontos"
        />
        <SummaryCard
          title="Total Líquido"
          value={formatCurrency(payroll?.totalNet || 0)}
          icon={<Banknote className="h-5 w-5" />}
          color="blue"
          description="Valor a pagar aos funcionários"
        />
        <SummaryCard
          title="Funcionários"
          value={payroll?.totalEmployees?.toString() || '0'}
          icon={<Users className="h-5 w-5" />}
          color="purple"
          description="Total de holerites gerados"
        />
      </div>

      {/* Ações */}
      <div className="flex flex-wrap gap-3 mb-6">
        {payroll?.status === 'DRAFT' && (
          <Can permission={PERMISSIONS.PAYROLL_GENERATE}>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  Gerar Holerites
                </>
              )}
            </Button>
          </Can>
        )}
        
        {payroll?.status === 'REVIEW' && (
          <>
            <Can permission={PERMISSIONS.PAYROLL_GENERATE}>
              <Button onClick={handleGenerate} variant="outline" disabled={isGenerating}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Recalcular
              </Button>
            </Can>
            <Can permission={PERMISSIONS.PAYROLL_APPROVE}>
              <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprovar Folha
              </Button>
            </Can>
          </>
        )}
        
        {payroll?.status === 'APPROVED' && (
          <Can permission={PERMISSIONS.PAYROLL_PAY}>
            <Button onClick={handleMarkAsPaid} className="bg-emerald-600 hover:bg-emerald-700">
              <DollarSign className="h-4 w-4 mr-2" />
              Marcar como Paga
            </Button>
          </Can>
        )}

        <Button variant="outline" onClick={fetchPayroll}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>

        <Can permission={PERMISSIONS.SETTINGS_EDIT}>
          <Link href={`${base}/configuracoes/folha-pagamento`}>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Button>
          </Link>
        </Can>
      </div>

      {/* Lista de Holerites */}
      <div className="border border-border rounded-lg bg-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Holerites</h2>
              <p className="text-sm text-muted-foreground">
                {filteredPayslips.length} funcionário(s)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar funcionário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            Carregando...
          </div>
        ) : filteredPayslips.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Nenhum holerite gerado</p>
            <p className="text-sm">Clique em "Gerar Holerites" para calcular a folha</p>
          </div>
        ) : (
          <>
            {/* Barra de ações para selecionados - só mostra se não estiver tudo pago */}
            {!allPaid && selectedPayslipIds.length > 0 && (
              <div className="mb-4 p-3 bg-primary/10 rounded-lg flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedPayslipIds.length} holerite(s) selecionado(s)
                </span>
                <div className="flex gap-2">
                  {/* Botão Aprovar - só mostra se há holerites CALCULATED selecionados */}
                  {selectedForApproval.length > 0 && (
                    <Can permission={PERMISSIONS.PAYROLL_APPROVE}>
                      <Button 
                        size="sm" 
                        onClick={handleApproveSelected}
                        disabled={isApproving}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isApproving ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Aprovar ({selectedForApproval.length})
                      </Button>
                    </Can>
                  )}
                  {/* Botão Pagar - só mostra se há holerites ACCEPTED selecionados */}
                  {selectedForPayment.length > 0 && (
                    <Can permission={PERMISSIONS.PAYROLL_PAY}>
                      <Button 
                        size="sm" 
                        onClick={handlePaySelected}
                        disabled={isPaying}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {isPaying ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Banknote className="h-4 w-4 mr-2" />
                        )}
                        Pagar ({selectedForPayment.length})
                      </Button>
                    </Can>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setSelectedPayslipIds([])}
                  >
                    Limpar Seleção
                  </Button>
                </div>
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    {/* Coluna de checkbox - só mostra se não estiver tudo pago */}
                    {!allPaid && (
                      <th className="px-4 py-3 text-center w-10">
                        <input
                          type="checkbox"
                          checked={selectedPayslipIds.length === selectablePayslips.length && selectablePayslips.length > 0}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-sm font-medium">Funcionário</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Cargo</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Salário Base</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Proventos</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Descontos</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Líquido</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Parcelas</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPayslips.map((payslip) => (
                    <tr 
                      key={payslip.id} 
                      className={`hover:bg-muted/30 transition-colors ${
                        selectedPayslipIds.includes(payslip.id) ? 'bg-primary/5' : ''
                      } ${payslip.status === 'REJECTED' ? 'bg-red-50 dark:bg-red-950/20' : ''}`}
                    >
                      {/* Checkbox - só mostra se não estiver tudo pago e se este não for PAID */}
                      {!allPaid && (
                        <td className="px-4 py-3 text-center">
                          {payslip.status !== 'PAID' ? (
                            <input
                              type="checkbox"
                              checked={selectedPayslipIds.includes(payslip.id)}
                              onChange={() => togglePayslipSelection(payslip.id)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{payslip.employeeName}</p>
                          <p className="text-xs text-muted-foreground">
                            Matrícula: {payslip.employeeRegistration}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {payslip.employeePosition || '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {formatCurrency(payslip.baseSalary)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-green-600">
                        {formatCurrency(payslip.totalEarnings)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-red-600">
                        {formatCurrency(payslip.totalDeductions)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(payslip.netSalary)}
                      </td>
                      {/* Coluna de Parcelas */}
                      <td className="px-4 py-3 text-center">
                        {payslip.installments && payslip.installments.length > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1">
                              {payslip.installments.map((inst, idx) => (
                                <div
                                  key={inst.id}
                                  className={`w-3 h-3 rounded-full ${
                                    inst.paidAt ? 'bg-emerald-500' : 'bg-gray-300'
                                  }`}
                                  title={`Parcela ${inst.installmentNumber}: ${formatCurrency(inst.amount)} - ${
                                    inst.paidAt ? 'Pago' : `Vence ${new Date(inst.dueDate).toLocaleDateString('pt-BR')}`
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {payslip.installments.filter(i => i.paidAt).length}/{payslip.installments.length}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          payslip.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500' :
                          payslip.status === 'ACCEPTED' ? 'bg-teal-500/10 text-teal-500' :
                          payslip.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                          payslip.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' :
                          payslip.status === 'CALCULATED' ? 'bg-blue-500/10 text-blue-500' :
                          'bg-gray-500/10 text-gray-500'
                        }`}>
                          {payslip.status === 'PAID' ? 'Pago' :
                           payslip.status === 'ACCEPTED' ? (
                             <>
                               <ThumbsUp className="h-3 w-3" />
                               Aceito
                             </>
                           ) :
                           payslip.status === 'REJECTED' ? (
                             <>
                               <ThumbsDown className="h-3 w-3" />
                               Rejeitado
                             </>
                           ) :
                           payslip.status === 'APPROVED' ? 'Aprovado' :
                           payslip.status === 'CALCULATED' ? 'Calculado' :
                           'Pendente'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openPayslipModal(payslip)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {/* Botão especial para holerite rejeitado */}
                          {payslip.status === 'REJECTED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => openRejectedPayslipModal(payslip)}
                              title="Ver motivo da rejeição"
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/50 font-semibold">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right">TOTAIS:</td>
                    <td className="px-4 py-3 text-right text-green-600">
                      {formatCurrency(payroll?.totalGross || 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      {formatCurrency(payroll?.totalDeductions || 0)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(payroll?.totalNet || 0)}
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal de Holerite Detalhado */}
      {showPayslipModal && selectedPayslip && (
        <PayslipModal
          payslip={selectedPayslip}
          month={currentMonth}
          year={currentYear}
          onClose={() => {
            setShowPayslipModal(false)
            setSelectedPayslip(null)
          }}
        />
      )}

      {/* Modal de Holerite Rejeitado */}
      {showRejectedModal && rejectedPayslip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border bg-red-50 dark:bg-red-950/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-red-500/10">
                    <ThumbsDown className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">
                      Holerite Rejeitado
                    </h2>
                    <p className="text-sm text-red-600 dark:text-red-300">
                      {rejectedPayslip.employeeName}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowRejectedModal(false)
                    setRejectedPayslip(null)
                  }}
                >
                  ✕
                </Button>
              </div>
            </div>

            {/* Motivo da Rejeição */}
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border-b border-red-200 dark:border-red-900">
              <h3 className="text-sm font-medium text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Motivo da Rejeição:
              </h3>
              <p className="text-red-800 dark:text-red-200 bg-white dark:bg-red-950/50 p-3 rounded border border-red-200 dark:border-red-800">
                {rejectedPayslip.rejectionReason || 'Motivo não informado'}
              </p>
              {rejectedPayslip.rejectedAt && (
                <p className="text-xs text-red-500 mt-2">
                  Rejeitado em: {new Date(rejectedPayslip.rejectedAt).toLocaleString('pt-BR')}
                </p>
              )}
            </div>

            {/* Conteúdo do Holerite */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {/* Resumo */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Salário Base</p>
                    <p className="text-lg font-semibold">{formatCurrency(rejectedPayslip.baseSalary)}</p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <p className="text-xs text-green-600">Total Proventos</p>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(rejectedPayslip.totalEarnings)}</p>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                    <p className="text-xs text-red-600">Total Descontos</p>
                    <p className="text-lg font-semibold text-red-600">{formatCurrency(rejectedPayslip.totalDeductions)}</p>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <p className="text-xs text-blue-600">Líquido</p>
                    <p className="text-lg font-semibold text-blue-600">{formatCurrency(rejectedPayslip.netSalary)}</p>
                  </div>
                </div>

                {/* Detalhes */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Proventos */}
                  <div className="border border-border rounded-lg p-4">
                    <h4 className="font-medium text-green-600 mb-3">Proventos</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Salário Base</span>
                        <span>{formatCurrency(rejectedPayslip.baseSalary)}</span>
                      </div>
                      {(rejectedPayslip.overtimeValue || 0) > 0 && (
                        <div className="flex justify-between">
                          <span>Horas Extras</span>
                          <span>{formatCurrency(rejectedPayslip.overtimeValue || 0)}</span>
                        </div>
                      )}
                      {(rejectedPayslip.bonusValue || 0) > 0 && (
                        <div className="flex justify-between">
                          <span>Bônus/Gratificações</span>
                          <span>{formatCurrency(rejectedPayslip.bonusValue || 0)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Descontos */}
                  <div className="border border-border rounded-lg p-4">
                    <h4 className="font-medium text-red-600 mb-3">Descontos</h4>
                    <div className="space-y-2 text-sm">
                      {rejectedPayslip.inssValue > 0 && (
                        <div className="flex justify-between">
                          <span>INSS ({rejectedPayslip.inssRate}%)</span>
                          <span>{formatCurrency(rejectedPayslip.inssValue)}</span>
                        </div>
                      )}
                      {rejectedPayslip.irValue > 0 && (
                        <div className="flex justify-between">
                          <span>IR ({rejectedPayslip.irRate}%)</span>
                          <span>{formatCurrency(rejectedPayslip.irValue)}</span>
                        </div>
                      )}
                      {rejectedPayslip.transportVoucher > 0 && (
                        <div className="flex justify-between">
                          <span>Vale-Transporte</span>
                          <span>{formatCurrency(rejectedPayslip.transportVoucher)}</span>
                        </div>
                      )}
                      {rejectedPayslip.mealVoucher > 0 && (
                        <div className="flex justify-between">
                          <span>Vale-Refeição</span>
                          <span>{formatCurrency(rejectedPayslip.mealVoucher)}</span>
                        </div>
                      )}
                      {rejectedPayslip.healthInsurance > 0 && (
                        <div className="flex justify-between">
                          <span>Plano de Saúde</span>
                          <span>{formatCurrency(rejectedPayslip.healthInsurance)}</span>
                        </div>
                      )}
                      {rejectedPayslip.dentalInsurance > 0 && (
                        <div className="flex justify-between">
                          <span>Plano Odontológico</span>
                          <span>{formatCurrency(rejectedPayslip.dentalInsurance)}</span>
                        </div>
                      )}
                      {rejectedPayslip.absenceValue > 0 && (
                        <div className="flex justify-between">
                          <span>Faltas ({rejectedPayslip.absenceDays} dias)</span>
                          <span>{formatCurrency(rejectedPayslip.absenceValue)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer com ações */}
            <div className="p-4 border-t border-border bg-muted/30 flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Após corrigir o holerite, você pode reaprová-lo para enviar novamente ao funcionário.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectedModal(false)
                    setRejectedPayslip(null)
                  }}
                >
                  Fechar
                </Button>
                <Can permission={PERMISSIONS.PAYROLL_APPROVE}>
                  <Button
                    onClick={handleReapprove}
                    disabled={isReapproving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isReapproving ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Reaprovar Holerite
                  </Button>
                </Can>
              </div>
            </div>
          </div>
        </div>
      )}
      </PageContainer>
    </ProtectedPage>
  )
}

// Componente de Card de Resumo
function SummaryCard({ title, value, icon, color, description }: {
  title: string
  value: string
  icon: React.ReactNode
  color: 'green' | 'red' | 'blue' | 'purple' | 'yellow'
  description?: string
}) {
  const colorClasses = {
    green: 'bg-green-500/10 text-green-500',
    red: 'bg-red-500/10 text-red-500',
    blue: 'bg-blue-500/10 text-blue-500',
    purple: 'bg-purple-500/10 text-purple-500',
    yellow: 'bg-yellow-500/10 text-yellow-500',
  }

  return (
    <div className="border border-border rounded-lg bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  )
}

// Modal de Holerite Detalhado
function PayslipModal({ payslip, month, year, onClose, onAccept, onReject, isEmployee = false }: {
  payslip: Payslip
  month: number
  year: number
  onClose: () => void
  onAccept?: () => void
  onReject?: (reason: string) => void
  isEmployee?: boolean
}) {
  const [showRejectForm, setShowRejectForm] = React.useState(false)
  const [rejectReason, setRejectReason] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Informe o motivo da rejeição')
      return
    }
    setIsSubmitting(true)
    try {
      if (onReject) {
        await onReject(rejectReason)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAccept = async () => {
    setIsSubmitting(true)
    try {
      if (onAccept) {
        await onAccept()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      {/* Container com barra de rolagem fina e quase transparente */}
      <div 
        className="bg-card border border-border rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto payslip-modal-scroll"
      >
        
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Holerite</h2>
              <p className="text-sm text-muted-foreground">
                {MONTH_NAMES[month - 1]} de {year}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              ✕
            </Button>
          </div>
        </div>

        {/* Dados do Funcionário */}
        <div className="p-6 border-b border-border bg-muted/30">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Nome</p>
              <p className="font-semibold">{payslip.employeeName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Matrícula</p>
              <p className="font-semibold">{payslip.employeeRegistration}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cargo</p>
              <p className="font-semibold">{payslip.employeePosition || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Departamento</p>
              <p className="font-semibold">{payslip.employeeDepartment || '-'}</p>
            </div>
          </div>
        </div>

        {/* PROVENTOS (Rendimentos) */}
        <div className="p-6 border-b border-border">
          <h3 className="font-semibold text-green-600 mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            PROVENTOS
          </h3>
          <div className="space-y-2">
            <PayslipLine label="Salário Base" value={payslip.baseSalary} />
            
            {/* Horas Extras */}
            {payslip.overtimeValue50 > 0 && (
              <PayslipLine 
                label={`Hora Extra 50% (${Number(payslip.overtimeHours50).toFixed(1)}h)`} 
                value={payslip.overtimeValue50} 
              />
            )}
            {payslip.overtimeValue100 > 0 && (
              <PayslipLine 
                label={`Hora Extra 100% (${Number(payslip.overtimeHours100).toFixed(1)}h)`} 
                value={payslip.overtimeValue100} 
              />
            )}
            
            {/* Adicional Noturno */}
            {payslip.nightShiftValue > 0 && (
              <PayslipLine 
                label={`Adicional Noturno (${Number(payslip.nightShiftHours).toFixed(1)}h)`} 
                value={payslip.nightShiftValue} 
              />
            )}
            
            {/* Periculosidade */}
            {payslip.hazardPay > 0 && (
              <PayslipLine label="Adicional de Periculosidade" value={payslip.hazardPay} />
            )}
            
            {/* Insalubridade */}
            {payslip.unhealthyPay > 0 && (
              <PayslipLine label="Adicional de Insalubridade" value={payslip.unhealthyPay} />
            )}
            
            {/* Bônus */}
            {payslip.bonus > 0 && (
              <PayslipLine label="Bônus/Gratificação" value={payslip.bonus} />
            )}
            
            {/* Outros Proventos */}
            {payslip.otherEarnings > 0 && (
              <PayslipLine 
                label={payslip.otherEarningsDesc || 'Outros Proventos'} 
                value={payslip.otherEarnings} 
              />
            )}
            
            <div className="border-t border-border pt-2 mt-2">
              <PayslipLine label="Total de Proventos" value={payslip.totalEarnings} bold positive />
            </div>
          </div>
        </div>

        {/* DESCONTOS */}
        <div className="p-6 border-b border-border">
          <h3 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            DESCONTOS
          </h3>
          <div className="space-y-2">
            {/* INSS - sempre mostra se tiver valor */}
            {Number(payslip.inssValue || 0) > 0 && (
              <PayslipLine 
                label={`INSS (${Number(payslip.inssRate || 0).toFixed(1)}% s/ ${formatCurrency(payslip.inssBase || payslip.totalEarnings)})`} 
                value={-Number(payslip.inssValue)} 
                negative 
              />
            )}
            
            {/* IRRF */}
            {Number(payslip.irValue || 0) > 0 && (
              <PayslipLine 
                label={`IRRF (${Number(payslip.irRate || 0).toFixed(1)}% s/ ${formatCurrency(payslip.irBase || 0)})`} 
                value={-Number(payslip.irValue)} 
                negative 
              />
            )}
            
            {/* Vale-Transporte */}
            {Number(payslip.transportVoucher || 0) > 0 && (
              <PayslipLine 
                label="Vale-Transporte (6%)" 
                value={-Number(payslip.transportVoucher)} 
                negative 
              />
            )}
            
            {/* Vale-Refeição */}
            {Number(payslip.mealVoucher || 0) > 0 && (
              <PayslipLine 
                label="Vale-Refeição" 
                value={-Number(payslip.mealVoucher)} 
                negative 
              />
            )}
            
            {/* Plano de Saúde */}
            {Number(payslip.healthInsurance || 0) > 0 && (
              <PayslipLine 
                label="Plano de Saúde" 
                value={-Number(payslip.healthInsurance)} 
                negative 
              />
            )}
            
            {/* Plano Odontológico */}
            {Number(payslip.dentalInsurance || 0) > 0 && (
              <PayslipLine 
                label="Plano Odontológico" 
                value={-Number(payslip.dentalInsurance)} 
                negative 
              />
            )}
            
            {/* Contribuição Sindical */}
            {Number(payslip.unionContribution || 0) > 0 && (
              <PayslipLine 
                label="Contribuição Sindical" 
                value={-Number(payslip.unionContribution)} 
                negative 
              />
            )}
            
            {/* Empréstimo Consignado */}
            {Number(payslip.loanDeduction || 0) > 0 && (
              <PayslipLine 
                label="Empréstimo Consignado" 
                value={-Number(payslip.loanDeduction)} 
                negative 
              />
            )}
            
            {/* Adiantamento Salarial */}
            {Number(payslip.salaryAdvanceValue || 0) > 0 && (
              <PayslipLine 
                label="Adiantamento Salarial" 
                value={-Number(payslip.salaryAdvanceValue)} 
                negative 
              />
            )}
            
            {/* Vales Avulsos */}
            {Number(payslip.extraAdvanceValue || 0) > 0 && (
              <PayslipLine 
                label="Vales Avulsos" 
                value={-Number(payslip.extraAdvanceValue)} 
                negative 
              />
            )}
            
            {/* Faltas */}
            {Number(payslip.absenceValue || 0) > 0 && (
              <PayslipLine 
                label={`Faltas (${payslip.absenceDays || 0} dia${(payslip.absenceDays || 0) > 1 ? 's' : ''})`} 
                value={-Number(payslip.absenceValue)} 
                negative 
              />
            )}
            
            {/* Atrasos */}
            {Number(payslip.lateValue || 0) > 0 && (
              <PayslipLine 
                label={`Atrasos (${payslip.lateMinutes || 0} min)`} 
                value={-Number(payslip.lateValue)} 
                negative 
              />
            )}
            
            {/* Outros Descontos */}
            {Number(payslip.otherDeductions || 0) > 0 && (
              <PayslipLine 
                label={payslip.otherDeductionsDesc || 'Outros Descontos'} 
                value={-Number(payslip.otherDeductions)} 
                negative 
              />
            )}
            
            <div className="border-t border-border pt-2 mt-2">
              <PayslipLine label="Total de Descontos" value={-payslip.totalDeductions} negative bold />
            </div>
          </div>
        </div>

        {/* FGTS (informativo - NÃO é desconto do funcionário) */}
        {payslip.fgtsValue > 0 && (
          <div className="p-6 border-b border-border bg-blue-500/5">
            <h3 className="font-semibold text-blue-600 mb-3 flex items-center gap-2">
              <PiggyBank className="h-4 w-4" />
              FGTS (INFORMATIVO)
            </h3>
            <div className="space-y-1">
              <PayslipLine 
                label={`Base de cálculo`} 
                value={payslip.fgtsBase || payslip.totalEarnings} 
                info 
              />
              <PayslipLine 
                label="Depósito FGTS (8%)" 
                value={payslip.fgtsValue} 
                info 
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">
              * O FGTS não é descontado do funcionário. É uma obrigação da empresa depositada em conta vinculada.
            </p>
          </div>
        )}

        {/* RESUMO FINAL */}
        <div className="p-6 bg-muted/30">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total de Proventos:</span>
              <span className="text-green-600 font-medium">{formatCurrency(payslip.totalEarnings)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total de Descontos:</span>
              <span className="text-red-600 font-medium">- {formatCurrency(payslip.totalDeductions)}</span>
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">VALOR LÍQUIDO A RECEBER:</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(payslip.netSalary)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Informações adicionais */}
        <div className="p-6 border-t border-border">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{payslip.workedDays} dias trabalhados</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{Number(payslip.workedHours).toFixed(0)}h trabalhadas</span>
            </div>
          </div>
        </div>

        {/* Formulário de rejeição (se ativo) */}
        {showRejectForm && (
          <div className="p-6 border-t border-border bg-red-50 dark:bg-red-950/20">
            <h4 className="font-medium text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
              <ThumbsDown className="h-4 w-4" />
              Informe o motivo da rejeição:
            </h4>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Descreva o que está incorreto no holerite..."
              className="w-full p-3 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-red-950/30 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setShowRejectForm(false)
                  setRejectReason('')
                }}
              >
                Cancelar
              </Button>
              <Button 
                size="sm"
                onClick={handleReject}
                disabled={isSubmitting || !rejectReason.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                {isSubmitting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ThumbsDown className="h-4 w-4 mr-2" />
                )}
                Confirmar Rejeição
              </Button>
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="p-6 border-t border-border flex justify-between items-center">
          <div>
            {/* Mostrar status atual */}
            {payslip.status === 'APPROVED' && isEmployee && (
              <p className="text-sm text-muted-foreground">
                Revise os valores e confirme se está tudo correto.
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            
            {/* Botões de aceitar/rejeitar (só para funcionário com status APPROVED) */}
            {isEmployee && payslip.status === 'APPROVED' && !showRejectForm && (
              <>
                <Button 
                  variant="outline"
                  onClick={() => setShowRejectForm(true)}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Rejeitar
                </Button>
                <Button 
                  onClick={handleAccept}
                  disabled={isSubmitting}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {isSubmitting ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ThumbsUp className="h-4 w-4 mr-2" />
                  )}
                  Aceitar Holerite
                </Button>
              </>
            )}
            
            {/* Botão de download (sempre visível) */}
            {!showRejectForm && (
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Baixar PDF
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Linha do holerite
function PayslipLine({ label, value, negative, positive, bold, info }: {
  label: string
  value: number
  negative?: boolean
  positive?: boolean
  bold?: boolean
  info?: boolean
}) {
  const colorClass = negative ? 'text-red-600' : positive ? 'text-green-600' : info ? 'text-blue-600' : 'text-foreground'
  const fontClass = bold ? 'font-semibold' : ''

  return (
    <div className={`flex items-center justify-between ${fontClass}`}>
      <span className="text-sm">{label}</span>
      <span className={`text-sm ${colorClass}`}>
        {negative ? '-' : ''}{formatCurrency(Math.abs(value))}
      </span>
    </div>
  )
}
