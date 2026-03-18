"use client"
// Componente: Modal de editar funcionário
// - Carrega dados existentes do funcionário
// - Permite edição de todos os campos
// - Atualiza via PUT /api/employees/:id

import { useState, useEffect } from 'react'
import { X, User, Mail, Phone, Briefcase, Building, DollarSign, Calendar, Timer, Clock, MapPin, Hash, Scan, Eye, ClockAlert, Hourglass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { InputWithIcon } from '@/components/ui/input-with-icon'
import { PasswordInput } from '@/components/ui/password-input'
import { SelectWithCreate } from '@/components/ui/select-with-create'
import { CheckboxWithIcon } from '@/components/ui/checkbox-with-icon'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import AvatarUpload from '@/components/admin/AvatarUpload'
import { toast } from 'sonner'
import { maskCPF, maskPhone, formatDateForInput, unmask } from '@/lib/masks'

interface EditEmployeeModalProps {
  isOpen: boolean
  onClose: () => void
  onEmployeeUpdated: () => void
  companyId: string
  employeeId: string
}

export default function EditEmployeeModal({ isOpen, onClose, onEmployeeUpdated, companyId, employeeId }: EditEmployeeModalProps) {
  // Comentário: Estado do formulário com todos os campos
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    phone: '',
    registrationId: '',
    position: '',
    positionId: '',
    department: '',
    departmentId: '',
    salary: '',
    hireDate: '',
    workStartTime: '',
    workEndTime: '',
    breakStartTime: '',
    breakEndTime: '',
    allowRemoteClockIn: false,
    allowFacialRecognition: false,
    requireLiveness: false,
    geofenceId: '' as string | null,
    allowOvertime: false,
    allowOvertimeBefore: false,
    maxOvertimeBefore: 120,
    allowOvertimeAfter: false,
    maxOvertimeAfter: 180,
    allowTimeBank: false,
    minRestHours: 11,
    warnOnRestViolation: true,
    // Escala de trabalho
    workSchedule: 'FIVE_TWO',
    customWorkDaysPerMonth: null as number | null,
    // Benefícios individuais
    useCustomBenefits: false,
    transportVoucherEnabled: null as boolean | null,
    transportVoucherRate: null as number | null,
    mealVoucherEnabled: null as boolean | null,
    mealVoucherValue: null as number | null,
    mealVoucherDiscount: null as number | null,
    healthInsuranceEnabled: null as boolean | null,
    healthInsuranceValue: null as number | null,
    dentalInsuranceEnabled: null as boolean | null,
    dentalInsuranceValue: null as number | null,
    // Datas de pagamento personalizadas
    customPaymentDay1: null as number | null,
    customPaymentDay2: null as number | null,
    customPaymentDay3: null as number | null,
    customPaymentDay4: null as number | null,
  })
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [positions, setPositions] = useState<{id: string, name: string}[]>([])
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([])
  const [geofences, setGeofences] = useState<{id: string, name: string, radiusMeters?: number}[]>([])
  const [initialData, setInitialData] = useState<any>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [payrollConfig, setPayrollConfig] = useState<{
    paymentMode: string
    installmentCount: number
  } | null>(null)

  const api = process.env.NEXT_PUBLIC_API_URL

  // Comentário: Detectar mudanças nos dados
  useEffect(() => {
    if (!initialData) return

    const changed = 
      JSON.stringify(formData) !== JSON.stringify(initialData) ||
      avatarFile !== null

    setHasChanges(changed)
  }, [formData, initialData, avatarFile])

  // Comentário: Buscar dados do funcionário
  const loadEmployeeData = async () => {
    try {
      setLoadingData(true)
      const token = localStorage.getItem('token')
      
      // Buscar funcionário diretamente por ID
      const res = await fetch(`${api}/api/employees/${employeeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Erro ao buscar funcionário')

      const employee = await res.json()

      if (!employee || employee.success === false) {
        throw new Error(employee?.message || 'Funcionário não encontrado')
      }

      console.log('[EditEmployeeModal] Funcionário encontrado:', employee)
      console.log('[EditEmployeeModal] User data:', employee.user)
      console.log('[EditEmployeeModal] Position:', employee.position)
      console.log('[EditEmployeeModal] Department:', employee.department)

      // Preencher formulário com dados existentes
      const initialFormData = {
        name: employee.user?.name || '',
        email: employee.user?.email || '',
        cpf: employee.user?.cpf ? maskCPF(employee.user.cpf) : '',
        phone: employee.user?.phone ? maskPhone(employee.user.phone) : '',
        registrationId: employee.registrationId || '',
        position: employee.position?.name || '',
        positionId: employee.positionId || '',
        department: employee.department?.name || '',
        departmentId: employee.departmentId || '',
        salary: employee.baseSalary?.toString() || '',
        hireDate: employee.hireDate ? formatDateForInput(new Date(employee.hireDate)) : '',
        workStartTime: employee.workStartTime || '',
        workEndTime: employee.workEndTime || '',
        breakStartTime: employee.breakStartTime || '',
        breakEndTime: employee.breakEndTime || '',
        allowRemoteClockIn: employee.allowRemoteClockIn || false,
        allowFacialRecognition: employee.allowFacialRecognition || false,
        requireLiveness: employee.requireLiveness || false,
        geofenceId: employee.geofenceId || '',
        allowOvertime: employee.allowOvertime || false,
        allowOvertimeBefore: employee.allowOvertimeBefore || false,
        maxOvertimeBefore: employee.maxOvertimeBefore || 120,
        allowOvertimeAfter: employee.allowOvertimeAfter || false,
        maxOvertimeAfter: employee.maxOvertimeAfter || 180,
        allowTimeBank: employee.allowTimeBank || false,
        minRestHours: employee.minRestHours || 11,
        warnOnRestViolation: employee.warnOnRestViolation !== false,
        // Escala de trabalho
        workSchedule: employee.workSchedule || 'FIVE_TWO',
        customWorkDaysPerMonth: employee.customWorkDaysPerMonth || null,
        // Benefícios individuais
        useCustomBenefits: employee.useCustomBenefits || false,
        transportVoucherEnabled: employee.transportVoucherEnabled ?? null,
        transportVoucherRate: employee.transportVoucherRate ? Number(employee.transportVoucherRate) : null,
        mealVoucherEnabled: employee.mealVoucherEnabled ?? null,
        mealVoucherValue: employee.mealVoucherValue ? Number(employee.mealVoucherValue) : null,
        mealVoucherDiscount: employee.mealVoucherDiscount ? Number(employee.mealVoucherDiscount) : null,
        healthInsuranceEnabled: employee.healthInsuranceEnabled ?? null,
        healthInsuranceValue: employee.healthInsuranceValue ? Number(employee.healthInsuranceValue) : null,
        dentalInsuranceEnabled: employee.dentalInsuranceEnabled ?? null,
        dentalInsuranceValue: employee.dentalInsuranceValue ? Number(employee.dentalInsuranceValue) : null,
        // Datas de pagamento personalizadas
        customPaymentDay1: employee.customPaymentDay1 ?? null,
        customPaymentDay2: employee.customPaymentDay2 ?? null,
        customPaymentDay3: employee.customPaymentDay3 ?? null,
        customPaymentDay4: employee.customPaymentDay4 ?? null,
      }

      setFormData(initialFormData)
      setInitialData(initialFormData)

      // Avatar atual
      if (employee.user?.avatarUrl) {
        setCurrentAvatarUrl(`${api}/api/files/employees/${employee.user.avatarUrl}`)
      }

    } catch (e: any) {
      console.error('[EditEmployeeModal] Erro ao carregar dados:', e)
      toast.error(e?.message || 'Erro ao carregar dados do funcionário')
    } finally {
      setLoadingData(false)
    }
  }

  // Comentário: Carregar cargos
  const loadPositions = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${api}/api/positions?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setPositions(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      console.error('[EditEmployeeModal] Erro ao carregar cargos:', e)
    }
  }

  // Comentário: Carregar departamentos
  const loadDepartments = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${api}/api/departments?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setDepartments(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      console.error('[EditEmployeeModal] Erro ao carregar departamentos:', e)
    }
  }

  // Comentário: Carregar cercas geográficas
  const loadGeofences = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${api}/api/geofences?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setGeofences(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      console.error('[EditEmployeeModal] Erro ao carregar cercas:', e)
    }
  }

  // Comentário: Carregar configuração de pagamento da empresa
  const loadPayrollConfig = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${api}/api/payroll/config?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setPayrollConfig({
          paymentMode: data.config?.paymentMode || 'FULL',
          installmentCount: data.config?.installmentCount || 1,
        })
      }
    } catch (e) {
      console.error('[EditEmployeeModal] Erro ao carregar config de pagamento:', e)
    }
  }

  // Comentário: Carregar dados do funcionário ao abrir modal
  useEffect(() => {
    if (isOpen && employeeId) {
      loadEmployeeData()
      loadPositions()
      loadDepartments()
      loadGeofences()
      loadPayrollConfig()
    }
  }, [isOpen, employeeId])

  // Comentário: Adicionar novo cargo
  const addNewPosition = async (name: string) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${api}/api/positions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, companyId }),
      })
      if (res.ok) {
        const newPos = await res.json()
        setPositions(prev => [...prev, newPos])
        setFormData(prev => ({ ...prev, position: newPos.name, positionId: newPos.id }))
        toast.success('Cargo criado com sucesso!')
      }
    } catch (e) {
      toast.error('Erro ao criar cargo')
    }
  }

  // Comentário: Adicionar novo departamento
  const addNewDepartment = async (name: string) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${api}/api/departments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, companyId }),
      })
      if (res.ok) {
        const newDept = await res.json()
        setDepartments(prev => [...prev, newDept])
        setFormData(prev => ({ ...prev, department: newDept.name, departmentId: newDept.id }))
        toast.success('Departamento criado com sucesso!')
      }
    } catch (e) {
      toast.error('Erro ao criar departamento')
    }
  }

  // Comentário: Validar se intervalo está dentro do horário de trabalho
  const isBreakWithinWorkHours = () => {
    if (!formData.breakStartTime || !formData.breakEndTime) return true
    if (!formData.workStartTime || !formData.workEndTime) return false
    
    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number)
      return h * 60 + m
    }
    
    const ws = toMinutes(formData.workStartTime)
    const we = toMinutes(formData.workEndTime)
    const bs = toMinutes(formData.breakStartTime)
    const be = toMinutes(formData.breakEndTime)
    
    if (bs >= be) return false
    return bs >= ws && be <= we
  }

  const canShowBreakFields = Boolean(formData.workStartTime && formData.workEndTime)

  // Comentário: Handler de mudança de campo
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  // Comentário: Submissão do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Comentário: Validações
    const missing: string[] = []
    if (!formData.name) missing.push('Nome')
    if (!formData.email) missing.push('Email')
    if (!formData.registrationId) missing.push('Matrícula')
    if (!formData.hireDate) missing.push('Data de Admissão')
    if (!formData.salary) missing.push('Salário')
    if (!formData.workStartTime) missing.push('Horário de Início')
    if (!formData.workEndTime) missing.push('Horário de Fim')
    
    if (missing.length > 0) {
      toast.error(`Preencha os campos obrigatórios: ${missing.join(', ')}`)
      return
    }

    // Comentário: Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast.error('Email inválido')
      return
    }

    // Comentário: Validar intervalo (se preenchido)
    if (formData.breakStartTime || formData.breakEndTime) {
      if (!canShowBreakFields) {
        toast.error('Defina o horário de trabalho antes de configurar o intervalo')
        return
      }
      if (!isBreakWithinWorkHours()) {
        toast.error('O horário de intervalo deve estar dentro do período de trabalho')
        return
      }
    }

    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      // Comentário: Preparar dados para envio (remover máscaras)
      const payload = {
        name: formData.name,
        email: formData.email,
        cpf: formData.cpf ? unmask(formData.cpf) : undefined,
        phone: formData.phone ? unmask(formData.phone) : undefined,
        registrationId: formData.registrationId,
        hireDate: formData.hireDate,
        baseSalary: parseFloat(formData.salary),
        positionId: formData.positionId || undefined,
        departmentId: formData.departmentId || undefined,
        geofenceId: formData.geofenceId === null ? null : (formData.geofenceId || undefined),
        workStartTime: formData.workStartTime,
        workEndTime: formData.workEndTime,
        breakStartTime: formData.breakStartTime || undefined,
        breakEndTime: formData.breakEndTime || undefined,
        allowRemoteClockIn: formData.allowRemoteClockIn,
        allowFacialRecognition: formData.allowFacialRecognition,
        requireLiveness: formData.requireLiveness,
        allowOvertime: formData.allowOvertime,
        allowOvertimeBefore: formData.allowOvertimeBefore,
        maxOvertimeBefore: formData.maxOvertimeBefore,
        allowOvertimeAfter: formData.allowOvertimeAfter,
        maxOvertimeAfter: formData.maxOvertimeAfter,
        allowTimeBank: formData.allowTimeBank,
        minRestHours: formData.minRestHours,
        warnOnRestViolation: formData.warnOnRestViolation,
        // Escala de trabalho
        workSchedule: formData.workSchedule,
        customWorkDaysPerMonth: formData.customWorkDaysPerMonth,
        // Benefícios individuais
        useCustomBenefits: formData.useCustomBenefits,
        transportVoucherEnabled: formData.transportVoucherEnabled,
        transportVoucherRate: formData.transportVoucherRate,
        mealVoucherEnabled: formData.mealVoucherEnabled,
        mealVoucherValue: formData.mealVoucherValue,
        mealVoucherDiscount: formData.mealVoucherDiscount,
        healthInsuranceEnabled: formData.healthInsuranceEnabled,
        healthInsuranceValue: formData.healthInsuranceValue,
        dentalInsuranceEnabled: formData.dentalInsuranceEnabled,
        dentalInsuranceValue: formData.dentalInsuranceValue,
      }
      
      const res = await fetch(`${api}/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data?.message || 'Erro ao atualizar funcionário')
      }

      toast.success('Funcionário atualizado com sucesso!')

      // Comentário: Upload de avatar (se houver)
      if (avatarFile && data?.user?.id) {
        try {
          console.log('[EditEmployeeModal] Iniciando upload de avatar:', { userId: data.user.id, fileName: avatarFile.name })
          
          const fd = new FormData()
          fd.append('userId', data.user.id)
          fd.append('photo', avatarFile)
          
          const uploadRes = await fetch(`${api}/api/files/upload/avatar`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
          })

          if (!uploadRes.ok) {
            const errorData = await uploadRes.json()
            console.error('[EditEmployeeModal] Erro no upload:', errorData)
            throw new Error(errorData?.message || 'Erro ao fazer upload do avatar')
          }

          const uploadData = await uploadRes.json()
          console.log('[EditEmployeeModal] Upload concluído:', uploadData)
        } catch (e: any) {
          console.error('[EditEmployeeModal] Erro ao fazer upload do avatar:', e)
          toast.error('Avatar não foi salvo: ' + (e?.message || 'Erro desconhecido'))
        }
      }
      
      // Comentário: Fechar modal e atualizar lista
      onEmployeeUpdated()
      onClose()
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar funcionário')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[9999] p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl my-8 mx-auto">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4 bg-white dark:bg-gray-900 rounded-t-lg border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg sm:text-xl">
                  {formData.name ? `Editando: ${formData.name}` : 'Editar Funcionário'}
                </CardTitle>
                <CardDescription className="text-sm">Atualize os dados do membro da equipe</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {loadingData ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Carregando dados...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Avatar */}
                <div className="flex justify-center">
                  <AvatarUpload
                    initialUrl={currentAvatarUrl}
                    onFileSelected={setAvatarFile}
                  />
                </div>

                {/* Dados Pessoais */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Dados Pessoais
                  </h3>

                  <InputWithIcon
                    id="name"
                    name="name"
                    icon={<User className="h-4 w-4" />}
                    label="Nome Completo"
                    placeholder="Digite o nome completo"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />

                  <div className="grid md:grid-cols-2 gap-4">
                    <InputWithIcon
                      id="email"
                      name="email"
                      type="email"
                      icon={<Mail className="h-4 w-4" />}
                      label="Email"
                      placeholder="email@exemplo.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />

                    <InputWithIcon
                      id="phone"
                      name="phone"
                      icon={<Phone className="h-4 w-4" />}
                      label="Telefone"
                      placeholder="(00) 00000-0000"
                      value={formData.phone}
                      onChange={(e) => {
                        const masked = maskPhone(e.target.value)
                        setFormData(prev => ({ ...prev, phone: masked }))
                      }}
                    />
                  </div>

                  <InputWithIcon
                    id="cpf"
                    name="cpf"
                    icon={<Hash className="h-4 w-4" />}
                    label="CPF"
                    placeholder="000.000.000-00"
                    value={formData.cpf}
                    onChange={(e) => {
                      const masked = maskCPF(e.target.value)
                      setFormData(prev => ({ ...prev, cpf: masked }))
                    }}
                  />
                </div>

                {/* Dados Profissionais */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Dados Profissionais
                  </h3>

                  <InputWithIcon
                    id="registrationId"
                    name="registrationId"
                    icon={<Hash className="h-4 w-4" />}
                    label="Matrícula"
                    placeholder="Digite a matrícula"
                    value={formData.registrationId}
                    onChange={handleChange}
                    required
                  />

                  <div className="grid md:grid-cols-2 gap-4">
                    <SelectWithCreate
                      icon={<Briefcase className="h-4 w-4" />}
                      label="Cargo"
                      placeholder="Selecione um cargo"
                      value={formData.positionId}
                      onValueChange={(value) => {
                        const opt = positions.find(p => p.id === value)
                        setFormData(prev => ({ ...prev, position: opt?.name || '', positionId: value }))
                      }}
                      options={positions}
                      onCreateNew={addNewPosition}
                    />

                    <SelectWithCreate
                      icon={<Building className="h-4 w-4" />}
                      label="Departamento"
                      placeholder="Selecione um departamento"
                      value={formData.departmentId}
                      onValueChange={(value) => {
                        const opt = departments.find(d => d.id === value)
                        setFormData(prev => ({ ...prev, department: opt?.name || '', departmentId: value }))
                      }}
                      options={departments}
                      onCreateNew={addNewDepartment}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <InputWithIcon
                      id="salary"
                      name="salary"
                      type="number"
                      step="0.01"
                      icon={<DollarSign className="h-4 w-4" />}
                      label="Salário Base"
                      placeholder="0.00"
                      value={formData.salary}
                      onChange={handleChange}
                      required
                    />

                    <InputWithIcon
                      id="hireDate"
                      name="hireDate"
                      type="date"
                      icon={<Calendar className="h-4 w-4" />}
                      label="Data de Admissão *"
                      value={formData.hireDate}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                {/* Horários */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Horários de Trabalho
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <InputWithIcon
                      id="workStartTime"
                      name="workStartTime"
                      type="time"
                      icon={<Clock className="h-4 w-4" />}
                      label="Início do Expediente"
                      value={formData.workStartTime}
                      onChange={handleChange}
                      required
                    />

                    <InputWithIcon
                      id="workEndTime"
                      name="workEndTime"
                      type="time"
                      icon={<Clock className="h-4 w-4" />}
                      label="Fim do Expediente"
                      value={formData.workEndTime}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {canShowBreakFields && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <InputWithIcon
                        id="breakStartTime"
                        name="breakStartTime"
                        type="time"
                        icon={<Timer className="h-4 w-4" />}
                        label="Início do Intervalo"
                        value={formData.breakStartTime}
                        onChange={handleChange}
                      />

                      <InputWithIcon
                        id="breakEndTime"
                        name="breakEndTime"
                        type="time"
                        icon={<Timer className="h-4 w-4" />}
                        label="Fim do Intervalo"
                        value={formData.breakEndTime}
                        onChange={handleChange}
                      />
                    </div>
                  )}

                  {/* Escala de Trabalho */}
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label className="text-sm">Escala de Trabalho</Label>
                      <Select
                        value={formData.workSchedule}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, workSchedule: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione a escala" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FIVE_TWO">5x2 - Segunda a Sexta (22 dias/mês)</SelectItem>
                          <SelectItem value="SIX_ONE">6x1 - Segunda a Sábado (26 dias/mês)</SelectItem>
                          <SelectItem value="TWELVE_THIRTYSIX">12x36 - 12h trabalha, 36h folga (~15 dias/mês)</SelectItem>
                          <SelectItem value="FOUR_TWO">4x2 - 4 dias trabalha, 2 folga (~20 dias/mês)</SelectItem>
                          <SelectItem value="CUSTOM">Personalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {formData.workSchedule === 'CUSTOM' && (
                      <div>
                        <Label className="text-sm">Dias Trabalhados/Mês</Label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={formData.customWorkDaysPerMonth || ''}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            customWorkDaysPerMonth: e.target.value ? parseInt(e.target.value) : null 
                          }))}
                          className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-sm"
                          placeholder="Ex: 22"
                        />
                      </div>
                    )}
                  </div>

                </div>

                {/* Benefícios Individuais */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Benefícios Individuais
                  </h3>
                  
                  <p className="text-xs text-muted-foreground">
                    Ative para sobrescrever os valores padrão da empresa para este funcionário.
                  </p>

                  <CheckboxWithIcon
                    icon={<DollarSign className="h-4 w-4" />}
                    label="Usar Benefícios Personalizados"
                    description="Sobrescrever configurações de benefícios da empresa"
                    checked={formData.useCustomBenefits}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, useCustomBenefits: checked as boolean }))
                    }
                  />

                  {formData.useCustomBenefits && (
                    <div className="space-y-4 pl-8 border-l-2 border-primary/20">
                      {/* Vale-Transporte */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.transportVoucherEnabled === true}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              transportVoucherEnabled: e.target.checked ? true : false 
                            }))}
                            className="h-4 w-4"
                          />
                          <Label className="text-sm font-medium">Vale-Transporte</Label>
                        </div>
                        {formData.transportVoucherEnabled && (
                          <div className="pl-6">
                            <Label className="text-xs">% Desconto</Label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={formData.transportVoucherRate || ''}
                              onChange={(e) => setFormData(prev => ({ 
                                ...prev, 
                                transportVoucherRate: e.target.value ? parseFloat(e.target.value) : null 
                              }))}
                              className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-sm"
                              placeholder="Ex: 6"
                            />
                          </div>
                        )}
                      </div>

                      {/* Vale-Refeição */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.mealVoucherEnabled === true}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              mealVoucherEnabled: e.target.checked ? true : false 
                            }))}
                            className="h-4 w-4"
                          />
                          <Label className="text-sm font-medium">Vale-Refeição</Label>
                        </div>
                        {formData.mealVoucherEnabled && (
                          <div className="pl-6 grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Valor (R$)</Label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.mealVoucherValue || ''}
                                onChange={(e) => setFormData(prev => ({ 
                                  ...prev, 
                                  mealVoucherValue: e.target.value ? parseFloat(e.target.value) : null 
                                }))}
                                className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-sm"
                                placeholder="Ex: 200"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">% Desconto</Label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={formData.mealVoucherDiscount || ''}
                                onChange={(e) => setFormData(prev => ({ 
                                  ...prev, 
                                  mealVoucherDiscount: e.target.value ? parseFloat(e.target.value) : null 
                                }))}
                                className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-sm"
                                placeholder="Ex: 20"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Plano de Saúde */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.healthInsuranceEnabled === true}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              healthInsuranceEnabled: e.target.checked ? true : false 
                            }))}
                            className="h-4 w-4"
                          />
                          <Label className="text-sm font-medium">Plano de Saúde</Label>
                        </div>
                        {formData.healthInsuranceEnabled && (
                          <div className="pl-6">
                            <Label className="text-xs">Valor Desconto (R$)</Label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={formData.healthInsuranceValue || ''}
                              onChange={(e) => setFormData(prev => ({ 
                                ...prev, 
                                healthInsuranceValue: e.target.value ? parseFloat(e.target.value) : null 
                              }))}
                              className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-sm"
                              placeholder="Ex: 350"
                            />
                          </div>
                        )}
                      </div>

                      {/* Plano Odontológico */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.dentalInsuranceEnabled === true}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              dentalInsuranceEnabled: e.target.checked ? true : false 
                            }))}
                            className="h-4 w-4"
                          />
                          <Label className="text-sm font-medium">Plano Odontológico</Label>
                        </div>
                        {formData.dentalInsuranceEnabled && (
                          <div className="pl-6">
                            <Label className="text-xs">Valor Desconto (R$)</Label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={formData.dentalInsuranceValue || ''}
                              onChange={(e) => setFormData(prev => ({ 
                                ...prev, 
                                dentalInsuranceValue: e.target.value ? parseFloat(e.target.value) : null 
                              }))}
                              className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-sm"
                              placeholder="Ex: 50"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Datas de Pagamento Personalizadas - Só mostra se modo for INSTALLMENTS */}
                {payrollConfig && payrollConfig.paymentMode === 'INSTALLMENTS' && payrollConfig.installmentCount > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      Datas de Pagamento Personalizadas
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Deixe vazio para usar as datas padrão da empresa ({payrollConfig.installmentCount} parcela{payrollConfig.installmentCount > 1 ? 's' : ''}).
                    </p>
                    
                    <div className={`grid gap-3 ${
                      payrollConfig.installmentCount === 1 ? 'grid-cols-1' :
                      payrollConfig.installmentCount === 2 ? 'grid-cols-2' :
                      payrollConfig.installmentCount === 3 ? 'grid-cols-3' :
                      'grid-cols-2 md:grid-cols-4'
                    }`}>
                      {payrollConfig.installmentCount >= 1 && (
                        <div>
                          <Label className="text-xs">Parcela 1 (Dia)</Label>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            value={formData.customPaymentDay1 || ''}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              customPaymentDay1: e.target.value ? parseInt(e.target.value) : null 
                            }))}
                            className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-sm"
                            placeholder="Padrão"
                          />
                        </div>
                      )}
                      {payrollConfig.installmentCount >= 2 && (
                        <div>
                          <Label className="text-xs">Parcela 2 (Dia)</Label>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            value={formData.customPaymentDay2 || ''}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              customPaymentDay2: e.target.value ? parseInt(e.target.value) : null 
                            }))}
                            className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-sm"
                            placeholder="Padrão"
                          />
                        </div>
                      )}
                      {payrollConfig.installmentCount >= 3 && (
                        <div>
                          <Label className="text-xs">Parcela 3 (Dia)</Label>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            value={formData.customPaymentDay3 || ''}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              customPaymentDay3: e.target.value ? parseInt(e.target.value) : null 
                            }))}
                            className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-sm"
                            placeholder="Padrão"
                          />
                        </div>
                      )}
                      {payrollConfig.installmentCount >= 4 && (
                        <div>
                          <Label className="text-xs">Parcela 4 (Dia)</Label>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            value={formData.customPaymentDay4 || ''}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              customPaymentDay4: e.target.value ? parseInt(e.target.value) : null 
                            }))}
                            className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-sm"
                            placeholder="Padrão"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Modo Adiantamento - Mostrar campos de adiantamento e saldo */}
                {payrollConfig && payrollConfig.paymentMode === 'ADVANCE' && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      Datas de Pagamento Personalizadas
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Deixe vazio para usar as datas padrão da empresa (Adiantamento + Saldo).
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Adiantamento (Dia)</Label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={formData.customPaymentDay1 || ''}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            customPaymentDay1: e.target.value ? parseInt(e.target.value) : null 
                          }))}
                          className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-sm"
                          placeholder="Padrão"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Saldo (Dia)</Label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={formData.customPaymentDay2 || ''}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            customPaymentDay2: e.target.value ? parseInt(e.target.value) : null 
                          }))}
                          className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-sm"
                          placeholder="Padrão"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Modo Pagamento Único - Mostrar apenas 1 campo */}
                {payrollConfig && payrollConfig.paymentMode === 'FULL' && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      Data de Pagamento Personalizada
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Deixe vazio para usar a data padrão da empresa (Pagamento único mensal).
                    </p>
                    
                    <div className="grid grid-cols-1 max-w-xs">
                      <div>
                        <Label className="text-xs">Dia do Pagamento</Label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={formData.customPaymentDay1 || ''}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            customPaymentDay1: e.target.value ? parseInt(e.target.value) : null 
                          }))}
                          className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-sm"
                          placeholder="Padrão"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Permissões e Configurações */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Permissões e Configurações
                  </h3>

                  <div className="space-y-3">
                    {/* Permitir Ponto Remoto */}
                    <CheckboxWithIcon
                      icon={<MapPin className="h-4 w-4" />}
                      label="Permitir Ponto Remoto"
                      description="Funcionário pode bater ponto pelo painel"
                      checked={formData.allowRemoteClockIn}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, allowRemoteClockIn: checked as boolean }))
                      }
                    />

                    {/* Submenu: Cerca Geográfica */}
                    {formData.allowRemoteClockIn && (
                      <div className="space-y-3 pl-8 border-l-2 border-primary/20">
                        <div className="space-y-2">
                          <Label className="text-sm flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Cerca Geográfica
                          </Label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Restrinja o ponto remoto a locais específicos. Selecione "Nenhuma" para permitir de qualquer lugar.
                          </p>
                          <Select
                            value={formData.geofenceId || 'none'}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, geofenceId: value === 'none' ? null : value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma cerca" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhuma (qualquer lugar)</SelectItem>
                              {geofences.map((gf) => (
                                <SelectItem key={gf.id} value={gf.id}>
                                  {gf.name} {gf.radiusMeters && `(${gf.radiusMeters}m)`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* Reconhecimento Facial */}
                    <CheckboxWithIcon
                      icon={<Scan className="h-4 w-4" />}
                      label="Reconhecimento Facial"
                      description="Habilitar registro de ponto por reconhecimento facial"
                      checked={formData.allowFacialRecognition}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, allowFacialRecognition: checked as boolean }))
                      }
                    />

                    {/* Submenu: Detecção de Vivacidade */}
                    {formData.allowFacialRecognition && (
                      <div className="space-y-2 pl-8 border-l-2 border-primary/20">
                        <CheckboxWithIcon
                          icon={<Eye className="h-4 w-4" />}
                          label="Detecção de Vivacidade"
                          description="Exigir prova de vida no reconhecimento facial"
                          checked={formData.requireLiveness}
                          onCheckedChange={(checked) => 
                            setFormData(prev => ({ ...prev, requireLiveness: checked as boolean }))
                          }
                        />
                      </div>
                    )}

                    <CheckboxWithIcon
                      icon={<ClockAlert className="h-4 w-4" />}
                      label="Permitir Hora Extra"
                      description="Funcionário pode fazer hora extra (antes/depois do expediente)"
                      checked={formData.allowOvertime}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, allowOvertime: checked as boolean }))
                      }
                    />

                    {formData.allowOvertime && (
                      <div className="space-y-4 pl-8 border-l-2 border-primary/20">
                        {/* Hora Extra ANTES */}
                        <div className="space-y-2">
                          <CheckboxWithIcon
                            icon={<Clock className="h-4 w-4" />}
                            label="Permitir Hora Extra ANTES do expediente"
                            description={`Funcionário pode entrar antes das ${formData.workStartTime}`}
                            checked={formData.allowOvertimeBefore}
                            onCheckedChange={(checked) => 
                              setFormData(prev => ({ ...prev, allowOvertimeBefore: checked as boolean }))
                            }
                          />
                          {formData.allowOvertimeBefore && (
                            <div className="pl-8 space-y-2">
                              <Label className="text-sm">Máximo permitido (minutos)</Label>
                              <input
                                type="number"
                                min="0"
                                max="240"
                                step="1"
                                value={formData.maxOvertimeBefore}
                                onChange={(e) => setFormData(prev => ({ ...prev, maxOvertimeBefore: parseInt(e.target.value) || 0 }))}
                                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
                              />
                              <p className="text-xs text-muted-foreground">
                                {Math.floor(formData.maxOvertimeBefore / 60)}h {formData.maxOvertimeBefore % 60}min = pode entrar às {(() => {
                                  const [h, m] = formData.workStartTime.split(':').map(Number)
                                  const totalMin = h * 60 + m - formData.maxOvertimeBefore
                                  const newH = Math.floor(totalMin / 60)
                                  const newM = totalMin % 60
                                  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
                                })()}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Hora Extra DEPOIS */}
                        <div className="space-y-2">
                          <CheckboxWithIcon
                            icon={<Clock className="h-4 w-4" />}
                            label="Permitir Hora Extra DEPOIS do expediente"
                            description={`Funcionário pode sair depois das ${formData.workEndTime}`}
                            checked={formData.allowOvertimeAfter}
                            onCheckedChange={(checked) => 
                              setFormData(prev => ({ ...prev, allowOvertimeAfter: checked as boolean }))
                            }
                          />
                          {formData.allowOvertimeAfter && (
                            <div className="pl-8 space-y-2">
                              <Label className="text-sm">Máximo permitido (minutos)</Label>
                              <input
                                type="number"
                                min="0"
                                max="240"
                                step="1"
                                value={formData.maxOvertimeAfter}
                                onChange={(e) => setFormData(prev => ({ ...prev, maxOvertimeAfter: parseInt(e.target.value) || 0 }))}
                                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
                              />
                              <p className="text-xs text-muted-foreground">
                                {Math.floor(formData.maxOvertimeAfter / 60)}h {formData.maxOvertimeAfter % 60}min = pode sair até {(() => {
                                  const [h, m] = formData.workEndTime.split(':').map(Number)
                                  const totalMin = h * 60 + m + formData.maxOvertimeAfter
                                  const newH = Math.floor(totalMin / 60) % 24
                                  const newM = totalMin % 60
                                  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
                                })()}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Banco de Horas */}
                        <CheckboxWithIcon
                          icon={<Hourglass className="h-4 w-4" />}
                          label="Usar Banco de Horas"
                          description="Compensar hora extra com folga ao invés de pagamento em dinheiro"
                          checked={formData.allowTimeBank}
                          onCheckedChange={(checked) => 
                            setFormData(prev => ({ ...prev, allowTimeBank: checked as boolean }))
                          }
                        />

                        {/* Alerta CLT */}
                        {(formData.maxOvertimeBefore / 60 + formData.maxOvertimeAfter / 60) > 2 && (
                          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                            <p className="text-xs text-yellow-800 dark:text-yellow-200">
                              ⚠️ <strong>Atenção:</strong> Total de {(formData.maxOvertimeBefore / 60 + formData.maxOvertimeAfter / 60).toFixed(1)}h extras/dia.
                              CLT recomenda máximo 2h/dia (total 10h/dia). Risco de passivo trabalhista.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>


                {/* Botões */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                    disabled={loading}
                  >
                    {hasChanges ? 'Cancelar' : 'Fechar'}
                  </Button>
                  {hasChanges && (
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={loading}
                    >
                      {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                  )}
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
