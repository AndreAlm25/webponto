"use client"
import React from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { useAuth } from '@/contexts/AuthContext'
import EditEmployeeModal from './EditEmployeeModal'
import EmployeeActionsMenu from './EmployeeActionsMenu'
import AvatarCircle from '@/components/facial/AvatarCircle'
import FacialRecognitionFlow from '@/components/facial/FacialRecognitionFlow'
import { Camera, MapPin } from 'lucide-react'

export type Employee = {
  id: string
  name: string
  email?: string
  photoUrl?: string | null
  roleTitle?: string | null
  status?: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'
  allowRemoteClockIn?: boolean
  allowFacialRecognition?: boolean
  faceRegistered?: boolean
  requireLiveness?: boolean
}

interface EmployeeListProps {
  searchTerm?: string
  onEmployeeAdded?: () => void
  onEditEmployee?: (employeeId: string) => void
}

export default function EmployeeList({ searchTerm = '', onEmployeeAdded, onEditEmployee }: EmployeeListProps) {
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [loading, setLoading] = React.useState(true)
  const [editingEmployeeId, setEditingEmployeeId] = React.useState<string | null>(null)
  const [showFacialCamera, setShowFacialCamera] = React.useState(false)
  const [selectedEmployeeForFace, setSelectedEmployeeForFace] = React.useState<Employee | null>(null)
  const { onEmployeeCreated, onEmployeeUpdated, onEmployeeDeleted, connected } = useWebSocket()
  const { user } = useAuth()

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
      console.log('[DEBUG] Funcionários carregados:', items.map(e => ({
        name: e.name,
        allowFacialRecognition: e.allowFacialRecognition,
        faceRegistered: e.faceRegistered
      })))
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

    const unsubscribe = onEmployeeCreated((employee) => {
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

    const unsubscribe = onEmployeeUpdated((employee) => {
      // Recarregar lista completa para garantir dados atualizados
      load()
      toast.info('Funcionário atualizado', {
        description: employee.user?.name || 'Funcionário'
      })
    })

    return unsubscribe
  }, [connected, onEmployeeUpdated, load])

  // WebSocket: Atualizar quando funcionário for deletado
  React.useEffect(() => {
    if (!connected) return

    const unsubscribe = onEmployeeDeleted((data) => {
      // Remover da lista local
      setEmployees(prev => prev.filter(e => e.id !== data.id))
      toast.error('Funcionário removido', {
        description: 'O funcionário foi excluído do sistema'
      })
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

  async function deleteFace(emp: Employee) {
    try {
      if (!api) return
      const token = localStorage.getItem('token') || localStorage.getItem('employee_token') || undefined
      const res = await fetch(`${api}/api/time-entries/facial/${emp.id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.message || 'Falha ao excluir reconhecimento facial')
      }
      toast.success('Reconhecimento facial excluído com sucesso!')
      // Recarregar lista completa para garantir dados atualizados
      load()
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir reconhecimento facial')
    }
  }

  function openFacialCamera(emp: Employee) {
    setSelectedEmployeeForFace(emp)
    setShowFacialCamera(true)
  }

  const handleFacialSuccess = React.useCallback(async (result: any) => {
    setShowFacialCamera(false)
    toast.success('Face cadastrada com sucesso!')
    setSelectedEmployeeForFace(null)
    // Recarregar lista completa para garantir dados atualizados
    load()
  }, [load])

  const handleFacialError = React.useCallback((error: string) => {
    setShowFacialCamera(false)
    toast.error(error || 'Erro ao cadastrar face')
    setSelectedEmployeeForFace(null)
  }, [])

  function handleEmployeeUpdated() {
    load() // Recarregar lista
    setEditingEmployeeId(null)
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
                onEdit={(e) => setEditingEmployeeId(e.id)}
                onDeactivate={toggleActive}
                onDelete={remove}
                onDisableFaceRecognition={deleteFace}
                onRegisterFace={openFacialCamera}
                hasFaceRegistered={emp.faceRegistered || false}
                allowFacialRecognition={emp.allowFacialRecognition || false}
              />
            </div>
          </div>
        ))
      )}

      {editingEmployeeId && (
        <EditEmployeeModal
          isOpen={true}
          onClose={() => setEditingEmployeeId(null)}
          onEmployeeUpdated={handleEmployeeUpdated}
          companyId={String(user?.companyId || '')}
          employeeId={editingEmployeeId}
        />
      )}

      {/* Modal da câmera facial */}
      {showFacialCamera && selectedEmployeeForFace && (
        <FacialRecognitionFlow
          mode="registration"
          authMode="admin"
          userId={selectedEmployeeForFace.id}
          userEmail={selectedEmployeeForFace.email}
          onRegistrationSuccess={handleFacialSuccess}
          onRegistrationError={handleFacialError}
          autoOpenCamera={true}
          showButton={false}
        />
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
