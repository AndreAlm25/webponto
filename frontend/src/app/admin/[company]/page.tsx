"use client"
// Código em INGLÊS; textos da UI em PORTUGUÊS
import React, { useEffect, useState } from 'react'
import { notFound } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Users, Camera, Clock, Bell, MapPin, Plus, Search } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import EmployeeList from '@/components/admin/EmployeeList'
import AddEmployeeModal from '@/components/admin/AddEmployeeModal'
import EditEmployeeModal from '@/components/admin/EditEmployeeModal'
import { useCompanySlug } from '@/hooks/useCompanySlug'
import { SlugMismatchError } from '@/components/admin/SlugMismatchError'

export default function CompanyAdminSlugPage({ params }: { params: { company: string } }) {
  const { user } = useAuth()
  const { company } = params
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [showEditEmployee, setShowEditEmployee] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Log detalhado do slug da URL
  useEffect(() => {
    console.log('🏠 [Dashboard] Página carregada')
    console.log('🏠 [Dashboard] Slug da URL (params.company):', company)
    console.log('🏠 [Dashboard] window.location.pathname:', window.location.pathname)
    console.log('🏠 [Dashboard] window.location.href:', window.location.href)
  }, [company])
  
  // Hook que valida slug
  const { companyId, companySlug, slugMismatch, loading } = useCompanySlug()
  
  useEffect(() => {
    console.log('🏠 [Dashboard] Hook useCompanySlug retornou:')
    console.log('   - companyId:', companyId)
    console.log('   - companySlug:', companySlug)
    console.log('   - slugMismatch:', slugMismatch)
    console.log('   - loading:', loading)
  }, [companyId, companySlug, slugMismatch, loading])
  
  if (!company) notFound()
  
  // Exibe erro se slug não corresponde
  if (slugMismatch) {
    return <SlugMismatchError urlSlug={company} correctSlug={companySlug} currentPath={`/admin/${company}`} />
  }

  return (
    <>
      {/* Stats cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Funcionários" icon={<Users className="h-5 w-5 text-primary" />} value={user?.company ? '—' : '—'} subtitle="em breve" />
        <StatCard title="Com Reconhecimento" icon={<Camera className="h-5 w-5 text-primary" />} value="—" subtitle="em breve" />
        <StatCard title="Registros Hoje" icon={<Clock className="h-5 w-5 text-primary" />} value="—" subtitle="Últimas 24h" />
        <StatCard title="Ponto Remoto" icon={<MapPin className="h-5 w-5 text-primary" />} value={(user as any)?.company?.allowRemoteClockIn ? 'Ativo' : 'Inativo'} subtitle="Config. da empresa" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Funcionários */}
        <section className="lg:col-span-2 border border-border rounded-lg bg-card">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Funcionários</h2>
                <p className="text-sm text-muted-foreground">Gerencie sua equipe</p>
              </div>
              <Button onClick={() => setShowAddEmployee(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
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

        {/* Sidebar direita: registros recentes / notificações */}
        <section className="space-y-4">
          <div className="border border-border rounded-lg bg-card">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold">Registros Recentes</h3>
              <p className="text-sm text-muted-foreground">Últimos registros de ponto</p>
            </div>
            <div className="p-4 space-y-3">
              <EmptyText>Sem registros</EmptyText>
            </div>
          </div>

          <div className="border border-border rounded-lg bg-card">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold">Notificações</h3>
              <p className="text-sm text-muted-foreground">Últimas atualizações</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Bell className="h-4 w-4 text-primary" />
                <span>Nenhuma notificação</span>
              </div>
            </div>
          </div>
        </section>
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
    </>
  )
}

function StatCard({ title, value, subtitle, icon }: { title: string; value: string; subtitle?: string; icon?: React.ReactNode }) {
  return (
    <div className="border border-border rounded-lg bg-card">
      <div className="p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold leading-tight">{value}</p>
          {subtitle ? <p className="text-xs text-muted-foreground mt-1">{subtitle}</p> : null}
        </div>
        <div className="shrink-0">{icon}</div>
      </div>
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
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  )
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground text-center py-6">{children}</p>
}

