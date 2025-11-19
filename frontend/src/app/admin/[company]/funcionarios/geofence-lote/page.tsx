"use client";

// Página: Vincular geofence em lote em /admin/[company]/funcionarios/geofence-lote
// - Código em inglês; textos em português

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { listGeofences, Geofence } from '@/lib/api/geofences'
import { patchEmployeesGeofence } from '@/lib/api/employees'

export default function EmployeesGeofenceBatchPage() {
  const params = useParams<{ company: string }>()
  const router = useRouter()
  const companyParam = String(params?.company || '')

  const [geofences, setGeofences] = useState<Geofence[]>([])
  const [geofenceId, setGeofenceId] = useState<string | null>(null)
  const [employeeIds, setEmployeeIds] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        const items = await listGeofences(companyParam)
        setGeofences(items)
      } catch (e) {
        setGeofences([])
      } finally {
        setLoading(false)
      }
    }
    if (companyParam) run()
  }, [companyParam])

  const onApply = async () => {
    const ids = employeeIds
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (ids.length === 0) return alert('Informe pelo menos um ID de funcionário')

    setSaving(true)
    try {
      const res = await patchEmployeesGeofence({ geofenceId, employeeIds: ids })
      alert(`Vínculo aplicado. Registros atualizados: ${res?.updatedCount ?? '?'} `)
      router.push(`/admin/${encodeURIComponent(companyParam)}`)
    } catch (e: any) {
      alert(`Erro ao aplicar em lote: ${e?.message || 'erro'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Vincular geofence em lote</h1>
      <div className="text-sm text-gray-600">Empresa: {companyParam}</div>

      {loading ? (
        <div>Carregando...</div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Geofence</label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={geofenceId ?? ''}
              onChange={(e) => setGeofenceId(e.target.value || null)}
            >
              <option value="">— Sem geofence (remover vínculo) —</option>
              {geofences.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} — raio {g.radiusMeters} m
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Funcionários (IDs separados por vírgula/espaço/linha)</label>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm min-h-[120px]"
              placeholder="ex.: 123e4567-e89b-12d3-a456-426614174000, 9caa2..., 3f1b..."
              value={employeeIds}
              onChange={(e) => setEmployeeIds(e.target.value)}
            />
          </div>

          <button onClick={onApply} disabled={saving} className="px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50">
            {saving ? 'Aplicando...' : 'Aplicar vínculo em lote'}
          </button>
        </div>
      )}
    </div>
  )
}
