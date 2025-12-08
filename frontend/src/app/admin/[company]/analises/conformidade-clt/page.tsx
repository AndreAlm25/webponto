'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Scale, TrendingUp, Clock, AlertTriangle, DollarSign, Users, Download, FileText, Filter } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import PageHeader from '@/components/admin/PageHeader'
import { ProtectedPage } from '@/components/auth/ProtectedPage'
import { PERMISSIONS } from '@/hooks/usePermissions'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

interface DashboardData {
  period: {
    start: string
    end: string
  }
  summary: {
    totalEntries: number
    compliancePercentage: number
    violations: {
      total: number
      late: number
      restViolations: number
    }
    overtime: {
      totalMinutes: number
      totalHours: number
      totalValue: number
      averageRate: number
    }
    late: {
      entries: number
      totalMinutes: number
    }
  }
  charts: {
    daily: Array<{
      date: string
      overtime: number
      overtimeValue: number
      late: number
      restViolations: number
    }>
    byEmployee: Array<{
      employeeId: string
      employeeName?: string
      overtimeMinutes: number
      overtimeValue: number
      lateCount: number
      restViolations: number
    }>
  }
}

export default function DashboardConformidadePage() {
  const params = useParams()
  const company = params?.company as string
  const { user } = useAuth()

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Função para obter data local formatada
  const getLocalDateString = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  
  const [period, setPeriod] = useState({
    startDate: getLocalDateString(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    endDate: getLocalDateString(new Date()),
  })
  const [filters, setFilters] = useState({
    department: '',
    position: '',
    overtimeType: '',
  })
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (!user?.companyId) return
    fetchData()
  }, [user?.companyId, period])

  const fetchData = async () => {
    if (!user?.companyId) return
    
    console.log('📊 [Dashboard] Buscando dados:', {
      companyId: user.companyId,
      startDate: period.startDate,
      endDate: period.endDate,
    })
    
    try {
      setLoading(true)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/compliance/dashboard?companyId=${user.companyId}&startDate=${period.startDate}&endDate=${period.endDate}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      )
      
      if (!response.ok) {
        console.error('Erro na resposta:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('Detalhes do erro:', errorText)
        return
      }
      
      const result = await response.json()
      console.log('Dados recebidos:', result)
      setData(result)
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToPDF = () => {
    if (!data) return

    const doc = new jsPDF()
    
    // Título
    doc.setFontSize(20)
    doc.text('Dashboard de Conformidade CLT', 14, 22)
    
    // Período
    doc.setFontSize(10)
    doc.text(`Período: ${new Date(period.startDate).toLocaleDateString('pt-BR')} até ${new Date(period.endDate).toLocaleDateString('pt-BR')}`, 14, 30)
    
    // Resumo
    doc.setFontSize(14)
    doc.text('Resumo', 14, 40)
    
    const summaryData = [
      ['Conformidade', `${data.summary.compliancePercentage.toFixed(1)}%`],
      ['Total de Hora Extra', `R$ ${data.summary.overtime.totalValue.toFixed(2)}`],
      ['Horas Extras', `${data.summary.overtime.totalHours.toFixed(1)}h`],
      ['Violações', `${data.summary.violations.total}`],
      ['Atrasos', `${data.summary.violations.late}`],
      ['Violações de Descanso', `${data.summary.violations.restViolations}`],
    ]
    
    autoTable(doc, {
      startY: 45,
      head: [['Métrica', 'Valor']],
      body: summaryData,
    })
    
    // Top Funcionários
    if (data.charts.byEmployee.length > 0) {
      doc.addPage()
      doc.setFontSize(14)
      doc.text('Top 10 Funcionários - Hora Extra', 14, 22)
      
      const employeeData = data.charts.byEmployee.slice(0, 10).map((emp, index) => [
        `${index + 1}º`,
        emp.employeeName || `Func. ${emp.employeeId.slice(0, 8)}`,
        `${(emp.overtimeMinutes / 60).toFixed(1)}h`,
        `R$ ${emp.overtimeValue.toFixed(2)}`,
        `${emp.lateCount}`,
        `${emp.restViolations}`,
      ])
      
      autoTable(doc, {
        startY: 28,
        head: [['#', 'Funcionário', 'Horas', 'Valor', 'Atrasos', 'Violações']],
        body: employeeData,
      })
    }
    
    doc.save(`conformidade-${period.startDate}-${period.endDate}.pdf`)
  }

  const exportToExcel = () => {
    if (!data) return

    // Resumo
    const summarySheet = [
      ['Dashboard de Conformidade CLT'],
      [`Período: ${period.startDate} até ${period.endDate}`],
      [],
      ['Métrica', 'Valor'],
      ['Conformidade', `${data.summary.compliancePercentage.toFixed(1)}%`],
      ['Total de Hora Extra', `R$ ${data.summary.overtime.totalValue.toFixed(2)}`],
      ['Horas Extras', `${data.summary.overtime.totalHours.toFixed(1)}h`],
      ['Violações', data.summary.violations.total],
      ['Atrasos', data.summary.violations.late],
      ['Violações de Descanso', data.summary.violations.restViolations],
    ]

    // Dados diários
    const dailySheet = [
      ['Data', 'Minutos H.E.', 'Valor R$', 'Atrasos', 'Violações Descanso'],
      ...data.charts.daily.map(day => [
        day.date,
        day.overtime,
        day.overtimeValue.toFixed(2),
        day.late,
        day.restViolations,
      ]),
    ]

    // Funcionários
    const employeeSheet = [
      ['Funcionário', 'Minutos H.E.', 'Horas H.E.', 'Valor R$', 'Atrasos', 'Violações'],
      ...data.charts.byEmployee.map(emp => [
        emp.employeeName || emp.employeeId.slice(0, 8),
        emp.overtimeMinutes,
        (emp.overtimeMinutes / 60).toFixed(1),
        emp.overtimeValue.toFixed(2),
        emp.lateCount,
        emp.restViolations,
      ]),
    ]

    // Criar workbook
    const wb = XLSX.utils.book_new()
    const ws1 = XLSX.utils.aoa_to_sheet(summarySheet)
    const ws2 = XLSX.utils.aoa_to_sheet(dailySheet)
    const ws3 = XLSX.utils.aoa_to_sheet(employeeSheet)

    XLSX.utils.book_append_sheet(wb, ws1, 'Resumo')
    XLSX.utils.book_append_sheet(wb, ws2, 'Diário')
    XLSX.utils.book_append_sheet(wb, ws3, 'Funcionários')

    XLSX.writeFile(wb, `conformidade-${period.startDate}-${period.endDate}.xlsx`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Erro ao carregar dados</p>
      </div>
    )
  }

  const complianceColor = data.summary.compliancePercentage >= 90 
    ? 'text-green-600 dark:text-green-400'
    : data.summary.compliancePercentage >= 70
    ? 'text-yellow-600 dark:text-yellow-400'
    : 'text-red-600 dark:text-red-400'

  const base = `/admin/${company}`

  return (
    <ProtectedPage permission={PERMISSIONS.COMPLIANCE_VIEW}>
    <TooltipProvider>
      <div className="space-y-6">
        <PageHeader
          title="Conformidade CLT"
          description="Análise de conformidade e hora extra"
          icon={<Scale className="h-6 w-6" />}
          breadcrumbs={[
            { label: 'Admin', href: base },
            { label: 'Análises' },
            { label: 'Conformidade CLT' }
          ]}
        />

        {/* Header com botões - Layout melhorado */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Filtro de Período + Botão Filtros à esquerda */}
          <div className="flex gap-3 items-center flex-wrap">
            <UITooltip>
              <TooltipTrigger asChild>
                <input
                  type="date"
                  value={period.startDate}
                  onChange={(e) => setPeriod({ ...period, startDate: e.target.value })}
                  className="px-4 py-2.5 border border-border rounded-md bg-background text-foreground [color-scheme:light] dark:[color-scheme:dark] min-w-[150px]"
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>Data inicial do período de análise</p>
              </TooltipContent>
            </UITooltip>

            <span className="text-muted-foreground font-medium">até</span>

            <UITooltip>
              <TooltipTrigger asChild>
                <input
                  type="date"
                  value={period.endDate}
                  onChange={(e) => setPeriod({ ...period, endDate: e.target.value })}
                  className="px-4 py-2.5 border border-border rounded-md bg-background text-foreground [color-scheme:light] dark:[color-scheme:dark] min-w-[150px]"
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>Data final do período de análise</p>
              </TooltipContent>
            </UITooltip>

            {/* Botão de Filtros ao lado das datas */}
            <UITooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
                >
                  <Filter className="h-5 w-5" />
                  Filtros
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Clique para abrir filtros avançados (departamento, cargo, tipo)</p>
              </TooltipContent>
            </UITooltip>
          </div>

          {/* Botões de exportação à direita */}
          <div className="flex gap-3 items-center flex-wrap">

            {/* Botão Exportar PDF */}
            <UITooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={exportToPDF}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors font-medium"
                >
                  <FileText className="h-5 w-5" />
                  Exportar PDF
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Exportar relatório em PDF</p>
              </TooltipContent>
            </UITooltip>

            {/* Botão Exportar Excel */}
            <UITooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors font-medium"
                >
                  <Download className="h-5 w-5" />
                  Exportar Excel
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Exportar dados em Excel</p>
              </TooltipContent>
            </UITooltip>
          </div>
        </div>

      {/* Filtros Avançados */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filtros Avançados</CardTitle>
            <CardDescription>Refine sua busca por departamento, cargo ou tipo de hora extra</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Departamento</label>
                <select
                  value={filters.department}
                  onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                >
                  <option value="">Todos</option>
                  <option value="ti">TI</option>
                  <option value="rh">RH</option>
                  <option value="vendas">Vendas</option>
                  <option value="financeiro">Financeiro</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Cargo</label>
                <select
                  value={filters.position}
                  onChange={(e) => setFilters({ ...filters, position: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                >
                  <option value="">Todos</option>
                  <option value="desenvolvedor">Desenvolvedor</option>
                  <option value="gerente">Gerente</option>
                  <option value="analista">Analista</option>
                  <option value="assistente">Assistente</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Tipo de Hora Extra</label>
                <select
                  value={filters.overtimeType}
                  onChange={(e) => setFilters({ ...filters, overtimeType: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                >
                  <option value="">Todos</option>
                  <option value="before">Antes do Expediente</option>
                  <option value="after">Depois do Expediente</option>
                  <option value="weekend">Fim de Semana</option>
                  <option value="holiday">Feriado</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Conformidade */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conformidade</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${complianceColor}`}>
              {data.summary.compliancePercentage.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {data.summary.totalEntries} registros analisados
            </p>
          </CardContent>
        </Card>

        {/* Valor Total H.E. */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hora Extra</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              R$ {data.summary.overtime.totalValue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.summary.overtime.totalHours.toFixed(1)} horas extras
            </p>
          </CardContent>
        </Card>

        {/* Violações */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Violações</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {data.summary.violations.total}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.summary.violations.late} atrasos, {data.summary.violations.restViolations} descanso
            </p>
          </CardContent>
        </Card>

        {/* Taxa Média H.E. */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Média H.E.</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.overtime.averageRate.toFixed(2)}x
            </div>
            <p className="text-xs text-muted-foreground">
              Multiplicador médio aplicado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Hora Extra Diária - Linha */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução de Hora Extra</CardTitle>
          <CardDescription>Minutos e valor em R$ ao longo do período</CardDescription>
        </CardHeader>
        <CardContent>
          {data.charts?.daily && data.charts.daily.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.charts.daily.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { 
                    day: '2-digit', 
                    month: 'short' 
                  })}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <ChartTooltip 
                  labelFormatter={(date: string) => new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')}
                  formatter={(value: any, name: string) => {
                    if (name === 'overtimeValue') return [`R$ ${Number(value).toFixed(2)}`, 'Valor']
                    if (name === 'overtime') return [`${value} min`, 'Minutos']
                    return [value, name]
                  }}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="overtime" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="Minutos"
                  dot={{ fill: '#8b5cf6' }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="overtimeValue" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Valor (R$)"
                  dot={{ fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum dado disponível para o período selecionado
            </p>
          )}
        </CardContent>
      </Card>

      {/* Gráficos em Grid 2 Colunas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gráfico de Violações - Pizza */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Violações</CardTitle>
            <CardDescription>Tipos de não conformidade</CardDescription>
          </CardHeader>
          <CardContent>
            {data.summary.violations.total > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Atrasos', value: data.summary.violations.late, color: '#eab308' },
                      { name: 'Violações de Descanso', value: data.summary.violations.restViolations, color: '#ef4444' },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      { name: 'Atrasos', value: data.summary.violations.late, color: '#eab308' },
                      { name: 'Violações de Descanso', value: data.summary.violations.restViolations, color: '#ef4444' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip formatter={(value: any) => [`${value} ocorrências`, 'Total']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma violação no período
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Funcionários - Gráfico de Barras */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Funcionários - Hora Extra</CardTitle>
            <CardDescription>Ranking por valor total em R$</CardDescription>
          </CardHeader>
          <CardContent>
            {data.charts?.byEmployee && data.charts.byEmployee.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart 
                  data={data.charts.byEmployee.slice(0, 10)}
                  layout="vertical"
                  margin={{ left: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="employeeId" 
                    tickFormatter={(id) => `Func. ${id.slice(0, 6)}`}
                  />
                  <ChartTooltip 
                    formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Valor']}
                    labelFormatter={(id: string) => `Funcionário ${id.slice(0, 8)}`}
                  />
                  <Bar dataKey="overtimeValue" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum funcionário com hora extra no período
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumo de Violações */}
      {data.summary?.violations?.total > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              Atenção: Violações Detectadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.summary.violations.late > 0 && (
                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div>
                    <div className="font-medium">Atrasos</div>
                    <div className="text-sm text-muted-foreground">
                      {data.summary.late.totalMinutes} minutos totais
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {data.summary.violations.late}
                  </div>
                </div>
              )}
              {data.summary.violations.restViolations > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div>
                    <div className="font-medium">Violações de Descanso</div>
                    <div className="text-sm text-muted-foreground">
                      Menos de 11h entre jornadas
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {data.summary.violations.restViolations}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </TooltipProvider>
    </ProtectedPage>
  )
}
