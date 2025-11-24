"use client";

// Página: Editar Cerca Geográfica em /admin/[company]/cercas-geograficas/[id]/edit
// - Código em inglês; textos em português

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getGeofenceById, updateGeofence, Geofence } from '@/lib/api/geofences'
import { MapGeofence } from '@/components/geo/MapGeofence'
import { AddressSearch } from '@/components/geo/AddressSearch'

export default function EditGeofencePage() {
  const params = useParams<{ company: string; id: string }>()
  const router = useRouter()
  const id = String(params?.id || '')
  const companyParam = String(params?.company || '')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [item, setItem] = useState<Geofence | null>(null)

  const [name, setName] = useState('')
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: -23.55052, lng: -46.633308 })
  const [radius, setRadius] = useState(200)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        const g = await getGeofenceById(id)
        setItem(g)
        setName(g.name)
        setCenter({ lat: g.centerLat, lng: g.centerLng })
        setRadius(g.radiusMeters)
      } catch (e) {
        alert('Erro ao carregar geofence')
      } finally {
        setLoading(false)
      }
    }
    if (id) run()
  }, [id])

  const onSave = async () => {
    setSaving(true)
    try {
      await updateGeofence(id, {
        name,
        centerLat: center.lat,
        centerLng: center.lng,
        radiusMeters: radius,
      })
      alert('Geofence atualizada!')
      router.push(`/admin/${encodeURIComponent(companyParam)}/cercas-geograficas`)
    } catch (e: any) {
      alert(`Erro ao salvar: ${e?.message || 'erro'}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-4">Carregando...</div>
  if (!item) return <div className="p-4">Geofence não encontrada.</div>

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-semibold">Editar geofence</h1>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-1 space-y-3">
          <label className="text-sm font-medium">Nome</label>
          <input className="w-full border rounded px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />

          <label className="text-sm font-medium">Endereço</label>
          <AddressSearch onSelect={({ lat, lng }) => setCenter({ lat, lng })} />

          <label className="text-sm font-medium mt-2">Raio da cerca (m)</label>
          <input type="range" min={50} max={1000} step={10} value={radius} onChange={(e) => setRadius(parseInt(e.target.value))} className="w-full" />
          <div className="text-xs text-gray-600">{radius} metros</div>

          <button onClick={onSave} disabled={saving} className="mt-2 px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
        <div className="md:col-span-2">
          <MapGeofence center={center} radiusMeters={radius} onChange={({ center, radiusMeters }) => { setCenter(center); setRadius(radiusMeters) }} />
        </div>
      </div>
    </div>
  )
}
