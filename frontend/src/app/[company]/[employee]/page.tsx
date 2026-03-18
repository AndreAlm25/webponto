"use client"
import { notFound, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { useMessages } from '@/hooks/useMessages'
import React from 'react'
import { 
  X, MessageCircleMore, MapPin, MapPinCheck, ScanFace, ClockArrowUp, ClockArrowDown, 
  Clock12, Clock2, UserRound, Clock, Clock11, ChartBarStacked, Calendar, LayoutDashboard,
  FileText, Wallet, BarChart3, ChevronLeft, ChevronRight, Download, CheckCircle, AlertCircle, Fingerprint,
  TrendingUp, DollarSign, CalendarDays, ClipboardCheck, Banknote, Timer, UserX, Clock3, Building2,
  ThumbsUp, ThumbsDown, RefreshCw, Palmtree, Send, Plus, Minus, Loader2, FileSignature
} from 'lucide-react'
import { ActionButton } from '@/components/ActionButton'
import { MessageModal } from '@/components/MessageModal'
import AvatarCircle from '@/components/facial/AvatarCircle'
import FacialRecognitionFlow from '@/components/facial/FacialRecognitionFlow'
import { Comfortaa, Roboto } from 'next/font/google'
import { toast } from 'sonner'
import { ThemeToggle } from '@/components/theme-toggle'
import LegacyTabs, { TabItem } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'

const comfortaa = Comfortaa({ subsets: ['latin'], weight: ['400', '700'] })
const roboto = Roboto({ subsets: ['latin'], weight: ['400', '700', '900'] })

export default function EmployeeCompanyPage({ params }: { params: { company: string, employee: string } }) {
  const router = useRouter()
  const { logout, user, refreshUser, loading: authLoading, isAuthenticated } = useAuth()
  const { onTimeEntryCreated, onEmployeeUpdated, onFaceRegistered, onFaceDeleted, onVacationRequestUpdated, connected } = useWebSocket()
  const { unreadCount } = useMessages()
  const { company, employee } = params
  
  // IMPORTANTE: Todos os useState DEVEM vir ANTES de qualquer return condicional
  // para evitar o erro "Rendered fewer hooks than expected"
  const [now, setNow] = React.useState<Date | null>(null)
  const [mounted, setMounted] = React.useState(false)
  const [geoPermission, setGeoPermission] = React.useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown')
  const [lastLocation, setLastLocation] = React.useState<{ latitude: number; longitude: number; accuracy?: number; capturedAt?: string } | null>(null)
  const [employeeData, setEmployeeData] = React.useState<any>(null)
  const [companyData, setCompanyData] = React.useState<any>(null)
  const [todayEntries, setTodayEntries] = React.useState<any[]>([])
  const [loadingData, setLoadingData] = React.useState(true)
  const [showFacialCamera, setShowFacialCamera] = React.useState(false)
  const [facialCameraMode, setFacialCameraMode] = React.useState<'registration' | 'recognition'>('recognition')
  const [hasFaceRegistered, setHasFaceRegistered] = React.useState(false)
  const [checkingFaceStatus, setCheckingFaceStatus] = React.useState(true)
  
  // Estado do painel de tabs (Resumo, Vales, Holerite)
  const [showPanel, setShowPanel] = React.useState(false)
  
  // Estados para as tabs do painel
  const [selectedMonth, setSelectedMonth] = React.useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear())
  const [payslips, setPayslips] = React.useState<any[]>([])
  const [advances, setAdvances] = React.useState<any[]>([])
  const [advanceSummary, setAdvanceSummary] = React.useState<any>(null)
  const [monthSummary, setMonthSummary] = React.useState<any>(null)
  const [selectedPayslip, setSelectedPayslip] = React.useState<any>(null)
  const [showPayslipView, setShowPayslipView] = React.useState(false)
  const [hasScrolledToEnd, setHasScrolledToEnd] = React.useState(false)
  const [showSignModal, setShowSignModal] = React.useState(false)
  const [isSigning, setIsSigning] = React.useState(false)
  const [showRejectForm, setShowRejectForm] = React.useState(false)
  const [rejectReason, setRejectReason] = React.useState('')
  const [isAccepting, setIsAccepting] = React.useState(false)
  const [isRejecting, setIsRejecting] = React.useState(false)
  const [showRequestModal, setShowRequestModal] = React.useState(false)
  const [newAdvanceAmount, setNewAdvanceAmount] = React.useState(0)
  const [newAdvanceReason, setNewAdvanceReason] = React.useState('')
  const [isRequesting, setIsRequesting] = React.useState(false)
  const [panelLoading, setPanelLoading] = React.useState(false)
  const [payrollConfig, setPayrollConfig] = React.useState<any>(null)
  const [dashboardData, setDashboardData] = React.useState<any>(null)
  
  // Filtros de holerite
  const [payslipFilterYear, setPayslipFilterYear] = React.useState<number | null>(null)
  const [payslipFilterMonth, setPayslipFilterMonth] = React.useState<number | null>(null)
  const [availableYears, setAvailableYears] = React.useState<number[]>([])
  
  // Estados para férias
  const [vacationData, setVacationData] = React.useState<any>(null)
  const [vacationRequests, setVacationRequests] = React.useState<any[]>([])
  const [canRequestVacation, setCanRequestVacation] = React.useState<any>(null)
  const [loadingVacations, setLoadingVacations] = React.useState(false)
  const [showVacationRequestModal, setShowVacationRequestModal] = React.useState(false)
  const [vacationRequestStartDate, setVacationRequestStartDate] = React.useState('')
  const [vacationRequestDays, setVacationRequestDays] = React.useState(30)
  const [vacationSellDays, setVacationSellDays] = React.useState(0)
  const [vacationNotes, setVacationNotes] = React.useState('')
  const [submittingVacationRequest, setSubmittingVacationRequest] = React.useState(false)
  const [selectedVacationId, setSelectedVacationId] = React.useState<string | null>(null)
  const [selectedPeriodAcquisitionStart, setSelectedPeriodAcquisitionStart] = React.useState<string | null>(null)
  const [showVacationSignModal, setShowVacationSignModal] = React.useState(false)
  const [selectedVacationRequest, setSelectedVacationRequest] = React.useState<any>(null)
  const [vacationSignScrolled, setVacationSignScrolled] = React.useState(false)
  const [signingVacation, setSigningVacation] = React.useState(false)
  const [showVacationSignConfirm, setShowVacationSignConfirm] = React.useState(false)
  
  // Constantes
  const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

  React.useEffect(() => {
    setMounted(true)
    setNow(new Date())
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])
  
  // Bloquear scroll da página quando o popup do holerite estiver aberto
  React.useEffect(() => {
    if (showPayslipView) {
      document.body.classList.add('modal-open')
    } else {
      document.body.classList.remove('modal-open')
    }
    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [showPayslipView])

  // Setar companyData assim que user estiver disponível
  React.useEffect(() => {
    if (user && (user as any)?.company) {
      setCompanyData((user as any).company)
    }
  }, [user])

  React.useEffect(() => {
    let cancelled = false
    const checkPerm = async () => {
      try {
        if (!('permissions' in navigator) || !(navigator as any).permissions?.query) {
          if (!cancelled) setGeoPermission('unknown')
          return
        }
        const status = await (navigator as any).permissions.query({ name: 'geolocation' as PermissionName })
        if (!cancelled) setGeoPermission(status.state as any)
        try {
          status.onchange = () => setGeoPermission((status as any).state as any)
        } catch {}
      } catch {
        if (!cancelled) setGeoPermission('unknown')
      }
    }
    checkPerm()
    return () => { cancelled = true }
  }, [])

  // Verificar se funcionário tem face cadastrada
  const checkFaceStatus = React.useCallback(async () => {
    if (!user) return
    
    try {
      const employeeId = (user as any)?.employee?.id || (user as any)?.funcionario?.id
      if (!employeeId) return

      const token = localStorage.getItem('token')
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/time-entries/facial/status/${employeeId}`
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setHasFaceRegistered(!!data?.hasFace)
      }
    } catch (error) {
      console.error('Erro ao verificar status facial:', error)
    } finally {
      setCheckingFaceStatus(false)
    }
  }, [user])

  // Atualizar apenas dados do funcionário (sem loading, sem piscada)
  // Usa /api/auth/me para não precisar de permissão employees.view
  const updateEmployeeDataSilently = React.useCallback(async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL
      const token = localStorage.getItem('token')
      if (!token || !backendUrl) return

      const meResponse = await fetch(`${backendUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (meResponse.ok) {
        const userData = await meResponse.json()
        const empData = userData?.employee
        if (empData) {
          console.log('[WebSocket] 🔄 Atualizando dados do funcionário:', {
            allowRemoteClockIn: empData.allowRemoteClockIn,
            allowFacialRecognition: empData.allowFacialRecognition,
          })
          setEmployeeData({
            ...empData,
            user: {
              name: userData.name,
              email: userData.email,
              avatarUrl: userData.avatarUrl,
            }
          })
        }
      }
    } catch (e) {
      console.error('Erro ao atualizar dados do funcionário:', e)
    }
  }, [])

  // Buscar dados do funcionário e pontos do dia
  const fetchEmployeeData = React.useCallback(async (isInitialLoad = false) => {
    
    // Buscar token diretamente do localStorage
    const token = localStorage.getItem('token')
    if (!token) {
      if (isInitialLoad) {
        setLoadingData(false)
      }
      return
    }
    try {
      // Só mostrar loading na carga inicial, não no polling
      if (isInitialLoad) {
        setLoadingData(true)
      }
      const backendUrl = process.env.NEXT_PUBLIC_API_URL
      
      // Buscar dados do usuário autenticado
      const meResponse = await fetch(`${backendUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (!meResponse.ok) {
        if (isInitialLoad) {
          setLoadingData(false)
        }
        return
      }
      
      const userData = await meResponse.json()
      const employeeId = userData?.employee?.id || userData?.funcionario?.id
      
      if (!employeeId || !backendUrl) {
        if (isInitialLoad) {
          setLoadingData(false)
        }
        return
      }

      // Usar dados do funcionário que já vêm do /api/auth/me
      // Isso evita precisar de permissão employees.view
      const empData = userData?.employee
      if (empData) {
        console.log('[EmployeePage] 🔍 Dados do funcionário (do /me):', {
          id: empData.id,
          allowRemoteClockIn: empData.allowRemoteClockIn,
          allowFacialRecognition: empData.allowFacialRecognition,
          requireLiveness: empData.requireLiveness,
          faceRegistered: empData.faceRegistered,
        })
        // Adicionar dados do user para ter o nome
        setEmployeeData({
          ...empData,
          user: {
            name: userData.name,
            email: userData.email,
            avatarUrl: userData.avatarUrl,
          }
        })
      }

      // Dados da empresa já vêm do user.company (incluindo logo)
      if ((user as any)?.company) {
        setCompanyData((user as any).company)
      }

      // Buscar pontos do dia (usar data local, não UTC)
      const now = new Date()
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const resEntries = await fetch(`${backendUrl}/api/time-entries/${employeeId}?dataInicio=${today}&dataFim=${today}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (resEntries.ok) {
        const entries = await resEntries.json()
        setTodayEntries(Array.isArray(entries) ? entries : [])
      } else {
        const errorText = await resEntries.text()
        console.error('[EmployeePage] Erro ao buscar pontos:', errorText)
      }
    } catch (e) {
      console.error('[fetchEmployeeData] ❌ ERRO:', e)
    } finally {
      if (isInitialLoad) {
        setLoadingData(false)
      }
    }
  }, [user])

  // Carregar dados apenas UMA VEZ na montagem
  // Não reagir a mudanças no user para evitar piscada
  const initialLoadDone = React.useRef(false)
  
  React.useEffect(() => {
    if (mounted && !initialLoadDone.current) {
      initialLoadDone.current = true
      checkFaceStatus()
      fetchEmployeeData(true) // isInitialLoad = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  // ========== FUNÇÕES DO PAINEL DE TABS ==========
  
  // Buscar holerites do funcionário
  const fetchPayslips = React.useCallback(async () => {
    if (!user) return
    
    try {
      const token = localStorage.getItem('token')
      const employeeId = (user as any)?.employee?.id || (user as any)?.funcionario?.id
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/payslips/employee/${employeeId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (res.ok) {
        const data = await res.json()
        // Funcionário só vê holerites após aprovação (APPROVED, ACCEPTED, REJECTED, PAID)
        const visiblePayslips = (data.payslips || []).filter((p: any) => 
          ['APPROVED', 'ACCEPTED', 'REJECTED', 'PAID'].includes(p.status)
        )
        setPayslips(visiblePayslips)
      }
    } catch (error) {
      console.error('Erro ao buscar holerites:', error)
    }
  }, [user])

  // Buscar vales do funcionário
  const fetchAdvances = React.useCallback(async () => {
    if (!user) return
    
    try {
      const token = localStorage.getItem('token')
      const employeeId = (user as any)?.employee?.id || (user as any)?.funcionario?.id
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/advances/employee/${employeeId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (res.ok) {
        const data = await res.json()
        setAdvances(data.advances || [])
        setAdvanceSummary(data.summary || null)
      }
    } catch (error) {
      console.error('Erro ao buscar vales:', error)
    }
  }, [user])

  // Buscar configuração de payroll da empresa
  const fetchPayrollConfig = React.useCallback(async () => {
    if (!user) return
    
    try {
      const token = localStorage.getItem('token')
      const companyId = (user as any)?.company?.id || (user as any)?.companyId
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/config?companyId=${companyId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (res.ok) {
        const data = await res.json()
        setPayrollConfig(data)
      }
    } catch (error) {
      console.error('Erro ao buscar config de payroll:', error)
    }
  }, [user])

  // Buscar dados para o dashboard
  const fetchDashboardData = React.useCallback(async () => {
    if (!user) return
    
    try {
      const token = localStorage.getItem('token')
      const employeeId = (user as any)?.employee?.id || (user as any)?.funcionario?.id
      const companyId = (user as any)?.company?.id || (user as any)?.companyId
      
      // Debug: verificar IDs
      console.log('[Dashboard] User:', (user as any)?.id)
      console.log('[Dashboard] Employee ID:', employeeId)
      console.log('[Dashboard] Company ID:', companyId)
      
      // Buscar registros do mês atual
      const now = new Date()
      const month = now.getMonth() + 1
      const year = now.getFullYear()
      
      // Calcular início e fim do mês para a API (formato YYYY-MM-DD)
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate() // Último dia do mês
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      
      const [entriesRes, payslipsRes, advancesRes, previewRes] = await Promise.all([
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/time-entries?companyId=${companyId}&employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/payslips/employee/${employeeId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/advances/employee/${employeeId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        // Buscar previsão em tempo real do holerite do mês atual
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/preview/${employeeId}?month=${month}&year=${year}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
      ])
      
      let workedDays = 0
      let totalHours = 0
      let pendingAdvances = 0
      let pendingPayslips = 0
      let lastSalary = 0
      let availableAdvance = 0
      let lateMinutes = 0
      let absences = 0
      
      if (entriesRes.ok) {
        const entriesData = await entriesRes.json()
        // A API pode retornar { entries: [] } ou diretamente um array
        const entries = Array.isArray(entriesData) ? entriesData : (entriesData.entries || entriesData.data || [])
        console.log('[Dashboard] Entries response type:', typeof entriesData, Array.isArray(entriesData))
        console.log('[Dashboard] Entries count:', entries.length)
        
        // Contar dias únicos com ponto
        const uniqueDays = new Set(entries.map((e: any) => e.timestamp?.split('T')[0]))
        workedDays = uniqueDays.size
        
        // Calcular horas trabalhadas (descontando intervalo)
        // Agrupar por dia e calcular: (CLOCK_OUT - CLOCK_IN) - (BREAK_END - BREAK_START)
        const dayGroups: { [key: string]: any[] } = {}
        entries.forEach((e: any) => {
          const day = e.timestamp?.split('T')[0]
          if (!dayGroups[day]) dayGroups[day] = []
          dayGroups[day].push(e)
        })
        
        Object.values(dayGroups).forEach((dayEntries: any[]) => {
          const clockIn = dayEntries.find((e: any) => e.type === 'CLOCK_IN')
          const clockOut = dayEntries.find((e: any) => e.type === 'CLOCK_OUT')
          const breakStart = dayEntries.find((e: any) => e.type === 'BREAK_START')
          const breakEnd = dayEntries.find((e: any) => e.type === 'BREAK_END')
          
          if (clockIn && clockOut) {
            const inTime = new Date(clockIn.timestamp).getTime()
            const outTime = new Date(clockOut.timestamp).getTime()
            let dayHours = (outTime - inTime) / 3600000
            
            // Descontar intervalo se houver
            if (breakStart && breakEnd) {
              const breakStartTime = new Date(breakStart.timestamp).getTime()
              const breakEndTime = new Date(breakEnd.timestamp).getTime()
              const breakHours = (breakEndTime - breakStartTime) / 3600000
              dayHours -= breakHours
            }
            
            totalHours += dayHours
          }
        })
        
        // Calcular atrasos (soma de lateMinutes de todas as entradas)
        lateMinutes = entries
          .filter((e: any) => e.isLate && e.lateMinutes)
          .reduce((sum: number, e: any) => sum + (e.lateMinutes || 0), 0)
        
        console.log('[Dashboard] Worked days:', workedDays, 'Total hours:', totalHours, 'Late minutes:', lateMinutes)
      } else {
        console.log('[Dashboard] Entries request failed:', entriesRes.status)
      }
      
      // Calcular faltas (dias úteis do mês - dias trabalhados)
      // Simplificado: considera 22 dias úteis por mês
      const today = new Date()
      const currentDay = today.getDate()
      // Estimar dias úteis até hoje (aproximadamente 22 dias úteis / 30 dias * dia atual)
      const estimatedWorkDays = Math.floor((22 / 30) * currentDay)
      absences = Math.max(0, estimatedWorkDays - workedDays)
      
      let slips: any[] = []
      let pendingPayslipsList: any[] = []
      
      if (payslipsRes.ok) {
        const payslipsData = await payslipsRes.json()
        slips = payslipsData.payslips || []
        pendingPayslipsList = slips.filter((p: any) => !p.signedAt)
        pendingPayslips = pendingPayslipsList.length
      }
      
      // Calcular adiantamentos aprovados do mês atual
      let advs: any[] = []
      let currentMonthAdvances = 0
      
      if (advancesRes.ok) {
        const advancesData = await advancesRes.json()
        advs = advancesData.advances || []
        pendingAdvances = advs.filter((a: any) => a.status === 'PENDING').length
        availableAdvance = advancesData.summary?.available || 0
        
        // Somar adiantamentos aprovados do mês atual
        currentMonthAdvances = advs
          .filter((a: any) => {
            const advDate = new Date(a.createdAt)
            return a.status === 'APPROVED' && 
                   advDate.getMonth() + 1 === month && 
                   advDate.getFullYear() === year
          })
          .reduce((sum: number, a: any) => sum + (Number(a.amount) || 0), 0)
      }
      
      // Separar holerites por mês
      // Pegar o último holerite que NÃO seja do mês atual (mês anterior fechado)
      const sortedSlips = [...slips].sort((a: any, b: any) => {
        if (a.referenceYear !== b.referenceYear) return b.referenceYear - a.referenceYear
        return b.referenceMonth - a.referenceMonth
      })
      const lastPaidPayslip = sortedSlips.find((p: any) => 
        !(p.referenceMonth === month && p.referenceYear === year) && 
        (p.status === 'PAID' || p.status === 'APPROVED' || p.signedAt)
      ) || sortedSlips.find((p: any) => p.referenceMonth !== month || p.referenceYear !== year)
      const currentMonthPayslip = slips.find((p: any) => 
        p.referenceMonth === month && p.referenceYear === year
      )
      
      // Buscar previsão em tempo real do backend
      let previewData: any = null
      console.log('[Dashboard] Preview URL:', `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/preview/${employeeId}?month=${month}&year=${year}`)
      console.log('[Dashboard] Preview response status:', previewRes.status, previewRes.ok)
      if (previewRes.ok) {
        const preview = await previewRes.json()
        console.log('[Dashboard] Preview response:', preview)
        if (preview.success) {
          previewData = preview
          console.log('[Dashboard] Preview data loaded:', {
            isPreview: preview.isPreview,
            hasOfficialPayslip: preview.hasOfficialPayslip,
            daysRemaining: preview.daysRemaining,
            netSalary: preview.preview?.netSalary,
            inssValue: preview.preview?.inssValue,
            totalDeductions: preview.preview?.totalDeductions,
          })
        } else {
          console.log('[Dashboard] Preview error:', preview.error)
        }
      } else {
        console.log('[Dashboard] Preview fetch failed:', previewRes.status)
      }
      
      // Usar dados da previsão em tempo real (mais precisos)
      // Se não tiver previsão, usar dados do holerite existente
      const forecast = previewData?.preview || {}
      const ps = currentMonthPayslip || {}
      
      // Função helper para converter Decimal/string para número
      const toNum = (val: any) => val !== undefined && val !== null ? Number(val) : 0
      
      // Normalizar dados do holerite existente
      const payslipData = {
        baseSalary: toNum(ps.baseSalary),
        totalEarnings: toNum(ps.totalEarnings),
        inssValue: toNum(ps.inssValue),
        inssRate: toNum(ps.inssRate),
        irValue: toNum(ps.irValue),
        irRate: toNum(ps.irRate),
        transportVoucher: toNum(ps.transportVoucher),
        healthInsurance: toNum(ps.healthInsurance),
        dentalInsurance: toNum(ps.dentalInsurance),
        lateValue: toNum(ps.lateValue),
        lateDiscounted: ps.lateDiscounted ?? true,
        absenceValue: toNum(ps.absenceValue),
        absenceDays: toNum(ps.absenceDays),
        lateMinutes: toNum(ps.lateMinutes),
        advancePayment: toNum(ps.advancePayment),
        totalDeductions: toNum(ps.totalDeductions),
        netSalary: toNum(ps.netSalary),
        fgtsBase: toNum(ps.fgtsBase),
        fgtsValue: toNum(ps.fgtsValue),
        overtimeHours50: toNum(ps.overtimeHours50),
        overtimeValue50: toNum(ps.overtimeValue50),
        overtimeHours100: toNum(ps.overtimeHours100),
        overtimeValue100: toNum(ps.overtimeValue100),
      }
      
      const baseSalary = toNum(forecast.baseSalary) || payslipData.baseSalary || 0
      
      console.log('[Dashboard] Using forecast:', Object.keys(forecast).length > 0 ? 'preview' : 'payslip')
      console.log('[Dashboard] Payslip data normalized:', payslipData)
      
      setDashboardData({
        // Mês atual
        workedDays: forecast.workedDays || workedDays,
        totalHours: Math.round((forecast.workedHours || totalHours) * 10) / 10,
        currentMonth: MONTHS[month - 1],
        currentYear: year,
        
        // Faltas e atrasos do mês atual (da previsão em tempo real)
        absences: forecast.absenceDays || payslipData.absenceDays || absences,
        lateMinutes: forecast.lateMinutes || payslipData.lateMinutes || lateMinutes,
        
        // Previsão do mês atual (dados completos do backend ou do holerite existente)
        salaryForecast: {
          baseSalary: baseSalary,
          totalEarnings: toNum(forecast.totalEarnings) || payslipData.totalEarnings || baseSalary,
          // Descontos detalhados (usar previsão ou holerite)
          inssValue: toNum(forecast.inssValue) || payslipData.inssValue,
          inssRate: toNum(forecast.inssRate) || payslipData.inssRate,
          irValue: toNum(forecast.irValue) || payslipData.irValue,
          irRate: toNum(forecast.irRate) || payslipData.irRate,
          transportVoucher: toNum(forecast.transportVoucher) || payslipData.transportVoucher,
          healthInsurance: toNum(forecast.healthInsurance) || payslipData.healthInsurance,
          dentalInsurance: toNum(forecast.dentalInsurance) || payslipData.dentalInsurance,
          lateValue: toNum(forecast.lateValue) || payslipData.lateValue,
          lateDiscounted: forecast.lateDiscounted ?? payslipData.lateDiscounted,
          absenceValue: toNum(forecast.absenceValue) || payslipData.absenceValue,
          advancePayment: toNum(forecast.advancePayment) || payslipData.advancePayment || currentMonthAdvances,
          // Totais
          totalDeductions: toNum(forecast.totalDeductions) || payslipData.totalDeductions,
          netSalary: toNum(forecast.netSalary) || payslipData.netSalary,
          // FGTS (informativo)
          fgtsBase: toNum(forecast.fgtsBase) || payslipData.fgtsBase,
          fgtsValue: toNum(forecast.fgtsValue) || payslipData.fgtsValue,
          // Horas extras
          overtimeHours50: toNum(forecast.overtimeHours50) || payslipData.overtimeHours50,
          overtimeValue50: toNum(forecast.overtimeValue50) || payslipData.overtimeValue50,
          overtimeHours100: toNum(forecast.overtimeHours100) || payslipData.overtimeHours100,
          overtimeValue100: toNum(forecast.overtimeValue100) || payslipData.overtimeValue100,
          // Status
          hasPayslip: previewData?.hasOfficialPayslip || !!currentMonthPayslip,
          isPreview: !currentMonthPayslip && (previewData?.isPreview ?? true),
          daysRemaining: previewData?.daysRemaining || 0,
        },
        paymentDay: 5, // Valor padrão
        
        // Configurações
        config: previewData?.config || {},
        
        // Mês anterior
        lastPayslip: lastPaidPayslip ? {
          netSalary: lastPaidPayslip.netSalary || 0,
          absenceDays: lastPaidPayslip.absenceDays || 0,
          overtimeHours: Number(lastPaidPayslip.overtimeHours50 || 0) + Number(lastPaidPayslip.overtimeHours100 || 0),
          overtimeValue: Number(lastPaidPayslip.overtimeValue50 || 0) + Number(lastPaidPayslip.overtimeValue100 || 0),
          month: lastPaidPayslip.referenceMonth,
          year: lastPaidPayslip.referenceYear,
          monthName: lastPaidPayslip.referenceMonth ? MONTHS[lastPaidPayslip.referenceMonth - 1] : '',
        } : null,
        
        // Pendências
        pendingAdvances,
        pendingPayslips,
        pendingPayslipsList,
        availableAdvance,
      })
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error)
    }
  }, [user, MONTHS])

  // Carregar dados do painel quando abrir (apenas uma vez)
  const panelDataLoaded = React.useRef(false)
  
  React.useEffect(() => {
    if (showPanel && user && !panelDataLoaded.current) {
      panelDataLoaded.current = true
      setPanelLoading(true)
      
      const loadPanelData = async () => {
        try {
          const token = localStorage.getItem('token')
          const employeeId = (user as any)?.employee?.id || (user as any)?.funcionario?.id
          const companyId = (user as any)?.company?.id || (user as any)?.companyId
          
          // Buscar todos os dados em paralelo
          const [payslipsRes, advancesRes, configRes] = await Promise.all([
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payroll/payslips/employee/${employeeId}`, {
              headers: { Authorization: `Bearer ${token}` }
            }),
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payroll/advances/employee/${employeeId}`, {
              headers: { Authorization: `Bearer ${token}` }
            }),
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payroll/config?companyId=${companyId}`, {
              headers: { Authorization: `Bearer ${token}` }
            })
          ])
          
          // Processar dados
          let slips: any[] = []
          let advs: any[] = []
          let advSummary: any = null
          
          if (payslipsRes.ok) {
            const data = await payslipsRes.json()
            slips = data.payslips || []
            setPayslips(slips)
            
            // Extrair anos disponíveis dos holerites
            const years = [...new Set(slips.map((p: any) => p.referenceYear))].sort((a, b) => b - a)
            setAvailableYears(years as number[])
          }
          
          if (advancesRes.ok) {
            const data = await advancesRes.json()
            advs = data.advances || []
            advSummary = data.summary || null
            setAdvances(advs)
            setAdvanceSummary(advSummary)
          }
          
          if (configRes.ok) {
            const data = await configRes.json()
            setPayrollConfig(data)
          }
          
          // Buscar registros de ponto do mês
          const now = new Date()
          const month = now.getMonth() + 1
          const year = now.getFullYear()
          
          // Calcular início e fim do mês para a API (formato YYYY-MM-DD)
          const startDate = `${year}-${String(month).padStart(2, '0')}-01`
          const lastDay = new Date(year, month, 0).getDate() // Último dia do mês
          const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
          
          let workedDays = 0
          let totalHours = 0
          let lateMinutes = 0
          let absences = 0
          
          try {
            const entriesRes = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/api/time-entries?companyId=${companyId}&employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
            
            if (entriesRes.ok) {
              const entriesData = await entriesRes.json()
              // A API pode retornar { entries: [] } ou diretamente um array
              const entries = Array.isArray(entriesData) ? entriesData : (entriesData.entries || entriesData.data || [])
              const uniqueDays = new Set(entries.map((e: any) => e.timestamp?.split('T')[0]))
              workedDays = uniqueDays.size
              
              // Calcular horas trabalhadas (descontando intervalo)
              const dayGroups: { [key: string]: any[] } = {}
              entries.forEach((e: any) => {
                const day = e.timestamp?.split('T')[0]
                if (!dayGroups[day]) dayGroups[day] = []
                dayGroups[day].push(e)
              })
              
              Object.values(dayGroups).forEach((dayEntries: any[]) => {
                const clockIn = dayEntries.find((e: any) => e.type === 'CLOCK_IN')
                const clockOut = dayEntries.find((e: any) => e.type === 'CLOCK_OUT')
                const breakStart = dayEntries.find((e: any) => e.type === 'BREAK_START')
                const breakEnd = dayEntries.find((e: any) => e.type === 'BREAK_END')
                
                if (clockIn && clockOut) {
                  const inTime = new Date(clockIn.timestamp).getTime()
                  const outTime = new Date(clockOut.timestamp).getTime()
                  let dayHours = (outTime - inTime) / 3600000
                  
                  // Descontar intervalo se houver
                  if (breakStart && breakEnd) {
                    const breakStartTime = new Date(breakStart.timestamp).getTime()
                    const breakEndTime = new Date(breakEnd.timestamp).getTime()
                    const breakHours = (breakEndTime - breakStartTime) / 3600000
                    dayHours -= breakHours
                  }
                  
                  totalHours += dayHours
                }
              })
              
              // Calcular atrasos (soma de lateMinutes de todas as entradas)
              lateMinutes = entries
                .filter((e: any) => e.isLate && e.lateMinutes)
                .reduce((sum: number, e: any) => sum + (e.lateMinutes || 0), 0)
            }
          } catch (e) {
            console.error('Erro ao buscar registros:', e)
          }
          
          // Calcular faltas (dias úteis do mês - dias trabalhados)
          const today = new Date()
          const currentDay = today.getDate()
          const estimatedWorkDays = Math.floor((22 / 30) * currentDay)
          absences = Math.max(0, estimatedWorkDays - workedDays)
          
          // Separar holerites por mês
          const pendingPayslipsList = slips.filter((p: any) => !p.signedAt)
          
          // Encontrar o último holerite que NÃO seja do mês atual (mês anterior fechado)
          const sortedSlipsPanel = [...slips].sort((a: any, b: any) => {
            if (a.referenceYear !== b.referenceYear) return b.referenceYear - a.referenceYear
            return b.referenceMonth - a.referenceMonth
          })
          const lastPaidPayslip = sortedSlipsPanel.find((p: any) => 
            !(p.referenceMonth === month && p.referenceYear === year) && 
            (p.status === 'PAID' || p.status === 'APPROVED' || p.signedAt)
          ) || sortedSlipsPanel.find((p: any) => p.referenceMonth !== month || p.referenceYear !== year)
          const lastPayslipMonth = lastPaidPayslip ? lastPaidPayslip.referenceMonth : null
          const lastPayslipYear = lastPaidPayslip ? lastPaidPayslip.referenceYear : null
          
          // Encontrar holerite do mês atual (se existir, para previsão)
          const currentMonthPayslip = slips.find((p: any) => 
            p.referenceMonth === month && p.referenceYear === year
          )
          
          // Buscar configurações de pagamento
          const config = payrollConfig || {}
          const paymentDay = config.paymentDay || 5
          const advancePaymentDay = config.advancePaymentDay || 20
          
          // Calcular adiantamentos aprovados do mês atual
          const currentMonthAdvances = advs
            .filter((a: any) => {
              const advDate = new Date(a.createdAt)
              return a.status === 'APPROVED' && 
                     advDate.getMonth() + 1 === month && 
                     advDate.getFullYear() === year
            })
            .reduce((sum: number, a: any) => sum + (Number(a.amount) || 0), 0)
          
          // Pegar salário base do funcionário
          const employeeSalary = (user as any)?.employee?.salary || 
                                (user as any)?.funcionario?.salary ||
                                lastPaidPayslip?.baseSalary || 0
          
          // Função helper para converter Decimal/string para número
          const toNum = (val: any) => val !== undefined && val !== null ? Number(val) : 0
          
          // Normalizar dados do holerite existente (se houver)
          const ps = currentMonthPayslip || {}
          const baseSalary = toNum(ps.baseSalary) || Number(employeeSalary) || 0
          
          console.log('[Panel] Current month payslip:', ps.id ? {
            id: ps.id,
            baseSalary: ps.baseSalary,
            inssValue: ps.inssValue,
            totalDeductions: ps.totalDeductions,
            netSalary: ps.netSalary,
          } : 'NOT FOUND')
          
          // Montar dados do dashboard com descontos detalhados
          setDashboardData({
            // Mês atual
            workedDays,
            totalHours: Math.round(totalHours * 10) / 10,
            currentMonth: MONTHS[month - 1],
            currentYear: year,
            
            // Faltas e atrasos do mês atual
            absences: toNum(ps.absenceDays) || absences,
            lateMinutes: toNum(ps.lateMinutes) || lateMinutes,
            
            // Previsão do mês atual (dados detalhados do holerite)
            salaryForecast: {
              baseSalary: baseSalary,
              totalEarnings: toNum(ps.totalEarnings) || baseSalary,
              // Descontos detalhados
              inssValue: toNum(ps.inssValue),
              inssRate: toNum(ps.inssRate),
              irValue: toNum(ps.irValue),
              irRate: toNum(ps.irRate),
              transportVoucher: toNum(ps.transportVoucher),
              healthInsurance: toNum(ps.healthInsurance),
              dentalInsurance: toNum(ps.dentalInsurance),
              lateValue: toNum(ps.lateValue),
              lateDiscounted: ps.lateDiscounted ?? true,
              absenceValue: toNum(ps.absenceValue),
              advancePayment: toNum(ps.advancePayment) || currentMonthAdvances,
              // Totais
              totalDeductions: toNum(ps.totalDeductions),
              netSalary: toNum(ps.netSalary),
              // FGTS (informativo)
              fgtsBase: toNum(ps.fgtsBase),
              fgtsValue: toNum(ps.fgtsValue),
              // Horas extras
              overtimeHours50: toNum(ps.overtimeHours50),
              overtimeValue50: toNum(ps.overtimeValue50),
              overtimeHours100: toNum(ps.overtimeHours100),
              overtimeValue100: toNum(ps.overtimeValue100),
              // Status
              hasPayslip: !!currentMonthPayslip,
              isPreview: !currentMonthPayslip,
              daysRemaining: 0,
            },
            paymentDay,
            advancePaymentDay,
            
            // Mês anterior (último holerite)
            lastPayslip: lastPaidPayslip ? {
              netSalary: lastPaidPayslip.netSalary || 0,
              absenceDays: lastPaidPayslip.absenceDays || 0,
              overtimeHours: Number(lastPaidPayslip.overtimeHours50 || 0) + Number(lastPaidPayslip.overtimeHours100 || 0),
              overtimeValue: Number(lastPaidPayslip.overtimeValue50 || 0) + Number(lastPaidPayslip.overtimeValue100 || 0),
              month: lastPayslipMonth,
              year: lastPayslipYear,
              monthName: lastPayslipMonth ? MONTHS[lastPayslipMonth - 1] : '',
            } : null,
            
            // Pendências
            pendingAdvances: advs.filter((a: any) => a.status === 'PENDING').length,
            pendingPayslips: pendingPayslipsList.length,
            pendingPayslipsList, // Lista para poder abrir o modal
            availableAdvance: advSummary?.available || 0,
          })
        } catch (error) {
          console.error('Erro ao carregar dados do painel:', error)
        } finally {
          setPanelLoading(false)
        }
      }
      
      loadPanelData()
    }
    
    // Reset quando fechar o painel
    if (!showPanel) {
      panelDataLoaded.current = false
    }
  }, [showPanel, user, MONTHS])

  // ========== FUNÇÕES DE FÉRIAS ==========
  
  // Buscar dados de férias do funcionário
  const fetchVacationData = React.useCallback(async () => {
    if (!user) return
    
    setLoadingVacations(true)
    try {
      const token = localStorage.getItem('token')
      const api = process.env.NEXT_PUBLIC_API_URL
      
      // Buscar férias e solicitações em paralelo
      const [vacRes, canReqRes, reqRes] = await Promise.all([
        fetch(`${api}/api/vacations/my-vacations`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${api}/api/vacation-requests/can-request`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${api}/api/vacation-requests/my-requests`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      
      if (vacRes.ok) {
        const data = await vacRes.json()
        console.log('[FÉRIAS] Dados recebidos:', data)
        setVacationData(data)
      }
      
      if (canReqRes.ok) {
        const data = await canReqRes.json()
        console.log('[FÉRIAS] Pode solicitar:', data)
        setCanRequestVacation(data)
        if (data.availablePeriods?.length > 0) {
          setSelectedVacationId(data.availablePeriods[0].id)
        }
      }
      
      if (reqRes.ok) {
        const data = await reqRes.json()
        console.log('[FÉRIAS] Minhas solicitações:', data)
        setVacationRequests(data || [])
      }
    } catch (error) {
      console.error('[FÉRIAS] Erro ao buscar dados:', error)
    } finally {
      setLoadingVacations(false)
    }
  }, [user])

  // Carregar férias quando abrir o painel
  React.useEffect(() => {
    if (showPanel && user) {
      fetchVacationData()
    }
  }, [showPanel, user, fetchVacationData])

  // WebSocket: atualizar quando admin aprovar/rejeitar férias
  React.useEffect(() => {
    const unsub = onVacationRequestUpdated((request: any) => {
      console.log('[FÉRIAS WS] Solicitação atualizada:', request)
      // Atualizar na lista de solicitações
      setVacationRequests(prev => 
        prev.map(r => r.id === request.id ? { ...r, ...request } : r)
      )
      // Notificar o funcionário
      if (request.status === 'APPROVED' || request.status === 'AWAITING_SIGNATURE') {
        toast.success('Suas férias foram aprovadas!')
      } else if (request.status === 'REJECTED') {
        toast.error('Sua solicitação de férias foi rejeitada')
      } else if (request.status === 'COUNTER_PROPOSAL') {
        toast.info('O RH fez uma contraproposta para suas férias')
      }
    })

    return () => unsub()
  }, [onVacationRequestUpdated])

  // Submeter solicitação de férias
  const handleSubmitVacationRequest = async () => {
    if (!vacationRequestStartDate) {
      toast.error('Informe a data de início das férias')
      return
    }
    
    setSubmittingVacationRequest(true)
    try {
      const token = localStorage.getItem('token')
      const api = process.env.NEXT_PUBLIC_API_URL
      
      const body = {
        vacationId: selectedVacationId || undefined,
        acquisitionStart: selectedPeriodAcquisitionStart || undefined,
        requestedStartDate: vacationRequestStartDate,
        requestedDays: vacationRequestDays - vacationSellDays,
        sellDays: vacationSellDays,
        employeeNotes: vacationNotes || undefined,
      }
      
      console.log('[FÉRIAS FRONTEND] Enviando solicitação:', JSON.stringify(body, null, 2))
      console.log('[FÉRIAS FRONTEND] selectedVacationId:', selectedVacationId)
      console.log('[FÉRIAS FRONTEND] selectedPeriodAcquisitionStart:', selectedPeriodAcquisitionStart)
      
      const res = await fetch(`${api}/api/vacation-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      
      if (res.ok) {
        toast.success('Solicitação de férias enviada com sucesso!')
        setShowVacationRequestModal(false)
        setVacationRequestStartDate('')
        setVacationRequestDays(30)
        setVacationSellDays(0)
        setVacationNotes('')
        setSelectedPeriodAcquisitionStart(null)
        fetchVacationData()
      } else {
        const error = await res.json()
        if (error.violations) {
          toast.error(error.violations.map((v: any) => v.message).join('. '))
        } else {
          toast.error(error.message || 'Erro ao enviar solicitação')
        }
      }
    } catch (error) {
      console.error('Erro ao enviar solicitação:', error)
      toast.error('Erro ao enviar solicitação')
    } finally {
      setSubmittingVacationRequest(false)
    }
  }

  // Responder contraproposta
  const handleRespondCounter = async (requestId: string, accepted: boolean) => {
    try {
      const token = localStorage.getItem('token')
      const api = process.env.NEXT_PUBLIC_API_URL
      
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
        fetchVacationData()
      } else {
        const error = await res.json()
        toast.error(error.message || 'Erro ao responder')
      }
    } catch (error) {
      toast.error('Erro ao responder contraproposta')
    }
  }

  // Abrir modal de assinatura de férias
  const openVacationSignModal = (request: any) => {
    setSelectedVacationRequest(request)
    // Carregar estado de scroll do banco (se já rolou antes)
    setVacationSignScrolled(request.employeeScrolled || false)
    setShowVacationSignModal(true)
  }

  // Marcar scroll de férias no backend e atualizar estado local
  const handleVacationScroll = async (requestId: string) => {
    try {
      const token = localStorage.getItem('token')
      const api = process.env.NEXT_PUBLIC_API_URL
      await fetch(`${api}/api/vacation-requests/${requestId}/mark-scrolled`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      
      // Atualizar o objeto selectedVacationRequest localmente
      if (selectedVacationRequest && selectedVacationRequest.id === requestId) {
        setSelectedVacationRequest({
          ...selectedVacationRequest,
          employeeScrolled: true,
          employeeScrolledAt: new Date().toISOString(),
        })
      }
      
      // Atualizar a lista de vacationRequests para manter sincronizado
      setVacationRequests((prev: any[]) => 
        prev.map((req: any) => 
          req.id === requestId 
            ? { ...req, employeeScrolled: true, employeeScrolledAt: new Date().toISOString() }
            : req
        )
      )
    } catch (error) {
      console.error('Erro ao marcar scroll:', error)
    }
  }

  // Assinar aviso de férias
  const handleEmployeeSignVacation = async () => {
    if (!selectedVacationRequest) return
    
    if (!vacationSignScrolled) {
      toast.error('Role até o final do documento para poder assinar')
      return
    }
    
    setSigningVacation(true)
    try {
      const token = localStorage.getItem('token')
      const api = process.env.NEXT_PUBLIC_API_URL
      
      const res = await fetch(`${api}/api/vacation-requests/${selectedVacationRequest.id}/employee-sign`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (res.ok) {
        toast.success('Aviso de férias assinado com sucesso!')
        setShowVacationSignConfirm(false)
        setShowVacationSignModal(false)
        setSelectedVacationRequest(null)
        fetchVacationData()
      } else {
        const error = await res.json()
        toast.error(error.message || 'Erro ao assinar')
      }
    } catch (error) {
      toast.error('Erro ao assinar aviso de férias')
    } finally {
      setSigningVacation(false)
    }
  }

  // Helper para formatar data
  const formatVacationDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR')
  }

  // Helper para badge de status de solicitação
  const getVacationRequestStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      PENDING: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', label: 'Aguardando análise' },
      COUNTER_PROPOSAL: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', label: 'Contraproposta' },
      APPROVED: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Aprovado' },
      REJECTED: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Rejeitado' },
      AWAITING_SIGNATURE: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'Aguardando assinatura' },
      EMPLOYEE_SIGNED: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400', label: 'Você assinou' },
      COMPLETED: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Concluído' },
      CANCELLED: { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-700 dark:text-gray-400', label: 'Cancelado' },
    }
    const badge = badges[status] || badges.PENDING
    return <span className={`px-2 py-1 text-xs rounded-full ${badge.bg} ${badge.text} font-medium`}>{badge.label}</span>
  }

  // Abrir visualização do holerite
  const handleOpenPayslipView = async (payslip: any) => {
    setSelectedPayslip(payslip)
    setHasScrolledToEnd(payslip.scrolledToEnd || false)
    setShowPayslipView(true)
    
    // Marcar como visualizado no backend
    try {
      const token = localStorage.getItem('token')
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/payslip/${payslip.id}/viewed`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      )
    } catch (error) {
      console.error('Erro ao marcar visualização:', error)
    }
  }

  // Detectar scroll até o final
  const handlePayslipScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    if (hasScrolledToEnd || !selectedPayslip) return
    
    const element = e.currentTarget
    const scrolledToBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50
    
    if (scrolledToBottom) {
      setHasScrolledToEnd(true)
      
      // Marcar scroll no backend
      try {
        const token = localStorage.getItem('token')
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/payslip/${selectedPayslip.id}/scrolled`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          }
        )
      } catch (error) {
        console.error('Erro ao marcar scroll:', error)
      }
    }
  }

  // Assinar holerite digitalmente
  const handleSignPayslip = async () => {
    if (!selectedPayslip) return
    
    if (!hasScrolledToEnd) {
      toast.error('Role até o final do documento para poder assinar')
      return
    }
    
    setIsSigning(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/payslip/${selectedPayslip.id}/sign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ acceptTerms: true }),
        }
      )
      
      if (res.ok) {
        toast.success('Holerite assinado com sucesso!')
        setShowSignModal(false)
        setShowPayslipView(false)
        setSelectedPayslip(null)
        setHasScrolledToEnd(false)
        // Recarregar dados do painel
        panelDataLoaded.current = false
        setPanelLoading(true)
        const loadData = async () => {
          const token = localStorage.getItem('token')
          const employeeId = (user as any)?.employee?.id || (user as any)?.funcionario?.id
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/payslips/employee/${employeeId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          if (res.ok) {
            const data = await res.json()
            setPayslips(data.payslips || [])
          }
          setPanelLoading(false)
        }
        loadData()
      } else {
        const data = await res.json()
        toast.error(data.message || 'Erro ao assinar holerite')
      }
    } catch (error) {
      toast.error('Erro ao assinar holerite')
    } finally {
      setIsSigning(false)
    }
  }

  // Aceitar holerite (👍)
  const handleAcceptPayslip = async () => {
    if (!selectedPayslip) return
    
    if (!hasScrolledToEnd) {
      toast.error('Role até o final do documento para poder aceitar')
      return
    }
    
    setIsAccepting(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/payslip/${selectedPayslip.id}/accept`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      )
      
      if (res.ok) {
        toast.success('Holerite aceito com sucesso!')
        setShowSignModal(false)
        setShowPayslipView(false)
        setSelectedPayslip(null)
        setHasScrolledToEnd(false)
        // Recarregar dados
        const employeeId = (user as any)?.employee?.id || (user as any)?.funcionario?.id
        const resPayslips = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/payslips/employee/${employeeId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (resPayslips.ok) {
          const data = await resPayslips.json()
          setPayslips(data.payslips || [])
        }
      } else {
        const data = await res.json()
        toast.error(data.message || 'Erro ao aceitar holerite')
      }
    } catch (error) {
      toast.error('Erro ao aceitar holerite')
    } finally {
      setIsAccepting(false)
    }
  }

  // Rejeitar holerite (👎)
  const handleRejectPayslip = async () => {
    if (!selectedPayslip) return
    
    if (!rejectReason.trim()) {
      toast.error('Informe o motivo da rejeição')
      return
    }
    
    setIsRejecting(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/payslip/${selectedPayslip.id}/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: rejectReason }),
        }
      )
      
      if (res.ok) {
        toast.success('Holerite rejeitado. O RH será notificado.')
        setShowSignModal(false)
        setShowRejectForm(false)
        setRejectReason('')
        setShowPayslipView(false)
        setSelectedPayslip(null)
        setHasScrolledToEnd(false)
        // Recarregar dados
        const employeeId = (user as any)?.employee?.id || (user as any)?.funcionario?.id
        const resPayslips = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/payslips/employee/${employeeId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (resPayslips.ok) {
          const data = await resPayslips.json()
          setPayslips(data.payslips || [])
        }
      } else {
        const data = await res.json()
        toast.error(data.message || 'Erro ao rejeitar holerite')
      }
    } catch (error) {
      toast.error('Erro ao rejeitar holerite')
    } finally {
      setIsRejecting(false)
    }
  }

  // Baixar PDF do holerite
  const handleDownloadPdf = async (payslipId: string, month: number, year: number) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/payslip/${payslipId}/pdf`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `holerite-${MONTHS[month - 1]}-${year}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('PDF baixado com sucesso!')
      } else {
        const data = await res.json()
        toast.error(data.message || 'Erro ao baixar PDF')
      }
    } catch (error) {
      toast.error('Erro ao baixar PDF')
    }
  }

  // Solicitar vale
  const handleRequestAdvance = async () => {
    if (newAdvanceAmount <= 0) {
      toast.error('Informe um valor válido')
      return
    }
    
    setIsRequesting(true)
    try {
      const token = localStorage.getItem('token')
      const companyId = (user as any)?.companyId || (user as any)?.company?.id
      const employeeId = (user as any)?.employee?.id || (user as any)?.funcionario?.id
      
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payroll/advances?companyId=${companyId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            employeeId,
            type: 'EXTRA_ADVANCE',
            amount: newAdvanceAmount,
            reason: newAdvanceReason,
          }),
        }
      )
      
      const data = await res.json()
      
      if (res.ok) {
        toast.success(data.message || 'Solicitação enviada!')
        setShowRequestModal(false)
        setNewAdvanceAmount(0)
        setNewAdvanceReason('')
        fetchAdvances()
      } else {
        toast.error(data.message || 'Erro ao solicitar vale')
      }
    } catch (error) {
      toast.error('Erro ao solicitar vale')
    } finally {
      setIsRequesting(false)
    }
  }

  // Formatar valores
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const formatHours = (hours: number) => {
    const h = Math.floor(Math.abs(hours))
    const m = Math.round((Math.abs(hours) - h) * 60)
    const sign = hours < 0 ? '-' : ''
    return `${sign}${h}h${m.toString().padStart(2, '0')}min`
  }

  // WebSocket: Atualizar quando novo ponto for registrado
  React.useEffect(() => {
    if (!connected) return

    const employeeId = (user as any)?.employee?.id || (user as any)?.funcionario?.id
    if (!employeeId) return

    const unsubscribe = onTimeEntryCreated((timeEntry) => {
      
      // Atualizar apenas se for do funcionário atual
      if (timeEntry.employeeId === employeeId) {
        fetchEmployeeData(false) // Atualizar sem loading
        // Não mostrar toast aqui - já mostra na função de registro
      }
    })

    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, onTimeEntryCreated, user])

  // WebSocket: Atualizar quando funcionário for editado
  React.useEffect(() => {
    console.log('[WebSocket] 🔌 Status conexão:', { connected, userId: (user as any)?.id, employeeId: (user as any)?.employee?.id })
    
    if (!connected) return

    const employeeId = (user as any)?.employee?.id || (user as any)?.funcionario?.id
    if (!employeeId) return
    
    console.log('[WebSocket] ✅ Registrando listener para employee-updated, employeeId:', employeeId)

    const unsubscribe = onEmployeeUpdated(async (employee) => {
      console.log('[WebSocket] 📥 Evento employee-updated recebido:', {
        receivedId: employee.id,
        myId: employeeId,
        isMe: employee.id === employeeId,
        allowRemoteClockIn: employee.allowRemoteClockIn,
        allowFacialRecognition: employee.allowFacialRecognition,
      })
      
      if (employee.id === employeeId) {
        if (employee.active === false) {
          toast.error('Sua conta foi desativada', {
            description: 'Entre em contato com o administrador',
            duration: 5000,
          })
          setTimeout(() => {
            logout()
          }, 2000) // 2 segundos para ler a mensagem
          return
        }

        console.log('[WebSocket] 🔄 Atualizando dados do funcionário...')
        await refreshUser()
        await updateEmployeeDataSilently()
        checkFaceStatus()
        
        toast.info('Seus dados foram atualizados', {
          description: 'As configurações foram alteradas pelo administrador'
        })
      }
    })

    return unsubscribe
  }, [connected, onEmployeeUpdated, user, updateEmployeeDataSilently, checkFaceStatus, refreshUser, logout])

  // WebSocket: Atualizar quando face for cadastrada/removida
  React.useEffect(() => {
    if (!connected) return

    const employeeId = (user as any)?.employee?.id || (user as any)?.funcionario?.id
    if (!employeeId) return

    const unsubscribeFaceRegistered = onFaceRegistered((data) => {
      if (data.employeeId === employeeId) {
        checkFaceStatus()
      }
    })

    const unsubscribeFaceDeleted = onFaceDeleted((data) => {
      if (data.employeeId === employeeId) {
        checkFaceStatus()
      }
    })

    return () => {
      unsubscribeFaceRegistered()
      unsubscribeFaceDeleted()
    }
  }, [connected, onFaceRegistered, onFaceDeleted, user, checkFaceStatus])

  // WebSocket: Atualizar quando holerite for aceito/rejeitado/pago
  const { onPayslipAccepted, onPayslipRejected, onPayslipPaid, onPayslipsApproved } = useWebSocket()
  
  React.useEffect(() => {
    if (!connected) return

    const employeeId = (user as any)?.employee?.id || (user as any)?.funcionario?.id
    if (!employeeId) return

    // Quando holerite é aceito (por este funcionário ou outro)
    const unsubAccepted = onPayslipAccepted((payslip) => {
      console.log('[WebSocket] 📥 payslip-accepted:', payslip.id)
      fetchPayslips() // Recarregar lista de holerites
    })

    // Quando holerite é rejeitado
    const unsubRejected = onPayslipRejected((payslip) => {
      console.log('[WebSocket] 📥 payslip-rejected:', payslip.id)
      fetchPayslips()
    })

    // Quando holerite é pago
    const unsubPaid = onPayslipPaid((payslip) => {
      console.log('[WebSocket] 📥 payslip-paid:', payslip.id)
      fetchPayslips()
    })

    // Quando holerites são aprovados (admin aprovou a folha)
    const unsubApproved = onPayslipsApproved((data) => {
      console.log('[WebSocket] 📥 payslips-approved:', data)
      fetchPayslips() // Recarregar para ver os novos holerites aprovados
      toast.info('Novos holerites disponíveis!', {
        description: 'A folha de pagamento foi aprovada'
      })
    })

    return () => {
      unsubAccepted()
      unsubRejected()
      unsubPaid()
      unsubApproved()
    }
  }, [connected, onPayslipAccepted, onPayslipRejected, onPayslipPaid, onPayslipsApproved, user, fetchPayslips])

  function getCurrentPositionOnce(options?: PositionOptions): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) return reject(new Error('Geolocalização não suportada'))
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        ...(options || {}),
      })
    })
  }

  async function handleLocationTest() {
    try {
      const pos = await getCurrentPositionOnce()
      const { latitude, longitude, accuracy } = pos.coords
      const capturedAt = new Date(pos.timestamp).toISOString()
      setLastLocation({ latitude, longitude, accuracy, capturedAt })
      toast.success('Localização obtida', { description: `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)} • ±${Math.round(accuracy || 0)}m` })
    } catch (e: any) {
      if (e?.code === 1) toast.error('Permissão de localização negada. Ative nas configurações do navegador.')
      else if (e?.code === 2) toast.error('Localização indisponível. Verifique GPS/Internet e tente novamente.')
      else if (e?.code === 3) toast.error('Tempo esgotado para obter a localização. Tente novamente.')
      else toast.error(e?.message || 'Erro ao obter localização')
    }
  }

  const handleClock = React.useCallback(async (type: 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END') => {
    try {
      const pos = await getCurrentPositionOnce()
      const { latitude, longitude, accuracy } = pos.coords
      const capturedAt = new Date(pos.timestamp).toISOString()

      const backendUrl = process.env.NEXT_PUBLIC_API_URL
      if (!backendUrl) {
        toast.error('Configuração ausente', { description: 'NEXT_PUBLIC_API_URL não definida' })
        return
      }

      const employeeId = (user as any)?.employee?.id || (user as any)?.funcionario?.id
      if (!employeeId) {
        toast.error('Funcionário não identificado')
        return
      }

      const token = localStorage.getItem('token')
      const res = await fetch(`${backendUrl}/api/time-entries`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          employeeId,
          type,
          latitude,
          longitude,
          accuracy,
          clientCapturedAt: capturedAt,
          geoMethod: 'html5',
          source: 'web',
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.message || 'Falha ao registrar ponto')
      }

      // Mensagens iguais ao reconhecimento facial
      const typeLabels: Record<string, string> = {
        'CLOCK_IN': 'Entrada',
        'CLOCK_OUT': 'Saída',
        'BREAK_START': 'Início do intervalo',
        'BREAK_END': 'Fim do intervalo',
      }
      const label = typeLabels[type] || 'Ponto'
      
      toast.success(`✅ ${label} registrada!`, {
        description: `${employeeName} • ${new Date().toLocaleTimeString('pt-BR')}`,
        duration: 5000,
      })
      
      // Recarregar dados do funcionário e pontos do dia
      await fetchEmployeeData()
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao registrar ponto')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Evitar flicker: usar apenas dados vindos do user; não cair no slug da URL.
  const employeeName = user?.employee?.name || user?.name || ''
  const companyName = user?.company?.tradeName || ''
  const jobTitle: string | undefined = (user as any)?.employee?.position?.name || undefined
  // avatarKey é a chave salva no banco (ex.: companyId/users/userId/profile.jpg|png)
  const avatarKey = (user as any)?.avatarUrl as string | undefined || (user as any)?.employee?.photoUrl as string | undefined || undefined

  // Handlers da câmera facial
  const handleFacialSuccess = React.useCallback(async (result: any) => {
    setShowFacialCamera(false)
    
    if (facialCameraMode === 'registration') {
      // Cadastro bem-sucedido
      toast.success('✅ Face cadastrada com sucesso!', {
        description: 'Agora você pode usar reconhecimento facial para bater ponto',
        duration: 5000,
      })
      setHasFaceRegistered(true)
    } else {
      // Reconhecimento bem-sucedido (ponto registrado)
      const typeLabels: Record<string, string> = {
        'CLOCK_IN': 'Entrada',
        'CLOCK_OUT': 'Saída',
        'BREAK_START': 'Início do intervalo',
        'BREAK_END': 'Fim do intervalo',
      }
      const label = typeLabels[result.type] || 'Ponto'
      
      toast.success(`✅ ${label} registrada!`, {
        description: `${result.employeeData?.name || employeeName} • ${new Date().toLocaleTimeString('pt-BR')}`,
        duration: 5000,
      })
      
      // Recarregar dados
      await fetchEmployeeData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facialCameraMode, employeeName])

  const handleFacialError = React.useCallback((error: string) => {
    setShowFacialCamera(false)
    
    // Detectar tipo de erro pela mensagem
    let title = '❌ Erro no reconhecimento facial'
    
    if (error.includes('fora da área') || error.includes('Distância')) {
      title = '📍 Fora da área permitida'
    } else if (error.includes('Face não cadastrada') || error.includes('não reconhecida')) {
      title = '👤 Face não reconhecida'
    } else if (error.includes('Foto') || error.includes('obrigatória')) {
      title = '📸 Erro na captura'
    }
    
    toast.error(title, {
      description: error,
      duration: 5000,
    })
  }, [])

  const openFacialCamera = React.useCallback((mode: 'registration' | 'recognition') => {
    setFacialCameraMode(mode)
    setShowFacialCamera(true)
  }, [])

  // Função handleDeleteFace removida - exclusão de face agora é feita apenas pelo admin

  const timeStr = now ? now.toLocaleTimeString('pt-BR', { hour12: false }) : ''
  const dateStr = now ? new Intl.DateTimeFormat('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: '2-digit' }).format(now) : ''
  const dateShort = now ? now.toLocaleDateString('pt-BR') : ''

  // Logo da empresa - usar companyData ao invés de user.company
  const companyLogoKey = companyData?.logoUrl || (user as any)?.company?.logoUrl
  const companyLogoUrl = companyLogoKey ? `${process.env.NEXT_PUBLIC_API_URL}/api/files/employees/${companyLogoKey}` : undefined

  const [showMessage, setShowMessage] = React.useState(false)

  // Verificar quais botões devem aparecer
  // Ordenar por timestamp (mais antigo primeiro para facilitar a lógica)
  const sortedEntriesAsc = [...todayEntries].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
  
  // Encontrar o índice do último CLOCK_OUT (procurando do fim para o início)
  const lastClockOutIndex = sortedEntriesAsc.map(e => e.type).lastIndexOf('CLOCK_OUT')
  
  // Considerar apenas pontos APÓS o último CLOCK_OUT (ciclo atual)
  // Se não há CLOCK_OUT, considerar todos os pontos
  // Se há CLOCK_OUT, pegar apenas os pontos depois dele
  const currentCycleEntries = lastClockOutIndex >= 0 
    ? sortedEntriesAsc.slice(lastClockOutIndex + 1)
    : sortedEntriesAsc
  
  const hasClockIn = currentCycleEntries.some(e => e.type === 'CLOCK_IN')
  const hasBreakStart = currentCycleEntries.some(e => e.type === 'BREAK_START')
  const hasBreakEnd = currentCycleEntries.some(e => e.type === 'BREAK_END')
  const hasClockOut = currentCycleEntries.some(e => e.type === 'CLOCK_OUT')

  // Verificar se reconhecimento facial está habilitado
  const facialRecognitionEnabled = employeeData?.allowFacialRecognition || false

  // Verificar se está no horário permitido (10 minutos antes do horário de entrada)
  // TODO: Reativar validação de horário quando sistema estiver pronto
  const isWithinAllowedTime = true // React.useMemo(() => {
  //   if (!employeeData?.workStartTime || !now) return false
  //   const [hours, minutes] = employeeData.workStartTime.split(':').map(Number)
  //   const workStart = new Date(now)
  //   workStart.setHours(hours, minutes, 0, 0)
  //   const tenMinutesBefore = new Date(workStart.getTime() - 10 * 60 * 1000)
  //   return now >= tenMinutesBefore
  // }, [employeeData?.workStartTime, now])

  // Determinar quais botões mostrar
  // Se já bateu saída, reinicia o ciclo (permite bater entrada novamente)
  const showClockInButton = !facialRecognitionEnabled && (!hasClockIn || hasClockOut) && isWithinAllowedTime
  const showBreakStartButton = !facialRecognitionEnabled && hasClockIn && !hasBreakStart && !hasClockOut
  const showBreakEndButton = !facialRecognitionEnabled && hasBreakStart && !hasBreakEnd
  const showClockOutButton = !facialRecognitionEnabled && hasClockIn && !hasClockOut && (!hasBreakStart || hasBreakEnd)

  // Verificar se deve mostrar o botão de localização
  // Só mostra se o funcionário tem permissão de ponto remoto
  const allowRemoteClockIn = employeeData?.allowRemoteClockIn ?? false
  const showLocationButton = allowRemoteClockIn && geoPermission !== 'granted'

  // Dados dos pontos para o resumo (apenas do ciclo atual)
  const clockInEntry = currentCycleEntries.find(e => e.type === 'CLOCK_IN')
  const breakStartEntry = currentCycleEntries.find(e => e.type === 'BREAK_START')
  const breakEndEntry = currentCycleEntries.find(e => e.type === 'BREAK_END')
  const clockOutEntry = currentCycleEntries.find(e => e.type === 'CLOCK_OUT')
  const showSummary = currentCycleEntries.length > 0 && !hasClockOut

  // Loading centralizado - exibir APENAS na carga inicial
  // Removido checkingFaceStatus para evitar piscada ao atualizar
  // REMOVIDO: dependência de !user para evitar loading infinito
  
  // Estado de loading
  React.useEffect(() => {
    // Loading state atualizado
  }, [mounted, loadingData, user])
  
  // Proteção de rota: redirecionar para login se não autenticado
  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log('[AUTH] Usuário não autenticado, redirecionando para login...')
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])
  
  // Verificar parâmetros da URL
  if (!company || !employee) notFound()
  
  // Mostrar loading enquanto verifica autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    )
  }
  
  // Não renderizar nada se não estiver autenticado (vai redirecionar)
  if (!isAuthenticated) {
    return null
  }
  
  if (!mounted || loadingData) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <UserRound className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground font-medium">Carregando dados do funcionário...</p>
          <p className="text-sm text-muted-foreground mt-2">Preparando sua interface</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen w-full grid place-items-start pt-0 pb-10 bg-background text-foreground employee-page-scroll">
      {/* Frame central fixo */}
      <div className="w-full px-4">
        <div className="mx-auto w-full max-w-[400px] py-5">
          {/* Linha superior: ThemeToggle à esquerda e botão fechar à direita */}
          <div className="flex items-center justify-between">
            <div title="Alterar tema">
              <ThemeToggle />
            </div>
            <button
              onClick={logout}
              aria-label="Sair"
              title="Sair"
              className="p-2 text-muted-foreground hover:text-red-500 transition rounded-full hover:bg-red-50 dark:hover:bg-red-950"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

        {/* Modal de mensagens */}
        <MessageModal
          open={showMessage}
          onClose={() => {
            setShowMessage(false)
          }}
          employee={{
            name: employeeName,
            position: jobTitle,
            // Passa a CHAVE crua; o componente MessageModal monta a URL via getFileUrl
            avatarUrl: avatarKey,
          }}
        />

          {/* Bloco do usuário */}
          <div className="mt-2 flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="relative rounded-full overflow-hidden">
              <AvatarCircle name={employeeName || ' '} photoUrl={avatarKey} sizeClass="w-[150px] h-[150px]" />
            </div>

            {/* Nome */}
            <h1 className={`${comfortaa.className} mt-5 text-[32px] leading-tight tracking-[-0.015em] text-black dark:text-white`}>
              {employeeName}
            </h1>

            {/* Cargo */}
            <p className={`${roboto.className} mt-1 text-[16px] leading-snug text-muted-foreground`}>
              {jobTitle || ''}
            </p>
          </div>

          {/* ========== CONTEÚDO CONDICIONAL: PONTO OU PAINEL ========== */}
          {!showPanel ? (
            <>
          {/* Ícones de status (reconhecimento + localização + mensagens) */}
          <div className="mt-6 flex items-center justify-center gap-[10px]">
            {facialRecognitionEnabled && (
              <span title="Reconhecimento facial ativado" role="img" aria-label="Reconhecimento facial ativado">
                <ScanFace className="w-6 h-6" style={{ color: '#01BB74' }} />
              </span>
            )}
            {/* Ícone de geolocalização - só mostra se tem permissão de ponto remoto */}
            {allowRemoteClockIn && (
              <>
                {geoPermission === 'granted' ? (
                  <span title="Geolocalização ativada" role="img" aria-label="Geolocalização ativada">
                    <MapPinCheck className="w-6 h-6" style={{ color: '#01BB74' }} />
                  </span>
                ) : geoPermission === 'denied' ? (
                  <span title="Geolocalização bloqueada" role="img" aria-label="Geolocalização bloqueada">
                    <MapPin className="w-6 h-6" style={{ color: '#BA2C2E' }} />
                  </span>
                ) : (
                  <span title="Autorize a geolocalização" role="img" aria-label="Autorize a geolocalização">
                    <MapPin className="w-6 h-6" style={{ color: '#FFB703' }} />
                  </span>
                )}
              </>
            )}
            {/* Ícone de mensagens não lidas - pisca em amarelo */}
            {unreadCount > 0 && (
              <button
                onClick={() => {
                  setShowMessage(true)
                }}
                className="relative animate-pulse"
                title={`${unreadCount} mensagem${unreadCount > 1 ? 's' : ''} não lida${unreadCount > 1 ? 's' : ''}`}
                aria-label={`${unreadCount} mensagem${unreadCount > 1 ? 's' : ''} não lida${unreadCount > 1 ? 's' : ''}`}
              >
                <MessageCircleMore className="w-6 h-6" style={{ color: '#FFB703' }} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </button>
            )}
          </div>

          {/* Botão de localização (se necessário) */}
          {showLocationButton && (
            <div className="mt-6">
              <ActionButton
                label="LOCALIZAÇÃO"
                icon={<MapPin className="w-5 h-5" />}
                bgColor="#FFB703"
                textColor="#000"
                border
                borderColor="#EBAA05"
                className={`${roboto.className}`}
                onClick={handleLocationTest}
              />
            </div>
          )}

          {/* Resumo do dia - Só aparece se houver pontos e não tiver saído */}
          {showSummary && (
            <div className="mt-6">
              <div className="flex items-center gap-2">
                <ChartBarStacked className="w-5 h-5 text-foreground" />
                <div className={`${comfortaa.className} text-foreground text-[20px] font-semibold`}>Resumo do dia</div>
              </div>
              <div className={`${comfortaa.className} text-muted-foreground text-[14px] mt-1`}>Qual a etapa do dia você está</div>

              <div className="mt-4 space-y-3">
                {clockInEntry && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-2">
                        <ClockArrowUp className="w-5 h-5" style={{ color: '#01BB74' }} />
                        <span className={`${comfortaa.className} text-[14px] font-semibold`} style={{ color: '#01BB74' }}>ENTRADA</span>
                      </div>
                      <span className={`${comfortaa.className} text-[14px] text-muted-foreground`}>
                        {new Date(clockInEntry.timestamp).toLocaleDateString('pt-BR')} - {new Date(clockInEntry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="h-px w-full bg-border" />
                  </>
                )}

                {breakStartEntry && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-2">
                        <Clock12 className="w-5 h-5" style={{ color: '#FFB703' }} />
                        <span className={`${comfortaa.className} text-[14px] font-semibold`} style={{ color: '#FFB703' }}>INÍCIO DO INTERVALO</span>
                      </div>
                      <span className={`${comfortaa.className} text-[14px] text-muted-foreground`}>
                        {new Date(breakStartEntry.timestamp).toLocaleDateString('pt-BR')} - {new Date(breakStartEntry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="h-px w-full bg-border" />
                  </>
                )}

                {breakEndEntry && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-2">
                        <Clock2 className="w-5 h-5" style={{ color: '#FF6F31' }} />
                        <span className={`${comfortaa.className} text-[14px] font-semibold`} style={{ color: '#FF6F31' }}>VOLTA DO INTERVALO</span>
                      </div>
                      <span className={`${comfortaa.className} text-[14px] text-muted-foreground`}>
                        {new Date(breakEndEntry.timestamp).toLocaleDateString('pt-BR')} - {new Date(breakEndEntry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="h-px w-full bg-border" />
                  </>
                )}
              </div>
            </div>
          )}

          {/* Cards de Data e Hora */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            {/* Card de Data - Esquerda */}
            <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border bg-card">
              <Calendar className="w-5 h-5 text-white flex-shrink-0" />
              <span className={`${comfortaa.className} text-foreground text-[14px] font-semibold leading-tight`} suppressHydrationWarning>{mounted ? dateShort : ''}</span>
            </div>
            
            {/* Card de Relógio - Direita */}
            <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border bg-card">
              <Clock11 className="w-5 h-5 text-white flex-shrink-0" />
              <span className={`${roboto.className} text-foreground text-[18px] font-bold tabular-nums leading-tight`} suppressHydrationWarning>{mounted ? timeStr : ''}</span>
            </div>
          </div>

          {/* Bloco de Ponto - só mostra se tem permissão de ponto remoto */}
          {allowRemoteClockIn && (
            <>
              {/* Ponto */}
              <div className="mt-4">
            <div className="grid grid-cols-[auto_1fr] grid-rows-[auto_auto] gap-x-2">
              <Clock className="w-6 h-6 text-foreground mt-0.5 col-[1] row-[1]" />
              <div className="col-[2] row-[1]">
                <div className={`${comfortaa.className} text-foreground text-[20px] font-semibold`}>
                  {facialRecognitionEnabled ? 'Ponto Facial' : 'Ponto Manual'}
                </div>
              </div>
              <div className="col-[1_/_span_2] row-[2] mt-1">
                <div className={`${comfortaa.className} text-muted-foreground text-[14px]`}>
                  {facialRecognitionEnabled 
                    ? 'Registre seu ponto com reconhecimento facial'
                    : 'Registre seu ponto manualmente'}
                </div>
              </div>
            </div>
          </div>

          {/* Botões de ponto - Ordem correta: ENTRADA, INÍCIO INTERVALO, FIM INTERVALO, SAÍDA */}
          <div className="mt-3 flex flex-col gap-[10px]">
            {/* Botões de reconhecimento facial */}
            {facialRecognitionEnabled && !checkingFaceStatus && !hasFaceRegistered && (
              <ActionButton
                label="CADASTRAR FACE"
                icon={<ScanFace className="w-5 h-5" />}
                bgColor="#18A0FB"
                textColor="#fff"
                border
                borderColor="#1286D4"
                className={`${roboto.className}`}
                onClick={() => openFacialCamera('registration')}
              />
            )}
            {facialRecognitionEnabled && !checkingFaceStatus && hasFaceRegistered && (
              <ActionButton
                label="RECONHECIMENTO FACIAL"
                icon={<ScanFace className="w-5 h-5" />}
                bgColor="#01BB74"
                textColor="#fff"
                border
                borderColor="#008D57"
                className={`${roboto.className}`}
                onClick={() => openFacialCamera('recognition')}
              />
            )}
            
            {/* Botões de ponto manual (só aparecem se reconhecimento facial NÃO estiver ativo) */}
            {(!facialRecognitionEnabled && showClockInButton) && (
              <ActionButton
                label="ENTRADA"
                icon={<ClockArrowUp className="w-5 h-5" />}
                bgColor="#01BB74"
                textColor="#fff"
                border
                borderColor="#008D57"
                className={`${roboto.className}`}
                onClick={() => handleClock('CLOCK_IN')}
              />
            )}
            {(!facialRecognitionEnabled && showBreakStartButton) && (
              <ActionButton
                label="INÍCIO DO INTERVALO"
                icon={<Clock12 className="w-5 h-5" />}
                bgColor="#FFB703"
                textColor="#000"
                border
                borderColor="#EBAA05"
                className={`${roboto.className}`}
                onClick={() => handleClock('BREAK_START')}
              />
            )}
            {(!facialRecognitionEnabled && showBreakEndButton) && (
              <ActionButton
                label="FIM DO INTERVALO"
                icon={<Clock2 className="w-5 h-5" />}
                bgColor="#FF6F31"
                textColor="#fff"
                border
                borderColor="#BF5716"
                className={`${roboto.className}`}
                onClick={() => handleClock('BREAK_END')}
              />
            )}
            {(!facialRecognitionEnabled && showClockOutButton) && (
              <ActionButton
                label="SAÍDA"
                icon={<ClockArrowDown className="w-5 h-5" />}
                bgColor="#BA2C2E"
                textColor="#fff"
                border
                borderColor="#A10003"
                className={`${roboto.className}`}
                onClick={() => handleClock('CLOCK_OUT')}
              />
            )}
          </div>
            </>
          )}

          {/* Botões - SEMPRE visíveis, independente de ponto remoto */}
          <div className="mt-6 flex flex-col gap-[10px]">
            <ActionButton
              label="MEU PAINEL"
              icon={<LayoutDashboard className="w-5 h-5" />}
              bgColor="#6366F1"
              textColor="#fff"
              border
              borderColor="#4F46E5"
              className={`${roboto.className}`}
              onClick={() => {
                // Resetar filtros ao abrir o painel
                setPayslipFilterYear(null)
                setPayslipFilterMonth(null)
                setShowPanel(true)
              }}
            />
            {/* Botão PAINEL ADMIN - só para MANAGER, HR e FINANCIAL */}
            {user && ['MANAGER', 'HR', 'FINANCIAL'].includes(user.role) && (
              <ActionButton
                label="PAINEL ADMIN"
                icon={<Building2 className="w-5 h-5" />}
                bgColor="#3B82F6"
                textColor="#fff"
                border
                borderColor="#2563EB"
                className={`${roboto.className}`}
                onClick={() => {
                  // Gerar slug da empresa (mesma lógica do login)
                  const slugify = (value?: string) => {
                    if (!value) return ''
                    return value
                      .toString()
                      .normalize('NFD')
                      .replace(/\p{Diacritic}/gu, '')
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)+/g, '')
                  }
                  const companySlug = (user.company as any)?.slug || slugify((user as any).company?.tradeName || (user as any).empresa?.nomeFantasia) || (user.companyId ? `empresa-${user.companyId}` : 'empresa')
                  router.push(`/admin/${companySlug}`)
                }}
              />
            )}
            <ActionButton
              label="MESSAGE"
              icon={<MessageCircleMore className="w-5 h-5" />}
              border
              borderColor="currentColor"
              className={`${roboto.className} text-foreground`}
              onClick={() => {
                setShowMessage(true)
              }}
              textColor="currentColor"
              hoverClass="hover:bg-accent"
            />
          </div>

          {/* Logo da empresa */}
          <div className="mt-6 flex items-center justify-center">
            {companyLogoUrl ? (
              <div className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={companyLogoUrl} 
                  alt={companyName || 'Logo da empresa'} 
                  className="max-h-[60px] max-w-[200px] object-contain mx-auto"
                />
                {companyName && (
                  <div className={`${comfortaa.className} text-muted-foreground text-xs mt-2`}>
                    {companyName}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-sm">
                <div className={`${comfortaa.className} text-foreground font-semibold text-lg`}>
                  {companyName || 'Empresa'}
                </div>
                <div className="text-muted-foreground text-xs mt-1">Sistema de Ponto</div>
              </div>
            )}
          </div>
            </>
          ) : (
            /* ========== PAINEL DE TABS (Dashboard, Vales, Holerite) ========== */
            <div className="mt-6">
              <LegacyTabs
                tabs={[
                  // Tab 1: Dashboard (antes era Resumo)
                  {
                    id: 'dashboard',
                    label: 'Dashboard',
                    icon: <LayoutDashboard className="w-4 h-4" />,
                    content: (
                      <div className="space-y-4">
                        {panelLoading ? (
                          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                        ) : (
                          <>
                            {/* ===== MÊS ATUAL ===== */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-primary" />
                                <h4 className="text-sm font-semibold">{dashboardData?.currentMonth || MONTHS[new Date().getMonth()]} {dashboardData?.currentYear || new Date().getFullYear()}</h4>
                              </div>
                              
                              {/* Previsão do Salário - PRIMEIRO CARD */}
                              {dashboardData?.salaryForecast?.baseSalary > 0 && (
                                <div className="bg-gradient-to-br from-emerald-500/5 via-cyan-500/5 to-blue-500/5 rounded-xl p-4 border border-emerald-500/20">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Prévia do Holerite
                                      </span>
                                    </div>
                                    {dashboardData.salaryForecast.daysRemaining > 0 && !dashboardData.salaryForecast.hasPayslip && (
                                      <span className="text-xs text-muted-foreground">
                                        {dashboardData.salaryForecast.daysRemaining} dias p/ fechamento
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* PROVENTOS */}
                                  <div className="mb-2">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase">Proventos</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 text-sm">
                                    <span className="text-muted-foreground">Salário Base</span>
                                    <span className="font-medium">{formatCurrency(dashboardData.salaryForecast.baseSalary)}</span>
                                  </div>
                                  {(dashboardData.salaryForecast.overtimeValue50 > 0 || dashboardData.salaryForecast.overtimeValue100 > 0) && (
                                    <div className="flex justify-between items-center py-1 text-sm">
                                      <span className="text-muted-foreground">Horas Extras</span>
                                      <span className="font-medium text-green-600">
                                        +{formatCurrency((dashboardData.salaryForecast.overtimeValue50 || 0) + (dashboardData.salaryForecast.overtimeValue100 || 0))}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex justify-between items-center py-1 text-sm border-b border-border/30">
                                    <span className="font-medium">Total Proventos</span>
                                    <span className="font-semibold">{formatCurrency(dashboardData.salaryForecast.totalEarnings || dashboardData.salaryForecast.baseSalary)}</span>
                                  </div>
                                  
                                  {/* DESCONTOS */}
                                  <div className="mt-3 mb-2">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase">Descontos</span>
                                  </div>
                                  {dashboardData.salaryForecast.inssValue > 0 && (
                                    <div className="flex justify-between items-center py-1 text-sm">
                                      <span className="text-muted-foreground">INSS ({dashboardData.salaryForecast.inssRate?.toFixed(1) || 0}%)</span>
                                      <span className="font-medium text-red-500">-{formatCurrency(dashboardData.salaryForecast.inssValue)}</span>
                                    </div>
                                  )}
                                  {dashboardData.salaryForecast.irValue > 0 && (
                                    <div className="flex justify-between items-center py-1 text-sm">
                                      <span className="text-muted-foreground">IRRF ({dashboardData.salaryForecast.irRate?.toFixed(1) || 0}%)</span>
                                      <span className="font-medium text-red-500">-{formatCurrency(dashboardData.salaryForecast.irValue)}</span>
                                    </div>
                                  )}
                                  {dashboardData.salaryForecast.transportVoucher > 0 && (
                                    <div className="flex justify-between items-center py-1 text-sm">
                                      <span className="text-muted-foreground">Vale Transporte</span>
                                      <span className="font-medium text-red-500">-{formatCurrency(dashboardData.salaryForecast.transportVoucher)}</span>
                                    </div>
                                  )}
                                  {dashboardData.salaryForecast.healthInsurance > 0 && (
                                    <div className="flex justify-between items-center py-1 text-sm">
                                      <span className="text-muted-foreground">Plano de Saúde</span>
                                      <span className="font-medium text-red-500">-{formatCurrency(dashboardData.salaryForecast.healthInsurance)}</span>
                                    </div>
                                  )}
                                  {dashboardData.salaryForecast.absenceValue > 0 && (
                                    <div className="my-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                                      <div className="text-sm text-muted-foreground">
                                        Dias não trabalhados ({dashboardData.absences || 0} de 22)
                                      </div>
                                      <div className="text-xs text-yellow-600 mb-2">(valor aumenta conforme trabalha)</div>
                                      <span className="font-semibold text-red-500 text-lg">-{formatCurrency(dashboardData.salaryForecast.absenceValue)}</span>
                                    </div>
                                  )}
                                  {dashboardData.salaryForecast.lateValue > 0 && (
                                    <div className="flex justify-between items-center py-1 text-sm">
                                      <span className="text-muted-foreground">
                                        Atrasos ({dashboardData.lateMinutes || 0}min)
                                        {!dashboardData.salaryForecast.lateDiscounted && (
                                          <span className="text-xs text-yellow-600 ml-1">(não descontado)</span>
                                        )}
                                      </span>
                                      <span className={`font-medium ${dashboardData.salaryForecast.lateDiscounted ? 'text-red-500' : 'text-yellow-600'}`}>
                                        {dashboardData.salaryForecast.lateDiscounted ? '-' : ''}{formatCurrency(dashboardData.salaryForecast.lateValue)}
                                      </span>
                                    </div>
                                  )}
                                  {dashboardData.salaryForecast.advancePayment > 0 && (
                                    <div className="flex justify-between items-center py-1 text-sm">
                                      <span className="text-muted-foreground">Adiantamentos</span>
                                      <span className="font-medium text-red-500">-{formatCurrency(dashboardData.salaryForecast.advancePayment)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between items-center py-1 text-sm border-b border-border/30">
                                    <span className="font-medium">Total Descontos</span>
                                    <span className="font-semibold text-red-500">-{formatCurrency(dashboardData.salaryForecast.totalDeductions || 0)}</span>
                                  </div>
                                  
                                  {/* LÍQUIDO */}
                                  <div className="flex justify-between items-center pt-3 mt-1">
                                    <span className="text-sm font-bold">Líquido {dashboardData.salaryForecast.hasPayslip ? '' : 'Estimado'}</span>
                                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                      {formatCurrency(dashboardData.salaryForecast.netSalary || 0)}
                                    </span>
                                  </div>
                                  
                                  {/* FGTS Informativo */}
                                  {dashboardData.salaryForecast.fgtsValue > 0 && (
                                    <div className="mt-3 pt-2 border-t border-border/30">
                                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                                        <span>FGTS (8% - depósito empresa)</span>
                                        <span>{formatCurrency(dashboardData.salaryForecast.fgtsValue)}</span>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Aviso de previsão */}
                                  {!dashboardData.salaryForecast.hasPayslip && (
                                    <p className="text-xs text-muted-foreground mt-3 text-center italic">
                                      ⚠️ Valores podem mudar até o fechamento da folha
                                    </p>
                                  )}
                                </div>
                              )}
                              
                              <div className="grid grid-cols-2 gap-3">
                                {/* Dias Trabalhados */}
                                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl p-4 border border-blue-500/20">
                                  <div className="flex items-center gap-2 mb-2">
                                    <CalendarDays className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs text-muted-foreground">Dias Trabalhados</span>
                                  </div>
                                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{dashboardData?.workedDays || 0}</p>
                                  <p className="text-xs text-muted-foreground mt-1">este mês</p>
                                </div>
                                
                                {/* Horas Trabalhadas */}
                                <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-xl p-4 border border-green-500/20">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Timer className="w-4 h-4 text-green-500" />
                                    <span className="text-xs text-muted-foreground">Horas</span>
                                  </div>
                                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{dashboardData?.totalHours || 0}h</p>
                                  <p className="text-xs text-muted-foreground mt-1">trabalhadas</p>
                                </div>
                                
                                {/* Dias não trabalhados */}
                                <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 rounded-xl p-4 border border-yellow-500/20">
                                  <div className="flex items-center gap-2 mb-2">
                                    <UserX className="w-4 h-4 text-yellow-500" />
                                    <span className="text-xs text-muted-foreground">A trabalhar</span>
                                  </div>
                                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{dashboardData?.absences || 0}</p>
                                  <p className="text-xs text-muted-foreground mt-1">dia(s) restantes</p>
                                </div>
                                
                                {/* Atrasos */}
                                <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 rounded-xl p-4 border border-orange-500/20">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Clock3 className="w-4 h-4 text-orange-500" />
                                    <span className="text-xs text-muted-foreground">Atrasos</span>
                                  </div>
                                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{dashboardData?.lateMinutes || 0}</p>
                                  <p className="text-xs text-muted-foreground mt-1">minuto(s)</p>
                                </div>
                              </div>
                              
                              {/* Vale Disponível - só mostra se vales estão habilitados */}
                              {payrollConfig?.enableExtraAdvance && dashboardData?.availableAdvance > 0 && (
                                <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl p-4 border border-purple-500/20">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Banknote className="w-4 h-4 text-purple-500" />
                                    <span className="text-xs text-muted-foreground">Vale Disponível</span>
                                  </div>
                                  <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(dashboardData.availableAdvance)}</p>
                                  <p className="text-xs text-muted-foreground mt-1">para solicitar</p>
                                </div>
                              )}
                            </div>
                            
                            {/* ===== MÊS ANTERIOR ===== */}
                            {dashboardData?.lastPayslip && (
                              <div className="pt-3 border-t border-border/50">
                                <div className="flex items-center justify-center gap-2 mb-3">
                                  <FileText className="w-4 h-4 text-muted-foreground" />
                                  <h4 className="text-sm font-semibold text-muted-foreground">
                                    {dashboardData.lastPayslip.monthName} {dashboardData.lastPayslip.year}
                                  </h4>
                                </div>
                                
                                {/* Card único em largura total */}
                                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-xl p-4 border border-emerald-500/20 text-center">
                                  <div className="flex items-center justify-center gap-2 mb-2">
                                    <DollarSign className="w-4 h-4 text-emerald-500" />
                                    <span className="text-xs text-muted-foreground">Salário Recebido</span>
                                  </div>
                                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(dashboardData.lastPayslip.netSalary)}</p>
                                  <p className="text-xs text-muted-foreground mt-1">líquido</p>
                                  
                                  {/* Info adicional se houver faltas ou horas extras */}
                                  {(dashboardData.lastPayslip.absenceDays > 0 || dashboardData.lastPayslip.overtimeHours > 0) && (
                                    <div className="flex justify-center gap-4 mt-3 pt-3 border-t border-emerald-500/20">
                                      {dashboardData.lastPayslip.absenceDays > 0 && (
                                        <div className="text-center">
                                          <p className="text-sm font-semibold text-red-500">{dashboardData.lastPayslip.absenceDays} falta(s)</p>
                                        </div>
                                      )}
                                      {dashboardData.lastPayslip.overtimeHours > 0 && (
                                        <div className="text-center">
                                          <p className="text-sm font-semibold text-orange-500">{dashboardData.lastPayslip.overtimeHours}h extra</p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Alertas / Pendências */}
                            {(dashboardData?.pendingPayslips > 0 || dashboardData?.pendingAdvances > 0) && (
                              <div className="space-y-2 pt-3 border-t border-border/50">
                                <h4 className="text-sm font-medium text-muted-foreground">Pendências</h4>
                                
                                {dashboardData?.pendingPayslips > 0 && (
                                  <button
                                    onClick={() => {
                                      // Se só tem 1 pendente, abre direto
                                      // Se tem mais de 1, vai para aba de holerites
                                      if (dashboardData.pendingPayslips === 1) {
                                        const firstPending = dashboardData.pendingPayslipsList?.[0]
                                        if (firstPending) {
                                          setSelectedPayslip(firstPending)
                                          setShowPayslipView(true)
                                        }
                                      } else {
                                        // Ir para aba de holerites - o componente SlidePanel precisa suportar isso
                                        // Por enquanto, abre o primeiro e mostra mensagem
                                        const firstPending = dashboardData.pendingPayslipsList?.[0]
                                        if (firstPending) {
                                          setSelectedPayslip(firstPending)
                                          setShowPayslipView(true)
                                        }
                                      }
                                    }}
                                    className="w-full flex items-center gap-3 bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors cursor-pointer"
                                  >
                                    <ClipboardCheck className="w-5 h-5 text-yellow-600" />
                                    <div className="flex-1 text-left">
                                      <p className="text-sm font-medium">Holerites para assinar</p>
                                      <p className="text-xs text-muted-foreground">{dashboardData.pendingPayslips} documento(s) pendente(s)</p>
                                    </div>
                                    <span className="text-xs bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded-full font-medium">
                                      {dashboardData.pendingPayslips}
                                    </span>
                                  </button>
                                )}
                                
                                {dashboardData?.pendingAdvances > 0 && (
                                  <div className="flex items-center gap-3 bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                                    <Wallet className="w-5 h-5 text-blue-600" />
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">Vales em análise</p>
                                      <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
                                    </div>
                                    <span className="text-xs bg-blue-500/20 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-full font-medium">
                                      {dashboardData.pendingAdvances}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Info rápida */}
                            <div className="bg-muted/30 rounded-lg p-3">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Departamento</span>
                                <span className="font-medium">{employeeData?.department?.name || '-'}</span>
                              </div>
                              {employeeData?.registrationId && (
                                <div className="flex items-center justify-between text-sm mt-2">
                                  <span className="text-muted-foreground">Matrícula</span>
                                  <span className="font-medium">{employeeData.registrationId}</span>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ),
                  },
                  // Tab 2: Vales - só aparece se habilitado
                  ...(payrollConfig?.enableExtraAdvance ? [{
                    id: 'vales',
                    label: 'Vales',
                    icon: <Wallet className="w-4 h-4" />,
                    content: (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className={`${comfortaa.className} text-lg font-semibold`}>Meus Vales</h3>
                          <Button size="sm" onClick={() => setShowRequestModal(true)}>
                            Solicitar
                          </Button>
                        </div>
                        
                        {/* Resumo de limite */}
                        {advanceSummary && (
                          <div className="bg-muted/30 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-muted-foreground">Utilizado este mês</span>
                              <span className="font-medium">{formatCurrency(advanceSummary.totalMonth || 0)}</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2 mb-2">
                              <div
                                className={`h-2 rounded-full ${
                                  (advanceSummary.percentage || 0) >= 80 ? 'bg-red-500' :
                                  (advanceSummary.percentage || 0) >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(100, advanceSummary.percentage || 0)}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{advanceSummary.percentage || 0}% do limite</span>
                              <span>Disponível: {formatCurrency(advanceSummary.available || 0)}</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Lista de vales */}
                        {panelLoading ? (
                          <div className="text-center py-4 text-muted-foreground">Carregando...</div>
                        ) : advances.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground">Nenhum vale solicitado</div>
                        ) : (
                          <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {advances.map((advance: any) => (
                              <div key={advance.id} className="bg-muted/30 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">{formatCurrency(advance.amount)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {advance.type === 'SALARY_ADVANCE' ? 'Adiantamento' : 'Vale Avulso'}
                                    </p>
                                  </div>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    advance.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                    advance.status === 'APPROVED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                    advance.status === 'PAID' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                    advance.status === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                  }`}>
                                    {advance.status === 'PENDING' ? 'Pendente' :
                                     advance.status === 'APPROVED' ? 'Aprovado' :
                                     advance.status === 'PAID' ? 'Pago' :
                                     advance.status === 'REJECTED' ? 'Rejeitado' : 'Descontado'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ),
                  }] : []),
                  // Tab 3: Holerites
                  {
                    id: 'holerites',
                    label: 'Holerite',
                    icon: <FileText className="w-4 h-4" />,
                    content: (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className={`${comfortaa.className} text-lg font-semibold`}>Meus Holerites</h3>
                        </div>
                        
                        {/* Filtros de Ano e Mês */}
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            {/* Filtro de Ano */}
                            <select
                              value={payslipFilterYear || ''}
                              onChange={(e) => {
                                const val = e.target.value ? Number(e.target.value) : null
                                setPayslipFilterYear(val)
                                if (!val) setPayslipFilterMonth(null) // Limpa mês se limpar ano
                              }}
                              className="flex-1 h-9 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring custom-select"
                            >
                              <option value="">Todos os anos</option>
                              {availableYears.map((year) => (
                                <option key={year} value={year}>{year}</option>
                              ))}
                            </select>
                            
                            {/* Filtro de Mês */}
                            <select
                              value={payslipFilterMonth || ''}
                              onChange={(e) => setPayslipFilterMonth(e.target.value ? Number(e.target.value) : null)}
                              className="flex-1 h-9 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring custom-select"
                            >
                              <option value="">Todos os meses</option>
                              {MONTHS.map((month, idx) => (
                                <option key={idx} value={idx + 1}>{month}</option>
                              ))}
                            </select>
                          </div>
                          
                          {/* Botão Limpar - embaixo dos selects */}
                          {(payslipFilterYear || payslipFilterMonth) && (
                            <button
                              onClick={() => {
                                setPayslipFilterYear(null)
                                setPayslipFilterMonth(null)
                              }}
                              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center justify-center gap-2"
                              title="Limpar filtros"
                            >
                              <X className="w-4 h-4" />
                              <span>Limpar filtros</span>
                            </button>
                          )}
                        </div>
                        
                        {panelLoading ? (
                          <div className="text-center py-4 text-muted-foreground">Carregando...</div>
                        ) : payslips.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground">Nenhum holerite disponível</div>
                        ) : (() => {
                          // Filtrar holerites
                          let filteredPayslips = payslips
                          
                          if (payslipFilterYear) {
                            filteredPayslips = filteredPayslips.filter((p: any) => p.referenceYear === payslipFilterYear)
                          }
                          if (payslipFilterMonth) {
                            filteredPayslips = filteredPayslips.filter((p: any) => p.referenceMonth === payslipFilterMonth)
                          }
                          
                          // Se não tem filtro, mostrar TODOS os holerites ordenados
                          // Ordenar por data (mais recente primeiro)
                          filteredPayslips = [...filteredPayslips].sort((a, b) => {
                            if (a.referenceYear !== b.referenceYear) return b.referenceYear - a.referenceYear
                            return b.referenceMonth - a.referenceMonth
                          })
                          
                          if (filteredPayslips.length === 0) {
                            return (
                              <div className="text-center py-4 text-muted-foreground">
                                Nenhum holerite encontrado para o período selecionado
                              </div>
                            )
                          }
                          
                          return (
                            <div className="space-y-3 max-h-[300px] overflow-y-auto payslip-modal-scroll">
                              {filteredPayslips.map((payslip: any) => (
                                <div key={payslip.id} className="bg-muted/30 rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium">
                                      {MONTHS[payslip.referenceMonth - 1]} {payslip.referenceYear}
                                    </h4>
                                    <span className={`text-xs px-2 py-1 rounded ${
                                      payslip.status === 'PAID' 
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                        : payslip.status === 'ACCEPTED'
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                        : payslip.status === 'REJECTED'
                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    }`}>
                                      {payslip.status === 'PAID' ? 'Pago' 
                                        : payslip.status === 'ACCEPTED' ? 'Aceito' 
                                        : payslip.status === 'REJECTED' ? 'Rejeitado'
                                        : 'Aguardando Aceite'}
                                    </span>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                    <div>
                                      <p className="text-muted-foreground text-xs">Bruto</p>
                                      <p className="font-medium">{formatCurrency(payslip.grossSalary || payslip.totalEarnings || 0)}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground text-xs">Descontos</p>
                                      <p className="font-medium text-red-600">-{formatCurrency(payslip.totalDeductions || 0)}</p>
                                    </div>
                                  </div>
                                  
                                  {/* Parcelas de Pagamento */}
                                  {payslip.installments && payslip.installments.length > 0 && (
                                    <div className="mb-3 p-2 bg-background rounded border border-border">
                                      <p className="text-xs text-muted-foreground mb-2">Parcelas de Pagamento</p>
                                      <div className="space-y-1">
                                        {payslip.installments.map((inst: any) => (
                                          <div key={inst.id} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                              <div className={`w-2 h-2 rounded-full ${inst.paidAt ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                              <span>Parcela {inst.installmentNumber}/{inst.totalInstallments}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="font-medium">{formatCurrency(inst.amount)}</span>
                                              <span className={inst.paidAt ? 'text-emerald-600' : 'text-muted-foreground'}>
                                                {inst.paidAt 
                                                  ? `Pago ${new Date(inst.paidAt).toLocaleDateString('pt-BR')}`
                                                  : `Vence ${new Date(inst.dueDate).toLocaleDateString('pt-BR')}`
                                                }
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center justify-between pt-2 border-t border-border">
                                    <div>
                                      <p className="text-xs text-muted-foreground">Líquido</p>
                                      <p className="text-lg font-bold text-green-600">{formatCurrency(payslip.netSalary || 0)}</p>
                                    </div>
                                    <div className="flex gap-2">
                                      {/* Botão Visualizar - sempre disponível */}
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleOpenPayslipView(payslip)}
                                      >
                                        <FileText className="h-4 w-4 mr-1" />
                                        Ver
                                      </Button>
                                      {/* Botão Download - só se aceito ou pago */}
                                      {(payslip.status === 'ACCEPTED' || payslip.status === 'PAID') && (
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          title="Baixar PDF"
                                          onClick={() => handleDownloadPdf(payslip.id, payslip.referenceMonth, payslip.referenceYear)}
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                      )}
                                      {/* Botão Aceitar - só se APPROVED (aguardando aceite) */}
                                      {payslip.status === 'APPROVED' && (
                                        <Button
                                          size="sm"
                                          className="bg-teal-600 hover:bg-teal-700"
                                          onClick={() => handleOpenPayslipView(payslip)}
                                        >
                                          <ThumbsUp className="h-4 w-4 mr-1" />
                                          Aceitar
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        })()}
                      </div>
                    ),
                  },
                  // Tab 3: Férias
                  {
                    id: 'ferias',
                    label: 'Férias',
                    icon: <Palmtree className="w-4 h-4" />,
                    content: (
                      <div className="space-y-4">
                        {loadingVacations ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                            Carregando...
                          </div>
                        ) : (
                          <>
                            {/* Períodos Aquisitivos */}
                            {vacationData?.acquisitivePeriods && vacationData.acquisitivePeriods.length > 0 ? (
                              <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-muted-foreground uppercase">Períodos Aquisitivos</h4>
                                {vacationData.acquisitivePeriods.map((period: any, idx: number) => (
                                  <div 
                                    key={idx} 
                                    className={`rounded-lg p-4 border ${
                                      period.isExpired 
                                        ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' 
                                        : period.status === 'REGULARIZED'
                                        ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                                        : period.status === 'SCHEDULED'
                                        ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                                        : 'bg-muted/30 border-border'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium">
                                        {period.periodNumber}º Período
                                      </span>
                                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                        period.isExpired 
                                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                          : period.status === 'REGULARIZED'
                                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                          : period.status === 'SCHEDULED'
                                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                          : period.isAcquired
                                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                          : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                                      }`}>
                                        {period.isExpired ? 'Vencido' 
                                          : period.status === 'REGULARIZED' ? 'Regularizado'
                                          : period.status === 'SCHEDULED' ? 'Agendado'
                                          : period.isAcquired ? 'Disponível'
                                          : 'Em aquisição'}
                                      </span>
                                    </div>
                                    
                                    <div className="text-xs text-muted-foreground space-y-1">
                                      <p>Aquisição: {formatVacationDate(period.acquisitionStart)} a {formatVacationDate(period.acquisitionEnd)}</p>
                                      <p>Concessão até: {formatVacationDate(period.concessionEnd)}</p>
                                      {period.vacation && (
                                        <p className="text-primary font-medium">
                                          {period.vacation.remainingDays} dias restantes
                                          {period.vacation.soldDays > 0 && ` (${period.vacation.soldDays} vendidos)`}
                                        </p>
                                      )}
                                    </div>
                                    
                                    {/* Info de férias programadas + botão de assinatura */}
                                    {period.hasVacation && period.vacation && period.status === 'SCHEDULED' && (
                                      <div className="mt-3 pt-3 border-t border-border/50">
                                        {period.vacation.periods && (
                                          <>
                                            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                                              📅 Férias programadas:
                                            </p>
                                            {period.vacation.periods.map((p: any, i: number) => (
                                              <p key={i} className="text-xs text-muted-foreground">
                                                {formatVacationDate(p.startDate)} a {formatVacationDate(p.endDate)} ({p.days} dias)
                                              </p>
                                            ))}
                                          </>
                                        )}
                                        
                                        {/* Verificar se há solicitação que precisa de assinatura para este período */}
                                        {(() => {
                                          const requestForPeriod = vacationRequests.find((req: any) => {
                                            if (req.vacationId && period.vacation?.id) {
                                              return req.vacationId === period.vacation.id
                                            }
                                            if (req.vacation?.acquisitionStart) {
                                              return new Date(req.vacation.acquisitionStart).toISOString().split('T')[0] === 
                                                new Date(period.acquisitionStart).toISOString().split('T')[0]
                                            }
                                            return false
                                          })
                                          
                                          const needsSignature = requestForPeriod && 
                                            (requestForPeriod.status === 'AWAITING_SIGNATURE' || requestForPeriod.status === 'APPROVED')
                                          
                                          const alreadySigned = requestForPeriod && requestForPeriod.status === 'EMPLOYEE_SIGNED'
                                          const isCompleted = requestForPeriod && requestForPeriod.status === 'COMPLETED'
                                          
                                          if (needsSignature) {
                                            return (
                                              <div className="mt-2">
                                                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">
                                                  ✍️ Aguardando sua assinatura
                                                </p>
                                                <Button
                                                  size="sm"
                                                  onClick={() => openVacationSignModal(requestForPeriod)}
                                                  className="w-full bg-blue-600 hover:bg-blue-700"
                                                >
                                                  <FileSignature className="w-4 h-4 mr-2" />
                                                  Assinar Aviso de Férias
                                                </Button>
                                              </div>
                                            )
                                          }
                                          
                                          if (alreadySigned) {
                                            return (
                                              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-2">
                                                📝 Você assinou - aguardando RH finalizar
                                              </p>
                                            )
                                          }
                                          
                                          if (isCompleted) {
                                            return (
                                              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-2">
                                                ✅ Férias confirmadas
                                              </p>
                                            )
                                          }
                                          
                                          return null
                                        })()}
                                      </div>
                                    )}
                                    
                                    {/* Alerta de férias vencidas */}
                                    {period.isExpired && !period.hasVacation && (
                                      <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                                        <p className="text-xs font-medium text-red-600 dark:text-red-400">
                                          ⚠️ Período vencido - Procure o RH para regularização
                                        </p>
                                      </div>
                                    )}
                                    
                                    {/* Botão Solicitar Férias - aparece em cada card elegível */}
                                    {(() => {
                                      // Verificar se já tem solicitação ativa (pendente, em andamento ou concluída) para este período
                                      // Compara por vacationId OU por acquisitionStart (caso vacation esteja populado)
                                      const hasActiveRequest = vacationRequests.some((req: any) => {
                                        // Ignorar apenas REJECTED e CANCELLED - todos os outros status bloqueiam nova solicitação
                                        if (req.status === 'REJECTED' || req.status === 'CANCELLED') {
                                          return false
                                        }
                                        // Se a solicitação tem vacationId, compara com o id do vacation do período
                                        if (req.vacationId && period.vacation?.id) {
                                          return req.vacationId === period.vacation.id
                                        }
                                        // Se tem vacation com acquisitionStart, compara as datas
                                        if (req.vacation?.acquisitionStart) {
                                          return new Date(req.vacation.acquisitionStart).toISOString().split('T')[0] === 
                                            new Date(period.acquisitionStart).toISOString().split('T')[0]
                                        }
                                        // Se não tem vacation associado, considera como ativa para qualquer período disponível
                                        // (isso evita múltiplas solicitações sem vacation)
                                        return !req.vacationId && (period.isAcquired || period.isExpired)
                                      })
                                      
                                      // Verificar se tem solicitação pendente (para mostrar status)
                                      const hasPendingRequest = vacationRequests.some((req: any) => {
                                        if (req.status !== 'PENDING' && req.status !== 'COUNTER_PROPOSAL' && req.status !== 'APPROVED' && req.status !== 'AWAITING_SIGNATURE' && req.status !== 'EMPLOYEE_SIGNED') {
                                          return false
                                        }
                                        if (req.vacationId && period.vacation?.id) {
                                          return req.vacationId === period.vacation.id
                                        }
                                        if (req.vacation?.acquisitionStart) {
                                          return new Date(req.vacation.acquisitionStart).toISOString().split('T')[0] === 
                                            new Date(period.acquisitionStart).toISOString().split('T')[0]
                                        }
                                        return !req.vacationId && (period.isAcquired || period.isExpired)
                                      })
                                      
                                      // Pode solicitar se:
                                      // - Período está disponível (isAcquired) OU vencido (isExpired)
                                      // - NÃO está agendado (SCHEDULED)
                                      // - NÃO está regularizado (REGULARIZED)
                                      // - NÃO está em aquisição ainda (!isAcquired && !isExpired)
                                      // - NÃO tem solicitação ativa (pendente, em andamento ou concluída)
                                      const canRequest = 
                                        (period.isAcquired || period.isExpired) && 
                                        period.status !== 'SCHEDULED' && 
                                        period.status !== 'REGULARIZED' &&
                                        period.status !== 'COMPLETED' &&
                                        !hasActiveRequest
                                      
                                      if (canRequest) {
                                        return (
                                          <div className="mt-3 pt-3 border-t border-border/50">
                                            <Button
                                              size="sm"
                                              onClick={() => {
                                                // Definir o período selecionado e abrir modal
                                                console.log('[FÉRIAS CLICK] period:', JSON.stringify({
                                                  periodNumber: period.periodNumber,
                                                  acquisitionStart: period.acquisitionStart,
                                                  vacationId: period.vacation?.id,
                                                  status: period.status,
                                                  isExpired: period.isExpired,
                                                  isAcquired: period.isAcquired,
                                                }, null, 2))
                                                setSelectedVacationId(period.vacation?.id || null)
                                                setSelectedPeriodAcquisitionStart(period.acquisitionStart)
                                                setVacationRequestDays(period.vacation?.remainingDays || 30)
                                                setShowVacationRequestModal(true)
                                              }}
                                              className="w-full bg-green-600 hover:bg-green-700"
                                            >
                                              <Send className="w-4 h-4 mr-2" />
                                              Solicitar Férias deste Período
                                            </Button>
                                          </div>
                                        )
                                      }
                                      
                                      // Mostrar indicador se já tem solicitação em andamento
                                      // MAS não mostrar nada se o período já é SCHEDULED (pois já tem tudo no bloco acima)
                                      if (hasPendingRequest && period.status !== 'SCHEDULED') {
                                        // Encontrar a solicitação para mostrar o status correto
                                        const activeRequest = vacationRequests.find((req: any) => {
                                          if (req.status !== 'PENDING' && req.status !== 'COUNTER_PROPOSAL' && req.status !== 'APPROVED' && req.status !== 'AWAITING_SIGNATURE' && req.status !== 'EMPLOYEE_SIGNED') {
                                            return false
                                          }
                                          if (req.vacationId && period.vacation?.id) {
                                            return req.vacationId === period.vacation.id
                                          }
                                          if (req.vacation?.acquisitionStart) {
                                            return new Date(req.vacation.acquisitionStart).toISOString().split('T')[0] === 
                                              new Date(period.acquisitionStart).toISOString().split('T')[0]
                                          }
                                          return !req.vacationId && (period.isAcquired || period.isExpired)
                                        })
                                        
                                        const statusMessages: Record<string, { icon: string; text: string; color: string }> = {
                                          PENDING: { icon: '⏳', text: 'Aguardando análise do RH', color: 'text-yellow-600 dark:text-yellow-400' },
                                          COUNTER_PROPOSAL: { icon: '📋', text: 'Contraproposta do RH - verifique', color: 'text-orange-600 dark:text-orange-400' },
                                          APPROVED: { icon: '✅', text: 'Aprovado - aguardando assinatura', color: 'text-green-600 dark:text-green-400' },
                                          AWAITING_SIGNATURE: { icon: '✍️', text: 'Aguardando sua assinatura', color: 'text-blue-600 dark:text-blue-400' },
                                          EMPLOYEE_SIGNED: { icon: '📝', text: 'Você assinou - aguardando RH', color: 'text-indigo-600 dark:text-indigo-400' },
                                        }
                                        
                                        const status = activeRequest?.status || 'PENDING'
                                        const msg = statusMessages[status] || statusMessages.PENDING
                                        
                                        // Se precisa de assinatura, mostrar botão
                                        // MAS não mostrar se o período já é SCHEDULED (pois já tem botão no bloco acima)
                                        const needsSignature = (status === 'AWAITING_SIGNATURE' || status === 'APPROVED') && period.status !== 'SCHEDULED'
                                        
                                        return (
                                          <div className="mt-3 pt-3 border-t border-border/50">
                                            <p className={`text-xs font-medium ${msg.color}`}>
                                              {msg.icon} {msg.text}
                                            </p>
                                            {needsSignature && activeRequest && (
                                              <Button
                                                size="sm"
                                                onClick={() => openVacationSignModal(activeRequest)}
                                                className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
                                              >
                                                <FileSignature className="w-4 h-4 mr-2" />
                                                Assinar Aviso de Férias
                                              </Button>
                                            )}
                                          </div>
                                        )
                                      }
                                      
                                      return null
                                    })()}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">
                                <Palmtree className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>Nenhum período de férias disponível</p>
                                <p className="text-xs mt-1">Você precisa completar 12 meses de trabalho</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ),
                  },
                ]}
                defaultTab="dashboard"
                onClose={() => setShowPanel(false)}
                showCloseButton={true}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal de visualização completa do holerite */}
      {showPayslipView && selectedPayslip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-semibold">Holerite</h2>
                <p className="text-sm text-muted-foreground">
                  {MONTHS[selectedPayslip.referenceMonth - 1]} de {selectedPayslip.referenceYear}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPayslipView(false)
                  setSelectedPayslip(null)
                  setHasScrolledToEnd(false)
                }}
                className="p-2 hover:bg-muted rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Conteúdo com scroll - OBRIGATÓRIO rolar até o final */}
            <div 
              className="flex-1 overflow-y-auto p-4 space-y-4 payslip-modal-scroll"
              onScroll={handlePayslipScroll}
            >
              {/* Cabeçalho da empresa com logo */}
              <div className="border-b border-border pb-6">
                <div className="flex items-center justify-center gap-5">
                  {companyLogoUrl && (
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-white p-1 shadow-sm flex-shrink-0">
                      <img 
                        src={companyLogoUrl} 
                        alt={companyName || 'Logo'} 
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <div className="text-center">
                    <h3 className="text-xl font-bold">{companyName || 'Empresa'}</h3>
                    <p className="text-sm text-muted-foreground">CNPJ: {companyData?.cnpj || '-'}</p>
                  </div>
                </div>
              </div>
              
              {/* Dados do funcionário */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-semibold mb-3 text-sm uppercase text-muted-foreground">Dados do Funcionário</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Nome</p>
                    <p className="font-medium">{employeeName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Cargo</p>
                    <p className="font-medium">{jobTitle || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Departamento</p>
                    <p className="font-medium">{employeeData?.department?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Matrícula</p>
                    <p className="font-medium">{employeeData?.registrationId || '-'}</p>
                  </div>
                </div>
              </div>
              
              {/* Proventos */}
              <div>
                <h4 className="font-semibold mb-3 text-sm uppercase text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Proventos
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span>Salário Base</span>
                    <span className="font-medium">{formatCurrency(selectedPayslip.baseSalary || 0)}</span>
                  </div>
                  {selectedPayslip.overtimeValue > 0 && (
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span>Hora Extra ({selectedPayslip.overtimeHours || 0}h)</span>
                      <span className="font-medium">{formatCurrency(selectedPayslip.overtimeValue)}</span>
                    </div>
                  )}
                  {selectedPayslip.nightShiftValue > 0 && (
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span>Adicional Noturno</span>
                      <span className="font-medium">{formatCurrency(selectedPayslip.nightShiftValue)}</span>
                    </div>
                  )}
                  {selectedPayslip.bonusValue > 0 && (
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span>Bônus/Gratificação</span>
                      <span className="font-medium">{formatCurrency(selectedPayslip.bonusValue)}</span>
                    </div>
                  )}
                  {selectedPayslip.otherEarnings > 0 && (
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span>{selectedPayslip.otherEarningsDesc || 'Outros Proventos'}</span>
                      <span className="font-medium">{formatCurrency(selectedPayslip.otherEarnings)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 bg-green-500/10 px-2 rounded font-semibold">
                    <span>Total de Proventos</span>
                    <span className="text-green-600">{formatCurrency(selectedPayslip.grossSalary || 0)}</span>
                  </div>
                </div>
              </div>
              
              {/* Descontos */}
              <div>
                <h4 className="font-semibold mb-3 text-sm uppercase text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  Descontos
                </h4>
                <div className="space-y-2">
                  {/* INSS */}
                  {Number(selectedPayslip.inssValue || 0) > 0 && (
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span>INSS ({Number(selectedPayslip.inssRate || 0).toFixed(1)}%)</span>
                      <span className="font-medium text-red-600">-{formatCurrency(selectedPayslip.inssValue)}</span>
                    </div>
                  )}
                  {/* IRRF - usando irValue do backend */}
                  {Number(selectedPayslip.irValue || selectedPayslip.irrfValue || 0) > 0 && (
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span>IRRF ({Number(selectedPayslip.irRate || 0).toFixed(1)}%)</span>
                      <span className="font-medium text-red-600">-{formatCurrency(selectedPayslip.irValue || selectedPayslip.irrfValue)}</span>
                    </div>
                  )}
                  {/* Vale Transporte - usando transportVoucher do backend */}
                  {Number(selectedPayslip.transportVoucher || selectedPayslip.transportVoucherDiscount || 0) > 0 && (
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span>Vale Transporte (6%)</span>
                      <span className="font-medium text-red-600">-{formatCurrency(selectedPayslip.transportVoucher || selectedPayslip.transportVoucherDiscount)}</span>
                    </div>
                  )}
                  {/* Vale Refeição - usando mealVoucher do backend */}
                  {Number(selectedPayslip.mealVoucher || selectedPayslip.mealVoucherDiscount || 0) > 0 && (
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span>Vale Refeição</span>
                      <span className="font-medium text-red-600">-{formatCurrency(selectedPayslip.mealVoucher || selectedPayslip.mealVoucherDiscount)}</span>
                    </div>
                  )}
                  {/* Plano de Saúde - usando healthInsurance do backend */}
                  {Number(selectedPayslip.healthInsurance || selectedPayslip.healthInsuranceDiscount || 0) > 0 && (
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span>Plano de Saúde</span>
                      <span className="font-medium text-red-600">-{formatCurrency(selectedPayslip.healthInsurance || selectedPayslip.healthInsuranceDiscount)}</span>
                    </div>
                  )}
                  {/* Plano Odontológico */}
                  {Number(selectedPayslip.dentalInsurance || 0) > 0 && (
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span>Plano Odontológico</span>
                      <span className="font-medium text-red-600">-{formatCurrency(selectedPayslip.dentalInsurance)}</span>
                    </div>
                  )}
                  {/* Contribuição Sindical */}
                  {Number(selectedPayslip.unionContribution || 0) > 0 && (
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span>Contribuição Sindical</span>
                      <span className="font-medium text-red-600">-{formatCurrency(selectedPayslip.unionContribution)}</span>
                    </div>
                  )}
                  {/* Empréstimo Consignado */}
                  {Number(selectedPayslip.loanDeduction || 0) > 0 && (
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span>Empréstimo Consignado</span>
                      <span className="font-medium text-red-600">-{formatCurrency(selectedPayslip.loanDeduction)}</span>
                    </div>
                  )}
                  {/* Adiantamento Salarial */}
                  {Number(selectedPayslip.salaryAdvanceValue || 0) > 0 && (
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span>Adiantamento Salarial</span>
                      <span className="font-medium text-red-600">-{formatCurrency(selectedPayslip.salaryAdvanceValue)}</span>
                    </div>
                  )}
                  {/* Vales Avulsos */}
                  {Number(selectedPayslip.extraAdvanceValue || 0) > 0 && (
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span>Vales Avulsos</span>
                      <span className="font-medium text-red-600">-{formatCurrency(selectedPayslip.extraAdvanceValue)}</span>
                    </div>
                  )}
                  {/* Faltas / Dias não trabalhados - usando absenceValue do backend */}
                  {Number(selectedPayslip.absenceValue || selectedPayslip.absenceDeduction || 0) > 0 && (
                    <div className="py-2 border-b border-border/50">
                      <div className="flex justify-between">
                        <span>
                          {/* Mês em andamento = "Dias não trabalhados", Mês fechado = "Faltas" */}
                          {selectedPayslip.status === 'CALCULATED' || selectedPayslip.status === 'DRAFT' || selectedPayslip.status === 'PENDING'
                            ? `Dias não trabalhados (${selectedPayslip.absenceDays || 0} de 22)`
                            : `Faltas (${selectedPayslip.absenceDays || 0} dia(s))`
                          }
                        </span>
                        <span className="font-medium text-red-600">-{formatCurrency(selectedPayslip.absenceValue || selectedPayslip.absenceDeduction)}</span>
                      </div>
                      {/* Nota explicativa para mês em andamento */}
                      {(selectedPayslip.status === 'CALCULATED' || selectedPayslip.status === 'DRAFT' || selectedPayslip.status === 'PENDING') && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          * Valor diminui conforme você trabalha
                        </p>
                      )}
                    </div>
                  )}
                  {/* Atrasos */}
                  {Number(selectedPayslip.lateValue || 0) > 0 && (
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span>Atrasos ({selectedPayslip.lateMinutes || 0} min)</span>
                      <span className="font-medium text-red-600">-{formatCurrency(selectedPayslip.lateValue)}</span>
                    </div>
                  )}
                  {/* Outros Descontos */}
                  {Number(selectedPayslip.otherDeductions || 0) > 0 && (
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span>{selectedPayslip.otherDeductionsDesc || 'Outros Descontos'}</span>
                      <span className="font-medium text-red-600">-{formatCurrency(selectedPayslip.otherDeductions)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 bg-red-500/10 px-2 rounded font-semibold">
                    <span>Total de Descontos</span>
                    <span className="text-red-600">-{formatCurrency(selectedPayslip.totalDeductions || 0)}</span>
                  </div>
                </div>
              </div>
              
              {/* FGTS (informativo) */}
              {selectedPayslip.fgtsValue > 0 && (
                <div className="bg-blue-500/10 rounded-lg p-4">
                  <h4 className="font-semibold mb-2 text-sm uppercase text-blue-600">FGTS (Informativo)</h4>
                  <p className="text-sm text-muted-foreground">
                    Base de cálculo: {formatCurrency(selectedPayslip.fgtsBase || 0)}
                  </p>
                  <p className="text-sm">
                    Depósito FGTS (8%): <strong>{formatCurrency(selectedPayslip.fgtsValue)}</strong>
                  </p>
                </div>
              )}
              
              {/* Resumo Final */}
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Salário Líquido a Receber</p>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(selectedPayslip.netSalary || 0)}</p>
              </div>
              
              {/* Termos de assinatura */}
              <div className="bg-muted/50 rounded-lg p-4 text-sm">
                <p className="font-medium mb-2">Ao assinar este holerite, você declara que:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Verificou todos os valores apresentados</li>
                  <li>Concorda com os proventos e descontos</li>
                  <li>Confirma o recebimento deste documento</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-3">
                  Esta assinatura terá validade legal conforme MP 2.200-2/2001.
                  Serão registrados: data/hora, IP e dispositivo.
                </p>
              </div>
              
              {/* Indicador de scroll */}
              {!hasScrolledToEnd && (
                <div className="text-center py-4 animate-bounce">
                  <p className="text-sm text-muted-foreground">↓ Role até o final para poder assinar ↓</p>
                </div>
              )}
            </div>
            
            {/* Footer com botões */}
            <div className="p-4 border-t border-border shrink-0">
              {/* Indicador de progresso */}
              {!selectedPayslip.signedAt && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Progresso da leitura</span>
                    <span>{hasScrolledToEnd ? '100%' : 'Role até o final'}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${hasScrolledToEnd ? 'bg-green-500 w-full' : 'bg-yellow-500 w-1/2'}`}
                    />
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-2 items-center">
                <Button variant="outline" onClick={() => {
                  setShowPayslipView(false)
                  setSelectedPayslip(null)
                  setHasScrolledToEnd(false)
                }}>
                  Fechar
                </Button>
                
                {/* Botões 👍/👎 - mostra se holerite NÃO foi pago, aceito nem rejeitado */}
                {selectedPayslip.status !== 'PAID' && selectedPayslip.status !== 'ACCEPTED' && selectedPayslip.status !== 'REJECTED' && !selectedPayslip.acceptedAt && !selectedPayslip.rejectedAt && (
                  <>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        if (hasScrolledToEnd) {
                          setShowRejectForm(true)
                          setShowSignModal(true)
                        } else {
                          toast.error('Role até o final do documento primeiro')
                        }
                      }}
                      disabled={!hasScrolledToEnd}
                      className={`${!hasScrolledToEnd ? 'opacity-50 cursor-not-allowed' : ''} border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-950`}
                    >
                      <ThumbsDown className="h-4 w-4 mr-2" />
                      Rejeitar
                    </Button>
                    <Button 
                      onClick={() => {
                        if (hasScrolledToEnd) {
                          setShowSignModal(true)
                        } else {
                          toast.error('Role até o final do documento primeiro')
                        }
                      }}
                      disabled={!hasScrolledToEnd}
                      className={`${!hasScrolledToEnd ? 'opacity-50 cursor-not-allowed' : ''} bg-teal-600 hover:bg-teal-700`}
                    >
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      Aceitar
                    </Button>
                  </>
                )}
                
                {/* Status já aceito - mostra badge em vez de botões */}
                {(selectedPayslip.status === 'ACCEPTED' || selectedPayslip.acceptedAt) && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-teal-500/10 text-teal-600 rounded-lg text-sm font-medium">
                    <ThumbsUp className="h-4 w-4" />
                    Aceito
                  </div>
                )}
                
                {/* Status rejeitado - mostra badge em vez de botões */}
                {(selectedPayslip.status === 'REJECTED' || selectedPayslip.rejectedAt) && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-600 rounded-lg text-sm font-medium">
                    <ThumbsDown className="h-4 w-4" />
                    Rejeitado
                  </div>
                )}
                
                {/* Botão download - sempre disponível */}
                <Button 
                  variant="outline"
                  onClick={() => handleDownloadPdf(selectedPayslip.id, selectedPayslip.referenceMonth, selectedPayslip.referenceYear)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de aceite */}
      {showSignModal && selectedPayslip && !showRejectForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-md">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ThumbsUp className="h-5 w-5 text-teal-600" />
                Confirmar Aceite
              </h2>
            </div>
            
            <div className="p-4 space-y-4">
              <p className="text-sm">
                Você confirma que revisou o holerite de{' '}
                <strong>{MONTHS[selectedPayslip.referenceMonth - 1]}/{selectedPayslip.referenceYear}</strong> e que todos os valores estão corretos?
              </p>
              
              <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-3">
                <p className="text-sm text-teal-700 dark:text-teal-400 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Você leu todo o documento
                </p>
              </div>
              
              {/* Aviso de assinatura digital */}
              <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-lg p-4">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2 mb-2">
                  ⚠️ ATENÇÃO: ASSINATURA DIGITAL
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-300">
                  Ao confirmar o aceite, você está <strong>assinando digitalmente</strong> este holerite, 
                  declarando que revisou e concorda com todos os valores apresentados. 
                  Esta ação tem <strong>validade jurídica</strong> e será registrada com data, hora e seu identificador.
                </p>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Ao aceitar, você concorda com todos os valores apresentados no holerite.
              </p>
            </div>
            
            <div className="p-4 border-t border-border flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSignModal(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAcceptPayslip} 
                disabled={isAccepting}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {isAccepting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ThumbsUp className="h-4 w-4 mr-2" />
                )}
                Confirmar Aceite
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de rejeição */}
      {showSignModal && selectedPayslip && showRejectForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-md">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ThumbsDown className="h-5 w-5 text-red-600" />
                Rejeitar Holerite
              </h2>
            </div>
            
            <div className="p-4 space-y-4">
              <p className="text-sm">
                Informe o motivo da rejeição do holerite de{' '}
                <strong>{MONTHS[selectedPayslip.referenceMonth - 1]}/{selectedPayslip.referenceYear}</strong>:
              </p>
              
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Descreva o que está incorreto no holerite..."
                className="w-full p-3 border border-border rounded-lg bg-background text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              
              <p className="text-xs text-muted-foreground">
                O RH será notificado e poderá corrigir o holerite.
              </p>
            </div>
            
            <div className="p-4 border-t border-border flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowRejectForm(false)
                  setRejectReason('')
                  setShowSignModal(false)
                }}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleRejectPayslip} 
                disabled={isRejecting || !rejectReason.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                {isRejecting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ThumbsDown className="h-4 w-4 mr-2" />
                )}
                Confirmar Rejeição
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de assinatura de férias */}
      {showVacationSignModal && selectedVacationRequest && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-blue-600" />
                Assinar Aviso de Férias
              </h2>
              <button 
                onClick={() => {
                  setShowVacationSignModal(false)
                  setSelectedVacationRequest(null)
                }}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div 
              className="p-4 space-y-4 overflow-y-auto flex-1"
              onScroll={(e) => {
                const target = e.target as HTMLDivElement
                const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50
                if (isAtBottom && !vacationSignScrolled && selectedVacationRequest) {
                  setVacationSignScrolled(true)
                  // Salvar no backend
                  handleVacationScroll(selectedVacationRequest.id)
                }
              }}
            >
              {/* Cabeçalho do documento */}
              <div className="text-center border-b border-border pb-4">
                <h3 className="text-lg font-bold uppercase">Aviso de Férias</h3>
                <p className="text-sm text-muted-foreground">Documento para assinatura digital</p>
              </div>
              
              {/* Dados do funcionário */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold mb-2 text-sm uppercase text-muted-foreground">Dados do Funcionário</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nome:</span>
                    <p className="font-medium">{user?.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Matrícula:</span>
                    <p className="font-medium">{user?.employee?.registrationId || '-'}</p>
                  </div>
                </div>
              </div>
              
              {/* Período Aquisitivo */}
              <div className="bg-blue-500/10 rounded-lg p-4">
                <h4 className="font-semibold mb-2 text-sm uppercase text-blue-600">Período Aquisitivo</h4>
                <div className="text-sm">
                  <p>
                    <span className="text-muted-foreground">De:</span>{' '}
                    <strong>{formatVacationDate(selectedVacationRequest.vacation?.acquisitionStart)}</strong>
                    {' '}a{' '}
                    <strong>{formatVacationDate(selectedVacationRequest.vacation?.acquisitionEnd)}</strong>
                  </p>
                </div>
              </div>
              
              {/* Período de Gozo */}
              <div className="bg-green-500/10 rounded-lg p-4">
                <h4 className="font-semibold mb-2 text-sm uppercase text-green-600">Período de Gozo das Férias</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Data de Início:</span>
                    <p className="font-medium">{formatVacationDate(selectedVacationRequest.requestedStartDate)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Dias de Férias:</span>
                    <p className="font-medium">{selectedVacationRequest.requestedDays} dias</p>
                  </div>
                  {selectedVacationRequest.sellDays > 0 && (
                    <div>
                      <span className="text-muted-foreground">Abono Pecuniário:</span>
                      <p className="font-medium">{selectedVacationRequest.sellDays} dias vendidos</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Data de Retorno:</span>
                    <p className="font-medium">
                      {(() => {
                        const start = new Date(selectedVacationRequest.requestedStartDate)
                        start.setDate(start.getDate() + selectedVacationRequest.requestedDays)
                        return start.toLocaleDateString('pt-BR')
                      })()}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Valores (se disponíveis) */}
              {(selectedVacationRequest.calculatedValues || (user?.employee as any)?.baseSalary) && (
                <div className="bg-yellow-500/10 rounded-lg p-4">
                  <h4 className="font-semibold mb-2 text-sm uppercase text-yellow-600">Valores Estimados</h4>
                  <div className="space-y-2 text-sm">
                    {(() => {
                      const baseSalary = Number((user?.employee as any)?.baseSalary || 0)
                      const dailyRate = baseSalary / 30
                      const vacationDays = selectedVacationRequest.requestedDays
                      const sellDays = selectedVacationRequest.sellDays || 0
                      
                      const vacationBase = vacationDays * dailyRate
                      const vacationBonus = vacationBase / 3 // 1/3 constitucional
                      const vacationTotal = vacationBase + vacationBonus
                      
                      const sellBase = sellDays * dailyRate
                      const sellBonus = sellBase / 3
                      const sellTotal = sellBase + sellBonus
                      
                      const grandTotal = vacationTotal + sellTotal
                      
                      return (
                        <>
                          <div className="flex justify-between py-1 border-b border-border/50">
                            <span>Férias ({vacationDays} dias)</span>
                            <span className="font-medium">{formatCurrency(vacationBase)}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border/50">
                            <span>1/3 Constitucional</span>
                            <span className="font-medium">{formatCurrency(vacationBonus)}</span>
                          </div>
                          {sellDays > 0 && (
                            <>
                              <div className="flex justify-between py-1 border-b border-border/50">
                                <span>Abono Pecuniário ({sellDays} dias)</span>
                                <span className="font-medium">{formatCurrency(sellBase)}</span>
                              </div>
                              <div className="flex justify-between py-1 border-b border-border/50">
                                <span>1/3 sobre Abono</span>
                                <span className="font-medium">{formatCurrency(sellBonus)}</span>
                              </div>
                            </>
                          )}
                          <div className="flex justify-between py-2 bg-green-500/20 px-2 rounded font-semibold mt-2">
                            <span>Total Bruto</span>
                            <span className="text-green-600">{formatCurrency(grandTotal)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            * Valores estimados. O valor líquido será calculado após descontos de INSS e IRRF.
                          </p>
                        </>
                      )
                    })()}
                  </div>
                </div>
              )}
              
              {/* Observações */}
              {selectedVacationRequest.employeeNotes && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2 text-sm uppercase text-muted-foreground">Suas Observações</h4>
                  <p className="text-sm">{selectedVacationRequest.employeeNotes}</p>
                </div>
              )}
              
              {/* Termos de assinatura */}
              <div className="bg-muted/50 rounded-lg p-4 text-sm">
                <p className="font-medium mb-2">Ao assinar este aviso de férias, você declara que:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Verificou o período de férias aprovado</li>
                  <li>Concorda com as datas de início e retorno</li>
                  <li>Está ciente dos valores a receber</li>
                  <li>Confirma o recebimento deste aviso</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-3">
                  Esta assinatura terá validade legal conforme MP 2.200-2/2001.
                  Serão registrados: data/hora, IP e dispositivo.
                </p>
              </div>
              
              {/* Indicador de scroll */}
              {!vacationSignScrolled && (
                <div className="text-center py-4 animate-bounce">
                  <p className="text-sm text-muted-foreground">↓ Role até o final para poder assinar ↓</p>
                </div>
              )}
            </div>
            
            {/* Footer com botões */}
            <div className="p-4 border-t border-border flex-shrink-0">
              {/* Barra de progresso de leitura */}
              {!selectedVacationRequest.employeeSignedAt && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Progresso da leitura</span>
                    <span>{vacationSignScrolled ? '100%' : 'Role até o final'}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${vacationSignScrolled ? 'bg-green-500 w-full' : 'bg-yellow-500 w-1/2'}`}
                    />
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowVacationSignModal(false)
                    setSelectedVacationRequest(null)
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={() => {
                    if (vacationSignScrolled) {
                      setShowVacationSignConfirm(true)
                    } else {
                      toast.error('Role até o final do documento primeiro')
                    }
                  }}
                  disabled={!vacationSignScrolled}
                  className={`${!vacationSignScrolled ? 'opacity-50 cursor-not-allowed' : ''} bg-blue-600 hover:bg-blue-700`}
                >
                  <FileSignature className="h-4 w-4 mr-2" />
                  Assinar Digitalmente
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de assinatura de férias */}
      {showVacationSignConfirm && selectedVacationRequest && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-md">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-blue-600" />
                Confirmar Assinatura Digital
              </h2>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
                  ⚠️ Atenção: Assinatura com Validade Legal
                </p>
                <p className="text-sm text-muted-foreground">
                  Você está prestes a assinar digitalmente o aviso de férias do período de{' '}
                  <strong>{formatVacationDate(selectedVacationRequest.requestedStartDate)}</strong> a{' '}
                  <strong>
                    {(() => {
                      const start = new Date(selectedVacationRequest.requestedStartDate)
                      start.setDate(start.getDate() + selectedVacationRequest.requestedDays - 1)
                      return start.toLocaleDateString('pt-BR')
                    })()}
                  </strong>.
                </p>
              </div>
              
              <div className="text-sm space-y-2">
                <p className="font-medium">Ao confirmar, você declara que:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Leu e compreendeu todos os termos do aviso</li>
                  <li>Concorda com o período de férias aprovado</li>
                  <li>Está ciente dos valores a receber</li>
                  <li>Autoriza o registro desta assinatura digital</li>
                </ul>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                <p>
                  Esta assinatura terá validade legal conforme MP 2.200-2/2001 e Lei 14.063/2020.
                  Serão registrados: data/hora ({new Date().toLocaleString('pt-BR')}), endereço IP e identificação do dispositivo.
                </p>
              </div>
            </div>
            
            <div className="p-4 border-t border-border flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowVacationSignConfirm(false)}
              >
                Voltar
              </Button>
              <Button 
                onClick={handleEmployeeSignVacation}
                disabled={signingVacation}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {signingVacation ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileSignature className="h-4 w-4 mr-2" />
                )}
                Confirmar Assinatura
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de solicitação de vale */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-md">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Solicitar Vale</h2>
            </div>
            
            <div className="p-4 space-y-4">
              {advanceSummary && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
                  <p className="text-blue-800 dark:text-blue-200">
                    Disponível: <strong>{formatCurrency(advanceSummary.available || 0)}</strong>
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-1">Valor (R$)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={newAdvanceAmount}
                  onChange={(e) => setNewAdvanceAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  placeholder="0,00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Motivo (opcional)</label>
                <input
                  type="text"
                  value={newAdvanceReason}
                  onChange={(e) => setNewAdvanceReason(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  placeholder="Ex: Emergência médica"
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-border flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowRequestModal(false)
                setNewAdvanceAmount(0)
                setNewAdvanceReason('')
              }}>
                Cancelar
              </Button>
              <Button onClick={handleRequestAdvance} disabled={isRequesting}>
                {isRequesting ? 'Enviando...' : 'Solicitar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Solicitação de Férias */}
      {showVacationRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Palmtree className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold">Solicitar Férias</h2>
              </div>
              <button
                onClick={() => setShowVacationRequestModal(false)}
                className="p-2 hover:bg-muted rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Período disponível */}
              {canRequestVacation?.availablePeriods?.length > 0 && (
                <div className="bg-muted/30 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Período selecionado:</p>
                  <p className="text-sm font-medium">
                    {canRequestVacation.availablePeriods[0].remainingDays} dias disponíveis
                  </p>
                </div>
              )}
              
              {/* Data de início */}
              <div>
                <label className="block text-sm font-medium mb-1">Data de início *</label>
                <input
                  type="date"
                  value={vacationRequestStartDate}
                  onChange={(e) => setVacationRequestStartDate(e.target.value)}
                  min={(() => {
                    // Data mínima: 5 dias a partir de hoje
                    const minDate = new Date()
                    minDate.setDate(minDate.getDate() + 5)
                    return minDate.toISOString().split('T')[0]
                  })()}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Mínimo 5 dias de antecedência
                </p>
              </div>
              
              {/* Dias de gozo */}
              <div>
                <label className="block text-sm font-medium mb-1">Dias de gozo</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVacationRequestDays(Math.max(14, vacationRequestDays - 1))}
                    disabled={vacationRequestDays <= 14}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-16 text-center font-medium">{vacationRequestDays - vacationSellDays} dias</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVacationRequestDays(Math.min(30, vacationRequestDays + 1))}
                    disabled={vacationRequestDays >= 30}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Vender dias (abono pecuniário) */}
              <div>
                <label className="block text-sm font-medium mb-1">Vender dias (abono pecuniário)</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVacationSellDays(Math.max(0, vacationSellDays - 1))}
                    disabled={vacationSellDays <= 0}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-16 text-center font-medium">{vacationSellDays} dias</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVacationSellDays(Math.min(10, vacationSellDays + 1))}
                    disabled={vacationSellDays >= 10}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Máximo 10 dias (1/3 das férias)</p>
              </div>
              
              {/* Observações */}
              <div>
                <label className="block text-sm font-medium mb-1">Observações (opcional)</label>
                <textarea
                  value={vacationNotes}
                  onChange={(e) => setVacationNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background resize-none"
                  rows={2}
                  placeholder="Ex: Viagem em família"
                />
              </div>
              
              {/* Lista de solicitações rejeitadas anteriormente */}
              {(() => {
                const rejectedRequests = vacationRequests.filter((req: any) => req.status === 'REJECTED')
                if (rejectedRequests.length > 0) {
                  return (
                    <div className="mt-2 pt-3 border-t border-border">
                      <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-2">
                        ❌ Solicitações rejeitadas anteriormente:
                      </p>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {rejectedRequests.map((req: any) => (
                          <div key={req.id} className="bg-red-50 dark:bg-red-950/30 p-2 rounded text-xs">
                            <p className="text-muted-foreground">
                              {formatVacationDate(req.requestedStartDate)} - {req.requestedDays} dias
                            </p>
                            {req.rejectionReason && (
                              <p className="text-red-600 dark:text-red-400 mt-1">
                                <strong>Motivo:</strong> {req.rejectionReason}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }
                return null
              })()}
            </div>
            
            <div className="p-4 border-t border-border flex justify-end gap-2 flex-shrink-0">
              <Button variant="outline" onClick={() => {
                setShowVacationRequestModal(false)
                setVacationRequestStartDate('')
                setVacationRequestDays(30)
                setVacationSellDays(0)
                setVacationNotes('')
                setSelectedPeriodAcquisitionStart(null)
              }}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmitVacationRequest} 
                disabled={submittingVacationRequest || !vacationRequestStartDate}
                className="bg-green-600 hover:bg-green-700"
              >
                {submittingVacationRequest ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Solicitar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal da câmera facial */}
      {showFacialCamera && (
        <FacialRecognitionFlow
          mode={facialCameraMode}
          authMode="employee"
          userId={(user as any)?.employee?.id || (user as any)?.funcionario?.id || ''}
          userEmail={(user as any)?.email || ''}
          onRecognitionSuccess={handleFacialSuccess}
          onRecognitionError={handleFacialError}
          onRegistrationSuccess={handleFacialSuccess}
          onRegistrationError={handleFacialError}
          autoOpenCamera={true}
          showButton={false}
        />
      )}
    </main>
  )
}
