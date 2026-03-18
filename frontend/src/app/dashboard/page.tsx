'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { LogOut, User, Building2, Calendar, Palmtree, CheckCircle2, Clock, AlertTriangle, Send, FileText, X, Plus, Minus, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface VacationPeriod {
  periodNumber: number
  acquisitionStart: string
  acquisitionEnd: string
  concessionStart: string
  concessionEnd: string
  isAcquired: boolean
  isExpired: boolean
  isExpiringSoon?: boolean
  daysUntilExpiration: number
  status: string
  hasVacation: boolean
  vacation?: {
    id: string
    status: string
    totalDays: number
    soldDays: number
    usedDays: number
    remainingDays: number
    regularizationType?: string
    periods?: Array<{
      periodNumber: number
      startDate: string
      endDate: string
      days: number
      status: string
    }>
  }
}

interface VacationRequest {
  id: string
  status: string
  requestedStartDate: string
  requestedDays: number
  requestedPeriods?: Array<{ startDate: string; days: number }>
  sellDays: number
  employeeNotes?: string
  counterProposal?: any
  counterProposalNotes?: string
  approvedAt?: string
  rejectedAt?: string
  rejectionReason?: string
  employeeSignedAt?: string
  adminSignedAt?: string
  createdAt: string
}

interface CanRequestResponse {
  canRequest: boolean
  reason?: string
  availablePeriods: Array<{
    id: string
    acquisitionStart: string
    acquisitionEnd: string
    concessionEnd: string
    totalDays: number
    usedDays: number
    soldDays: number
    remainingDays: number
  }>
  pendingRequestId?: string
  pendingRequestStatus?: string
}

export default function DashboardPage() {
  const { user, logout, loading } = useAuth()
  const router = useRouter()
  const [vacationData, setVacationData] = useState<{ acquisitivePeriods: VacationPeriod[] } | null>(null)
  const [loadingVacations, setLoadingVacations] = useState(false)
  
  // Estados para solicitação de férias
  const [canRequestData, setCanRequestData] = useState<CanRequestResponse | null>(null)
  const [myRequests, setMyRequests] = useState<VacationRequest[]>([])
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [submittingRequest, setSubmittingRequest] = useState(false)
  
  // Formulário de solicitação
  const [selectedVacationId, setSelectedVacationId] = useState('')
  const [requestStartDate, setRequestStartDate] = useState('')
  const [requestDays, setRequestDays] = useState(30)
  const [sellDays, setSellDays] = useState(0)
  const [usePeriods, setUsePeriods] = useState(false)
  const [periods, setPeriods] = useState<Array<{ startDate: string; days: number }>>([{ startDate: '', days: 14 }])
  const [employeeNotes, setEmployeeNotes] = useState('')

  const api = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Buscar férias do funcionário
  useEffect(() => {
    const fetchVacations = async () => {
      console.log('[FÉRIAS DEBUG] user:', user)
      console.log('[FÉRIAS DEBUG] user.role:', user?.role)
      if (!user || user.role === 'SUPER_ADMIN') {
        console.log('[FÉRIAS DEBUG] Saindo - user null ou SUPER_ADMIN')
        return
      }
      
      setLoadingVacations(true)
      try {
        const token = localStorage.getItem('token')
        console.log('[FÉRIAS DEBUG] Buscando férias em:', `${api}/api/vacations/my-vacations`)
        const res = await fetch(`${api}/api/vacations/my-vacations`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        console.log('[FÉRIAS DEBUG] Response status:', res.status)
        if (res.ok) {
          const data = await res.json()
          console.log('[FÉRIAS DEBUG] Dados recebidos:', data)
          console.log('[FÉRIAS DEBUG] acquisitivePeriods:', data?.acquisitivePeriods?.length)
          setVacationData(data)
        } else {
          const errorText = await res.text()
          console.error('[FÉRIAS DEBUG] Erro na resposta:', errorText)
        }
      } catch (e) {
        console.error('[FÉRIAS DEBUG] Erro ao buscar férias:', e)
      } finally {
        setLoadingVacations(false)
      }
    }
    
    if (user) {
      fetchVacations()
    }
  }, [user, api])

  // Buscar se pode solicitar férias e minhas solicitações
  useEffect(() => {
    const fetchRequestData = async () => {
      if (!user || user.role === 'SUPER_ADMIN') return
      
      try {
        const token = localStorage.getItem('token')
        
        // Verificar se pode solicitar
        const canRes = await fetch(`${api}/api/vacation-requests/can-request`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (canRes.ok) {
          const data = await canRes.json()
          setCanRequestData(data)
          if (data.availablePeriods?.length > 0) {
            setSelectedVacationId(data.availablePeriods[0].id)
          }
        }
        
        // Buscar minhas solicitações
        const reqRes = await fetch(`${api}/api/vacation-requests/my-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (reqRes.ok) {
          const data = await reqRes.json()
          setMyRequests(data)
        }
      } catch (e) {
        console.error('Erro ao buscar dados de solicitação:', e)
      }
    }
    
    if (user) {
      fetchRequestData()
    }
  }, [user, api])

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR })
  }

  // Resetar formulário
  const resetForm = () => {
    setRequestStartDate('')
    setRequestDays(30)
    setSellDays(0)
    setUsePeriods(false)
    setPeriods([{ startDate: '', days: 14 }])
    setEmployeeNotes('')
  }

  // Adicionar período
  const addPeriod = () => {
    if (periods.length < 3) {
      setPeriods([...periods, { startDate: '', days: 5 }])
    }
  }

  // Remover período
  const removePeriod = (index: number) => {
    if (periods.length > 1) {
      setPeriods(periods.filter((_, i) => i !== index))
    }
  }

  // Atualizar período
  const updatePeriod = (index: number, field: 'startDate' | 'days', value: string | number) => {
    const newPeriods = [...periods]
    newPeriods[index] = { ...newPeriods[index], [field]: value }
    setPeriods(newPeriods)
  }

  // Calcular total de dias dos períodos
  const totalPeriodDays = periods.reduce((sum, p) => sum + (p.days || 0), 0)
  const daysToUse = 30 - sellDays

  // Submeter solicitação
  const handleSubmitRequest = async () => {
    if (!requestStartDate && !usePeriods) {
      toast.error('Informe a data de início das férias')
      return
    }

    if (usePeriods) {
      if (periods.some(p => !p.startDate || !p.days)) {
        toast.error('Preencha todos os períodos')
        return
      }
      if (totalPeriodDays !== daysToUse) {
        toast.error(`Total de dias (${totalPeriodDays}) deve ser igual a ${daysToUse}`)
        return
      }
    }

    setSubmittingRequest(true)
    try {
      const token = localStorage.getItem('token')
      const body: any = {
        vacationId: selectedVacationId || undefined,
        requestedStartDate: usePeriods ? periods[0].startDate : requestStartDate,
        requestedDays: usePeriods ? totalPeriodDays : daysToUse,
        sellDays,
        employeeNotes: employeeNotes || undefined,
      }

      if (usePeriods) {
        body.requestedPeriods = periods
      }

      const res = await fetch(`${api}/api/vacation-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success('Solicitação de férias enviada com sucesso!')
        setMyRequests([data, ...myRequests])
        setShowRequestModal(false)
        resetForm()
        
        // Atualizar dados
        const canRes = await fetch(`${api}/api/vacation-requests/can-request`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (canRes.ok) {
          setCanRequestData(await canRes.json())
        }
      } else {
        const error = await res.json()
        if (error.violations) {
          toast.error(error.violations.map((v: any) => v.message).join('. '))
        } else {
          toast.error(error.message || 'Erro ao enviar solicitação')
        }
      }
    } catch (e) {
      console.error('Erro ao enviar solicitação:', e)
      toast.error('Erro ao enviar solicitação')
    } finally {
      setSubmittingRequest(false)
    }
  }

  // Responder a contraproposta
  const handleRespondCounter = async (requestId: string, accepted: boolean) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${api}/api/vacation-requests/${requestId}/respond-counter`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ accepted }),
      })

      if (res.ok) {
        toast.success(accepted ? 'Contraproposta aceita!' : 'Contraproposta recusada')
        // Atualizar lista
        const reqRes = await fetch(`${api}/api/vacation-requests/my-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (reqRes.ok) {
          setMyRequests(await reqRes.json())
        }
      } else {
        const error = await res.json()
        toast.error(error.message || 'Erro ao responder')
      }
    } catch (e) {
      toast.error('Erro ao responder contraproposta')
    }
  }

  // Assinar aviso de férias
  const handleEmployeeSign = async (requestId: string) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${api}/api/vacation-requests/${requestId}/employee-sign`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        toast.success('Aviso de férias assinado com sucesso!')
        // Atualizar lista
        const reqRes = await fetch(`${api}/api/vacation-requests/my-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (reqRes.ok) {
          setMyRequests(await reqRes.json())
        }
      } else {
        const error = await res.json()
        toast.error(error.message || 'Erro ao assinar')
      }
    } catch (e) {
      toast.error('Erro ao assinar aviso de férias')
    }
  }

  // Status da solicitação
  const getRequestStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      PENDING: { bg: 'bg-yellow-500/20', text: 'text-yellow-600', label: 'Aguardando análise' },
      COUNTER_PROPOSAL: { bg: 'bg-orange-500/20', text: 'text-orange-600', label: 'Contraproposta' },
      APPROVED: { bg: 'bg-green-500/20', text: 'text-green-600', label: 'Aprovado' },
      REJECTED: { bg: 'bg-red-500/20', text: 'text-red-600', label: 'Rejeitado' },
      AWAITING_SIGNATURE: { bg: 'bg-blue-500/20', text: 'text-blue-600', label: 'Aguardando assinatura' },
      EMPLOYEE_SIGNED: { bg: 'bg-indigo-500/20', text: 'text-indigo-600', label: 'Você assinou' },
      COMPLETED: { bg: 'bg-emerald-500/20', text: 'text-emerald-600', label: 'Concluído' },
      CANCELLED: { bg: 'bg-gray-500/20', text: 'text-gray-600', label: 'Cancelado' },
    }
    const badge = badges[status] || badges.PENDING
    return <span className={`px-2 py-1 text-xs rounded-full ${badge.bg} ${badge.text} font-medium`}>{badge.label}</span>
  }

  const getStatusBadge = (period: VacationPeriod) => {
    if (period.status === 'REGULARIZED') {
      if (period.vacation?.regularizationType === 'ENJOYED') {
        return <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-600 font-medium">Gozadas</span>
      }
      if (period.vacation?.regularizationType === 'PAID_DOUBLE') {
        return <span className="px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-600 font-medium">Pagas em Dobro</span>
      }
      return <span className="px-2 py-1 text-xs rounded-full bg-amber-500/20 text-amber-600 font-medium">Regularizado</span>
    }
    if (period.status === 'SCHEDULED') {
      return <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-600 font-medium">Agendado</span>
    }
    if (period.status === 'IN_PROGRESS') {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-600 font-medium">Em andamento</span>
    }
    if (period.status === 'COMPLETED') {
      return <span className="px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-600 font-medium">Concluído</span>
    }
    if (period.isExpired) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-600 font-medium">Vencido</span>
    }
    if (period.isExpiringSoon) {
      return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-600 font-medium">Vencendo</span>
    }
    if (period.isAcquired) {
      return <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-600 font-medium">Disponível</span>
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-gray-500/20 text-gray-600 font-medium">Em aquisição</span>
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200">
      {/* Header */}
      <header className="bg-gradient-to-r from-webponto-blue to-webponto-blue-dark shadow-lg border-b-4 border-webponto-yellow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="text-3xl font-black text-white">P</div>
              <div className="w-8 h-8 rounded-full border-3 border-webponto-yellow flex items-center justify-center">
                <div className="w-1.5 h-5 bg-webponto-yellow rotate-45"></div>
                <div className="w-1.5 h-5 bg-webponto-yellow -rotate-45 -ml-1.5"></div>
              </div>
              <div className="text-3xl font-black text-white">nto</div>
            </div>
            <div className="border-l-2 border-white/30 pl-3">
              <p className="text-sm text-white/90 font-medium">Sistema de Ponto Eletrônico</p>
            </div>
          </div>
          <Button
            onClick={logout}
            variant="outline"
            className="flex items-center gap-2 bg-white/10 text-white border-white/30 hover:bg-white/20"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            Olá, {user.nome}! 👋
          </h2>
          <p className="text-slate-600">
            Bem-vindo ao painel de controle do WebPonto
          </p>
        </div>

        {/* User Info Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Perfil */}
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-webponto-blue">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-webponto-blue/10 rounded-lg">
                <User className="w-6 h-6 text-webponto-blue" />
              </div>
              <h3 className="font-semibold text-slate-900">Seu Perfil</h3>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-slate-600">
                <strong>Email:</strong> {user.email}
              </p>
              <p className="text-slate-600">
                <strong>Função:</strong> {user.role}
              </p>
              {user.funcionario && (
                <p className="text-slate-600">
                  <strong>Matrícula:</strong> {user.funcionario.matricula}
                </p>
              )}
            </div>
          </div>

          {/* Empresa */}
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-webponto-yellow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-webponto-yellow/20 rounded-lg">
                <Building2 className="w-6 h-6 text-webponto-yellow-dark" />
              </div>
              <h3 className="font-semibold text-slate-900">Empresa</h3>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-slate-600">
                <strong>Nome:</strong> {user.company?.tradeName || user.empresa?.nomeFantasia || 'N/A'}
              </p>
              <p className="text-slate-600">
                <strong>CNPJ:</strong> {user.company?.cnpj || user.empresa?.cnpj || 'N/A'}
              </p>
            </div>
          </div>

          {/* Ações Rápidas */}
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-webponto-blue">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-webponto-blue/10 rounded-lg">
                <Calendar className="w-6 h-6 text-webponto-blue" />
              </div>
              <h3 className="font-semibold text-slate-900">Ações</h3>
            </div>
            <div className="space-y-2">
              <Button
                onClick={() => router.push('/ponto/facial')}
                className="w-full bg-webponto-blue hover:bg-webponto-blue-dark"
                size="sm"
              >
                Registrar Ponto
              </Button>
              <Button
                onClick={() => router.push('/ponto/historico')}
                variant="outline"
                className="w-full border-webponto-yellow text-webponto-yellow-dark hover:bg-webponto-yellow/10"
                size="sm"
              >
                Ver Histórico
              </Button>
            </div>
          </div>
        </div>

        {/* Seção de Férias - só aparece se tiver dados */}
        {vacationData && vacationData.acquisitivePeriods && vacationData.acquisitivePeriods.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Palmtree className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Minhas Férias</h3>
                  <p className="text-sm text-slate-500">Acompanhe seus períodos aquisitivos</p>
                </div>
              </div>
              
              {/* Botão Solicitar Férias */}
              {canRequestData?.canRequest && (
                <Button
                  onClick={() => setShowRequestModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Solicitar Férias
                </Button>
              )}
            </div>
            
            {/* Minhas Solicitações */}
            {myRequests.length > 0 && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Minhas Solicitações
                </h4>
                <div className="space-y-3">
                  {myRequests.slice(0, 5).map((req) => (
                    <div key={req.id} className="bg-white p-3 rounded border">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {formatDate(req.requestedStartDate)} - {req.requestedDays} dias
                            {req.sellDays > 0 && <span className="text-green-600 ml-2">(+{req.sellDays} vendidos)</span>}
                          </p>
                          <p className="text-xs text-slate-500">
                            Solicitado em {formatDate(req.createdAt)}
                          </p>
                        </div>
                        {getRequestStatusBadge(req.status)}
                      </div>
                      
                      {/* Contraproposta recebida */}
                      {req.status === 'COUNTER_PROPOSAL' && req.counterProposal && (
                        <div className="mt-2 p-2 bg-orange-50 rounded border border-orange-200">
                          <p className="text-xs font-medium text-orange-700 mb-1">📋 Contraproposta do RH:</p>
                          <p className="text-xs text-orange-600">
                            Nova data: {formatDate((req.counterProposal as any).startDate)} - {(req.counterProposal as any).days} dias
                          </p>
                          {req.counterProposalNotes && (
                            <p className="text-xs text-orange-600 mt-1">Obs: {req.counterProposalNotes}</p>
                          )}
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRespondCounter(req.id, false)}
                              className="text-red-600 border-red-300 hover:bg-red-50 text-xs h-7"
                            >
                              <X className="w-3 h-3 mr-1" /> Recusar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleRespondCounter(req.id, true)}
                              className="bg-green-600 hover:bg-green-700 text-xs h-7"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Aceitar
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* Aguardando assinatura */}
                      {(req.status === 'AWAITING_SIGNATURE' || req.status === 'APPROVED') && !req.employeeSignedAt && (
                        <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                          <p className="text-xs font-medium text-blue-700 mb-2">✍️ Assine o aviso de férias</p>
                          <Button
                            size="sm"
                            onClick={() => handleEmployeeSign(req.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-xs h-7"
                          >
                            <FileText className="w-3 h-3 mr-1" /> Assinar
                          </Button>
                        </div>
                      )}
                      
                      {/* Já assinado pelo funcionário */}
                      {req.employeeSignedAt && !req.adminSignedAt && (
                        <p className="text-xs text-indigo-600 mt-2">
                          ✓ Você assinou em {formatDate(req.employeeSignedAt)} - Aguardando assinatura do RH
                        </p>
                      )}
                      
                      {/* Concluído */}
                      {req.status === 'COMPLETED' && (
                        <p className="text-xs text-emerald-600 mt-2">
                          ✓ Processo concluído - Férias confirmadas!
                        </p>
                      )}
                      
                      {/* Rejeitado */}
                      {req.status === 'REJECTED' && req.rejectionReason && (
                        <p className="text-xs text-red-600 mt-2">
                          ✗ Motivo: {req.rejectionReason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Aviso se não pode solicitar */}
            {canRequestData && !canRequestData.canRequest && canRequestData.reason && (
              <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {canRequestData.reason}
                </p>
              </div>
            )}

            <div className="space-y-4">
              {vacationData.acquisitivePeriods.map((period, idx) => (
                <div 
                  key={idx} 
                  className={`rounded-lg border p-4 ${
                    period.status === 'REGULARIZED' 
                      ? 'bg-green-50 border-green-200' 
                      : period.status === 'SCHEDULED'
                      ? 'bg-blue-50 border-blue-200'
                      : period.isExpired
                      ? 'bg-red-50 border-red-200'
                      : period.isExpiringSoon
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-800">
                      {period.periodNumber}º Período Aquisitivo
                    </span>
                    {getStatusBadge(period)}
                  </div>
                  
                  <p className="text-sm text-slate-600">
                    Aquisitivo: {formatDate(period.acquisitionStart)} a {formatDate(period.acquisitionEnd)}
                  </p>
                  
                  {/* Só mostrar concessivo se não for regularizado */}
                  {period.status !== 'REGULARIZED' && (
                    <p className="text-sm text-slate-600">
                      Concessivo: {formatDate(period.concessionStart)} a {formatDate(period.concessionEnd)}
                      {period.isAcquired && !period.isExpired && period.daysUntilExpiration > 0 && (
                        <span className="ml-2 text-yellow-600 font-medium">
                          ({period.daysUntilExpiration} dias restantes)
                        </span>
                      )}
                    </p>
                  )}

                  {/* Info de férias programadas */}
                  {period.hasVacation && period.vacation && period.status === 'SCHEDULED' && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-sm font-medium text-blue-600 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Férias programadas
                      </p>
                      {period.vacation.periods && period.vacation.periods.map((p, i) => (
                        <p key={i} className="text-sm text-slate-600 ml-5">
                          {p.periodNumber}º período: {formatDate(p.startDate)} a {formatDate(p.endDate)} ({p.days} dias)
                        </p>
                      ))}
                      {period.vacation.soldDays > 0 && (
                        <p className="text-sm text-green-600 ml-5">
                          💰 {period.vacation.soldDays} dias vendidos (abono pecuniário)
                        </p>
                      )}
                    </div>
                  )}

                  {/* Info de férias regularizadas */}
                  {period.status === 'REGULARIZED' && period.vacation && (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <p className="text-sm font-medium text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        {period.vacation.regularizationType === 'ENJOYED' ? 'Férias gozadas' : 'Férias pagas em dobro'}
                      </p>
                      {period.vacation.periods && period.vacation.periods.length > 0 && (
                        period.vacation.periods.map((p, i) => (
                          <p key={i} className="text-sm text-slate-600 ml-5">
                            {formatDate(p.startDate)} a {formatDate(p.endDate)} ({p.days} dias)
                          </p>
                        ))
                      )}
                    </div>
                  )}

                  {/* Alerta de férias vencidas */}
                  {period.isExpired && !period.hasVacation && (
                    <div className="mt-3 pt-3 border-t border-red-200">
                      <p className="text-sm font-medium text-red-600 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        Período vencido - Entre em contato com o RH
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading de férias */}
        {loadingVacations && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
              <p className="text-slate-600">Carregando informações de férias...</p>
            </div>
          </div>
        )}

        {/* Sistema Funcionando */}
        <div className="bg-gradient-to-r from-green-500 via-green-600 to-green-700 rounded-xl shadow-lg p-8 text-white border-4 border-green-300">
          <h3 className="text-2xl font-bold mb-2">
            ✅ Sistema Operacional!
          </h3>
          <p className="text-green-100 mb-4">
            WebPonto conectado ao banco de dados e pronto para uso!
          </p>
          <ul className="space-y-2 text-sm text-green-50">
            <li>✅ Autenticação com PostgreSQL</li>
            <li>✅ Reconhecimento Facial (CompreFace)</li>
            <li>✅ Armazenamento de Fotos (MinIO)</li>
            <li>✅ Registro de Pontos em Tempo Real</li>
          </ul>
        </div>
      </main>

      {/* Modal de Solicitação de Férias */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palmtree className="w-5 h-5 text-green-600" />
              Solicitar Férias
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da sua solicitação de férias
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Período aquisitivo */}
            {canRequestData?.availablePeriods && canRequestData.availablePeriods.length > 1 && (
              <div>
                <Label>Período Aquisitivo</Label>
                <select
                  value={selectedVacationId}
                  onChange={(e) => setSelectedVacationId(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  {canRequestData.availablePeriods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {formatDate(p.acquisitionStart)} a {formatDate(p.acquisitionEnd)} ({p.remainingDays} dias disponíveis)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Vender dias */}
            <div>
              <Label>Vender dias (Abono Pecuniário)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={sellDays}
                  onChange={(e) => setSellDays(Math.min(10, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-24"
                />
                <span className="text-sm text-slate-500">dias (máx. 10)</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Você receberá o valor de {sellDays} dias + 1/3 como abono
              </p>
            </div>

            {/* Dividir em períodos */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="usePeriods"
                checked={usePeriods}
                onChange={(e) => setUsePeriods(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="usePeriods" className="cursor-pointer">
                Dividir férias em períodos
              </Label>
            </div>

            {!usePeriods ? (
              /* Período único */
              <div>
                <Label>Data de início</Label>
                <Input
                  type="date"
                  value={requestStartDate}
                  onChange={(e) => setRequestStartDate(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Período de {daysToUse} dias corridos
                </p>
              </div>
            ) : (
              /* Múltiplos períodos */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Períodos (máx. 3)</Label>
                  {periods.length < 3 && (
                    <Button type="button" size="sm" variant="outline" onClick={addPeriod}>
                      <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  )}
                </div>
                
                {periods.map((period, idx) => (
                  <div key={idx} className="flex items-end gap-2 p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <Label className="text-xs">Início</Label>
                      <Input
                        type="date"
                        value={period.startDate}
                        onChange={(e) => updatePeriod(idx, 'startDate', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="w-24">
                      <Label className="text-xs">Dias</Label>
                      <Input
                        type="number"
                        min={idx === 0 ? 14 : 5}
                        value={period.days}
                        onChange={(e) => updatePeriod(idx, 'days', parseInt(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    {periods.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removePeriod(idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                
                <div className={`text-sm ${totalPeriodDays === daysToUse ? 'text-green-600' : 'text-red-600'}`}>
                  Total: {totalPeriodDays} de {daysToUse} dias
                  {totalPeriodDays !== daysToUse && ' ⚠️'}
                </div>
              </div>
            )}

            {/* Observações */}
            <div>
              <Label>Observações (opcional)</Label>
              <Textarea
                value={employeeNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEmployeeNotes(e.target.value)}
                placeholder="Motivo ou informações adicionais..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitRequest}
              disabled={submittingRequest}
              className="bg-green-600 hover:bg-green-700"
            >
              {submittingRequest ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Solicitação
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
