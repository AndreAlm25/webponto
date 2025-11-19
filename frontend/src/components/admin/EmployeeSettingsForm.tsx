"use client"
import React from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type Employee = {
  id: string
  name: string
  email?: string
  allowRemoteClockIn?: boolean
  allowFacialRecognition?: boolean
  requireLiveness?: boolean
  requireGeolocation?: boolean
  minGeoAccuracyMeters?: number | null
}

export default function EmployeeSettingsForm({ employee, onSaved, onCancel }: {
  employee: Employee
  onSaved: (updated: Employee) => void
  onCancel: () => void
}) {
  const [form, setForm] = React.useState<Employee>({ ...employee })
  const [saving, setSaving] = React.useState(false)

  const api = process.env.NEXT_PUBLIC_API_URL

  async function handleSave() {
    try {
      if (!api) {
        toast.error('Configuração ausente', { description: 'NEXT_PUBLIC_API_URL não definida' })
        return
      }
      setSaving(true)
      const token = localStorage.getItem('token') || localStorage.getItem('employee_token') || undefined
      const res = await fetch(`${api}/api/employees/${employee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          allowRemoteClockIn: !!form.allowRemoteClockIn,
          allowFacialRecognition: !!form.allowFacialRecognition,
          requireLiveness: !!form.requireLiveness,
          requireGeolocation: !!form.requireGeolocation,
          minGeoAccuracyMeters: form.minGeoAccuracyMeters ?? null,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.message || 'Falha ao salvar configurações')
      toast.success('Configurações salvas')
      onSaved({ ...form })
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">{employee.name}</p>
        <p className="text-xs text-muted-foreground">{employee.email}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!form.allowRemoteClockIn} onChange={e => setForm(s => ({ ...s, allowRemoteClockIn: e.target.checked }))} />
          Permitir ponto remoto (allowRemoteClockIn)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!form.allowFacialRecognition} onChange={e => setForm(s => ({ ...s, allowFacialRecognition: e.target.checked }))} />
          Exigir facial (allowFacialRecognition)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!form.requireGeolocation} onChange={e => setForm(s => ({ ...s, requireGeolocation: e.target.checked }))} />
          Exigir geolocalização (requireGeolocation)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!form.requireLiveness} onChange={e => setForm(s => ({ ...s, requireLiveness: e.target.checked }))} />
          Exigir vivacidade (requireLiveness)
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-sm">Precisão mínima em metros (minGeoAccuracyMeters)</span>
          <input
            type="number"
            className="h-9 rounded border px-2 bg-background"
            value={form.minGeoAccuracyMeters ?? ''}
            onChange={e => setForm(s => ({ ...s, minGeoAccuracyMeters: e.target.value === '' ? null : Number(e.target.value) }))}
            placeholder="ex.: 100"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
      </div>
    </div>
  )
}
