import { api } from './client'

export type Geofence = {
  id: string
  companyId: string
  name: string
  centerLat: number
  centerLng: number
  radiusMeters: number
  active: boolean
  createdAt?: string
  updatedAt?: string
}

export async function listGeofences(companyId: string): Promise<Geofence[]> {
  return api<Geofence[]>(`/api/geofences?companyId=${encodeURIComponent(companyId)}`)
}

export async function createGeofence(payload: Partial<Geofence>): Promise<Geofence> {
  return api<Geofence>('/api/geofences', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateGeofence(id: string, payload: Partial<Geofence>): Promise<Geofence> {
  return api<Geofence>(`/api/geofences/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteGeofence(id: string): Promise<{ success: boolean }> {
  return api<{ success: boolean }>(`/api/geofences/${id}`, { method: 'DELETE' })
}

export async function getGeofenceById(id: string): Promise<Geofence> {
  // Não há endpoint dedicado GET /api/geofences/:id; se necessário, backend pode ser ajustado.
  // Por ora, chamaremos update com method GET se existir; senão, podemos listar e filtrar.
  // Implementação provisória: lançar erro se não suportado pelo backend atual.
  return api<Geofence>(`/api/geofences/${id}`, { method: 'GET' })
}
