'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { CalendarClock, Search, Users, ChevronDown, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import PageHeader from '@/components/admin/PageHeader'
import PageContainer from '@/components/admin/PageContainer'
import { ProtectedPage } from '@/components/auth/ProtectedPage'
import { PERMISSIONS } from '@/hooks/usePermissions'

const API = process.env.NEXT_PUBLIC_API_URL

const SCHEDULES = [
  { value: 'FIVE_TWO',         label: '5×2',      desc: 'Seg–Sex, folga Sáb/Dom (≈22 dias/mês)' },
  { value: 'SIX_ONE',          label: '6×1',      desc: 'Seg–Sáb, folga Dom (≈26 dias/mês)' },
  { value: 'TWELVE_THIRTYSIX', label: '12×36',    desc: '12h trabalha / 36h folga (≈15 dias/mês)' },
  { value: 'FOUR_TWO',         label: '4×2',      desc: '4 dias trabalha / 2 folga (≈20 dias/mês)' },
  { value: 'CUSTOM',           label: 'Personalizado', desc: 'Dias por mês definidos manualmente' },
]

const SCHEDULE_COLORS: Record<string, string> = {
  FIVE_TWO:         'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700',
  SIX_ONE:          'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700',
  TWELVE_THIRTYSIX: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700',
  FOUR_TWO:         'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700',
  CUSTOM:           'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
}

interface Employee {
  id: string
  user: { name: string; email: string }
  department?: { name: string }
  workSchedule: string
  customWorkDaysPerMonth?: number | null
}

export default function EscalasPage() {
  const { company } = useParams<{ company: string }>()
  const { user } = useAuth()
  const companyId = user?.companyId

  const [employees, setEmployees] = useState<Employee[]>([])
  const [search, setSearch] = useState('')
  const [filterSchedule, setFilterSchedule] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  // Edição inline por funcionário
  const [editing, setEditing] = useState<Record<string, { schedule: string; customDays: number }>>({})

  const load = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/employees?companyId=${companyId}&limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const list: Employee[] = (data.employees || data).map((e: any) => ({
          id: e.id,
          user: e.user,
          department: e.department,
          workSchedule: e.workSchedule || 'FIVE_TWO',
          customWorkDaysPerMonth: e.customWorkDaysPerMonth,
        }))
        setEmployees(list)
      }
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => { load() }, [load])

  const getEdit = (emp: Employee) =>
    editing[emp.id] || { schedule: emp.workSchedule, customDays: emp.customWorkDaysPerMonth || 22 }

  const setEdit = (id: string, field: string, value: any) => {
    setEditing(prev => ({ ...prev, [id]: { ...getEditById(id, prev), [field]: value } }))
  }

  const getEditById = (id: string, prev: typeof editing) => {
    const emp = employees.find(e => e.id === id)!
    return prev[id] || { schedule: emp.workSchedule, customDays: emp.customWorkDaysPerMonth || 22 }
  }

  const isDirty = (emp: Employee) => {
    const e = editing[emp.id]
    if (!e) return false
    return e.schedule !== emp.workSchedule || (e.schedule === 'CUSTOM' && e.customDays !== (emp.customWorkDaysPerMonth || 22))
  }

  const handleSave = async (emp: Employee) => {
    const e = getEdit(emp)
    setSaving(emp.id)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/employees/${emp.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workSchedule: e.schedule,
          customWorkDaysPerMonth: e.schedule === 'CUSTOM' ? e.customDays : null,
        }),
      })
      if (res.ok) {
        toast.success(`Escala de ${emp.user.name} atualizada!`)
        setEmployees(prev => prev.map(x => x.id === emp.id
          ? { ...x, workSchedule: e.schedule, customWorkDaysPerMonth: e.schedule === 'CUSTOM' ? e.customDays : null }
          : x
        ))
        setEditing(prev => { const n = { ...prev }; delete n[emp.id]; return n })
      } else {
        const err = await res.json()
        toast.error(err.message || 'Erro ao salvar')
      }
    } finally {
      setSaving(null)
    }
  }

  const filtered = employees.filter(e => {
    const matchSearch = e.user.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.department?.name || '').toLowerCase().includes(search.toLowerCase())
    const matchSchedule = filterSchedule === 'ALL' || getEdit(e).schedule === filterSchedule
    return matchSearch && matchSchedule
  })

  // Resumo por escala
  const summary = SCHEDULES.map(s => ({
    ...s,
    count: employees.filter(e => e.workSchedule === s.value).length,
  }))

  return (
    <ProtectedPage permission={PERMISSIONS.EMPLOYEES_VIEW}>
      <PageHeader
        title="Gestão de Escalas"
        description="Configure a escala de trabalho de cada funcionário"
        icon={<CalendarClock className="h-6 w-6" />}
      />
      <PageContainer>
        <div className="space-y-6">

          {/* Cards de resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {summary.map(s => (
              <button
                key={s.value}
                onClick={() => setFilterSchedule(prev => prev === s.value ? 'ALL' : s.value)}
                className={`rounded-xl border p-3 text-left transition-all hover:shadow-sm ${
                  filterSchedule === s.value ? SCHEDULE_COLORS[s.value] + ' ring-2 ring-current' : 'bg-card border-border'
                }`}
              >
                <p className="text-2xl font-bold">{s.count}</p>
                <p className="text-sm font-semibold">{s.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{s.desc}</p>
              </button>
            ))}
          </div>

          {/* Filtros */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou departamento..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={filterSchedule}
              onChange={e => setFilterSchedule(e.target.value)}
              className="rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="ALL">Todas as escalas</option>
              {SCHEDULES.map(s => <option key={s.value} value={s.value}>{s.label} — {s.desc}</option>)}
            </select>
          </div>

          {/* Tabela */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando funcionários...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Nenhum funcionário encontrado</div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Funcionário</th>
                    <th className="text-left px-4 py-3 font-medium">Departamento</th>
                    <th className="text-left px-4 py-3 font-medium">Escala</th>
                    <th className="text-left px-4 py-3 font-medium w-36">Dias/Mês</th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(emp => {
                    const e = getEdit(emp)
                    const dirty = isDirty(emp)
                    return (
                      <tr key={emp.id} className={`hover:bg-muted/30 transition-colors ${dirty ? 'bg-yellow-50/50 dark:bg-yellow-950/10' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium">{emp.user.name}</p>
                          <p className="text-xs text-muted-foreground">{emp.user.email}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {emp.department?.name || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={e.schedule}
                            onChange={ev => setEdit(emp.id, 'schedule', ev.target.value)}
                            className="rounded-md border border-input bg-background px-2 py-1 text-sm w-40"
                          >
                            {SCHEDULES.map(s => (
                              <option key={s.value} value={s.value}>{s.label} — {s.desc}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          {e.schedule === 'CUSTOM' ? (
                            <Input
                              type="number"
                              min={1} max={31}
                              value={e.customDays}
                              onChange={ev => setEdit(emp.id, 'customDays', Number(ev.target.value))}
                              className="w-20 h-8 text-sm"
                            />
                          ) : (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${SCHEDULE_COLORS[e.schedule]}`}>
                              {e.schedule === 'FIVE_TWO' ? '22 dias' :
                               e.schedule === 'SIX_ONE' ? '26 dias' :
                               e.schedule === 'TWELVE_THIRTYSIX' ? '15 dias' :
                               e.schedule === 'FOUR_TWO' ? '20 dias' : '—'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {dirty && (
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleSave(emp)}
                              disabled={saving === emp.id}
                            >
                              <Save className="h-3 w-3 mr-1" />
                              {saving === emp.id ? '...' : 'Salvar'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Info */}
          <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Como as escalas afetam os cálculos</p>
            <p>• <strong>5×2:</strong> 22 dias úteis → hora extra acima de 8h/dia ou 44h/semana</p>
            <p>• <strong>6×1:</strong> 26 dias → folga remunerada obrigatória ao domingo (CLT art. 67)</p>
            <p>• <strong>12×36:</strong> 15 turnos/mês → hora extra calculada por turno acima de 12h</p>
            <p>• <strong>Personalizado:</strong> você define quantos dias/mês o funcionário trabalha</p>
          </div>

        </div>
      </PageContainer>
    </ProtectedPage>
  )
}
