"use client"
// Código em INGLÊS; textos da UI em PORTUGUÊS
import React, { useEffect, useState } from 'react'
import { notFound } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { Users, Plus, Search, UserCheck, Clock, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import EmployeeList from '@/components/admin/EmployeeList'
import AddEmployeeModal from '@/components/admin/AddEmployeeModal'
import EditEmployeeModal from '@/components/admin/EditEmployeeModal'
import { useCompanySlug } from '@/hooks/useCompanySlug'
import { SlugMismatchError } from '@/components/admin/SlugMismatchError'
import PageHeader from '@/components/admin/PageHeader'
import { ProtectedPage } from '@/components/auth/ProtectedPage'
import { PERMISSIONS, Can } from '@/hooks/usePermissions'

export default function EmployeesPage({ params }: { params: { company: string } }) {
  const { user } = useAuth()
  const { company } = params
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [showEditEmployee, setShowEditEmployee] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [employeeStats, setEmployeeStats] = useState({
    total: 0,
    withFacial: 0,
    remote: 0,
    active: 0
  })
  
  // Hook que valida slug
  const { companyId, companySlug, slugMismatch, loading } = useCompanySlug()
  
  // WebSocket para atualização em tempo real
  const { 
    connected, 
    onEmployeeCreated, 
    onEmployeeUpdated, 
    onEmployeeDeleted,
    onFaceRegistered,
    onFaceDeleted
  } = useWebSocket()
  
  if (!company) notFound()
  
  // Exibe erro se slug não corresponde
  if (slugMismatch) {
    return <SlugMismatchError urlSlug={company} correctSlug={companySlug} currentPath={`/admin/${company}/funcionarios`} />
  }

  // Buscar estatísticas dos funcionários
  useEffect(() => {
    const fetchStats = async () => {
      if (!companyId) return
      
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/employees?companyId=${companyId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        
        if (response.ok) {
          const data = await response.json()
          const employees = Array.isArray(data?.employees) ? data.employees : (Array.isArray(data) ? data : [])
          setEmployeeStats({
            total: employees.length,
            withFacial: employees.filter((e: any) => e.allowFacialRecognition).length,
            remote: employees.filter((e: any) => e.allowRemoteClockIn).length,
            active: employees.filter((e: any) => e.status === 'ACTIVE').length
          })
        }
      } catch (error) {
        console.error('Erro ao buscar estatísticas:', error)
      }
    }
    
    fetchStats()
  }, [companyId, refreshKey])

  // WebSocket: Atualizar stats quando funcionário for criado
  useEffect(() => {
    if (!connected) return
    
    const unsubscribe = onEmployeeCreated(() => {
      console.log('[EmployeesPage] 📥 Funcionário criado - atualizando stats')
      setRefreshKey(prev => prev + 1)
    })
    
    return unsubscribe
  }, [connected, onEmployeeCreated])

  // WebSocket: Atualizar stats quando funcionário for atualizado
  useEffect(() => {
    if (!connected) return
    
    const unsubscribe = onEmployeeUpdated(() => {
      console.log('[EmployeesPage] 📥 Funcionário atualizado - atualizando stats')
      setRefreshKey(prev => prev + 1)
    })
    
    return unsubscribe
  }, [connected, onEmployeeUpdated])

  // WebSocket: Atualizar stats quando funcionário for deletado
  useEffect(() => {
    if (!connected) return
    
    const unsubscribe = onEmployeeDeleted(() => {
      console.log('[EmployeesPage] 📥 Funcionário deletado - atualizando stats')
      setRefreshKey(prev => prev + 1)
    })
    
    return unsubscribe
  }, [connected, onEmployeeDeleted])

  // WebSocket: Atualizar stats quando face for registrada
  useEffect(() => {
    if (!connected) return
    
    const unsubscribe = onFaceRegistered(() => {
      console.log('[EmployeesPage] 📥 Face registrada - atualizando stats')
      setRefreshKey(prev => prev + 1)
    })
    
    return unsubscribe
  }, [connected, onFaceRegistered])

  // WebSocket: Atualizar stats quando face for deletada
  useEffect(() => {
    if (!connected) return
    
    const unsubscribe = onFaceDeleted(() => {
      console.log('[EmployeesPage] 📥 Face deletada - atualizando stats')
      setRefreshKey(prev => prev + 1)
    })
    
    return unsubscribe
  }, [connected, onFaceDeleted])

  const base = company ? `/admin/${encodeURIComponent(company)}` : '/admin'

  return (
    <ProtectedPage permission={PERMISSIONS.EMPLOYEES_VIEW}>
      <PageHeader
        title="Funcionários"
        description="Gerencie sua equipe"
        icon={<Users className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Admin', href: base },
          { label: 'G. de Colaboradores' },
          { label: 'Funcionários' }
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de funcionários - 2 colunas */}
        <section className="lg:col-span-2 border border-border rounded-lg bg-card">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Lista de Funcionários</h2>
                <p className="text-sm text-muted-foreground">Todos os colaboradores cadastrados</p>
              </div>
              <Can permission={PERMISSIONS.EMPLOYEES_CREATE}>
                <Button onClick={() => setShowAddEmployee(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </Can>
            </div>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar funcionários..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </div>
          <div className="p-4">
            <EmployeeList 
              key={refreshKey} 
              searchTerm={searchTerm} 
              onEmployeeAdded={() => setRefreshKey(prev => prev + 1)}
              onEditEmployee={(employeeId: string) => {
                setSelectedEmployeeId(employeeId)
                setShowEditEmployee(true)
              }}
            />
          </div>
        </section>

        {/* Cards laterais com informações */}
        <div className="space-y-4">
          <InfoCard 
            title="Total de Funcionários"
            value={employeeStats.total.toString()}
            icon={<Users className="h-5 w-5" />}
            color="blue"
          />
          <InfoCard 
            title="Ativos"
            value={employeeStats.active.toString()}
            icon={<UserCheck className="h-5 w-5" />}
            color="green"
          />
          <InfoCard 
            title="Com Reconhecimento Facial"
            value={employeeStats.withFacial.toString()}
            icon={<Clock className="h-5 w-5" />}
            color="purple"
          />
          <InfoCard 
            title="Ponto Remoto Ativo"
            value={employeeStats.remote.toString()}
            icon={<MapPin className="h-5 w-5" />}
            color="orange"
          />
        </div>
      </div>

      {/* Modal de adicionar funcionário */}
      {companyId && (
        <AddEmployeeModal
          isOpen={showAddEmployee}
          onClose={() => setShowAddEmployee(false)}
          onEmployeeAdded={() => setRefreshKey(prev => prev + 1)}
          companyId={companyId}
        />
      )}

      {/* Modal de editar funcionário */}
      {companyId && selectedEmployeeId && (
        <EditEmployeeModal
          isOpen={showEditEmployee}
          onClose={() => {
            setShowEditEmployee(false)
            setSelectedEmployeeId('')
          }}
          onEmployeeUpdated={() => setRefreshKey(prev => prev + 1)}
          companyId={companyId}
          employeeId={selectedEmployeeId}
        />
      )}
    </ProtectedPage>
  )
}

function InfoCard({ title, value, icon, color }: {
  title: string
  value: string
  icon: React.ReactNode
  color: 'blue' | 'green' | 'purple' | 'orange'
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    purple: 'bg-purple-500/10 text-purple-500',
    orange: 'bg-orange-500/10 text-orange-500',
  }
  
  return (
    <div className="border border-border rounded-lg bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  )
}
