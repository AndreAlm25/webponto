"use client"
// Código em INGLÊS; textos da UI em PORTUGUÊS
import React, { useEffect, useState, useCallback } from 'react'
import { notFound } from 'next/navigation'
import { useCompanySlug } from '@/hooks/useCompanySlug'
import { SlugMismatchError } from '@/components/admin/SlugMismatchError'
import PageHeader from '@/components/admin/PageHeader'
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
  employee?: {
    user?: { name: string; avatarUrl: string | null }
  }
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

  // Filtrar holerites
  const filteredPayslips = payroll?.payslips?.filter((p) =>
    p.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.employeeRegistration.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  // Abrir modal de holerite
  const openPayslipModal = (payslip: Payslip) => {
    // Debug: verificar dados do holerite
    console.log('=== DADOS DO HOLERITE ===')
    console.log('Funcionário:', payslip.employeeName)
    console.log('Salário Base:', payslip.baseSalary)
    console.log('Total Proventos:', payslip.totalEarnings)
    console.log('INSS:', payslip.inssValue, '(', payslip.inssRate, '%)')
    console.log('IR:', payslip.irValue, '(', payslip.irRate, '%)')
    console.log('Vale-Transporte:', payslip.transportVoucher)
    console.log('Vale-Refeição:', payslip.mealVoucher)
    console.log('Plano Saúde:', payslip.healthInsurance)
    console.log('Plano Odonto:', payslip.dentalInsurance)
    console.log('Faltas:', payslip.absenceDays, 'dias =', payslip.absenceValue)
    console.log('Total Descontos:', payslip.totalDeductions)
    console.log('Líquido:', payslip.netSalary)
    console.log('=========================')
    
    setSelectedPayslip(payslip)
    setShowPayslipModal(true)
  }

  return (
    <>
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

      {/* Navegação de Mês */}
      <div className="flex items-center justify-between mb-6">
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
        )}
        
        {payroll?.status === 'REVIEW' && (
          <>
            <Button onClick={handleGenerate} variant="outline" disabled={isGenerating}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Recalcular
            </Button>
            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprovar Folha
            </Button>
          </>
        )}
        
        {payroll?.status === 'APPROVED' && (
          <Button onClick={handleMarkAsPaid} className="bg-emerald-600 hover:bg-emerald-700">
            <DollarSign className="h-4 w-4 mr-2" />
            Marcar como Paga
          </Button>
        )}

        <Button variant="outline" onClick={fetchPayroll}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>

        <Link href={`${base}/configuracoes/folha-pagamento`}>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </Button>
        </Link>
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Funcionário</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Cargo</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Salário Base</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Proventos</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Descontos</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Líquido</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPayslips.map((payslip) => (
                  <tr key={payslip.id} className="hover:bg-muted/30 transition-colors">
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
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openPayslipModal(payslip)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/50 font-semibold">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right">TOTAIS:</td>
                  <td className="px-4 py-3 text-right text-green-600">
                    {formatCurrency(payroll?.totalGross || 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-red-600">
                    {formatCurrency(payroll?.totalDeductions || 0)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(payroll?.totalNet || 0)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
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
    </>
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
function PayslipModal({ payslip, month, year, onClose }: {
  payslip: Payslip
  month: number
  year: number
  onClose: () => void
}) {
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

        {/* Ações */}
        <div className="p-6 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Baixar PDF
          </Button>
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
