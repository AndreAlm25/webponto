'use client'

import { useState, useEffect } from 'react'
import { useCompanySlug } from '@/hooks/useCompanySlug'
import { 
  FileText, Plus, Search, Filter, Check, X, Calendar, 
  User, Clock, AlertCircle, Download, Eye, Trash2,
  ChevronDown, Stethoscope
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
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

interface MedicalCertificate {
  id: string
  employeeId: string
  employeeName: string
  employeePosition: string | null
  employeeDepartment: string | null
  employeeAvatar: string | null
  startDate: string
  endDate: string
  days: number
  reason: string | null
  doctorName: string | null
  doctorCrm: string | null
  attachmentUrl: string | null
  notes: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvedAt: string | null
  rejectedAt: string | null
  rejectionReason: string | null
  createdAt: string
}

interface Employee {
  id: string
  name?: string
  user?: { name: string }
  position?: { name: string } | null
  department?: { name: string } | null
}

interface Stats {
  pending: number
  approved: number
  rejected: number
  totalDaysThisMonth: number
  topEmployees: Array<{
    employeeId: string
    employeeName: string
    totalDays: number
    count: number
  }>
}

export default function AtestadosPage() {
  // Hook que converte slug para UUID
  const { companyId, loading: companyLoading } = useCompanySlug()

  const [certificates, setCertificates] = useState<MedicalCertificate[]>()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedCertificate, setSelectedCertificate] = useState<MedicalCertificate | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  
  // Form state
  const [formData, setFormData] = useState({
    employeeId: '',
    startDate: '',
    endDate: '',
    reason: '',
    doctorName: '',
    doctorCrm: '',
    notes: '',
  })

  const api = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => {
    if (!companyId) return
    fetchCertificates()
    fetchEmployees()
    fetchStats()
  }, [companyId])

  const fetchCertificates = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${api}/api/payroll/medical-certificates?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setCertificates(data.certificates || [])
      }
    } catch (e) {
      console.error('Erro ao buscar atestados:', e)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token')
      const url = `${api}/api/employees?companyId=${companyId}`
      console.log('[Atestados] Buscando funcionários:', url)
      console.log('[Atestados] Token:', token ? 'presente' : 'AUSENTE')
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      console.log('[Atestados] Response status:', res.status)
      
      if (res.ok) {
        const data = await res.json()
        console.log('[Atestados] Dados recebidos:', data)
        console.log('[Atestados] É array?', Array.isArray(data))
        console.log('[Atestados] Quantidade:', Array.isArray(data) ? data.length : 'N/A')
        // API retorna array direto, não { employees: [...] }
        setEmployees(Array.isArray(data) ? data : [])
      } else {
        const errorText = await res.text()
        console.error('[Atestados] Erro na resposta:', res.status, errorText)
      }
    } catch (e) {
      console.error('[Atestados] Erro ao buscar funcionários:', e)
    }
  }

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${api}/api/payroll/medical-certificates-stats?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats || null)
      }
    } catch (e) {
      console.error('Erro ao buscar estatísticas:', e)
    }
  }

  const handleCreate = async () => {
    if (!formData.employeeId || !formData.startDate || !formData.endDate) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${api}/api/payroll/medical-certificates?companyId=${companyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(data.message)
        setShowCreateModal(false)
        resetForm()
        fetchCertificates()
        fetchStats()
      } else {
        const error = await res.json()
        toast.error(error.message || 'Erro ao criar atestado')
      }
    } catch (e) {
      toast.error('Erro ao criar atestado')
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${api}/api/payroll/medical-certificates/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(data.message)
        fetchCertificates()
        fetchStats()
      } else {
        const error = await res.json()
        toast.error(error.message || 'Erro ao aprovar atestado')
      }
    } catch (e) {
      toast.error('Erro ao aprovar atestado')
    }
  }

  const handleReject = async () => {
    if (!selectedCertificate) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${api}/api/payroll/medical-certificates/${selectedCertificate.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectReason }),
      })

      if (res.ok) {
        toast.success('Atestado rejeitado')
        setShowRejectModal(false)
        setRejectReason('')
        setSelectedCertificate(null)
        fetchCertificates()
        fetchStats()
      } else {
        const error = await res.json()
        toast.error(error.message || 'Erro ao rejeitar atestado')
      }
    } catch (e) {
      toast.error('Erro ao rejeitar atestado')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este atestado?')) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${api}/api/payroll/medical-certificates/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        toast.success('Atestado excluído')
        fetchCertificates()
        fetchStats()
      } else {
        const error = await res.json()
        toast.error(error.message || 'Erro ao excluir atestado')
      }
    } catch (e) {
      toast.error('Erro ao excluir atestado')
    }
  }

  const resetForm = () => {
    setFormData({
      employeeId: '',
      startDate: '',
      endDate: '',
      reason: '',
      doctorName: '',
      doctorCrm: '',
      notes: '',
    })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Pendente</span>
      case 'APPROVED':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Aprovado</span>
      case 'REJECTED':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Rejeitado</span>
      default:
        return null
    }
  }

  // Loading enquanto resolve o companyId
  if (companyLoading || !companyId) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const filteredCertificates = (certificates || []).filter(cert => {
    const matchesSearch = cert.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cert.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cert.doctorName?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || cert.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Atestados Médicos"
        description="Gerencie os atestados médicos dos funcionários"
        icon={<Stethoscope className="h-6 w-6" />}
      />

      {/* Cards de Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-green-600 dark:text-green-400">Aprovados</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.approved}</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
                <X className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-red-600 dark:text-red-400">Rejeitados</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.rejected}</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400">Dias este mês</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.totalDaysThisMonth}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Ações */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por funcionário, motivo ou médico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Status
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                Todos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('PENDING')}>
                Pendentes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('APPROVED')}>
                Aprovados
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('REJECTED')}>
                Rejeitados
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Atestado
        </Button>
      </div>

      {/* Tabela de Atestados */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Funcionário</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Período</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Dias</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Motivo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Médico</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              ) : filteredCertificates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum atestado encontrado
                  </td>
                </tr>
              ) : (
                filteredCertificates.map((cert) => (
                  <tr key={cert.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{cert.employeeName}</p>
                          <p className="text-xs text-muted-foreground">{cert.employeePosition || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{formatDate(cert.startDate)} - {formatDate(cert.endDate)}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold text-sm">{cert.days}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-muted-foreground">{cert.reason || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{cert.doctorName || '-'}</p>
                      {cert.doctorCrm && <p className="text-xs text-muted-foreground">CRM: {cert.doctorCrm}</p>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(cert.status)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCertificate(cert)
                            setShowViewModal(true)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {cert.status === 'PENDING' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleApprove(cert.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setSelectedCertificate(cert)
                                setShowRejectModal(true)
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(cert.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar Atestado */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Novo Atestado Médico
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Funcionário *</Label>
              <select
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background"
              >
                <option value="">Selecione...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name || emp.user?.name || 'Sem nome'}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data Início *</Label>
                <div className="relative mt-1 group">
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="[&::-webkit-calendar-picker-indicator]:dark:invert [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-popover border border-border rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    Clique no ícone para abrir o calendário
                  </span>
                </div>
              </div>
              <div>
                <Label>Data Fim *</Label>
                <div className="relative mt-1 group">
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="[&::-webkit-calendar-picker-indicator]:dark:invert [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-popover border border-border rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    Clique no ícone para abrir o calendário
                  </span>
                </div>
              </div>
            </div>

            <div>
              <Label>Motivo / CID</Label>
              <Input
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Ex: Gripe, CID J11"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome do Médico</Label>
                <Input
                  value={formData.doctorName}
                  onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                  placeholder="Dr. João Silva"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>CRM</Label>
                <Input
                  value={formData.doctorCrm}
                  onChange={(e) => setFormData({ ...formData, doctorCrm: e.target.value })}
                  placeholder="12345-SP"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observações adicionais..."
                className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate}>
              Criar Atestado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Visualizar Atestado */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalhes do Atestado
            </DialogTitle>
          </DialogHeader>

          {selectedCertificate && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{selectedCertificate.employeeName}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCertificate.employeePosition || 'Sem cargo'} • {selectedCertificate.employeeDepartment || 'Sem departamento'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Período</p>
                  <p className="font-medium">
                    {formatDate(selectedCertificate.startDate)} - {formatDate(selectedCertificate.endDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Dias</p>
                  <p className="font-medium">{selectedCertificate.days} dia(s)</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">{getStatusBadge(selectedCertificate.status)}</div>
              </div>

              {selectedCertificate.reason && (
                <div>
                  <p className="text-sm text-muted-foreground">Motivo / CID</p>
                  <p className="font-medium">{selectedCertificate.reason}</p>
                </div>
              )}

              {(selectedCertificate.doctorName || selectedCertificate.doctorCrm) && (
                <div>
                  <p className="text-sm text-muted-foreground">Médico</p>
                  <p className="font-medium">
                    {selectedCertificate.doctorName || '-'}
                    {selectedCertificate.doctorCrm && ` (CRM: ${selectedCertificate.doctorCrm})`}
                  </p>
                </div>
              )}

              {selectedCertificate.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Observações</p>
                  <p className="text-sm">{selectedCertificate.notes}</p>
                </div>
              )}

              {selectedCertificate.status === 'REJECTED' && selectedCertificate.rejectionReason && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">Motivo da Rejeição:</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{selectedCertificate.rejectionReason}</p>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Criado em: {formatDate(selectedCertificate.createdAt)}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewModal(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Rejeitar Atestado */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Rejeitar Atestado
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja rejeitar este atestado de <strong>{selectedCertificate?.employeeName}</strong>?
            </p>

            <div>
              <Label>Motivo da Rejeição</Label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Informe o motivo da rejeição..."
                className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>
              Cancelar
            </Button>
            <Button variant="outline" className="bg-red-600 text-white hover:bg-red-700" onClick={handleReject}>
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
