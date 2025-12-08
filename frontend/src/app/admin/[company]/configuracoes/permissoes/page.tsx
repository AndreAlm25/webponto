'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions, Can, PERMISSIONS } from '@/hooks/usePermissions'
import { ProtectedPage } from '@/components/auth/ProtectedPage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2, Shield, Users, Save, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

// Mapeamento de nomes de módulos para português
const MODULE_NAMES: Record<string, string> = {
  dashboard: 'Dashboard',
  employees: 'Funcionários',
  time_entries: 'Registros de Ponto',
  overtime: 'Hora Extra',
  payroll: 'Folha de Pagamento',
  advances: 'Adiantamentos/Vales',
  departments: 'Departamentos',
  positions: 'Cargos',
  geofences: 'Cercas Geográficas',
  messages: 'Mensagens',
  alerts: 'Alertas',
  compliance: 'Conformidade CLT',
  settings: 'Configurações',
  permissions: 'Permissões',
  audit: 'Auditoria',
  terminal: 'Terminal de Ponto',
}

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
  { value: 'MANAGER', label: 'Gerente' },
  { value: 'HR', label: 'RH' },
  { value: 'FINANCIAL', label: 'Financeiro' },
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
  const { hasPermission } = usePermissions()
  const [selectedRole, setSelectedRole] = useState('MANAGER')
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
      console.error('Erro:', error)
      toast.error('Erro ao carregar permissões')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hasPermission(PERMISSIONS.PERMISSIONS_VIEW)) {
      fetchPermissions()
    }
  }, [selectedRole])

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

  return (
    <ProtectedPage permission={PERMISSIONS.PERMISSIONS_VIEW}>
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Configuração de Permissões
          </h1>
          <p className="text-muted-foreground">
            Configure as permissões de acesso para cada função
          </p>
        </div>

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

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Super Admin / Admin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Têm <strong>todas as permissões</strong> automaticamente.
              Não é possível restringir.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gerente / RH / Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Permissões <strong>configuráveis</strong> por empresa.
              Defina o que cada função pode acessar.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Funcionário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Acessa apenas o <strong>painel pessoal</strong>.
              Não tem acesso ao painel admin.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de roles */}
      <Tabs value={selectedRole} onValueChange={setSelectedRole}>
        <TabsList>
          {CONFIGURABLE_ROLES.map(role => (
            <TabsTrigger key={role.value} value={role.value} className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {role.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CONFIGURABLE_ROLES.map(role => (
          <TabsContent key={role.value} value={role.value} className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(permissions).map(([module, perms]) => (
                  <Card key={module}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        {MODULE_NAMES[module] || module}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {perms.map(perm => {
                        const value = getPermissionValue(perm)
                        const changed = isChanged(perm.key)

                        return (
                          <div
                            key={perm.key}
                            className={`flex items-center justify-between py-1 px-2 rounded ${
                              changed ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
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
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Botão de refresh */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={fetchPermissions} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>
    </div>
    </ProtectedPage>
  )
}
