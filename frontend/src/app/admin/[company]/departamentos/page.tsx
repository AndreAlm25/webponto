"use client"
// Código em INGLÊS; textos da UI em PORTUGUÊS
import React, { useEffect, useState, useCallback } from 'react'
import { notFound } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Building2, Plus, Search, Pencil, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCompanySlug } from '@/hooks/useCompanySlug'
import { SlugMismatchError } from '@/components/admin/SlugMismatchError'
import PageHeader from '@/components/admin/PageHeader'
import PageContainer from '@/components/admin/PageContainer'
import { ProtectedPage } from '@/components/auth/ProtectedPage'
import { PERMISSIONS, Can } from '@/hooks/usePermissions'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'

interface Department {
  id: string
  name: string
  companyId: string
  _count?: {
    employees: number
  }
}

export default function DepartmentsPage({ params }: { params: { company: string } }) {
  const { user } = useAuth()
  const { company } = params
  const [searchTerm, setSearchTerm] = useState('')
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [formName, setFormName] = useState('')
  const [saving, setSaving] = useState(false)
  
  // Hook que valida slug
  const { companyId, companySlug, slugMismatch, loading: slugLoading } = useCompanySlug()
  
  const api = process.env.NEXT_PUBLIC_API_URL
  
  if (!company) notFound()
  
  // Exibe erro se slug não corresponde
  if (slugMismatch) {
    return <SlugMismatchError urlSlug={company} correctSlug={companySlug} currentPath={`/admin/${company}/departamentos`} />
  }

  // Carregar departamentos
  const loadDepartments = useCallback(async () => {
    if (!companyId || !api) return
    
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${api}/api/departments?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setDepartments(Array.isArray(data) ? data : [])
      } else {
        toast.error('Erro ao carregar departamentos')
      }
    } catch (error) {
      console.error('Erro ao carregar departamentos:', error)
      toast.error('Erro ao carregar departamentos')
    } finally {
      setLoading(false)
    }
  }, [companyId, api])

  useEffect(() => {
    loadDepartments()
  }, [loadDepartments, refreshKey])

  // Criar departamento
  const handleCreate = async () => {
    if (!formName.trim()) {
      toast.error('Digite o nome do departamento')
      return
    }
    
    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${api}/api/departments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ companyId, name: formName.trim() })
      })
      
      if (response.ok) {
        toast.success('Departamento criado com sucesso!')
        setShowAddModal(false)
        setFormName('')
        setRefreshKey(prev => prev + 1)
      } else {
        const data = await response.json()
        toast.error(data.message || 'Erro ao criar departamento')
      }
    } catch (error) {
      toast.error('Erro ao criar departamento')
    } finally {
      setSaving(false)
    }
  }

  // Editar departamento
  const handleEdit = async () => {
    if (!formName.trim() || !selectedDepartment) {
      toast.error('Digite o nome do departamento')
      return
    }
    
    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${api}/api/departments/${selectedDepartment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: formName.trim() })
      })
      
      if (response.ok) {
        toast.success('Departamento atualizado com sucesso!')
        setShowEditModal(false)
        setFormName('')
        setSelectedDepartment(null)
        setRefreshKey(prev => prev + 1)
      } else {
        const data = await response.json()
        toast.error(data.message || 'Erro ao atualizar departamento')
      }
    } catch (error) {
      toast.error('Erro ao atualizar departamento')
    } finally {
      setSaving(false)
    }
  }

  // Deletar departamento
  const handleDelete = async () => {
    if (!selectedDepartment) return
    
    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${api}/api/departments/${selectedDepartment.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.ok) {
        toast.success('Departamento excluído com sucesso!')
        setShowDeleteDialog(false)
        setSelectedDepartment(null)
        setRefreshKey(prev => prev + 1)
      } else {
        const data = await response.json()
        toast.error(data.message || 'Erro ao excluir departamento')
      }
    } catch (error) {
      toast.error('Erro ao excluir departamento')
    } finally {
      setSaving(false)
    }
  }

  // Abrir modal de edição
  const openEditModal = (department: Department) => {
    setSelectedDepartment(department)
    setFormName(department.name)
    setShowEditModal(true)
  }

  // Abrir diálogo de exclusão
  const openDeleteDialog = (department: Department) => {
    setSelectedDepartment(department)
    setShowDeleteDialog(true)
  }

  // Filtrar departamentos
  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const base = company ? `/admin/${encodeURIComponent(company)}` : '/admin'

  return (
    <ProtectedPage permission={PERMISSIONS.DEPARTMENTS_VIEW}>
      <PageContainer>
        <PageHeader
          title="Departamentos"
          description="Gerencie os departamentos da empresa"
          icon={<Building2 className="h-6 w-6" />}
          breadcrumbs={[
            { label: 'Admin', href: base },
            { label: 'G. de Colaboradores' },
            { label: 'Departamentos' }
          ]}
        />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Lista de departamentos - 2 colunas */}
          <section className="lg:col-span-2 border border-border rounded-lg bg-card">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Lista de Departamentos</h2>
                  <p className="text-sm text-muted-foreground">Todos os departamentos cadastrados</p>
                </div>
                <Can permission={PERMISSIONS.DEPARTMENTS_CREATE}>
                  <Button onClick={() => { setFormName(''); setShowAddModal(true) }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Departamento
                  </Button>
                </Can>
              </div>
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar departamentos..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </div>
            <div className="p-4 space-y-3">
              {loading ? (
                <>
                  <ItemSkeleton />
                  <ItemSkeleton />
                  <ItemSkeleton />
                </>
              ) : filteredDepartments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {searchTerm ? 'Nenhum departamento encontrado' : 'Nenhum departamento cadastrado'}
                </p>
              ) : (
                filteredDepartments.map(department => (
                  <div 
                    key={department.id} 
                    className="flex items-center justify-between gap-3 p-3 border border-border rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{department.name}</p>
                        {department._count && (
                          <p className="text-xs text-muted-foreground">
                            {department._count.employees} funcionário(s)
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Can permission={PERMISSIONS.DEPARTMENTS_EDIT}>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openEditModal(department)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Can>
                      <Can permission={PERMISSIONS.DEPARTMENTS_DELETE}>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => openDeleteDialog(department)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </Can>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Cards laterais */}
          <div className="space-y-4">
            <InfoCard 
              title="Total de Departamentos"
              value={departments.length.toString()}
              icon={<Building2 className="h-5 w-5" />}
              color="purple"
            />
            <InfoCard 
              title="Funcionários Alocados"
              value={departments.reduce((acc, dept) => acc + (dept._count?.employees || 0), 0).toString()}
              icon={<Users className="h-5 w-5" />}
              color="green"
            />
          </div>
        </div>

        {/* Modal de Adicionar */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Departamento</DialogTitle>
              <DialogDescription>
                Cadastre um novo departamento para a empresa
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Departamento</Label>
                <Input
                  id="name"
                  placeholder="Ex: TI, RH, Financeiro, Comercial..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? 'Salvando...' : 'Criar Departamento'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Editar */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Departamento</DialogTitle>
              <DialogDescription>
                Altere o nome do departamento
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome do Departamento</Label>
                <Input
                  id="edit-name"
                  placeholder="Ex: TI, RH, Financeiro, Comercial..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditModal(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleEdit} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Diálogo de Confirmação de Exclusão */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Departamento</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o departamento "{selectedDepartment?.name}"?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete} 
                disabled={saving}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {saving ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageContainer>
    </ProtectedPage>
  )
}

function ItemSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 p-3 border border-border rounded-md">
      <div className="flex items-center gap-3 min-w-0">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="min-w-0">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20 mt-1" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </div>
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
