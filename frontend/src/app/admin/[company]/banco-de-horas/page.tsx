'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Clock, Users, TrendingUp, Search, Download, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

function fmtMinutes(minutes: number) {
  const h = Math.floor(Math.abs(minutes) / 60)
  const m = Math.abs(minutes) % 60
  const sign = minutes < 0 ? '-' : ''
  return `${sign}${h}h${m.toString().padStart(2, '0')}m`
}

interface BancoItem {
  employeeId: string
  employeeName: string
  registrationId: string
  position: string | null
  department: string | null
  avatarUrl: string | null
  allowTimeBank: boolean
  totalMinutes: number
  entries50: number
  entries100: number
  lastEntry: string | null
}

export default function BancoDeHorasPage() {
  const { company } = useParams<{ company: string }>()
  const { user } = useAuth()
  const companyId = user?.companyId

  const [data, setData] = useState<BancoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'hours'>('hours')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const load = useCallback(async () => {
    if (!companyId) return
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/overtime/time-bank?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Erro ao carregar banco de horas')
      setData(await res.json())
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => { load() }, [load])

  const filtered = data
    .filter(e =>
      !search ||
      e.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      e.registrationId.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name') cmp = a.employeeName.localeCompare(b.employeeName)
      else cmp = b.totalMinutes - a.totalMinutes
      return sortDir === 'desc' ? cmp : -cmp
    })

  const totalMinutes = filtered.reduce((s, e) => s + e.totalMinutes, 0)
  const withTimeBank = filtered.filter(e => e.allowTimeBank).length

  const toggleSort = (col: 'name' | 'hours') => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const exportCSV = () => {
    const rows = [
      ['Funcionário', 'Matrícula', 'Cargo', 'Departamento', 'Banco de Horas', 'Total (min)', 'H.E. 50%', 'H.E. 100%', 'Último Registro'],
      ...filtered.map(e => [
        e.employeeName,
        e.registrationId,
        e.position || '',
        e.department || '',
        e.allowTimeBank ? 'Sim' : 'Não',
        e.totalMinutes.toString(),
        fmtMinutes(e.entries50),
        fmtMinutes(e.entries100),
        e.lastEntry ? new Date(e.lastEntry).toLocaleDateString('pt-BR') : '',
      ]),
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'banco-de-horas.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const SortIcon = ({ col }: { col: 'name' | 'hours' }) =>
    sortBy === col
      ? sortDir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
      : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Banco de Horas</h1>
          <p className="text-sm text-muted-foreground">Saldo acumulado de horas extras aprovadas por funcionário</p>
        </div>
        <Button variant="outline" onClick={exportCSV} className="gap-2">
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <Users className="h-8 w-8 text-blue-500" />
          <div>
            <p className="text-2xl font-bold">{filtered.length}</p>
            <p className="text-xs text-muted-foreground">Funcionários com horas</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <Clock className="h-8 w-8 text-purple-500" />
          <div>
            <p className="text-2xl font-bold">{fmtMinutes(totalMinutes)}</p>
            <p className="text-xs text-muted-foreground">Total acumulado</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-green-500" />
          <div>
            <p className="text-2xl font-bold">{withTimeBank}</p>
            <p className="text-xs text-muted-foreground">Com banco de horas ativo</p>
          </div>
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome ou matrícula..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Tabela */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left px-4 py-3 font-medium">
                  <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('name')}>
                    Funcionário <SortIcon col="name" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Cargo / Depto</th>
                <th className="text-center px-4 py-3 font-medium">
                  <button className="flex items-center gap-1 mx-auto hover:text-foreground" onClick={() => toggleSort('hours')}>
                    Total <SortIcon col="hours" />
                  </button>
                </th>
                <th className="text-center px-4 py-3 font-medium hidden lg:table-cell">H.E. 50%</th>
                <th className="text-center px-4 py-3 font-medium hidden lg:table-cell">H.E. 100%</th>
                <th className="text-center px-4 py-3 font-medium hidden md:table-cell">Banco Horas</th>
                <th className="text-center px-4 py-3 font-medium hidden md:table-cell">Último Reg.</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Nenhum registro encontrado</td></tr>
              ) : filtered.map((emp, i) => (
                <tr key={emp.employeeId} className={`border-b last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'} hover:bg-muted/40 transition-colors`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                        {emp.employeeName[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{emp.employeeName}</p>
                        <p className="text-xs text-muted-foreground">{emp.registrationId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-sm">{emp.position || '—'}</p>
                    <p className="text-xs text-muted-foreground">{emp.department || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold text-base ${emp.totalMinutes > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                      {fmtMinutes(emp.totalMinutes)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    <span className="text-sm text-orange-500">{fmtMinutes(emp.entries50)}</span>
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    <span className="text-sm text-red-500">{fmtMinutes(emp.entries100)}</span>
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${emp.allowTimeBank ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {emp.allowTimeBank ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell text-xs text-muted-foreground">
                    {emp.lastEntry ? new Date(emp.lastEntry).toLocaleDateString('pt-BR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
