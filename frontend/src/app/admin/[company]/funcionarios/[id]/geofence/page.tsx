"use client";

// Página: Vincular geofence (unitário) em /admin/[company]/funcionarios/[id]/geofence
// - Código em inglês; textos em português

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { listGeofences, Geofence } from '@/lib/api/geofences'
import { patchEmployeeGeofence } from '@/lib/api/employees'

export default function EmployeeGeofenceLinkPage() {
  const params = useParams<{ company: string; id: string }>()
  const router = useRouter()
  const companyParam = String(params?.company || '')
  const employeeId = String(params?.id || '')

  const [geofences, setGeofences] = useState<Geofence[]>([])
  const [geofenceId, setGeofenceId] = useState<string | null>(null)
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

  const onSave = async () => {
    setSaving(true)
    try {
      await patchEmployeeGeofence(employeeId, geofenceId)
      alert('Geofence vinculada ao funcionário!')
      router.push(`/admin/${encodeURIComponent(companyParam)}`)
    } catch (e: any) {
      alert(`Erro ao vincular: ${e?.message || 'erro'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Vincular geofence ao funcionário</h1>
      <div className="text-sm text-gray-600">Empresa: {companyParam} | Funcionário: {employeeId}</div>

      {loading ? (
        <div>Carregando...</div>
      ) : (
        <div className="space-y-2">
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

          <button onClick={onSave} disabled={saving} className="px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar vínculo'}
          </button>
        </div>
      )}
    </div>
  )
}
