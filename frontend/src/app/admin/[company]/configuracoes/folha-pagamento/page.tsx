"use client"
// Código em INGLÊS; textos da UI em PORTUGUÊS
import React, { useEffect, useState, useCallback } from 'react'
import { notFound } from 'next/navigation'
import { useCompanySlug } from '@/hooks/useCompanySlug'
import { SlugMismatchError } from '@/components/admin/SlugMismatchError'
import PageHeader from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  Settings,
  Save,
  RefreshCw,
  DollarSign,
  Percent,
  Calendar,
  Clock,
  Shield,
  Gift,
  Plus,
  Trash2,
  Users,
  Search,
  X,
  Check,
  Moon,
  Wallet,
  CreditCard,
  Edit,
  UserPlus,
} from 'lucide-react'

// Tipos
interface PayrollConfig {
  id: string
  // Frequência e dias de pagamento
  paymentFrequency: string
  paymentDay1: number
  paymentDay2: number | null
  paymentDayOfWeek: number | null
  // Encargos
  enableInss: boolean
  enableIrrf: boolean
  enableFgts: boolean
  // Adicional noturno
  enableNightShift: boolean
  nightShiftStart: string
  nightShiftEnd: string
  nightShiftPercentage: number
  // Adiantamento salarial
  enableSalaryAdvance: boolean
  salaryAdvanceDay: number | null
  salaryAdvancePercentage: number | null
  // Vale avulso
  enableExtraAdvance: boolean
  maxExtraAdvancePercentage: number | null
  // Benefícios
  enableTransportVoucher: boolean
  transportVoucherRate: number
  enableMealVoucher: boolean
  mealVoucherValue: number
  mealVoucherDiscount: number
  enableHealthInsurance: boolean
  healthInsuranceValue: number
  enableDentalInsurance: boolean
  dentalInsuranceValue: number
  enable13thSalary: boolean
  enableVacationBonus: boolean
  // Cálculo
  workDaysPerMonth: number
  workHoursPerDay: number
}

interface PaymentGroup {
  id: string
  name: string
  description: string | null
  paymentDay1: number
  paymentDay2: number | null
  advanceDay: number | null
  advancePercentage: number | null
  active: boolean
  employeeCount: number
  employees: Array<{
    id: string
    user: { name: string } | null
    position: { name: string } | null
  }>
}

interface CustomBenefit {
  id: string
  name: string
  description: string | null
  value: number
  type: 'EARNING' | 'DEDUCTION'
  active: boolean
  employeeCount: number
}

interface Employee {
  id: string
  employeeId: string
  name: string
  position: string | null
  avatarUrl: string | null
  customValue: number | null
}

// Frequência de pagamento
const PAYMENT_FREQUENCIES = [
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'BIWEEKLY', label: 'Quinzenal' },
  { value: 'MONTHLY', label: 'Mensal' },
]

export default function PayrollConfigPage({ params }: { params: { company: string } }) {
  const { company } = params
  const { companyId, companySlug, slugMismatch, loading } = useCompanySlug()
  
  // Estado
  const [config, setConfig] = useState<PayrollConfig | null>(null)
  const [benefits, setBenefits] = useState<CustomBenefit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  // Modal de benefício
  const [showBenefitModal, setShowBenefitModal] = useState(false)
  const [editingBenefit, setEditingBenefit] = useState<CustomBenefit | null>(null)
  const [benefitForm, setBenefitForm] = useState({
    name: '',
    description: '',
    value: 0,
    type: 'EARNING' as 'EARNING' | 'DEDUCTION',
  })
  
  // Modal de funcionários do benefício
  const [showEmployeesModal, setShowEmployeesModal] = useState(false)
  const [selectedBenefit, setSelectedBenefit] = useState<CustomBenefit | null>(null)
  const [benefitEmployees, setBenefitEmployees] = useState<Employee[]>([])
  const [allEmployees, setAllEmployees] = useState<any[]>([])
  const [employeeSearch, setEmployeeSearch] = useState('')
  
  if (!company) notFound()
  
  if (slugMismatch) {
    return <SlugMismatchError urlSlug={company} correctSlug={companySlug} currentPath={`/admin/${company}/folha-pagamento/configuracoes`} />
  }

  const base = company ? `/admin/${encodeURIComponent(company)}` : '/admin'

  // Buscar configurações
  const fetchConfig = useCallback(async () => {
    if (!companyId) return
    
    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const [configRes, benefitsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payroll/config?companyId=${companyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payroll/benefits?companyId=${companyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])
      
      if (configRes.ok) {
        const data = await configRes.json()
        setConfig(data.config)
      }
      
      if (benefitsRes.ok) {
        const data = await benefitsRes.json()
        setBenefits(data.benefits)
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error)
      toast.error('Erro ao carregar configurações')
    } finally {
      setIsLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  // Salvar configurações
  const handleSaveConfig = async () => {
    if (!config || !companyId) return
    
    setIsSaving(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/config?companyId=${companyId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(config),
        }
      )
      
      if (response.ok) {
        toast.success('Configurações salvas com sucesso!')
      } else {
        toast.error('Erro ao salvar configurações')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar configurações')
    } finally {
      setIsSaving(false)
    }
  }

  // Criar/Editar benefício
  const handleSaveBenefit = async () => {
    if (!companyId) return
    
    try {
      const token = localStorage.getItem('token')
      const url = editingBenefit
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/benefits/${editingBenefit.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/benefits?companyId=${companyId}`
      
      const response = await fetch(url, {
        method: editingBenefit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(benefitForm),
      })
      
      if (response.ok) {
        toast.success(editingBenefit ? 'Benefício atualizado!' : 'Benefício criado!')
        setShowBenefitModal(false)
        setEditingBenefit(null)
        setBenefitForm({ name: '', description: '', value: 0, type: 'EARNING' })
        fetchConfig()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao salvar benefício')
      }
    } catch (error) {
      console.error('Erro ao salvar benefício:', error)
      toast.error('Erro ao salvar benefício')
    }
  }

  // Excluir benefício
  const handleDeleteBenefit = async (benefitId: string) => {
    if (!confirm('Tem certeza que deseja excluir este benefício?')) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/benefits/${benefitId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      
      if (response.ok) {
        toast.success('Benefício excluído!')
        fetchConfig()
      } else {
        toast.error('Erro ao excluir benefício')
      }
    } catch (error) {
      console.error('Erro ao excluir:', error)
      toast.error('Erro ao excluir benefício')
    }
  }

  // Abrir modal de funcionários
  const openEmployeesModal = async (benefit: CustomBenefit) => {
    setSelectedBenefit(benefit)
    setShowEmployeesModal(true)
    
    try {
      const token = localStorage.getItem('token')
      
      // Buscar funcionários do benefício
      const benefitRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/benefits/${benefit.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (benefitRes.ok) {
        const data = await benefitRes.json()
        setBenefitEmployees(data.benefit.employees)
      }
      
      // Buscar todos os funcionários
      const employeesRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/employees?companyId=${companyId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (employeesRes.ok) {
        const data = await employeesRes.json()
        setAllEmployees(data.employees || data)
      }
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error)
    }
  }

  // Adicionar funcionário ao benefício
  const addEmployeeToBenefit = async (employeeId: string) => {
    if (!selectedBenefit) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/benefits/${selectedBenefit.id}/employees`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ employeeId }),
        }
      )
      
      if (response.ok) {
        toast.success('Funcionário adicionado!')
        openEmployeesModal(selectedBenefit)
        fetchConfig()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao adicionar funcionário')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao adicionar funcionário')
    }
  }

  // Remover funcionário do benefício
  const removeEmployeeFromBenefit = async (employeeId: string) => {
    if (!selectedBenefit) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/benefits/${selectedBenefit.id}/employees/${employeeId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      
      if (response.ok) {
        toast.success('Funcionário removido!')
        openEmployeesModal(selectedBenefit)
        fetchConfig()
      } else {
        toast.error('Erro ao remover funcionário')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao remover funcionário')
    }
  }

  // Filtrar funcionários disponíveis
  const availableEmployees = allEmployees.filter(
    (emp) => !benefitEmployees.some((be) => be.employeeId === emp.id)
  ).filter(
    (emp) => emp.user?.name?.toLowerCase().includes(employeeSearch.toLowerCase())
  )

  // Formatar valor monetário
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Configurações da Folha"
        description="Configure encargos, benefícios e parâmetros de cálculo"
        icon={<Settings className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Admin', href: base },
          { label: 'Configurações' },
          { label: 'Folha de Pagamento' }
        ]}
      />

      <div className="space-y-6">
        {/* Configurações Gerais */}
        <div className="border border-border rounded-lg bg-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Configurações Gerais
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Frequência de Pagamento</Label>
              <select
                className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background"
                value={config?.paymentFrequency || 'MONTHLY'}
                onChange={(e) => setConfig({ ...config!, paymentFrequency: e.target.value })}
              >
                {PAYMENT_FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            
            {/* Dias de pagamento dinâmicos conforme frequência */}
            {config?.paymentFrequency === 'MONTHLY' && (
              <div>
                <Label>Dia do Pagamento</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={config?.paymentDay1 || 5}
                  onChange={(e) => setConfig({ ...config!, paymentDay1: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
            )}
            
            {config?.paymentFrequency === 'BIWEEKLY' && (
              <>
                <div>
                  <Label>1º Dia de Pagamento</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={config?.paymentDay1 || 5}
                    onChange={(e) => setConfig({ ...config!, paymentDay1: parseInt(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>2º Dia de Pagamento</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={config?.paymentDay2 || 20}
                    onChange={(e) => setConfig({ ...config!, paymentDay2: parseInt(e.target.value) })}
                    className="mt-1"
                  />
                </div>
              </>
            )}
            
            {config?.paymentFrequency === 'WEEKLY' && (
              <div>
                <Label>Dia da Semana</Label>
                <select
                  className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background"
                  value={config?.paymentDayOfWeek ?? 5}
                  onChange={(e) => setConfig({ ...config!, paymentDayOfWeek: parseInt(e.target.value) })}
                >
                  <option value={0}>Domingo</option>
                  <option value={1}>Segunda-feira</option>
                  <option value={2}>Terça-feira</option>
                  <option value={3}>Quarta-feira</option>
                  <option value={4}>Quinta-feira</option>
                  <option value={5}>Sexta-feira</option>
                  <option value={6}>Sábado</option>
                </select>
              </div>
            )}
            
            <div>
              <Label>Dias Úteis/Mês (padrão)</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={config?.workDaysPerMonth || 22}
                onChange={(e) => setConfig({ ...config!, workDaysPerMonth: parseInt(e.target.value) })}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Usado como fallback se funcionário não tiver horário definido</p>
            </div>
            
            <div>
              <Label>Horas/Dia (padrão)</Label>
              <Input
                type="number"
                min={1}
                max={24}
                step={0.5}
                value={config?.workHoursPerDay || 8}
                onChange={(e) => setConfig({ ...config!, workHoursPerDay: parseFloat(e.target.value) })}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Encargos Obrigatórios */}
        <div className="border border-border rounded-lg bg-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Encargos (Ativar/Desativar)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <p className="font-medium">INSS</p>
                <p className="text-sm text-muted-foreground">Desconto do funcionário (7,5% a 14%)</p>
              </div>
              <Switch
                checked={config?.enableInss || false}
                onCheckedChange={(checked) => setConfig({ ...config!, enableInss: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <p className="font-medium">IRRF</p>
                <p className="text-sm text-muted-foreground">Imposto de Renda Retido na Fonte</p>
              </div>
              <Switch
                checked={config?.enableIrrf || false}
                onCheckedChange={(checked) => setConfig({ ...config!, enableIrrf: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <p className="font-medium">FGTS</p>
                <p className="text-sm text-muted-foreground">Obrigação da empresa (8%)</p>
              </div>
              <Switch
                checked={config?.enableFgts || false}
                onCheckedChange={(checked) => setConfig({ ...config!, enableFgts: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <p className="font-medium">13º Salário</p>
                <p className="text-sm text-muted-foreground">Provisionar 13º salário</p>
              </div>
              <Switch
                checked={config?.enable13thSalary || false}
                onCheckedChange={(checked) => setConfig({ ...config!, enable13thSalary: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <p className="font-medium">Férias + 1/3</p>
                <p className="text-sm text-muted-foreground">Provisionar férias</p>
              </div>
              <Switch
                checked={config?.enableVacationBonus || false}
                onCheckedChange={(checked) => setConfig({ ...config!, enableVacationBonus: checked })}
              />
            </div>
          </div>
        </div>

        {/* Adicional Noturno */}
        <div className="border border-border rounded-lg bg-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Adicional Noturno
          </h2>
          
          <div className="flex items-center justify-between p-4 border border-border rounded-lg mb-4">
            <div>
              <p className="font-medium">Habilitar Adicional Noturno</p>
              <p className="text-sm text-muted-foreground">Calcular adicional para horas trabalhadas no período noturno (CLT: 22h às 05h = +20%)</p>
            </div>
            <Switch
              checked={config?.enableNightShift || false}
              onCheckedChange={(checked) => setConfig({ ...config!, enableNightShift: checked })}
            />
          </div>
          
          {config?.enableNightShift && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Início do Horário Noturno</Label>
                <Input
                  type="time"
                  value={config?.nightShiftStart || '22:00'}
                  onChange={(e) => setConfig({ ...config!, nightShiftStart: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Fim do Horário Noturno</Label>
                <Input
                  type="time"
                  value={config?.nightShiftEnd || '05:00'}
                  onChange={(e) => setConfig({ ...config!, nightShiftEnd: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Percentual Adicional (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={config?.nightShiftPercentage || 20}
                  onChange={(e) => setConfig({ ...config!, nightShiftPercentage: parseFloat(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </div>

        {/* Adiantamento Salarial */}
        <div className="border border-border rounded-lg bg-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Adiantamento Salarial (Vale Fixo)
          </h2>
          
          <div className="flex items-center justify-between p-4 border border-border rounded-lg mb-4">
            <div>
              <p className="font-medium">Habilitar Adiantamento Salarial</p>
              <p className="text-sm text-muted-foreground">Pagamento automático de % do salário em data fixa (ex: dia 5 = 40%)</p>
            </div>
            <Switch
              checked={config?.enableSalaryAdvance || false}
              onCheckedChange={(checked) => setConfig({ ...config!, enableSalaryAdvance: checked })}
            />
          </div>
          
          {config?.enableSalaryAdvance && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Dia do Adiantamento</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={config?.salaryAdvanceDay || 5}
                  onChange={(e) => setConfig({ ...config!, salaryAdvanceDay: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Percentual do Salário (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={config?.salaryAdvancePercentage || 40}
                  onChange={(e) => setConfig({ ...config!, salaryAdvancePercentage: parseFloat(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </div>

        {/* Vale Avulso */}
        <div className="border border-border rounded-lg bg-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Vale Avulso (Sob Demanda)
          </h2>
          
          <div className="flex items-center justify-between p-4 border border-border rounded-lg mb-4">
            <div>
              <p className="font-medium">Habilitar Vale Avulso</p>
              <p className="text-sm text-muted-foreground">Permitir que funcionários solicitem adiantamentos avulsos (valor fixo)</p>
            </div>
            <Switch
              checked={config?.enableExtraAdvance || false}
              onCheckedChange={(checked) => setConfig({ ...config!, enableExtraAdvance: checked })}
            />
          </div>
          
          {config?.enableExtraAdvance && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Limite Máximo (% do salário)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={config?.maxExtraAdvancePercentage || 50}
                  onChange={(e) => setConfig({ ...config!, maxExtraAdvancePercentage: parseFloat(e.target.value) })}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Sistema alertará se funcionário ultrapassar este limite</p>
              </div>
            </div>
          )}
        </div>

        {/* Benefícios Padrão */}
        <div className="border border-border rounded-lg bg-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Benefícios Padrão
          </h2>
          
          <div className="space-y-4">
            {/* Vale-Transporte */}
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-4">
                  <Switch
                    checked={config?.enableTransportVoucher || false}
                    onCheckedChange={(checked) => setConfig({ ...config!, enableTransportVoucher: checked })}
                  />
                  <div>
                    <p className="font-medium">Vale-Transporte</p>
                    <p className="text-sm text-muted-foreground">Desconto do funcionário</p>
                  </div>
                </div>
              </div>
              {config?.enableTransportVoucher && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={config?.transportVoucherRate || 6}
                    onChange={(e) => setConfig({ ...config!, transportVoucherRate: parseFloat(e.target.value) })}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              )}
            </div>

            {/* Vale-Refeição */}
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-4">
                  <Switch
                    checked={config?.enableMealVoucher || false}
                    onCheckedChange={(checked) => setConfig({ ...config!, enableMealVoucher: checked })}
                  />
                  <div>
                    <p className="font-medium">Vale-Refeição</p>
                    <p className="text-sm text-muted-foreground">Valor e desconto do funcionário</p>
                  </div>
                </div>
              </div>
              {config?.enableMealVoucher && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Valor:</span>
                    <Input
                      type="number"
                      min={0}
                      step={10}
                      value={config?.mealVoucherValue || 0}
                      onChange={(e) => setConfig({ ...config!, mealVoucherValue: parseFloat(e.target.value) })}
                      className="w-24"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Desconto:</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={config?.mealVoucherDiscount || 0}
                      onChange={(e) => setConfig({ ...config!, mealVoucherDiscount: parseFloat(e.target.value) })}
                      className="w-20"
                    />
                    <span className="text-sm">%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Plano de Saúde */}
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-4">
                  <Switch
                    checked={config?.enableHealthInsurance || false}
                    onCheckedChange={(checked) => setConfig({ ...config!, enableHealthInsurance: checked })}
                  />
                  <div>
                    <p className="font-medium">Plano de Saúde</p>
                    <p className="text-sm text-muted-foreground">Desconto do funcionário</p>
                  </div>
                </div>
              </div>
              {config?.enableHealthInsurance && (
                <div className="flex items-center gap-2">
                  <span className="text-sm">R$</span>
                  <Input
                    type="number"
                    min={0}
                    step={10}
                    value={config?.healthInsuranceValue || 0}
                    onChange={(e) => setConfig({ ...config!, healthInsuranceValue: parseFloat(e.target.value) })}
                    className="w-24"
                  />
                </div>
              )}
            </div>

            {/* Plano Odontológico */}
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-4">
                  <Switch
                    checked={config?.enableDentalInsurance || false}
                    onCheckedChange={(checked) => setConfig({ ...config!, enableDentalInsurance: checked })}
                  />
                  <div>
                    <p className="font-medium">Plano Odontológico</p>
                    <p className="text-sm text-muted-foreground">Desconto do funcionário</p>
                  </div>
                </div>
              </div>
              {config?.enableDentalInsurance && (
                <div className="flex items-center gap-2">
                  <span className="text-sm">R$</span>
                  <Input
                    type="number"
                    min={0}
                    step={10}
                    value={config?.dentalInsuranceValue || 0}
                    onChange={(e) => setConfig({ ...config!, dentalInsuranceValue: parseFloat(e.target.value) })}
                    className="w-24"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <Button onClick={handleSaveConfig} disabled={isSaving}>
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>

        {/* Benefícios Personalizados */}
        <div className="border border-border rounded-lg bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Benefícios Personalizados
            </h2>
            <Button
              onClick={() => {
                setEditingBenefit(null)
                setBenefitForm({ name: '', description: '', value: 0, type: 'EARNING' })
                setShowBenefitModal(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Benefício
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">
            Crie benefícios personalizados (ex: Ajuda Aluguel, Auxílio Creche) e vincule aos funcionários que devem recebê-los.
          </p>

          {benefits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Gift className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum benefício personalizado cadastrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {benefits.map((benefit) => (
                <div
                  key={benefit.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${benefit.type === 'EARNING' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {benefit.type === 'EARNING' ? <Plus className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-medium">{benefit.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {benefit.type === 'EARNING' ? 'Provento' : 'Desconto'} • {formatCurrency(benefit.value)}
                          {benefit.description && ` • ${benefit.description}`}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEmployeesModal(benefit)}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      {benefit.employeeCount} funcionário(s)
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingBenefit(benefit)
                        setBenefitForm({
                          name: benefit.name,
                          description: benefit.description || '',
                          value: benefit.value,
                          type: benefit.type,
                        })
                        setShowBenefitModal(true)
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => handleDeleteBenefit(benefit.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Benefício */}
      {showBenefitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingBenefit ? 'Editar Benefício' : 'Novo Benefício'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label>Nome do Benefício</Label>
                <Input
                  placeholder="Ex: Ajuda Aluguel"
                  value={benefitForm.name}
                  onChange={(e) => setBenefitForm({ ...benefitForm, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label>Descrição (opcional)</Label>
                <Input
                  placeholder="Ex: Auxílio para moradia"
                  value={benefitForm.description}
                  onChange={(e) => setBenefitForm({ ...benefitForm, description: e.target.value })}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step={10}
                  value={benefitForm.value}
                  onChange={(e) => setBenefitForm({ ...benefitForm, value: parseFloat(e.target.value) })}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label>Tipo</Label>
                <select
                  className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background"
                  value={benefitForm.type}
                  onChange={(e) => setBenefitForm({ ...benefitForm, type: e.target.value as 'EARNING' | 'DEDUCTION' })}
                >
                  <option value="EARNING">Provento (adiciona ao salário)</option>
                  <option value="DEDUCTION">Desconto (subtrai do salário)</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowBenefitModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveBenefit}>
                {editingBenefit ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Funcionários do Benefício */}
      {showEmployeesModal && selectedBenefit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold">
                Funcionários - {selectedBenefit.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(selectedBenefit.value)} • {selectedBenefit.type === 'EARNING' ? 'Provento' : 'Desconto'}
              </p>
            </div>
            
            {/* Lista de funcionários vinculados */}
            <div className="p-4 border-b border-border">
              <p className="text-sm font-medium mb-2">Funcionários que recebem este benefício:</p>
              {benefitEmployees.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum funcionário vinculado</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {benefitEmployees.map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <div>
                        <p className="text-sm font-medium">{emp.name}</p>
                        <p className="text-xs text-muted-foreground">{emp.position || 'Sem cargo'}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => removeEmployeeFromBenefit(emp.employeeId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Adicionar funcionário */}
            <div className="p-4 flex-1 overflow-hidden flex flex-col">
              <p className="text-sm font-medium mb-2">Adicionar funcionário:</p>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar funcionário..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2">
                {availableEmployees.slice(0, 10).map((emp) => (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between p-2 border border-border rounded hover:bg-muted/30 cursor-pointer"
                    onClick={() => addEmployeeToBenefit(emp.id)}
                  >
                    <div>
                      <p className="text-sm font-medium">{emp.user?.name || 'Sem nome'}</p>
                      <p className="text-xs text-muted-foreground">{emp.position?.name || 'Sem cargo'}</p>
                    </div>
                    <Plus className="h-4 w-4 text-green-500" />
                  </div>
                ))}
                {availableEmployees.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {employeeSearch ? 'Nenhum funcionário encontrado' : 'Todos os funcionários já estão vinculados'}
                  </p>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-border">
              <Button variant="outline" className="w-full" onClick={() => setShowEmployeesModal(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
