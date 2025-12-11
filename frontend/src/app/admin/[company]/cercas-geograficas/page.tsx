"use client";

// Página: Cercas Geográficas (lista e criação) escopada por empresa na rota /admin/[company]/cercas-geograficas
// - Código em inglês; textos em português

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { listGeofences, createGeofence, deleteGeofence, Geofence } from '@/lib/api/geofences'
import { MapGeofence } from '@/components/geo/MapGeofence'
import { AddressSearch } from '@/components/geo/AddressSearch'
import { MapPin, Save, Edit, Trash2, Navigation } from 'lucide-react'
import { InputField } from '@/components/ui/input-field'
import { useCompanySlug } from '@/hooks/useCompanySlug'
import { SlugMismatchError } from '@/components/admin/SlugMismatchError'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { IconButton } from '@/components/ui/IconButton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from 'sonner'
import PageHeader from '@/components/admin/PageHeader'
import { ProtectedPage } from '@/components/auth/ProtectedPage'
import { PERMISSIONS, Can } from '@/hooks/usePermissions'

export default function GeofencesCompanyPage() {
  const params = useParams<{ company: string }>()
  const urlSlug = String(params?.company || '')
  
  // Comentário: Hook que valida slug e retorna companyId (UUID)
  const { companyId, companySlug, slugMismatch, loading: loadingAuth } = useCompanySlug()
  
  // Comentário: [company] é obtido da rota e usado diretamente como identificador (ID/slug).
  const [items, setItems] = useState<Geofence[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  // Estado do formulário de criação/edição
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  // Estado do modal de confirmação de exclusão
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; name: string }>({ isOpen: false, id: '', name: '' })
  const envLat = Number(process.env.NEXT_PUBLIC_DEFAULT_CENTER_LAT)
  const envLng = Number(process.env.NEXT_PUBLIC_DEFAULT_CENTER_LNG)
  const [center, setCenter] = useState<{ lat: number; lng: number }>({
    lat: Number.isFinite(envLat) ? envLat : -23.55052,
    lng: Number.isFinite(envLng) ? envLng : -46.633308,
  })
  const [radius, setRadius] = useState(200)
  const [addressText, setAddressText] = useState('')
  // Campo unificado de coordenadas (formato: lat,lng)
  const [coordsInput, setCoordsInput] = useState(`${center.lat},${center.lng}`)
  // Timestamp para forçar reset de zoom quando usuário buscar novo local
  const [resetTimestamp, setResetTimestamp] = useState(Date.now())

  useEffect(() => {
    setCoordsInput(`${center.lat},${center.lng}`)
  }, [center.lat, center.lng])

  // Reverse geocoding para atualizar o texto do endereço ao mover o mapa
  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      // Usa proxy do backend (navegador tem CORS bloqueado)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      const url = new URL(`${apiUrl}/api/geocoding/reverse`)
      url.searchParams.set('lat', String(lat))
      url.searchParams.set('lon', String(lon))
      url.searchParams.set('format', 'json')
      url.searchParams.set('zoom', '18') // Zoom alto para pegar número da casa
      url.searchParams.set('addressdetails', '1')
      const res = await fetch(url.toString())
      const data = await res.json()
      
      // Monta endereço limpo a partir dos componentes
      const addr = data?.address || {}
      const parts: string[] = []
      
      // Rua e número
      if (addr.road) {
        if (addr.house_number) {
          parts.push(`${addr.road}, ${addr.house_number}`)
        } else {
          parts.push(addr.road)
        }
      }
      
      // Bairro
      if (addr.suburb || addr.neighbourhood) {
        parts.push(addr.suburb || addr.neighbourhood)
      }
      
      // Cidade
      if (addr.city || addr.town || addr.village) {
        parts.push(addr.city || addr.town || addr.village)
      }
      
      // Estado
      if (addr.state) {
        parts.push(addr.state)
      }
      
      // CEP
      if (addr.postcode) {
        parts.push(addr.postcode)
      }
      
      const cleanAddress = parts.join(' - ')
      if (cleanAddress) {
        setAddressText(cleanAddress)
      } else {
        // Fallback: limpa display_name removendo regiões
        let display = data?.display_name || ''
        display = display.replace(/, Região Imediata de [^,]+/gi, '')
        display = display.replace(/, Região Metropolitana de [^,]+/gi, '')
        display = display.replace(/, Região Geográfica Intermediária de [^,]+/gi, '')
        display = display.replace(/, Região Sudeste/gi, '')
        display = display.replace(/,\s*,/g, ',').trim()
        if (display) setAddressText(display)
      }
    } catch {}
  }

  const canList = companyId.trim().length > 0

  const refresh = async () => {
    if (!canList) return
    setLoading(true)
    try {
      const data = await listGeofences(companyId)
      setItems(data)
    } catch (e) {
      console.error(e)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId])

  const onCreate = async () => {
    if (!companyId) return
    
    // Validação: Nome obrigatório
    if (!name.trim()) {
      toast.error('Nome do ponto é obrigatório')
      return
    }
    
    // Validação: Endereço obrigatório
    if (!addressText.trim()) {
      toast.error('Endereço é obrigatório')
      return
    }
    
    // Valida se companyId é um UUID válido
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(companyId)
    if (!isUuid) {
      toast.error(`Erro: Empresa "${companySlug}" não encontrada.`)
      return
    }
    
    setCreating(true)
    try {
      await createGeofence({
        companyId: companyId,
        name,
        centerLat: center.lat,
        centerLng: center.lng,
        radiusMeters: radius,
        active: true,
      })
      setName('')
      await refresh()
      toast.success('Cerca geográfica criada com sucesso!')
    } catch (e: any) {
      toast.error(`Erro ao criar cerca: ${e?.message || 'Erro desconhecido'}`)
    } finally {
      setCreating(false)
    }
  }

  const onUpdate = async () => {
    if (!editingId) return
    
    // Validação: Nome obrigatório
    if (!name.trim()) {
      toast.error('Nome do ponto é obrigatório')
      return
    }
    
    // Validação: Endereço obrigatório
    if (!addressText.trim()) {
      toast.error('Endereço é obrigatório')
      return
    }
    
    setCreating(true)
    try {
      // Comentário: Atualiza geofence existente
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      const token = localStorage.getItem('token')
      const response = await fetch(`${apiUrl}/api/geofences/${editingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          centerLat: center.lat,
          centerLng: center.lng,
          radiusMeters: radius,
        }),
      })
      if (!response.ok) throw new Error('Erro ao atualizar')
      
      // Limpa formulário e sai do modo de edição
      setName('')
      setEditingId(null)
      await refresh()
      toast.success('Cerca geográfica atualizada com sucesso!')
    } catch (e: any) {
      toast.error(`Erro ao atualizar cerca: ${e?.message || 'Erro desconhecido'}`)
    } finally {
      setCreating(false)
    }
  }

  const onEdit = (geofence: Geofence) => {
    // Comentário: Carrega dados da geofence no formulário
    setEditingId(geofence.id)
    setName(geofence.name)
    setCenter({ lat: geofence.centerLat, lng: geofence.centerLng })
    setRadius(geofence.radiusMeters)
    setResetTimestamp(Date.now())
    reverseGeocode(geofence.centerLat, geofence.centerLng)
  }

  const onCancelEdit = () => {
    setEditingId(null)
    setName('')
  }

  const onDelete = async () => {
    try {
      await deleteGeofence(deleteConfirm.id)
      await refresh()
      toast.success('Cerca geográfica excluída com sucesso!')
      setDeleteConfirm({ isOpen: false, id: '', name: '' })
    } catch (e: any) {
      toast.error('Erro ao excluir cerca geográfica')
    }
  }

  // Comentário: Exibe erro se slug da URL não corresponde ao slug do usuário
  if (slugMismatch) {
    return <SlugMismatchError urlSlug={urlSlug} correctSlug={companySlug} currentPath={`/admin/${urlSlug}/cercas-geograficas`} />
  }

  const base = `/admin/${urlSlug}`

  return (
    <ProtectedPage permission={PERMISSIONS.GEOFENCES_VIEW}>
    <div className="p-4 space-y-6">
      <PageHeader
        title="Cercas Geográficas"
        description="Gerencie as cercas geográficas da empresa"
        icon={<MapPin className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Admin', href: base },
          { label: 'G. de Colaboradores' },
          { label: 'Cercas Geográficas' }
        ]}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-1 space-y-3">
          <InputField
            label="Nome do ponto"
            showLabel={true}
            placeholder="Ex.: Entrada Principal"
            value={name}
            onChange={(v) => setName(v)}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium">Endereço</label>
            <AddressSearch
            placeholder="Buscar endereço (rua, número, bairro, cidade ou CEP)"
            value={addressText}
            onChangeText={setAddressText}
            cityHint="São Paulo"
            stateHint="São Paulo"
            onSelect={({ lat, lng, label }) => {
              console.log('Geofences page: onSelect chamado', { lat, lng, label })
              setCenter({ lat, lng })
              setAddressText(label)
              // Reseta raio para padrão (200m) ao selecionar endereço
              setRadius(200)
              // Força reset de zoom
              setResetTimestamp(Date.now())
            }}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <InputField
                  label="Coordenadas (lat, lng)"
                  showLabel={true}
                  placeholder="Ex.: -23.683527, -46.791024"
                  value={coordsInput}
                  onChange={(v) => setCoordsInput(v)}
                />
              </div>
              <PrimaryButton
                onClick={() => {
                  const parts = coordsInput.split(',').map((p) => p.trim())
                  const lat = Number(parts[0])
                  const lng = Number(parts[1])
                  if (Number.isFinite(lat) && Number.isFinite(lng)) {
                    setCenter({ lat, lng })
                    // Reseta raio para padrão (200m) ao ir para coordenadas
                    setRadius(200)
                    // Força reset de zoom
                    setResetTimestamp(Date.now())
                    // Busca endereço via reverse geocoding
                    reverseGeocode(lat, lng)
                  } else {
                    toast.error('Coordenadas inválidas. Use o formato: lat, lng')
                  }
                }}
                icon={Navigation}
                className="mt-6 uppercase"
                title="Buscar localização da latitude e longitude"
              >
                Buscar
              </PrimaryButton>
            </div>
            <details className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
              <summary className="cursor-pointer font-medium">Como copiar coordenadas do Google Maps?</summary>
              <ol className="mt-2 space-y-1 list-decimal list-inside">
                <li>Acesse <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google Maps</a></li>
                <li>Digite o endereço desejado na busca</li>
                <li>Clique com o botão direito no ponto vermelho (marcador)</li>
                <li>Na caixinha que aparece, clique no primeiro número (latitude, longitude)</li>
                <li>As coordenadas serão copiadas automaticamente</li>
                <li>Cole aqui no campo "Coordenadas" e clique em "Ir"</li>
              </ol>
            </details>
          </div>

          <label className="text-sm font-medium mt-2">Raio da cerca (m)</label>
          <input
            type="range"
            min={50}
            max={1000}
            step={10}
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-gray-600">{radius} metros</div>

          {/* Botões de criar/editar - requer geofences.create ou geofences.edit */}
          <Can permissions={[PERMISSIONS.GEOFENCES_CREATE, PERMISSIONS.GEOFENCES_EDIT]}>
            <div className="flex gap-2">
              <PrimaryButton
                disabled={!companyId || creating}
                onClick={editingId ? onUpdate : onCreate}
                icon={editingId ? Edit : Save}
                loading={creating}
                fullWidth
                className="mt-2 uppercase"
              >
                {editingId ? 'Atualizar cerca' : 'Salvar cerca'}
              </PrimaryButton>
              {editingId && (
                <PrimaryButton
                  onClick={onCancelEdit}
                  variant="outline"
                  className="mt-2 uppercase"
                >
                  Cancelar
                </PrimaryButton>
              )}
            </div>
          </Can>
        </div>
        <div className="md:col-span-2">
          <MapGeofence 
            center={center} 
            radiusMeters={radius} 
            resetTimestamp={resetTimestamp}
            onChange={({ center, radiusMeters }) => {
              setCenter(center)
              setRadius(radiusMeters)
              reverseGeocode(center.lat, center.lng)
            }} 
          />
        </div>
      </div>

      <div className="pt-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-lg">Cercas geográficas cadastradas</h2>
          <button onClick={refresh} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 transition-colors">Atualizar</button>
        </div>
        {!canList && <div className="text-sm text-gray-500 mt-2">Informe o companyId para listar.</div>}
        {loading && <div className="text-sm text-gray-500 mt-2">Carregando...</div>}
        {canList && !loading && (
          <div className="mt-2 border rounded divide-y">
            {items.map((g) => (
              <div 
                key={g.id} 
                className="group p-3 flex items-center justify-between text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
              >
                <div>
                  <div className="font-medium">{g.name}</div>
                  <div className="text-gray-600 dark:text-gray-400">Raio: {g.radiusMeters} m | Lat: {g.centerLat.toFixed(6)} Lng: {g.centerLng.toFixed(6)}</div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Editar - requer geofences.edit */}
                  <Can permission={PERMISSIONS.GEOFENCES_EDIT}>
                    <IconButton 
                      icon={Edit}
                      onClick={() => onEdit(g)} 
                      variant="outline"
                      size="md"
                      tooltip="Editar cerca geográfica"
                    />
                  </Can>
                  {/* Excluir - requer geofences.delete */}
                  <Can permission={PERMISSIONS.GEOFENCES_DELETE}>
                    <IconButton 
                      icon={Trash2}
                      onClick={() => setDeleteConfirm({ isOpen: true, id: g.id, name: g.name })} 
                      variant="danger"
                      size="md"
                      tooltip="Excluir cerca geográfica"
                    />
                  </Can>
                </div>
              </div>
            ))}
            {items.length === 0 && <div className="p-3 text-sm text-gray-500">Nenhuma geofence encontrada.</div>}
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: '', name: '' })}
        onConfirm={onDelete}
        title="Excluir Cerca Geográfica"
        description="Esta ação não pode ser desfeita"
        itemName={deleteConfirm.name}
        message="Tem certeza que deseja excluir permanentemente a cerca"
        confirmText="Excluir"
        cancelText="Cancelar"
        icon={Trash2}
        variant="danger"
      />
    </div>
    </ProtectedPage>
  )
}
