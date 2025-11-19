"use client"
import React from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useWebSocket } from '@/contexts/WebSocketContext'
import EmployeeSettingsForm from './EmployeeSettingsForm'
import EmployeeActionsMenu from './EmployeeActionsMenu'
import AvatarCircle from '@/components/facial/AvatarCircle'
import { Camera, MapPin, Timer } from 'lucide-react'

export type Employee = {
  id: string
  name: string
  email?: string
  photoUrl?: string | null
  roleTitle?: string | null
  status?: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'
  allowRemoteClockIn?: boolean
  allowFacialRecognition?: boolean
  requireLiveness?: boolean
  requireGeolocation?: boolean
  minGeoAccuracyMeters?: number | null
}

interface EmployeeListProps {
  searchTerm?: string
  onEmployeeAdded?: () => void
  onEditEmployee?: (employeeId: string) => void
}

export default function EmployeeList({ searchTerm = '', onEmployeeAdded, onEditEmployee }: EmployeeListProps) {
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [loading, setLoading] = React.useState(true)
  const [editing, setEditing] = React.useState<Employee | null>(null)
  const { onEmployeeCreated, onEmployeeUpdated, onEmployeeDeleted, connected } = useWebSocket()

  const api = process.env.NEXT_PUBLIC_API_URL

  const load = React.useCallback(async () => {
    try {
      if (!api) {
        setLoading(false)
        return
      }
      setLoading(true)
      const token = localStorage.getItem('token') || localStorage.getItem('employee_token') || undefined
      // TEMP: sem filtro de companyId para garantir que dados apareçam; voltaremos a filtrar pelo slug
      const url = `${api}/api/employees`
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        cache: 'no-store',
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.message || 'Falha ao carregar funcionários')
      const items: Employee[] = Array.isArray(data?.employees) ? data.employees : (Array.isArray(data) ? data : [])
      console.log('[EmployeeList] GET /api/employees ->', Array.isArray(items) ? items.length : 0)
      setEmployees(items)
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar funcionários')
    } finally {
      setLoading(false)
    }
  }, [api])

  React.useEffect(() => { load() }, [load])

  // WebSocket: Atualizar quando funcionário for criado
  React.useEffect(() => {
    if (!connected) return

    console.log('[EmployeeList] 📡 Registrando listener para employee-created')

    const unsubscribe = onEmployeeCreated((employee) => {
      console.log('[EmployeeList] 📥 Novo funcionário criado:', employee)
      load() // Recarregar lista
      toast.success('Novo funcionário adicionado!', {
        description: employee.user?.name || 'Funcionário'
      })
    })

    return unsubscribe
  }, [connected, onEmployeeCreated, load])

  // WebSocket: Atualizar quando funcionário for editado
  React.useEffect(() => {
    if (!connected) return

    console.log('[EmployeeList] 📡 Registrando listener para employee-updated')

    const unsubscribe = onEmployeeUpdated((employee) => {
      console.log('[EmployeeList] 📥 Funcionário atualizado:', employee)
      
      // Atualizar na lista local
      setEmployees(prev => {
        const index = prev.findIndex(e => e.id === employee.id)
        if (index === -1) {
          // Se não existe, recarregar lista completa
          load()
          return prev
        }
        
        // Atualizar item existente
        const updated = [...prev]
        updated[index] = {
          ...updated[index],
          ...employee,
          name: employee.user?.name || updated[index].name,
          email: employee.user?.email || updated[index].email,
          photoUrl: employee.user?.avatarUrl || updated[index].photoUrl,
        }
        return updated
      })

      toast.info('Funcionário atualizado', {
        description: employee.user?.name || 'Dados atualizados'
      })
    })

    return unsubscribe
  }, [connected, onEmployeeUpdated, load])

  // WebSocket: Atualizar quando funcionário for deletado
  React.useEffect(() => {
    if (!connected) return

    console.log('[EmployeeList] 📡 Registrando listener para employee-deleted')

    const unsubscribe = onEmployeeDeleted((data) => {
      console.log('[EmployeeList] 📥 Funcionário deletado:', data)
      
      // Remover da lista local
      setEmployees(prev => prev.filter(e => e.id !== data.id))
      
      toast.info('Funcionário removido')
    })

    return unsubscribe
  }, [connected, onEmployeeDeleted])

  async function toggleActive(emp: Employee) {
    try {
      if (!api) return
      const token = localStorage.getItem('token') || localStorage.getItem('employee_token') || undefined
      const next = emp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
      const res = await fetch(`${api}/api/employees/${emp.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ status: next }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.message || 'Falha ao atualizar funcionário')
      toast.success(`Funcionário ${next === 'ACTIVE' ? 'ativado' : 'desativado'}`)
      setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, status: next as any } : e))
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar status')
    }
  }

  async function remove(emp: Employee) {
    try {
      if (!api) return
      const token = localStorage.getItem('token') || localStorage.getItem('employee_token') || undefined
      const res = await fetch(`${api}/api/employees/${emp.id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.message || 'Falha ao excluir funcionário')
      }
      toast.success('Funcionário excluído')
      setEmployees(prev => prev.filter(e => e.id !== emp.id))
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir')
    }
  }

  function onSaved(updated: Employee) {
    setEmployees(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e))
    setEditing(null)
  }

  // Comentário: Filtra funcionários pela busca
  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (emp.roleTitle && emp.roleTitle.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Comentário: Traduz status para português
  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'ACTIVE': return 'Ativo'
      case 'INACTIVE': return 'Inativo'
      case 'TERMINATED': return 'Desligado'
      default: return 'Ativo'
    }
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="space-y-3">
          <EmployeeItemSkeleton />
          <EmployeeItemSkeleton />
          <EmployeeItemSkeleton />
        </div>
      ) : filteredEmployees.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          {searchTerm ? 'Nenhum funcionário encontrado' : 'Nenhum funcionário cadastrado'}
        </p>
      ) : (
        filteredEmployees.map(emp => (
          <div key={emp.id} className="flex items-center justify-between gap-3 p-3 border border-border rounded-md hover:bg-muted/50 dark:hover:bg-white/5 transition-colors">
            {/* Esquerda: avatar + textos */}
            <div className="flex items-center gap-3 min-w-0">
              <AvatarCircle name={emp.name} photoUrl={emp.photoUrl || undefined} sizeClass="h-10 w-10" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{emp.name}</p>
                  {/* Ícones de permissões */}
                  <span className="flex items-center gap-1">
                    {emp.allowRemoteClockIn && (
                      <MapPin className="h-4 w-4 text-green-600 flex-shrink-0" />
                    )}
                    {emp.requireGeolocation && (
                      <Timer className="h-4 w-4 text-green-600 flex-shrink-0" />
                    )}
                    {emp.allowFacialRecognition && (
                      <Camera className="h-4 w-4 text-green-600 flex-shrink-0" />
                    )}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                {emp.roleTitle && (
                  <p className="text-xs text-muted-foreground truncate">{emp.roleTitle}</p>
                )}
              </div>
            </div>

            {/* Direita: status + menu suspenso */}
            <div className="flex items-center gap-2 shrink-0">
              <span className={`px-2 py-0.5 rounded-full text-xs border ${emp.status === 'ACTIVE' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800' : 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800'}`}>
                {getStatusLabel(emp.status)}
              </span>
              <EmployeeActionsMenu
                employee={emp}
                onEdit={(employee) => onEditEmployee?.(employee.id)}
                onDeactivate={toggleActive}
                onDelete={remove}
                hasFaceRegistered={emp.allowFacialRecognition}
              />
            </div>
          </div>
        ))
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-md border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold">Editar Funcionário</p>
              <button onClick={() => setEditing(null)} className="text-sm text-muted-foreground">Fechar</button>
            </div>
            <EmployeeSettingsForm employee={editing} onSaved={onSaved} onCancel={() => setEditing(null)} />
          </div>
        </div>
      )}
    </div>
  )
}

function EmployeeItemSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 p-3 border border-border rounded-md">
      <div className="flex items-center gap-3 min-w-0">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="min-w-0">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24 mt-1" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-12 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  )
}
