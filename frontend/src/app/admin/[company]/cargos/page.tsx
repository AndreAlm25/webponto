"use client"
// Código em INGLÊS; textos da UI em PORTUGUÊS
import React, { useEffect, useState, useCallback } from 'react'
import { notFound } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Briefcase, Plus, Search, Pencil, Trash2, Users } from 'lucide-react'
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

interface Position {
  id: string
  name: string
  companyId: string
  _count?: {
    employees: number
  }
}

export default function PositionsPage({ params }: { params: { company: string } }) {
  const { user } = useAuth()
  const { company } = params
  const [searchTerm, setSearchTerm] = useState('')
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [formName, setFormName] = useState('')
  const [saving, setSaving] = useState(false)
  
  // Hook que valida slug
  const { companyId, companySlug, slugMismatch, loading: slugLoading } = useCompanySlug()
  
  const api = process.env.NEXT_PUBLIC_API_URL
  
  if (!company) notFound()
  
  // Exibe erro se slug não corresponde
  if (slugMismatch) {
    return <SlugMismatchError urlSlug={company} correctSlug={companySlug} currentPath={`/admin/${company}/cargos`} />
  }

  // Carregar cargos
  const loadPositions = useCallback(async () => {
    if (!companyId || !api) return
    
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${api}/api/positions?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPositions(Array.isArray(data) ? data : [])
      } else {
        toast.error('Erro ao carregar cargos')
      }
    } catch (error) {
      console.error('Erro ao carregar cargos:', error)
      toast.error('Erro ao carregar cargos')
    } finally {
      setLoading(false)
    }
  }, [companyId, api])

  useEffect(() => {
    loadPositions()
  }, [loadPositions, refreshKey])

  // Criar cargo
  const handleCreate = async () => {
    if (!formName.trim()) {
      toast.error('Digite o nome do cargo')
      return
    }
    
    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${api}/api/positions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ companyId, name: formName.trim() })
      })
      
      if (response.ok) {
        toast.success('Cargo criado com sucesso!')
        setShowAddModal(false)
        setFormName('')
        setRefreshKey(prev => prev + 1)
      } else {
        const data = await response.json()
        toast.error(data.message || 'Erro ao criar cargo')
      }
    } catch (error) {
      toast.error('Erro ao criar cargo')
    } finally {
      setSaving(false)
    }
  }

  // Editar cargo
  const handleEdit = async () => {
    if (!formName.trim() || !selectedPosition) {
      toast.error('Digite o nome do cargo')
      return
    }
    
    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${api}/api/positions/${selectedPosition.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: formName.trim() })
      })
      
      if (response.ok) {
        toast.success('Cargo atualizado com sucesso!')
        setShowEditModal(false)
        setFormName('')
        setSelectedPosition(null)
        setRefreshKey(prev => prev + 1)
      } else {
        const data = await response.json()
        toast.error(data.message || 'Erro ao atualizar cargo')
      }
    } catch (error) {
      toast.error('Erro ao atualizar cargo')
    } finally {
      setSaving(false)
    }
  }

  // Deletar cargo
  const handleDelete = async () => {
    if (!selectedPosition) return
    
    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${api}/api/positions/${selectedPosition.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.ok) {
        toast.success('Cargo excluído com sucesso!')
        setShowDeleteDialog(false)
        setSelectedPosition(null)
        setRefreshKey(prev => prev + 1)
      } else {
        const data = await response.json()
        toast.error(data.message || 'Erro ao excluir cargo')
      }
    } catch (error) {
      toast.error('Erro ao excluir cargo')
    } finally {
      setSaving(false)
    }
  }

  // Abrir modal de edição
  const openEditModal = (position: Position) => {
    setSelectedPosition(position)
    setFormName(position.name)
    setShowEditModal(true)
  }

  // Abrir diálogo de exclusão
  const openDeleteDialog = (position: Position) => {
    setSelectedPosition(position)
    setShowDeleteDialog(true)
  }

  // Filtrar cargos
  const filteredPositions = positions.filter(pos =>
    pos.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const base = company ? `/admin/${encodeURIComponent(company)}` : '/admin'

  return (
    <ProtectedPage permission={PERMISSIONS.POSITIONS_VIEW}>
      <PageContainer>
        <PageHeader
          title="Cargos"
          description="Gerencie os cargos da empresa"
          icon={<Briefcase className="h-6 w-6" />}
          breadcrumbs={[
            { label: 'Admin', href: base },
            { label: 'G. de Colaboradores' },
            { label: 'Cargos' }
          ]}
        />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Lista de cargos - 2 colunas */}
          <section className="lg:col-span-2 border border-border rounded-lg bg-card">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Lista de Cargos</h2>
                  <p className="text-sm text-muted-foreground">Todos os cargos cadastrados</p>
                </div>
                <Can permission={PERMISSIONS.POSITIONS_CREATE}>
                  <Button onClick={() => { setFormName(''); setShowAddModal(true) }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Cargo
                  </Button>
                </Can>
              </div>
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cargos..."
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
              ) : filteredPositions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {searchTerm ? 'Nenhum cargo encontrado' : 'Nenhum cargo cadastrado'}
                </p>
              ) : (
                filteredPositions.map(position => (
                  <div 
                    key={position.id} 
                    className="flex items-center justify-between gap-3 p-3 border border-border rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{position.name}</p>
                        {position._count && (
                          <p className="text-xs text-muted-foreground">
                            {position._count.employees} funcionário(s)
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Can permission={PERMISSIONS.POSITIONS_EDIT}>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openEditModal(position)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Can>
                      <Can permission={PERMISSIONS.POSITIONS_DELETE}>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => openDeleteDialog(position)}
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
              title="Total de Cargos"
              value={positions.length.toString()}
              icon={<Briefcase className="h-5 w-5" />}
              color="blue"
            />
            <InfoCard 
              title="Funcionários Alocados"
              value={positions.reduce((acc, pos) => acc + (pos._count?.employees || 0), 0).toString()}
              icon={<Users className="h-5 w-5" />}
              color="green"
            />
          </div>
        </div>

        {/* Modal de Adicionar */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Cargo</DialogTitle>
              <DialogDescription>
                Cadastre um novo cargo para a empresa
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Cargo</Label>
                <Input
                  id="name"
                  placeholder="Ex: Desenvolvedor, Analista, Gerente..."
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
                {saving ? 'Salvando...' : 'Criar Cargo'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Editar */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Cargo</DialogTitle>
              <DialogDescription>
                Altere o nome do cargo
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome do Cargo</Label>
                <Input
                  id="edit-name"
                  placeholder="Ex: Desenvolvedor, Analista, Gerente..."
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
              <AlertDialogTitle>Excluir Cargo</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o cargo "{selectedPosition?.name}"?
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
