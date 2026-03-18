'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Calendar, 
  Clock, 
  User, 
  Building2, 
  FileText, 
  Download,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Printer,
  ChevronDown,
  FileSpreadsheet
} from 'lucide-react'
import { toast } from 'sonner'

import dynamic from 'next/dynamic'
import { pdf } from '@react-pdf/renderer'
import { exportarEspelhoExcel } from '@/lib/excel-export'
import PageHeader from '@/components/admin/PageHeader'
import PageContainer from '@/components/admin/PageContainer'
import { EspelhoPontoPDF } from '@/components/admin/EspelhoPontoPDF'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// Converter URL de imagem para base64 (necessário para @react-pdf/renderer)
async function imageUrlToBase64(url: string): Promise<string> {
  const response = await fetch(url)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

interface EspelhoPonto {
  funcionario: {
    id: string
    nome: string
    cpf: string
    matricula: string
    cargo: string
    departamento: string
    dataAdmissao: string
    jornadaDiaria: string
    fotoUrl?: string | null
  }
  empresa: {
    nomeFantasia: string
    razaoSocial: string
    cnpj: string
    logoUrl?: string | null
  }
  periodo: {
    mes: number
    ano: number
    mesNome: string
    mesAno: string
    dataInicio: string
    dataFim: string
  }
  resumo: {
    diasUteis: number
    diasTrabalhados: number
    faltas: number
    atrasos: number
    totalMinutosTrabalhados: number
    totalHorasTrabalhadas: string
    jornadaEsperadaMinutos: number
    jornadaEsperada: string
    saldoMinutos: number
    saldo: string
    saldoPositivo: boolean
    totalMinutosExtras: number
    totalHorasExtras: string
    totalMinutosNoturnos: number
    totalHorasNoturnas: string
  }
  dias: Array<{
    data: string
    diaSemana: string
    fimDeSemana: boolean
    entrada: string | null
    inicioIntervalo: string | null
    fimIntervalo: string | null
    saida: string | null
    minutosTrabalhados: number
    horasTrabalhadas: string
    minutosExtras: number
    horasExtras: string
    minutosNoturnos: number
    horasNoturnas: string
    registros: Array<{
      tipo: string
      horario: string
      metodo: string
      status: string
    }>
  }>
  geradoEm: string
  versao: string
}

interface Employee {
  id: string
  user?: {
    name: string
  }
  registrationId: string
}

export default function EspelhoPontoPage() {
  const params = useParams()
  const company = params.company as string

  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [espelho, setEspelho] = useState<EspelhoPonto | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)

  // Carregar lista de funcionários
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`${API_URL}/api/employees`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        if (res.ok) {
          const data = await res.json()
          setEmployees(data)
        }
      } catch (error) {
        console.error('Erro ao carregar funcionários:', error)
      } finally {
        setLoadingEmployees(false)
      }
    }
    fetchEmployees()
  }, [])

  // Carregar espelho de ponto
  const carregarEspelho = async () => {
    if (!selectedEmployee) {
      toast.error('Selecione um funcionário')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(
        `${API_URL}/api/time-entries/espelho/${selectedEmployee}?mes=${mes}&ano=${ano}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Erro ao carregar espelho')
      }

      const data = await res.json()
      
      // Converter imagens para base64 (necessário para @react-pdf/renderer)
      if (data.funcionario?.fotoUrl) {
        try {
          // Construir URL completa se for caminho relativo
          const fotoFullUrl = data.funcionario.fotoUrl.startsWith('http') 
            ? data.funcionario.fotoUrl 
            : `${API_URL}${data.funcionario.fotoUrl}`
          const fotoBase64 = await imageUrlToBase64(fotoFullUrl)
          data.funcionario.fotoUrl = fotoBase64
        } catch (e) {
          console.warn('Erro ao converter foto do funcionário:', e)
          data.funcionario.fotoUrl = null
        }
      }
      
      if (data.empresa?.logoUrl) {
        try {
          // Construir URL completa se for caminho relativo
          const logoFullUrl = data.empresa.logoUrl.startsWith('http') 
            ? data.empresa.logoUrl 
            : `${API_URL}${data.empresa.logoUrl}`
          const logoBase64 = await imageUrlToBase64(logoFullUrl)
          data.empresa.logoUrl = logoBase64
        } catch (e) {
          console.warn('Erro ao converter logo da empresa:', e)
          data.empresa.logoUrl = null
        }
      }
      
      setEspelho(data)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar espelho de ponto')
      setEspelho(null)
    } finally {
      setLoading(false)
    }
  }

  // Navegar entre meses
  const mesAnterior = () => {
    if (mes === 1) {
      setMes(12)
      setAno(ano - 1)
    } else {
      setMes(mes - 1)
    }
  }

  const mesProximo = () => {
    if (mes === 12) {
      setMes(1)
      setAno(ano + 1)
    } else {
      setMes(mes + 1)
    }
  }

  // Imprimir espelho
  const imprimirEspelho = () => {
    window.print()
  }

  // Exportar PDF
  const exportarPDF = async () => {
    if (!espelho) return
    
    try {
      const blob = await pdf(<EspelhoPontoPDF data={espelho} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `espelho-ponto-${espelho.funcionario.matricula}-${espelho.periodo.mesAno.replace('/', '-')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('PDF exportado com sucesso!')
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      toast.error('Erro ao gerar PDF')
    }
  }

  // Exportar Excel (processamento no navegador)
  const exportarExcel = async () => {
    if (!espelho) return

    try {
      await exportarEspelhoExcel(espelho)
      toast.success('Excel exportado com sucesso!')
    } catch (error) {
      console.error('Erro ao gerar Excel:', error)
      toast.error('Erro ao gerar Excel')
    }
  }

  // Formatar tipo de registro
  const formatarTipo = (tipo: string) => {
    const tipos: Record<string, string> = {
      'CLOCK_IN': 'Entrada',
      'CLOCK_OUT': 'Saída',
      'BREAK_START': 'Início Intervalo',
      'BREAK_END': 'Fim Intervalo',
    }
    return tipos[tipo] || tipo
  }

  const meses = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ]

  const anos = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i)

  return (
    <PageContainer>
        <PageHeader
          title="Espelho de Ponto"
          description="Relatório mensal de registros de ponto (Portaria 671)"
          icon={<FileText className="h-6 w-6" />}
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${company}` },
            { label: 'Análises' },
            { label: 'Espelho de Ponto' },
          ]}
        />

        {/* Filtros */}
        <Card className="mb-6 print:hidden">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Seletor de Funcionário */}
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Funcionário</label>
                {loadingEmployees ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um funcionário" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.user?.name || emp.registrationId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Seletor de Mês */}
              <div className="w-[150px]">
                <label className="text-sm font-medium mb-2 block">Mês</label>
                <Select value={mes.toString()} onValueChange={(v) => setMes(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {meses.map((m) => (
                      <SelectItem key={m.value} value={m.value.toString()}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Seletor de Ano */}
              <div className="w-[120px]">
                <label className="text-sm font-medium mb-2 block">Ano</label>
                <Select value={ano.toString()} onValueChange={(v) => setAno(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {anos.map((a) => (
                      <SelectItem key={a} value={a.toString()}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Botão Gerar */}
              <Button onClick={carregarEspelho} disabled={loading || !selectedEmployee}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Gerar Espelho
                  </>
                )}
              </Button>

              {/* Dropdown de Ações */}
              {espelho && (
                <div className="relative">
                  <Button 
                    variant="outline" 
                    onClick={() => setExportMenuOpen(!exportMenuOpen)}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Exportar
                    <ChevronDown className={cn("h-4 w-4 transition-transform", exportMenuOpen && "rotate-180")} />
                  </Button>
                  
                  {exportMenuOpen && (
                    <>
                      {/* Overlay para fechar ao clicar fora */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setExportMenuOpen(false)} 
                      />
                      
                      {/* Menu dropdown */}
                      <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-card border border-border rounded-lg shadow-lg py-1">
                        <button
                          onClick={() => {
                            imprimirEspelho()
                            setExportMenuOpen(false)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                        >
                          <Printer className="h-4 w-4" />
                          Imprimir
                        </button>
                        <button
                          onClick={() => {
                            exportarPDF()
                            setExportMenuOpen(false)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-red-600"
                        >
                          <FileText className="h-4 w-4" />
                          Exportar PDF
                        </button>
                        <button
                          onClick={() => {
                            exportarExcel()
                            setExportMenuOpen(false)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-green-600"
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                          Exportar Excel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Espelho de Ponto */}
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : espelho ? (
          <div className="space-y-6 print:space-y-4" id="espelho-ponto">
            {/* Cabeçalho do Relatório */}
            <Card className="print:shadow-none print:border-2">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">ESPELHO DE PONTO MENSAL</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Período: {espelho.periodo.dataInicio} a {espelho.periodo.dataFim}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-lg px-4 py-1">
                    {espelho.periodo.mesAno.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Dados do Funcionário */}
                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Dados do Funcionário
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Nome:</span>
                        <p className="font-medium">{espelho.funcionario.nome}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">CPF:</span>
                        <p className="font-medium">{espelho.funcionario.cpf}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Matrícula:</span>
                        <p className="font-medium">{espelho.funcionario.matricula}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cargo:</span>
                        <p className="font-medium">{espelho.funcionario.cargo}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Departamento:</span>
                        <p className="font-medium">{espelho.funcionario.departamento}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Jornada:</span>
                        <p className="font-medium">{espelho.funcionario.jornadaDiaria}</p>
                      </div>
                    </div>
                  </div>

                  {/* Dados da Empresa */}
                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Dados da Empresa
                    </h3>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Razão Social:</span>
                        <p className="font-medium">{espelho.empresa.razaoSocial}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Nome Fantasia:</span>
                        <p className="font-medium">{espelho.empresa.nomeFantasia}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">CNPJ:</span>
                        <p className="font-medium">{espelho.empresa.cnpj}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resumo */}
            <Card className="print:shadow-none print:border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Resumo do Período
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{espelho.resumo.diasUteis}</p>
                    <p className="text-xs text-muted-foreground">Dias Úteis</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{espelho.resumo.diasTrabalhados}</p>
                    <p className="text-xs text-muted-foreground">Dias Trabalhados</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{espelho.resumo.faltas}</p>
                    <p className="text-xs text-muted-foreground">Faltas</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{espelho.resumo.atrasos}</p>
                    <p className="text-xs text-muted-foreground">Atrasos</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{espelho.resumo.totalHorasTrabalhadas}</p>
                    <p className="text-xs text-muted-foreground">Horas Trabalhadas</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className={cn(
                      "text-2xl font-bold",
                      espelho.resumo.saldoPositivo ? "text-green-600" : "text-red-600"
                    )}>
                      {espelho.resumo.saldoPositivo ? '+' : '-'}{espelho.resumo.saldo}
                    </p>
                    <p className="text-xs text-muted-foreground">Saldo</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="text-center p-3 border rounded-lg">
                    <p className="text-lg font-semibold">{espelho.resumo.jornadaEsperada}</p>
                    <p className="text-xs text-muted-foreground">Jornada Esperada</p>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <p className="text-lg font-semibold text-blue-600">{espelho.resumo.totalHorasExtras}</p>
                    <p className="text-xs text-muted-foreground">Horas Extras</p>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <p className="text-lg font-semibold text-purple-600">{espelho.resumo.totalHorasNoturnas}</p>
                    <p className="text-xs text-muted-foreground">Horas Noturnas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabela de Registros */}
            <Card className="print:shadow-none print:border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Detalhamento Diário
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Data</th>
                        <th className="text-left p-3 font-medium">Dia</th>
                        <th className="text-center p-3 font-medium">Entrada</th>
                        <th className="text-center p-3 font-medium">Início Int.</th>
                        <th className="text-center p-3 font-medium">Fim Int.</th>
                        <th className="text-center p-3 font-medium">Saída</th>
                        <th className="text-center p-3 font-medium">Trabalhado</th>
                        <th className="text-center p-3 font-medium">Extras</th>
                      </tr>
                    </thead>
                    <tbody>
                      {espelho.dias.map((dia) => (
                        <tr 
                          key={dia.data} 
                          className={cn(
                            "border-b hover:bg-muted/30",
                            dia.fimDeSemana && "bg-muted/20"
                          )}
                        >
                          <td className="p-3 font-medium">
                            {format(new Date(dia.data + 'T12:00:00'), 'dd/MM')}
                          </td>
                          <td className="p-3 capitalize">
                            {dia.diaSemana.substring(0, 3)}
                          </td>
                          <td className="p-3 text-center">
                            {dia.entrada || (dia.fimDeSemana ? '-' : <span className="text-red-500">--:--</span>)}
                          </td>
                          <td className="p-3 text-center">
                            {dia.inicioIntervalo || '-'}
                          </td>
                          <td className="p-3 text-center">
                            {dia.fimIntervalo || '-'}
                          </td>
                          <td className="p-3 text-center">
                            {dia.saida || (dia.fimDeSemana ? '-' : <span className="text-red-500">--:--</span>)}
                          </td>
                          <td className="p-3 text-center font-medium">
                            {dia.horasTrabalhadas !== '00:00' ? dia.horasTrabalhadas : '-'}
                          </td>
                          <td className="p-3 text-center">
                            {dia.minutosExtras > 0 ? (
                              <span className="text-blue-600 font-medium">{dia.horasExtras}</span>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Rodapé */}
            <div className="text-center text-xs text-muted-foreground print:mt-8">
              <p>Documento gerado em {format(new Date(espelho.geradoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              <p className="mt-1">Espelho de Ponto conforme Portaria 671 do MTE</p>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum espelho gerado</h3>
              <p className="text-muted-foreground">
                Selecione um funcionário e o período desejado para gerar o espelho de ponto.
              </p>
            </CardContent>
          </Card>
        )}
      </PageContainer>
  )
}
