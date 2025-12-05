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
  TrendingUp, DollarSign, CalendarDays, ClipboardCheck, Banknote, Timer, UserX, Clock3
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
  const { onTimeEntryCreated, onEmployeeUpdated, onFaceRegistered, onFaceDeleted, connected } = useWebSocket()
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
  const updateEmployeeDataSilently = React.useCallback(async () => {
    if (!user) return
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL
      const employeeId = (user as any)?.employee?.id || (user as any)?.funcionario?.id
      const companyId = (user as any)?.company?.id || (user as any)?.empresa?.id
      if (!employeeId || !backendUrl) return

      const token = localStorage.getItem('token')
      const resEmployees = await fetch(`${backendUrl}/api/employees?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (resEmployees.ok) {
        const employees = await resEmployees.json()
        const empData = employees.find((emp: any) => emp.id === employeeId)
        if (empData) {
          setEmployeeData(empData)
        }
      }
    } catch (e) {
      console.error('Erro ao atualizar dados do funcionário:', e)
    }
  }, [user])

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
      const companyId = userData?.company?.id || userData?.empresa?.id
      
      if (!employeeId || !backendUrl) {
        if (isInitialLoad) {
          setLoadingData(false)
        }
        return
      }

      // Buscar dados do funcionário da lista
      const resEmployees = await fetch(`${backendUrl}/api/employees?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (resEmployees.ok) {
        const employees = await resEmployees.json()
        const empData = employees.find((emp: any) => emp.id === employeeId)
        if (empData) {
          setEmployeeData(empData)
        }
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
        setPayslips(data.payslips || [])
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
      
      const [entriesRes, payslipsRes, advancesRes] = await Promise.all([
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
      const lastPaidPayslip = slips.find((p: any) => p.signedAt) || slips[0]
      const currentMonthPayslip = slips.find((p: any) => 
        p.referenceMonth === month && p.referenceYear === year
      )
      
      // Pegar salário base do funcionário (do employeeData ou do último holerite)
      const employeeSalary = (user as any)?.employee?.salary || 
                            (user as any)?.funcionario?.salary ||
                            lastPaidPayslip?.baseSalary || 0
      
      // Calcular previsão do mês atual
      const baseSalary = Number(employeeSalary) || 0
      const currentDeductions = currentMonthAdvances // Por enquanto só adiantamentos
      const estimatedNet = baseSalary - currentDeductions
      
      setDashboardData({
        // Mês atual
        workedDays,
        totalHours: Math.round(totalHours * 10) / 10,
        currentMonth: MONTHS[month - 1],
        currentYear: year,
        
        // Faltas e atrasos do mês atual
        absences,
        lateMinutes,
        
        // Previsão do mês atual (calculada ou do holerite se existir)
        salaryForecast: {
          baseSalary: currentMonthPayslip?.baseSalary || baseSalary,
          currentDeductions: currentMonthPayslip?.totalDeductions || currentDeductions,
          estimatedNet: currentMonthPayslip?.netSalary || estimatedNet,
          advancesThisMonth: currentMonthAdvances,
          hasPayslip: !!currentMonthPayslip,
        },
        paymentDay: 5, // Valor padrão, será atualizado quando abrir o painel
        
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
          
          // Encontrar o último holerite pago/assinado (mês anterior)
          const lastPaidPayslip = slips.find((p: any) => p.signedAt) || slips[0]
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
          
          // Calcular previsão do mês atual
          const baseSalary = currentMonthPayslip?.baseSalary || Number(employeeSalary) || 0
          const currentDeductions = currentMonthPayslip?.totalDeductions || currentMonthAdvances
          const estimatedNet = currentMonthPayslip?.netSalary || (baseSalary - currentMonthAdvances)
          
          // Montar dados do dashboard
          setDashboardData({
            // Mês atual
            workedDays,
            totalHours: Math.round(totalHours * 10) / 10,
            currentMonth: MONTHS[month - 1],
            currentYear: year,
            
            // Faltas e atrasos do mês atual
            absences,
            lateMinutes,
            
            // Previsão do mês atual
            salaryForecast: {
              baseSalary,
              currentDeductions,
              estimatedNet,
              advancesThisMonth: currentMonthAdvances,
              hasPayslip: !!currentMonthPayslip,
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
    if (!connected) return

    const employeeId = (user as any)?.employee?.id || (user as any)?.funcionario?.id
    if (!employeeId) return

    const unsubscribe = onEmployeeUpdated(async (employee) => {
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
                                  <div className="flex items-center gap-2 mb-3">
                                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                      Previsão {dashboardData.salaryForecast.hasPayslip ? '(Holerite Gerado)' : 'Estimada'}
                                    </span>
                                  </div>
                                  
                                  {/* Salário Base */}
                                  <div className="flex justify-between items-center py-1.5 border-b border-border/30">
                                    <span className="text-sm text-muted-foreground">Salário Base</span>
                                    <span className="text-sm font-medium">{formatCurrency(dashboardData.salaryForecast.baseSalary)}</span>
                                  </div>
                                  
                                  {/* Descontos (se houver) */}
                                  {dashboardData.salaryForecast.currentDeductions > 0 && (
                                    <div className="flex justify-between items-center py-1.5 border-b border-border/30">
                                      <span className="text-sm text-muted-foreground">
                                        Descontos
                                        {dashboardData.salaryForecast.advancesThisMonth > 0 && (
                                          <span className="text-xs ml-1">(vales: {formatCurrency(dashboardData.salaryForecast.advancesThisMonth)})</span>
                                        )}
                                      </span>
                                      <span className="text-sm font-medium text-red-500">-{formatCurrency(dashboardData.salaryForecast.currentDeductions)}</span>
                                    </div>
                                  )}
                                  
                                  {/* Líquido Previsto */}
                                  <div className="flex justify-between items-center pt-2 mt-1">
                                    <span className="text-sm font-semibold">Líquido Previsto</span>
                                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                      {formatCurrency(dashboardData.salaryForecast.estimatedNet)}
                                    </span>
                                  </div>
                                  
                                  {/* Data de pagamento */}
                                  <p className="text-xs text-muted-foreground mt-2 text-center">
                                    Pagamento previsto: dia {dashboardData.paymentDay || 5} do próximo mês
                                  </p>
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
                                
                                {/* Faltas */}
                                <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 rounded-xl p-4 border border-red-500/20">
                                  <div className="flex items-center gap-2 mb-2">
                                    <UserX className="w-4 h-4 text-red-500" />
                                    <span className="text-xs text-muted-foreground">Faltas</span>
                                  </div>
                                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{dashboardData?.absences || 0}</p>
                                  <p className="text-xs text-muted-foreground mt-1">dia(s)</p>
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
                              {(payrollConfig?.enableExtraAdvance || payrollConfig?.enableSalaryAdvance) && dashboardData?.availableAdvance > 0 && (
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
                              <div className="space-y-3 pt-3 border-t border-border/50">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-muted-foreground" />
                                  <h4 className="text-sm font-semibold text-muted-foreground">
                                    {dashboardData.lastPayslip.monthName} {dashboardData.lastPayslip.year}
                                  </h4>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                  {/* Último Salário */}
                                  <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-xl p-4 border border-emerald-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                      <DollarSign className="w-4 h-4 text-emerald-500" />
                                      <span className="text-xs text-muted-foreground">Salário Recebido</span>
                                    </div>
                                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(dashboardData.lastPayslip.netSalary)}</p>
                                    <p className="text-xs text-muted-foreground mt-1">líquido</p>
                                  </div>
                                  
                                  {/* Faltas - só mostra se tiver faltas */}
                                  {dashboardData.lastPayslip.absenceDays > 0 && (
                                    <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 rounded-xl p-4 border border-red-500/20">
                                      <div className="flex items-center gap-2 mb-2">
                                        <UserX className="w-4 h-4 text-red-500" />
                                        <span className="text-xs text-muted-foreground">Faltas</span>
                                      </div>
                                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">{dashboardData.lastPayslip.absenceDays}</p>
                                      <p className="text-xs text-muted-foreground mt-1">dia(s)</p>
                                    </div>
                                  )}
                                  
                                  {/* Hora Extra - só mostra se tiver horas extras */}
                                  {dashboardData.lastPayslip.overtimeHours > 0 && (
                                    <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 rounded-xl p-4 border border-orange-500/20">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Clock3 className="w-4 h-4 text-orange-500" />
                                        <span className="text-xs text-muted-foreground">Hora Extra</span>
                                      </div>
                                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{dashboardData.lastPayslip.overtimeHours}h</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {dashboardData.lastPayslip.overtimeValue > 0 ? `+${formatCurrency(dashboardData.lastPayslip.overtimeValue)}` : ''}
                                      </p>
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
                                      // Abrir o primeiro holerite pendente
                                      const firstPending = dashboardData.pendingPayslipsList?.[0]
                                      if (firstPending) {
                                        setSelectedPayslip(firstPending)
                                        setShowPayslipView(true)
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
                  ...((payrollConfig?.enableExtraAdvance || payrollConfig?.enableSalaryAdvance) ? [{
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
                          
                          // Se não tem filtro, mostrar apenas o mês anterior (último fechamento)
                          if (!payslipFilterYear && !payslipFilterMonth && filteredPayslips.length > 0) {
                            // Ordenar por data (mais recente primeiro)
                            const sorted = [...filteredPayslips].sort((a, b) => {
                              if (a.referenceYear !== b.referenceYear) return b.referenceYear - a.referenceYear
                              return b.referenceMonth - a.referenceMonth
                            })
                            // Pegar apenas o mais recente
                            filteredPayslips = [sorted[0]]
                          }
                          
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
                                      payslip.signedAt 
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    }`}>
                                      {payslip.signedAt ? 'Assinado' : 'Pendente'}
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
                                      {/* Botão Download - só se assinado */}
                                      {payslip.signedAt && (
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          title="Baixar PDF"
                                          onClick={() => handleDownloadPdf(payslip.id, payslip.referenceMonth, payslip.referenceYear)}
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                      )}
                                      {/* Botão Assinar - só se não assinado */}
                                      {!payslip.signedAt && (
                                        <Button
                                          size="sm"
                                          onClick={() => handleOpenPayslipView(payslip)}
                                        >
                                          <Fingerprint className="h-4 w-4 mr-1" />
                                          Assinar
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
                  {/* Faltas - usando absenceValue do backend */}
                  {Number(selectedPayslip.absenceValue || selectedPayslip.absenceDeduction || 0) > 0 && (
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span>Faltas ({selectedPayslip.absenceDays || 0} dia(s))</span>
                      <span className="font-medium text-red-600">-{formatCurrency(selectedPayslip.absenceValue || selectedPayslip.absenceDeduction)}</span>
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
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setShowPayslipView(false)
                  setSelectedPayslip(null)
                  setHasScrolledToEnd(false)
                }}>
                  Fechar
                </Button>
                {!selectedPayslip.signedAt && (
                  <Button 
                    onClick={() => {
                      if (hasScrolledToEnd) {
                        setShowSignModal(true)
                      } else {
                        toast.error('Role até o final do documento para poder assinar')
                      }
                    }}
                    disabled={!hasScrolledToEnd}
                    className={!hasScrolledToEnd ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    <Fingerprint className="h-4 w-4 mr-2" />
                    {hasScrolledToEnd ? 'Assinar Holerite' : 'Role para assinar'}
                  </Button>
                )}
                {selectedPayslip.signedAt && (
                  <Button 
                    variant="outline"
                    onClick={() => handleDownloadPdf(selectedPayslip.id, selectedPayslip.referenceMonth, selectedPayslip.referenceYear)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar PDF
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de assinatura */}
      {showSignModal && selectedPayslip && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-md">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Confirmar Assinatura</h2>
            </div>
            
            <div className="p-4 space-y-4">
              <p className="text-sm">
                Você está prestes a assinar digitalmente o holerite de{' '}
                <strong>{MONTHS[selectedPayslip.referenceMonth - 1]}/{selectedPayslip.referenceYear}</strong>.
              </p>
              
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Você leu todo o documento
                </p>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Ao clicar em "Confirmar Assinatura", você concorda com todos os valores apresentados.
                Esta ação não pode ser desfeita.
              </p>
            </div>
            
            <div className="p-4 border-t border-border flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSignModal(false)}>
                Voltar
              </Button>
              <Button onClick={handleSignPayslip} disabled={isSigning}>
                {isSigning ? 'Assinando...' : 'Confirmar Assinatura'}
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
