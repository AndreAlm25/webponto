'use client'

import { useState, useEffect, useCallback } from 'react'
import { Building2, Users, Plus, Search, Power, Key, ChevronDown, ChevronUp, UserPlus, BarChart3, Loader2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

const API = '/api/superadmin'

async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options?.headers || {}) },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || 'Erro na requisição')
  return data
}

interface Company {
  id: string
  tradeName: string
  legalName: string
  cnpj: string
  email: string
  active: boolean
  plan: string
  status: string
  createdAt: string
  _count: { employees: number; users: number }
}

interface Stats {
  totalCompanies: number
  activeCompanies: number
  totalEmployees: number
  totalUsers: number
}

export default function SuperAdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [stats, setStats] = useState<Stats | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [search, setSearch] = useState('')
  const [loadingData, setLoadingData] = useState(true)
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)
  const [companyAdmins, setCompanyAdmins] = useState<Record<string, any[]>>({})

  // Modais
  const [showCreateCompany, setShowCreateCompany] = useState(false)
  const [showCreateAdmin, setShowCreateAdmin] = useState<string | null>(null)
  const [showResetPassword, setShowResetPassword] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Forms
  const [companyForm, setCompanyForm] = useState({ tradeName: '', legalName: '', cnpj: '', email: '', adminName: '', adminEmail: '', adminPassword: '', plan: 'BASIC' })
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', role: 'COMPANY_ADMIN' })
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    if (!loading && user?.role !== 'SUPER_ADMIN') {
      router.push('/login')
    }
  }, [user, loading, router])

  const loadData = useCallback(async () => {
    try {
      setLoadingData(true)
      const [s, c] = await Promise.all([
        apiFetch('/stats'),
        apiFetch(`/companies${search ? `?search=${encodeURIComponent(search)}` : ''}`),
      ])
      setStats(s)
      setCompanies(c)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoadingData(false)
    }
  }, [search])

  useEffect(() => { if (user?.role === 'SUPER_ADMIN') loadData() }, [loadData, user])

  const loadAdmins = async (companyId: string) => {
    if (companyAdmins[companyId]) return
    try {
      const admins = await apiFetch(`/companies/${companyId}/admins`)
      setCompanyAdmins(prev => ({ ...prev, [companyId]: admins }))
    } catch (e: any) { toast.error(e.message) }
  }

  const toggleExpand = (id: string) => {
    if (expandedCompany === id) { setExpandedCompany(null); return }
    setExpandedCompany(id)
    loadAdmins(id)
  }

  const toggleActive = async (id: string) => {
    try {
      await apiFetch(`/companies/${id}/toggle-active`, { method: 'PATCH' })
      toast.success('Status atualizado')
      loadData()
    } catch (e: any) { toast.error(e.message) }
  }

  const toggleAdminActive = async (userId: string, companyId: string) => {
    try {
      await apiFetch(`/admins/${userId}/toggle-active`, { method: 'PATCH' })
      toast.success('Status do usuário atualizado')
      const admins = await apiFetch(`/companies/${companyId}/admins`)
      setCompanyAdmins(prev => ({ ...prev, [companyId]: admins }))
    } catch (e: any) { toast.error(e.message) }
  }

  const handleCreateCompany = async () => {
    if (!companyForm.tradeName || !companyForm.cnpj || !companyForm.adminEmail || !companyForm.adminPassword) {
      toast.error('Preencha todos os campos obrigatórios'); return
    }
    try {
      setSubmitting(true)
      await apiFetch('/companies', { method: 'POST', body: JSON.stringify(companyForm) })
      toast.success('Empresa criada com sucesso!')
      setShowCreateCompany(false)
      setCompanyForm({ tradeName: '', legalName: '', cnpj: '', email: '', adminName: '', adminEmail: '', adminPassword: '', plan: 'BASIC' })
      loadData()
    } catch (e: any) { toast.error(e.message) } finally { setSubmitting(false) }
  }

  const handleCreateAdmin = async (companyId: string) => {
    if (!adminForm.name || !adminForm.email || !adminForm.password) {
      toast.error('Preencha todos os campos'); return
    }
    try {
      setSubmitting(true)
      await apiFetch(`/companies/${companyId}/admins`, { method: 'POST', body: JSON.stringify(adminForm) })
      toast.success('Usuário criado com sucesso!')
      setShowCreateAdmin(null)
      setAdminForm({ name: '', email: '', password: '', role: 'COMPANY_ADMIN' })
      const admins = await apiFetch(`/companies/${companyId}/admins`)
      setCompanyAdmins(prev => ({ ...prev, [companyId]: admins }))
    } catch (e: any) { toast.error(e.message) } finally { setSubmitting(false) }
  }

  const handleResetPassword = async (userId: string) => {
    if (!newPassword || newPassword.length < 6) { toast.error('Senha deve ter pelo menos 6 caracteres'); return }
    try {
      setSubmitting(true)
      await apiFetch(`/admins/${userId}/reset-password`, { method: 'PATCH', body: JSON.stringify({ password: newPassword }) })
      toast.success('Senha redefinida com sucesso!')
      setShowResetPassword(null)
      setNewPassword('')
    } catch (e: any) { toast.error(e.message) } finally { setSubmitting(false) }
  }

  const planLabel: Record<string, string> = { TRIAL: 'Trial', BASIC: 'Básico', PROFESSIONAL: 'Profissional', ENTERPRISE: 'Enterprise' }
  const planColor: Record<string, string> = { TRIAL: 'bg-gray-100 text-gray-700', BASIC: 'bg-blue-100 text-blue-700', PROFESSIONAL: 'bg-purple-100 text-purple-700', ENTERPRISE: 'bg-amber-100 text-amber-700' }

  if (loading || !user) return null

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Painel Super Admin</h1>
          <p className="text-sm text-muted-foreground">Gestão global da plataforma WebPonto</p>
        </div>
        <Button onClick={() => setShowCreateCompany(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Empresa
        </Button>
      </div>

      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total de Empresas', value: stats.totalCompanies, icon: Building2, color: 'text-blue-500' },
              { label: 'Empresas Ativas', value: stats.activeCompanies, icon: Check, color: 'text-green-500' },
              { label: 'Funcionários Ativos', value: stats.totalEmployees, icon: Users, color: 'text-purple-500' },
              { label: 'Usuários Ativos', value: stats.totalUsers, icon: BarChart3, color: 'text-amber-500' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-xl border bg-card p-4 flex items-center gap-3">
                <Icon className={`h-8 w-8 ${color}`} />
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, CNPJ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Lista de Empresas */}
        {loadingData ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-3">
            {companies.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">Nenhuma empresa encontrada</div>
            )}
            {companies.map(company => (
              <div key={company.id} className="rounded-xl border bg-card overflow-hidden">
                {/* Cabeçalho da empresa */}
                <div className="p-4 flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${company.active ? 'bg-green-100' : 'bg-red-100'}`}>
                    <Building2 className={`h-5 w-5 ${company.active ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{company.tradeName}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planColor[company.plan] || 'bg-gray-100 text-gray-700'}`}>
                        {planLabel[company.plan] || company.plan}
                      </span>
                      {!company.active && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Inativa</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{company.cnpj} • {company._count.employees} funcionários • {company._count.users} usuários</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={() => toggleActive(company.id)} className="gap-1 text-xs">
                      <Power className="h-3 w-3" />
                      {company.active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleExpand(company.id)}>
                      {expandedCompany === company.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Expansão: admins */}
                {expandedCompany === company.id && (
                  <div className="border-t border-border bg-muted/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold">Usuários Administradores</p>
                      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => { setShowCreateAdmin(company.id); setAdminForm({ name: '', email: '', password: '', role: 'COMPANY_ADMIN' }) }}>
                        <UserPlus className="h-3 w-3" /> Novo Usuário
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {(companyAdmins[company.id] || []).map((admin: any) => (
                        <div key={admin.id} className="flex items-center gap-3 bg-background rounded-lg px-3 py-2">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${admin.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            {admin.name?.[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{admin.name}</p>
                            <p className="text-xs text-muted-foreground">{admin.email} • {admin.role}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => { setShowResetPassword(admin.id); setNewPassword('') }}>
                              <Key className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => toggleAdminActive(admin.id, company.id)}>
                              {admin.active ? <X className="h-3 w-3 text-red-500" /> : <Check className="h-3 w-3 text-green-500" />}
                            </Button>
                          </div>
                        </div>
                      ))}
                      {(companyAdmins[company.id] || []).length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-2">Nenhum usuário encontrado</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Criar Empresa */}
      <Dialog open={showCreateCompany} onOpenChange={setShowCreateCompany}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Empresa</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Nome Fantasia *</Label>
                <Input value={companyForm.tradeName} onChange={e => setCompanyForm(p => ({ ...p, tradeName: e.target.value }))} placeholder="Beta Solutions" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Razão Social</Label>
                <Input value={companyForm.legalName} onChange={e => setCompanyForm(p => ({ ...p, legalName: e.target.value }))} placeholder="Beta Soluções Ltda" />
              </div>
              <div className="space-y-1">
                <Label>CNPJ *</Label>
                <Input value={companyForm.cnpj} onChange={e => setCompanyForm(p => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" />
              </div>
              <div className="space-y-1">
                <Label>Email da Empresa</Label>
                <Input value={companyForm.email} onChange={e => setCompanyForm(p => ({ ...p, email: e.target.value }))} placeholder="contato@empresa.com" />
              </div>
              <div className="space-y-1">
                <Label>Plano</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={companyForm.plan} onChange={e => setCompanyForm(p => ({ ...p, plan: e.target.value }))}>
                  <option value="TRIAL">Trial</option>
                  <option value="BASIC">Básico</option>
                  <option value="PROFESSIONAL">Profissional</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
            </div>
            <div className="border-t pt-3">
              <p className="text-sm font-semibold mb-3">Administrador da Empresa</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Nome do Admin *</Label>
                  <Input value={companyForm.adminName} onChange={e => setCompanyForm(p => ({ ...p, adminName: e.target.value }))} placeholder="Nome Completo" />
                </div>
                <div className="space-y-1">
                  <Label>Email do Admin *</Label>
                  <Input value={companyForm.adminEmail} onChange={e => setCompanyForm(p => ({ ...p, adminEmail: e.target.value }))} placeholder="admin@empresa.com" />
                </div>
                <div className="space-y-1">
                  <Label>Senha Inicial *</Label>
                  <Input type="password" value={companyForm.adminPassword} onChange={e => setCompanyForm(p => ({ ...p, adminPassword: e.target.value }))} placeholder="Mínimo 6 caracteres" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateCompany(false)}>Cancelar</Button>
            <Button onClick={handleCreateCompany} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Criar Empresa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Criar Admin */}
      <Dialog open={!!showCreateAdmin} onOpenChange={() => setShowCreateAdmin(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={adminForm.name} onChange={e => setAdminForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input value={adminForm.email} onChange={e => setAdminForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Senha *</Label>
              <Input type="password" value={adminForm.password} onChange={e => setAdminForm(p => ({ ...p, password: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Papel</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={adminForm.role} onChange={e => setAdminForm(p => ({ ...p, role: e.target.value }))}>
                <option value="COMPANY_ADMIN">Admin da Empresa</option>
                <option value="MANAGER">Gerente</option>
                <option value="HR">RH</option>
                <option value="FINANCIAL">Financeiro</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateAdmin(null)}>Cancelar</Button>
            <Button onClick={() => showCreateAdmin && handleCreateAdmin(showCreateAdmin)} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Redefinir Senha */}
      <Dialog open={!!showResetPassword} onOpenChange={() => setShowResetPassword(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Redefinir Senha</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Nova Senha</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetPassword(null)}>Cancelar</Button>
            <Button onClick={() => showResetPassword && handleResetPassword(showResetPassword)} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />} Redefinir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
