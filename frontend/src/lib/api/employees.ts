import { api } from './client'

export async function patchEmployeeGeofence(id: string, geofenceId: string | null) {
  return api(`/api/employees/${id}/geofence`, {
    method: 'PATCH',
    body: JSON.stringify({ geofenceId }),
  })
}

export async function patchEmployeesGeofence(payload: { geofenceId: string | null; employeeIds: string[] }) {
  return api(`/api/employees/geofence`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
