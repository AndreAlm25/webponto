"use client"
// Componente: Modal de adicionar funcionário
// - Versão completa baseada no projeto antigo
// - Todos os campos: dados pessoais, profissionais, horários, permissões, geofence

import { useState, useEffect } from 'react'
import { X, User, Mail, Lock, Phone, Briefcase, Building, DollarSign, Calendar, Timer, Clock, MapPin, Hash } from 'lucide-react'
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

interface AddEmployeeModalProps {
  isOpen: boolean
  onClose: () => void
  onEmployeeAdded: () => void
  companyId: string
}

export default function AddEmployeeModal({ isOpen, onClose, onEmployeeAdded, companyId }: AddEmployeeModalProps) {
  // Comentário: Estado do formulário com todos os campos
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    cpf: '',
    phone: '',
    registrationId: '',
    position: '',
    positionId: '',
    department: '',
    departmentId: '',
    salary: '',
    hireDate: formatDateForInput(new Date()),
    workStartTime: '',
    workEndTime: '',
    breakStartTime: '',
    breakEndTime: '',
    allowRemoteClockIn: false,
    allowFacialRecognition: false,
    requireLiveness: false,
    geofenceId: '',
  })
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [positions, setPositions] = useState<{id: string, name: string}[]>([])
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([])
  const [geofences, setGeofences] = useState<{id: string, name: string, radiusMeters?: number}[]>([])

  const api = process.env.NEXT_PUBLIC_API_URL

  // Comentário: Carregar cargos, departamentos e geofences ao abrir modal
  useEffect(() => {
    if (isOpen) {
      console.log('[AddEmployeeModal] Modal aberto, carregando dados...')
      console.log('[AddEmployeeModal] CompanyId:', companyId)
      loadPositions()
      loadDepartments()
      loadGeofences()
    }
  }, [isOpen])

  // Comentário: Carregar lista de cargos
  const loadPositions = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${api}/api/positions?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      console.log('[AddEmployeeModal] Cargos recebidos:', data)
      if (response.ok) {
        setPositions(Array.isArray(data) ? data : [])
        console.log('[AddEmployeeModal] Cargos salvos no estado:', Array.isArray(data) ? data : [])
      } else {
        console.error('[AddEmployeeModal] Erro na resposta de cargos:', response.status, data)
      }
    } catch (error) {
      console.error('[AddEmployeeModal] Erro ao carregar cargos:', error)
    }
  }

  // Comentário: Carregar lista de departamentos
  const loadDepartments = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${api}/api/departments?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      console.log('[AddEmployeeModal] Departamentos recebidos:', data)
      if (response.ok) {
        setDepartments(Array.isArray(data) ? data : [])
        console.log('[AddEmployeeModal] Departamentos salvos no estado:', Array.isArray(data) ? data : [])
      } else {
        console.error('[AddEmployeeModal] Erro na resposta de departamentos:', response.status, data)
      }
    } catch (error) {
      console.error('[AddEmployeeModal] Erro ao carregar departamentos:', error)
    }
  }

  // Comentário: Carregar lista de geofences
  const loadGeofences = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${api}/api/geofences?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      console.log('[AddEmployeeModal] Cercas recebidas:', data)
      if (response.ok) {
        // Comentário: Backend retorna array direto, não objeto com propriedade
        setGeofences(Array.isArray(data) ? data : [])
        console.log('[AddEmployeeModal] Cercas salvas no estado:', Array.isArray(data) ? data : [])
      } else {
        console.error('[AddEmployeeModal] Erro na resposta de cercas:', response.status, data)
      }
    } catch (error) {
      console.error('[AddEmployeeModal] Erro ao carregar cercas geográficas:', error)
    }
  }

  // Comentário: Criar novo cargo
  const addNewPosition = async (name: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${api}/api/positions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, companyId })
      })
      const data = await response.json()
      if (response.ok) {
        setPositions(prev => [...prev, data.position])
        setFormData(prev => ({ ...prev, position: data.position.name, positionId: data.position.id }))
        toast.success('Cargo cadastrado com sucesso')
      } else {
        toast.error(data.message || 'Erro ao adicionar cargo')
      }
    } catch (error) {
      toast.error('Erro ao adicionar cargo')
    }
  }

  // Comentário: Criar novo departamento
  const addNewDepartment = async (name: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${api}/api/departments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, companyId })
      })
      const data = await response.json()
      if (response.ok) {
        setDepartments(prev => [...prev, data.department])
        setFormData(prev => ({ ...prev, department: data.department.name, departmentId: data.department.id }))
        toast.success('Departamento cadastrado com sucesso')
      } else {
        toast.error(data.message || 'Erro ao adicionar departamento')
      }
    } catch (error) {
      toast.error('Erro ao adicionar departamento')
    }
  }

  // Comentário: Validação de horários
  const timeToMinutes = (t?: string) => {
    if (!t) return null
    const [h, m] = t.split(':').map(Number)
    if (Number.isNaN(h) || Number.isNaN(m)) return null
    return h * 60 + m
  }

  const isBreakWithinWorkHours = () => {
    const ws = timeToMinutes(formData.workStartTime)
    const we = timeToMinutes(formData.workEndTime)
    const bs = timeToMinutes(formData.breakStartTime)
    const be = timeToMinutes(formData.breakEndTime)
    if (ws == null || we == null || bs == null || be == null) return false
    if (ws >= we) return false
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
    if (!formData.password) missing.push('Senha')
    if (!formData.registrationId) missing.push('Matrícula')
    if (!formData.hireDate) missing.push('Data de início')
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
        ...formData,
        companyId,
        cpf: formData.cpf ? unmask(formData.cpf) : undefined,
        phone: formData.phone ? unmask(formData.phone) : undefined,
        baseSalary: parseFloat(formData.salary),
        positionId: formData.positionId || undefined,
        departmentId: formData.departmentId || undefined,
        geofenceId: formData.geofenceId || undefined,
      }
      
      const res = await fetch(`${api}/api/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data?.message || 'Erro ao criar funcionário')
      }

      toast.success('Funcionário criado com sucesso!')

      // Comentário: Upload de avatar (se houver)
      if (avatarFile && data?.user?.id) {
        try {
          console.log('[AddEmployeeModal] Iniciando upload de avatar:', { userId: data.user.id, fileName: avatarFile.name })
          
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
            console.error('[AddEmployeeModal] Erro no upload:', errorData)
            throw new Error(errorData?.message || 'Erro ao fazer upload do avatar')
          }

          const uploadData = await uploadRes.json()
          console.log('[AddEmployeeModal] Upload concluído:', uploadData)
        } catch (e) {
          console.error('[AddEmployeeModal] Erro ao fazer upload do avatar:', e)
          toast.error('Avatar não foi salvo: ' + (e?.message || 'Erro desconhecido'))
        }
      }
      
      // Comentário: Resetar formulário e fechar
      resetForm()
      onEmployeeAdded()
      onClose()
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao criar funcionário')
    } finally {
      setLoading(false)
    }
  }

  // Comentário: Resetar formulário
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      cpf: '',
      phone: '',
      registrationId: '',
      position: '',
      positionId: '',
      department: '',
      departmentId: '',
      salary: '',
      hireDate: formatDateForInput(new Date()),
      workStartTime: '',
      workEndTime: '',
      breakStartTime: '',
      breakEndTime: '',
      allowRemoteClockIn: false,
      allowFacialRecognition: false,
      requireLiveness: false,
      geofenceId: '',
    })
    setAvatarFile(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[9999] p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl my-8 mx-auto">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4 bg-white dark:bg-gray-900 rounded-t-lg border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg sm:text-xl">Adicionar Funcionário</CardTitle>
                <CardDescription className="text-sm">Cadastre um novo membro da equipe</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Upload de Avatar */}
              <div className="flex justify-center">
                <AvatarUpload initialUrl="" onFileSelected={(f) => setAvatarFile(f)} />
              </div>

              {/* Dados Pessoais */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Dados Pessoais</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <InputWithIcon
                    id="name"
                    icon={<User className="h-4 w-4" />}
                    label="Nome Completo *"
                    name="name"
                    placeholder="João Silva"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />

                  <InputWithIcon
                    id="email"
                    icon={<Mail className="h-4 w-4" />}
                    label="Email *"
                    name="email"
                    type="email"
                    placeholder="joao@empresa.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <PasswordInput
                    id="password"
                    icon={Lock}
                    label="Senha *"
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />

                  <InputWithIcon
                    id="cpf"
                    icon={<Hash className="h-4 w-4" />}
                    label="CPF"
                    name="cpf"
                    placeholder="000.000.000-00"
                    value={formData.cpf}
                    onChange={(e) => {
                      const masked = maskCPF(e.target.value)
                      setFormData(prev => ({ ...prev, cpf: masked }))
                    }}
                  />
                </div>

                <InputWithIcon
                  id="phone"
                  icon={<Phone className="h-4 w-4" />}
                  label="Telefone"
                  name="phone"
                  placeholder="(11) 99999-9999"
                  value={formData.phone}
                  onChange={(e) => {
                    const masked = maskPhone(e.target.value)
                    setFormData(prev => ({ ...prev, phone: masked }))
                  }}
                />
              </div>

              {/* Dados Profissionais */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Dados Profissionais</h3>
                
                <InputWithIcon
                  id="registrationId"
                  icon={<Hash className="h-4 w-4" />}
                  label="Matrícula *"
                  name="registrationId"
                  placeholder="FUNC001"
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
                    icon={<DollarSign className="h-4 w-4" />}
                    label="Salário (R$) *"
                    name="salary"
                    type="number"
                    step="0.01"
                    placeholder="5000.00"
                    value={formData.salary}
                    onChange={handleChange}
                    required
                  />

                  <InputWithIcon
                    id="hireDate"
                    icon={<Calendar className="h-4 w-4" />}
                    label="Data de Início *"
                    name="hireDate"
                    type="date"
                    value={formData.hireDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Horário de Trabalho */}
                <div className="grid md:grid-cols-2 gap-4">
                  <InputWithIcon
                    id="workStartTime"
                    icon={<Timer className="h-4 w-4" />}
                    label="Horário de Início *"
                    name="workStartTime"
                    type="time"
                    value={formData.workStartTime}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      handleChange(e)
                      setFormData(prev => ({ ...prev, breakStartTime: '', breakEndTime: '' }))
                    }}
                    required
                  />

                  <InputWithIcon
                    id="workEndTime"
                    icon={<Timer className="h-4 w-4" />}
                    label="Horário de Fim *"
                    name="workEndTime"
                    type="time"
                    value={formData.workEndTime}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      handleChange(e)
                      setFormData(prev => ({ ...prev, breakStartTime: '', breakEndTime: '' }))
                    }}
                    required
                  />
                </div>
                
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Horário de trabalho do funcionário (ex: 08:00 às 18:00).
                </p>

                {/* Intervalo: visível somente após definir horário de trabalho */}
                {canShowBreakFields && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputWithIcon
                      id="breakStartTime"
                      icon={<Clock className="h-4 w-4" />}
                      label="Início do Intervalo"
                      name="breakStartTime"
                      type="time"
                      value={formData.breakStartTime}
                      onChange={handleChange}
                    />
                    <InputWithIcon
                      id="breakEndTime"
                      icon={<Clock className="h-4 w-4" />}
                      label="Fim do Intervalo"
                      name="breakEndTime"
                      type="time"
                      value={formData.breakEndTime}
                      onChange={handleChange}
                    />
                  </div>
                )}
              </div>

              {/* Configurações de Ponto */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Configurações de Ponto</h3>
                
                <CheckboxWithIcon
                  icon={<MapPin className="h-4 w-4" />}
                  label="Permitir ponto remoto"
                  description="Permite que o funcionário registre ponto mesmo quando não estiver na localização da empresa."
                  checked={formData.allowRemoteClockIn}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allowRemoteClockIn: !!checked }))}
                />

                <CheckboxWithIcon
                  icon={<User className="h-4 w-4" />}
                  label="Permitir reconhecimento facial"
                  description="Permite que o funcionário utilize reconhecimento facial para registrar ponto."
                  checked={formData.allowFacialRecognition}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allowFacialRecognition: !!checked }))}
                />

                <CheckboxWithIcon
                  icon={<User className="h-4 w-4" />}
                  label="Exigir prova de vida"
                  description="Exige que o funcionário pisque ou mova a cabeça durante o reconhecimento facial."
                  checked={formData.requireLiveness}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requireLiveness: !!checked }))}
                />

              </div>

              {/* Cerca Geográfica - Só aparece se permitir ponto remoto */}
              {formData.allowRemoteClockIn && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Cerca Geográfica
                  </Label>
                  <Select
                    value={formData.geofenceId || 'none'}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, geofenceId: value === 'none' ? '' : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma cerca (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {geofences.map((gf) => (
                        <SelectItem key={gf.id} value={gf.id}>
                          {gf.name} {gf.radiusMeters && `(${gf.radiusMeters}m)`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Limita a área onde o funcionário pode bater ponto remotamente. Sem cerca, pode bater de qualquer localização.
                  </p>
                </div>
              )}

              {/* Botões */}
              <div className="flex space-x-4 pt-4">
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Cadastrando...' : 'Cadastrar Funcionário'}
                </Button>
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
