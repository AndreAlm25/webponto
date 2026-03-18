'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Calendar,
  Plus,
  Pencil,
  Trash2,
  Download,
  Loader2,
  CalendarDays,
  Building2,
  MapPin,
  Flag,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'

import PageHeader from '@/components/admin/PageHeader'
import PageContainer from '@/components/admin/PageContainer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { parseISO, isValid } from 'date-fns'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// Função segura para parsear data
const parseDate = (dateStr: string): Date => {
  // Se já é uma data ISO completa, usar parseISO
  if (dateStr.includes('T')) {
    const parsed = parseISO(dateStr)
    if (isValid(parsed)) return parsed
  }
  // Se é só YYYY-MM-DD, adicionar horário
  const withTime = new Date(dateStr + 'T12:00:00')
  if (isValid(withTime)) return withTime
  // Fallback
  return new Date()
}

interface Holiday {
  id: string
  name: string
  date: string
  type: 'NATIONAL' | 'STATE' | 'MUNICIPAL' | 'COMPANY' | 'OPTIONAL'
  recurring: boolean
  halfDay: boolean
  active: boolean
  notes?: string
}

const holidayTypeLabels: Record<string, string> = {
  NATIONAL: 'Nacional',
  STATE: 'Estadual',
  MUNICIPAL: 'Municipal',
  COMPANY: 'Empresa',
  OPTIONAL: 'Facultativo',
}

const holidayTypeColors: Record<string, string> = {
  NATIONAL: 'bg-red-100 text-red-800 border-red-200',
  STATE: 'bg-blue-100 text-blue-800 border-blue-200',
  MUNICIPAL: 'bg-green-100 text-green-800 border-green-200',
  COMPANY: 'bg-purple-100 text-purple-800 border-purple-200',
  OPTIONAL: 'bg-yellow-100 text-yellow-800 border-yellow-200',
}

const holidayTypeIcons: Record<string, React.ReactNode> = {
  NATIONAL: <Flag className="h-3 w-3" />,
  STATE: <MapPin className="h-3 w-3" />,
  MUNICIPAL: <Building2 className="h-3 w-3" />,
  COMPANY: <Building2 className="h-3 w-3" />,
  OPTIONAL: <Clock className="h-3 w-3" />,
}

export default function FeriadosPage() {
  const params = useParams()
  const company = params.company as string

  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [modalOpen, setModalOpen] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null)
  const [importing, setImporting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    type: 'NATIONAL' as Holiday['type'],
    recurring: true,
    halfDay: false,
    notes: '',
  })

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + 5 - i)

  // Carregar feriados
  const fetchHolidays = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/api/holidays?year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setHolidays(data)
      }
    } catch (error) {
      console.error('Erro ao carregar feriados:', error)
      toast.error('Erro ao carregar feriados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHolidays()
  }, [year])

  // Abrir modal para criar
  const openCreateModal = () => {
    setEditingHoliday(null)
    setFormData({
      name: '',
      date: '',
      type: 'NATIONAL',
      recurring: true,
      halfDay: false,
      notes: '',
    })
    setModalOpen(true)
  }

  // Abrir modal para editar
  const openEditModal = (holiday: Holiday) => {
    setEditingHoliday(holiday)
    setFormData({
      name: holiday.name,
      date: holiday.date.split('T')[0],
      type: holiday.type,
      recurring: holiday.recurring,
      halfDay: holiday.halfDay,
      notes: holiday.notes || '',
    })
    setModalOpen(true)
  }

  // Salvar feriado
  const saveHoliday = async () => {
    if (!formData.name || !formData.date) {
      toast.error('Preencha nome e data')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const url = editingHoliday
        ? `${API_URL}/api/holidays/${editingHoliday.id}`
        : `${API_URL}/api/holidays`
      const method = editingHoliday ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        toast.success(editingHoliday ? 'Feriado atualizado!' : 'Feriado criado!')
        setModalOpen(false)
        fetchHolidays()
      } else {
        const error = await res.json()
        toast.error(error.message || 'Erro ao salvar feriado')
      }
    } catch (error) {
      toast.error('Erro ao salvar feriado')
    }
  }

  // Deletar feriado
  const deleteHoliday = async (id: string) => {
    if (!confirm('Deseja realmente excluir este feriado?')) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/api/holidays/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        toast.success('Feriado excluído!')
        fetchHolidays()
      } else {
        toast.error('Erro ao excluir feriado')
      }
    } catch (error) {
      toast.error('Erro ao excluir feriado')
    }
  }

  // Importar feriados nacionais
  const importNationalHolidays = async () => {
    setImporting(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/api/holidays/import-national`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ year }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`${data.created} feriados importados!`)
        fetchHolidays()
      } else {
        toast.error('Erro ao importar feriados')
      }
    } catch (error) {
      toast.error('Erro ao importar feriados')
    } finally {
      setImporting(false)
    }
  }

  // Agrupar feriados por mês
  const holidaysByMonth = holidays.reduce((acc, holiday) => {
    const month = parseDate(holiday.date).getMonth()
    if (!acc[month]) acc[month] = []
    acc[month].push(holiday)
    return acc
  }, {} as Record<number, Holiday[]>)

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Calendário de Feriados"
        description="Gerencie os feriados para cálculo correto de horas extras"
        icon={<CalendarDays className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Admin', href: `/admin/${company}` },
          { label: 'Configurações' },
          { label: 'Feriados' },
        ]}
      />

      {/* Filtros e Ações */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end justify-between">
            <div className="flex gap-4 items-end">
              {/* Seletor de Ano */}
              <div className="w-[120px]">
                <Label className="mb-2 block">Ano</Label>
                <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Botão Importar */}
              <Button variant="outline" onClick={importNationalHolidays} disabled={importing}>
                {importing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Importar Nacionais {year}
              </Button>
            </div>

            {/* Botão Adicionar */}
            <Button onClick={openCreateModal}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Feriado
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Feriados */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : holidays.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum feriado cadastrado</h3>
            <p className="text-muted-foreground mb-4">
              Importe os feriados nacionais ou adicione manualmente.
            </p>
            <Button onClick={importNationalHolidays} disabled={importing}>
              <Download className="mr-2 h-4 w-4" />
              Importar Feriados Nacionais
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {monthNames.map((monthName, monthIndex) => {
            const monthHolidays = holidaysByMonth[monthIndex] || []
            if (monthHolidays.length === 0) return null

            return (
              <Card key={monthIndex}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {monthName}
                    <Badge variant="secondary" className="ml-auto">
                      {monthHolidays.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {monthHolidays.map((holiday) => (
                    <div
                      key={holiday.id}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-lg border",
                        !holiday.active && "opacity-50"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {format(parseDate(holiday.date), 'dd')} - {holiday.name}
                          </span>
                          {holiday.halfDay && (
                            <Badge variant="outline" className="text-xs">½</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", holidayTypeColors[holiday.type])}
                          >
                            {holidayTypeIcons[holiday.type]}
                            <span className="ml-1">{holidayTypeLabels[holiday.type]}</span>
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEditModal(holiday)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-600 hover:text-red-700"
                          onClick={() => deleteHoliday(holiday.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal de Criar/Editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingHoliday ? 'Editar Feriado' : 'Novo Feriado'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Nome do Feriado</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Natal, Dia do Trabalho"
              />
            </div>

            <div>
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v as Holiday['type'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NATIONAL">Nacional</SelectItem>
                  <SelectItem value="STATE">Estadual</SelectItem>
                  <SelectItem value="MUNICIPAL">Municipal</SelectItem>
                  <SelectItem value="COMPANY">Empresa</SelectItem>
                  <SelectItem value="OPTIONAL">Facultativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="recurring"
                  checked={formData.recurring}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, recurring: checked as boolean })
                  }
                />
                <Label htmlFor="recurring" className="text-sm">
                  Recorrente (repete todo ano)
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="halfDay"
                  checked={formData.halfDay}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, halfDay: checked as boolean })
                  }
                />
                <Label htmlFor="halfDay" className="text-sm">
                  Meio período
                </Label>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Observações</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Opcional"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveHoliday}>
              {editingHoliday ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
