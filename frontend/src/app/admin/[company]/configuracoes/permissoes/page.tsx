'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions, Can, PERMISSIONS } from '@/hooks/usePermissions'
import { ProtectedPage } from '@/components/auth/ProtectedPage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2, Shield, Users, Save, RefreshCw, TrendingUp, Settings, Bell, LayoutDashboard, List, Clock, Scale, Briefcase, Building2, FileText, Wallet, Monitor, MapPin, MessageSquare, FileSearch, CheckSquare, Square, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import PageHeader from '@/components/admin/PageHeader'
import { useParams } from 'next/navigation'

// Mapeamento de ações para português
const ACTION_NAMES: Record<string, string> = {
  view: 'Visualizar',
  create: 'Criar',
  edit: 'Editar',
  delete: 'Excluir',
  export: 'Exportar',
  approve: 'Aprovar',
  reject: 'Rejeitar',
  pay: 'Pagar',
  generate: 'Gerar',
  manage_face: 'Gerenciar Face',
  clock_in: 'Bater Ponto',
}

// Roles configuráveis
const CONFIGURABLE_ROLES = [
  { value: 'MANAGER', label: 'Gerente', icon: Users },
  { value: 'HR', label: 'RH', icon: Briefcase },
  { value: 'FINANCIAL', label: 'Financeiro', icon: Wallet },
]

// Categorias de permissões organizadas
interface CategoryConfig {
  id: string
  label: string
  icon: React.ElementType
  modules: {
    key: string
    label: string
    icon: React.ElementType
    description: string
  }[]
}

const PERMISSION_CATEGORIES: CategoryConfig[] = [
  {
    id: 'analises',
    label: 'Análises',
    icon: TrendingUp,
    modules: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Painel principal com visão geral' },
      { key: 'time_entries', label: 'Registros de Ponto', icon: List, description: 'Histórico de registros de ponto' },
      { key: 'overtime', label: 'Hora Extra', icon: Clock, description: 'Gestão de horas extras' },
      { key: 'compliance', label: 'Conformidade CLT', icon: Scale, description: 'Relatórios de conformidade trabalhista' },
    ],
  },
  {
    id: 'colaboradores',
    label: 'Gestão de Colaboradores',
    icon: Users,
    modules: [
      { key: 'employees', label: 'Funcionários', icon: Users, description: 'Cadastro e gestão de funcionários' },
      { key: 'positions', label: 'Cargos', icon: Briefcase, description: 'Cadastro de cargos' },
      { key: 'departments', label: 'Departamentos', icon: Building2, description: 'Cadastro de departamentos' },
      { key: 'payroll', label: 'Folha de Pagamento', icon: FileText, description: 'Geração e aprovação de holerites' },
      { key: 'advances', label: 'Vales/Adiantamentos', icon: Wallet, description: 'Solicitações de adiantamento' },
      { key: 'terminal', label: 'Terminal de Ponto', icon: Monitor, description: 'Terminal para registro de ponto' },
      { key: 'geofences', label: 'Cercas Geográficas', icon: MapPin, description: 'Áreas permitidas para ponto' },
    ],
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    icon: Settings,
    modules: [
      { key: 'settings', label: 'Config. Gerais', icon: Settings, description: 'Configurações do sistema' },
      { key: 'permissions', label: 'Permissões', icon: Shield, description: 'Gerenciar permissões de acesso' },
      { key: 'audit', label: 'Auditoria', icon: FileSearch, description: 'Logs de atividades do sistema' },
    ],
  },
  {
    id: 'comunicacao',
    label: 'Comunicação',
    icon: Bell,
    modules: [
      { key: 'messages', label: 'Mensagens', icon: MessageSquare, description: 'Comunicação com funcionários' },
      { key: 'alerts', label: 'Alertas', icon: Bell, description: 'Notificações e alertas do sistema' },
    ],
  },
]

interface Permission {
  id: string
  key: string
  action: string
  description: string
  granted?: boolean
}

interface PermissionsByModule {
  [module: string]: Permission[]
}

export default function PermissoesPage() {
  const { user } = useAuth()
  const params = useParams<{ company: string }>()
  const company = params?.company
  const base = company ? `/admin/${encodeURIComponent(company)}` : '/admin'
  const { hasPermission, loading: permissionsLoading } = usePermissions()
  const [selectedRole, setSelectedRole] = useState('MANAGER')
  const [selectedCategory, setSelectedCategory] = useState('analises')
  const [searchQuery, setSearchQuery] = useState('')
  const [permissions, setPermissions] = useState<PermissionsByModule>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changes, setChanges] = useState<Record<string, boolean>>({})

  const api = process.env.NEXT_PUBLIC_API_URL

  // Buscar permissões do role selecionado
  const fetchPermissions = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const res = await fetch(`${api}/api/permissions/role?role=${selectedRole}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setPermissions(data.permissions || {})
        setChanges({})
      } else {
        toast.error('Erro ao carregar permissões')
      }
    } catch (error) {
      toast.error('Erro ao carregar permissões')
    } finally {
      setLoading(false)
    }
  }

  // Buscar permissões quando o role mudar ou quando as permissões do usuário carregarem
  useEffect(() => {
    if (permissionsLoading) return
    fetchPermissions()
  }, [selectedRole, permissionsLoading])

  // Alternar permissão
  const togglePermission = (permKey: string, currentValue: boolean) => {
    setChanges(prev => ({
      ...prev,
      [permKey]: !currentValue,
    }))
  }

  // Verificar se uma permissão foi alterada
  const isChanged = (permKey: string) => {
    return changes.hasOwnProperty(permKey)
  }

  // Obter valor atual da permissão (considerando alterações)
  const getPermissionValue = (perm: Permission) => {
    if (changes.hasOwnProperty(perm.key)) {
      return changes[perm.key]
    }
    return perm.granted || false
  }

  // Salvar alterações
  const saveChanges = async () => {
    if (Object.keys(changes).length === 0) {
      toast.info('Nenhuma alteração para salvar')
      return
    }

    try {
      setSaving(true)
      const token = localStorage.getItem('token')

      const permissionsToUpdate = Object.entries(changes).map(([key, granted]) => ({
        permissionKey: key,
        granted,
      }))

      const res = await fetch(`${api}/api/permissions/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role: selectedRole,
          permissions: permissionsToUpdate,
        }),
      })

      if (res.ok) {
        toast.success('Permissões atualizadas com sucesso!')
        setChanges({})
        fetchPermissions()
      } else {
        const error = await res.json()
        toast.error(error.message || 'Erro ao salvar permissões')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao salvar permissões')
    } finally {
      setSaving(false)
    }
  }

  // Descartar alterações
  const discardChanges = () => {
    setChanges({})
  }

  // Verificar permissão de edição
  const canEdit = hasPermission(PERMISSIONS.PERMISSIONS_EDIT)

  // Contar alterações pendentes
  const pendingChanges = Object.keys(changes).length

  // Contar permissões ativas por módulo
  const countActivePermissions = (moduleKey: string): number => {
    const modulePerms = permissions[moduleKey] || []
    return modulePerms.filter(p => getPermissionValue(p)).length
  }

  // Contar total de permissões por módulo
  const countTotalPermissions = (moduleKey: string): number => {
    return (permissions[moduleKey] || []).length
  }

  // Marcar/desmarcar todas as permissões de um módulo
  const toggleAllModulePermissions = (moduleKey: string, value: boolean) => {
    const modulePerms = permissions[moduleKey] || []
    const newChanges = { ...changes }
    modulePerms.forEach(perm => {
      const currentValue = getPermissionValue(perm)
      if (currentValue !== value) {
        newChanges[perm.key] = value
      } else {
        delete newChanges[perm.key]
      }
    })
    setChanges(newChanges)
  }

  // Verificar se todas as permissões de um módulo estão ativas
  const areAllModulePermissionsActive = (moduleKey: string): boolean => {
    const modulePerms = permissions[moduleKey] || []
    return modulePerms.length > 0 && modulePerms.every(p => getPermissionValue(p))
  }

  // Verificar se alguma permissão de um módulo está ativa
  const hasAnyModulePermissionActive = (moduleKey: string): boolean => {
    const modulePerms = permissions[moduleKey] || []
    return modulePerms.some(p => getPermissionValue(p))
  }

  // Filtrar permissões por busca
  const filterPermissionsBySearch = (moduleKey: string): Permission[] => {
    const modulePerms = permissions[moduleKey] || []
    if (!searchQuery.trim()) return modulePerms
    
    const query = searchQuery.toLowerCase().trim()
    return modulePerms.filter(perm => {
      const actionName = ACTION_NAMES[perm.action] || perm.action
      return (
        actionName.toLowerCase().includes(query) ||
        perm.description.toLowerCase().includes(query) ||
        perm.key.toLowerCase().includes(query)
      )
    })
  }

  // Verificar se um módulo tem resultados na busca
  const moduleHasSearchResults = (moduleKey: string): boolean => {
    if (!searchQuery.trim()) return true
    return filterPermissionsBySearch(moduleKey).length > 0
  }

  // Verificar se uma categoria tem resultados na busca
  const categoryHasSearchResults = (category: CategoryConfig): boolean => {
    if (!searchQuery.trim()) return true
    return category.modules.some(mod => moduleHasSearchResults(mod.key))
  }

  // Ref para o header com os botões
  const headerRef = useRef<HTMLDivElement>(null)
  const [showFloatingButtons, setShowFloatingButtons] = useState(false)

  // Detectar quando o header sai da tela
  useEffect(() => {
    // Aguardar um pouco para o DOM estar pronto
    const timer = setTimeout(() => {
      if (!headerRef.current) return

      const observer = new IntersectionObserver(
        ([entry]) => {
          setShowFloatingButtons(!entry.isIntersecting)
        },
        { threshold: 0, rootMargin: '0px' }
      )

      observer.observe(headerRef.current)

      return () => observer.disconnect()
    }, 100)

    return () => clearTimeout(timer)
  }, [loading])

  return (
    <ProtectedPage permission={PERMISSIONS.PERMISSIONS_VIEW}>
      <PageHeader
        title="Permissões"
        description="Configure as permissões de acesso para cada função"
        icon={<Shield className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Admin', href: base },
          { label: 'Configurações' },
          { label: 'Permissões' }
        ]}
      />
    <div className="container mx-auto py-6 space-y-6">
      {/* Header com botões */}
      <div ref={headerRef} className="flex items-center justify-end">
        {pendingChanges > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{pendingChanges} alterações</Badge>
            <Button variant="outline" size="sm" onClick={discardChanges}>
              Descartar
            </Button>
            <Can permission={PERMISSIONS.PERMISSIONS_EDIT}>
              <Button size="sm" onClick={saveChanges} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar
              </Button>
            </Can>
          </div>
        )}
      </div>

      {/* Botão flutuante - aparece quando o header sai da tela e há alterações */}
      {showFloatingButtons && pendingChanges > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-card border border-border rounded-lg shadow-lg p-3 animate-in slide-in-from-bottom-4 duration-300">
          <Badge variant="secondary" className="bg-yellow-500 text-black border-yellow-600">
            {pendingChanges} alterações
          </Badge>
          <Button variant="outline" size="sm" onClick={discardChanges}>
            Descartar
          </Button>
          <Can permission={PERMISSIONS.PERMISSIONS_EDIT}>
            <Button size="sm" onClick={saveChanges} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </Can>
        </div>
      )}

      {/* Tabs de Roles */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={selectedRole} onValueChange={setSelectedRole}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              {CONFIGURABLE_ROLES.map(role => {
                const RoleIcon = role.icon
                return (
                  <TabsTrigger key={role.value} value={role.value} className="flex items-center gap-2">
                    <RoleIcon className="h-4 w-4" />
                    {role.label}
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {CONFIGURABLE_ROLES.map(role => (
              <TabsContent key={role.value} value={role.value}>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Campo de Busca */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar permissão... (ex: visualizar, criar, funcionários)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-9"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Tabs de Categorias */}
                    <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                      <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
                        {PERMISSION_CATEGORIES.map(category => {
                          const CategoryIcon = category.icon
                          // Contar permissões ativas na categoria
                          const activeInCategory = category.modules.reduce((acc, mod) => acc + countActivePermissions(mod.key), 0)
                          const totalInCategory = category.modules.reduce((acc, mod) => acc + countTotalPermissions(mod.key), 0)
                          
                          return (
                            <TabsTrigger 
                              key={category.id} 
                              value={category.id} 
                              className="flex items-center gap-2 data-[state=active]:bg-background"
                            >
                              <CategoryIcon className="h-4 w-4" />
                              <span className="hidden sm:inline">{category.label}</span>
                              {totalInCategory > 0 && (
                                <Badge 
                                  variant={activeInCategory > 0 ? "default" : "secondary"} 
                                  className={`text-xs px-1.5 py-0 ${activeInCategory > 0 ? 'bg-green-600' : ''}`}
                                >
                                  {activeInCategory}/{totalInCategory}
                                </Badge>
                              )}
                            </TabsTrigger>
                          )
                        })}
                      </TabsList>

                      {PERMISSION_CATEGORIES.map(category => (
                        <TabsContent key={category.id} value={category.id} className="mt-4">
                          {!categoryHasSearchResults(category) ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>Nenhuma permissão encontrada para "{searchQuery}"</p>
                              <button 
                                onClick={() => setSearchQuery('')}
                                className="text-sm text-primary hover:underline mt-2"
                              >
                                Limpar busca
                              </button>
                            </div>
                          ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {category.modules.map(moduleConfig => {
                              const ModuleIcon = moduleConfig.icon
                              const filteredPerms = filterPermissionsBySearch(moduleConfig.key)
                              const activeCount = countActivePermissions(moduleConfig.key)
                              const totalCount = countTotalPermissions(moduleConfig.key)
                              const allActive = areAllModulePermissionsActive(moduleConfig.key)
                              const hasAny = hasAnyModulePermissionActive(moduleConfig.key)

                              // Esconder módulo se não tem permissões ou não tem resultados na busca
                              if (totalCount === 0 || filteredPerms.length === 0) return null

                              return (
                                <Card 
                                  key={moduleConfig.key} 
                                  className={`transition-all ${hasAny ? 'border-green-500/50 bg-green-50/30 dark:bg-green-900/10' : ''}`}
                                >
                                  <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className={`p-2 rounded-lg ${hasAny ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                                          <ModuleIcon className={`h-4 w-4 ${hasAny ? 'text-green-600' : 'text-muted-foreground'}`} />
                                        </div>
                                        <div>
                                          <CardTitle className="text-sm font-semibold">{moduleConfig.label}</CardTitle>
                                          <p className="text-xs text-muted-foreground">{moduleConfig.description}</p>
                                        </div>
                                      </div>
                                      <Badge variant={hasAny ? "default" : "secondary"} className={hasAny ? 'bg-green-600' : ''}>
                                        {activeCount}/{totalCount}
                                      </Badge>
                                    </div>
                                    {/* Botão marcar/desmarcar todos */}
                                    {canEdit && totalCount > 1 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full mt-2 text-xs h-7"
                                        onClick={() => toggleAllModulePermissions(moduleConfig.key, !allActive)}
                                      >
                                        {allActive ? (
                                          <>
                                            <Square className="h-3 w-3 mr-1" />
                                            Desmarcar todos
                                          </>
                                        ) : (
                                          <>
                                            <CheckSquare className="h-3 w-3 mr-1" />
                                            Marcar todos
                                          </>
                                        )}
                                      </Button>
                                    )}
                                  </CardHeader>
                                  <CardContent className="pt-0 space-y-2">
                                    {filteredPerms.map(perm => {
                                      const value = getPermissionValue(perm)
                                      const changed = isChanged(perm.key)

                                      return (
                                        <div
                                          key={perm.key}
                                          className={`flex items-center justify-between py-2 px-3 rounded-lg border transition-all ${
                                            changed 
                                              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700' 
                                              : value 
                                                ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800' 
                                                : 'bg-muted/30 border-transparent'
                                          }`}
                                        >
                                          <div className="flex flex-col">
                                            <span className="text-sm font-medium">
                                              {ACTION_NAMES[perm.action] || perm.action}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                              {perm.description}
                                            </span>
                                          </div>
                                          <Switch
                                            checked={value}
                                            onCheckedChange={() => togglePermission(perm.key, value)}
                                            disabled={!canEdit}
                                          />
                                        </div>
                                      )
                                    })}
                                  </CardContent>
                                </Card>
                              )
                            })}
                          </div>
                          )}
                        </TabsContent>
                      ))}
                    </Tabs>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Legenda e Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500/50 border border-green-500"></div>
            <span>Permissão ativa</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-500/50 border border-yellow-500"></div>
            <span>Alteração pendente</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPermissions} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>
    </div>
    </ProtectedPage>
  )
}
