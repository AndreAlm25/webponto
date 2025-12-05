'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions, PERMISSIONS } from '@/hooks/usePermissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Loader2,
  FileText,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  User,
  Activity,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Mapeamento de ações para badges coloridos
const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  approve: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  reject: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  login: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  logout: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

// Mapeamento de módulos para português
const MODULE_NAMES: Record<string, string> = {
  employees: 'Funcionários',
  time_entries: 'Registros de Ponto',
  overtime: 'Hora Extra',
  payroll: 'Folha de Pagamento',
  advances: 'Adiantamentos',
  departments: 'Departamentos',
  positions: 'Cargos',
  geofences: 'Cercas Geográficas',
  messages: 'Mensagens',
  compliance: 'Conformidade',
  settings: 'Configurações',
  permissions: 'Permissões',
  auth: 'Autenticação',
}

interface AuditLog {
  id: string
  timestamp: string
  userName: string
  userRole: string
  action: string
  module: string
  entityId?: string
  entityName?: string
  oldData?: any
  newData?: any
  ip?: string
  userAgent?: string
  user?: {
    id: string
    name: string
    email: string
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AuditoriaPage() {
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  // Filtros
  const [modules, setModules] = useState<string[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [filterModule, setFilterModule] = useState<string>('')
  const [filterAction, setFilterAction] = useState<string>('')
  const [filterStartDate, setFilterStartDate] = useState<string>('')
  const [filterEndDate, setFilterEndDate] = useState<string>('')

  const api = process.env.NEXT_PUBLIC_API_URL

  // Buscar filtros disponíveis
  const fetchFilters = async () => {
    try {
      const token = localStorage.getItem('token')
      const [modulesRes, actionsRes] = await Promise.all([
        fetch(`${api}/api/audit/modules`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${api}/api/audit/actions`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (modulesRes.ok) {
        const data = await modulesRes.json()
        setModules(data)
      }
      if (actionsRes.ok) {
        const data = await actionsRes.json()
        setActions(data)
      }
    } catch (error) {
      console.error('Erro ao buscar filtros:', error)
    }
  }

  // Buscar logs
  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      })

      if (filterModule) params.append('module', filterModule)
      if (filterAction) params.append('action', filterAction)
      if (filterStartDate) params.append('startDate', filterStartDate)
      if (filterEndDate) params.append('endDate', filterEndDate)

      const res = await fetch(`${api}/api/audit/logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
        setPagination(data.pagination || pagination)
      }
    } catch (error) {
      console.error('Erro ao buscar logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hasPermission(PERMISSIONS.AUDIT_VIEW)) {
      fetchFilters()
      fetchLogs()
    }
  }, [])

  // Aplicar filtros
  const applyFilters = () => {
    fetchLogs(1)
  }

  // Limpar filtros
  const clearFilters = () => {
    setFilterModule('')
    setFilterAction('')
    setFilterStartDate('')
    setFilterEndDate('')
    setTimeout(() => fetchLogs(1), 0)
  }

  // Ver detalhes
  const viewDetails = (log: AuditLog) => {
    setSelectedLog(log)
    setShowDetails(true)
  }

  // Formatar data
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    } catch {
      return dateStr
    }
  }

  // Obter cor do badge de ação
  const getActionColor = (action: string) => {
    return ACTION_COLORS[action.toLowerCase()] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Logs de Auditoria
          </h1>
          <p className="text-muted-foreground">
            Histórico de todas as ações realizadas no sistema
          </p>
        </div>

        <Button variant="outline" onClick={() => fetchLogs(pagination.page)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Select value={filterModule || 'all'} onValueChange={(v) => setFilterModule(v === 'all' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os módulos</SelectItem>
                {modules.map(m => (
                  <SelectItem key={m} value={m}>
                    {MODULE_NAMES[m] || m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterAction || 'all'} onValueChange={(v) => setFilterAction(v === 'all' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                {actions.map(a => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={filterStartDate}
                onChange={e => setFilterStartDate(e.target.value)}
                placeholder="Data início"
              />
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
                placeholder="Data fim"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={applyFilters} className="flex-1">
                Filtrar
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de logs */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mb-4" />
              <p>Nenhum log encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{log.userName}</span>
                        <span className="text-xs text-muted-foreground">{log.userRole}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getActionColor(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {MODULE_NAMES[log.module] || log.module}
                    </TableCell>
                    <TableCell>
                      {log.entityName || log.entityId || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewDetails(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Paginação */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {logs.length} de {pagination.total} registros
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLogs(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLogs(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal de detalhes */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalhes do Log
            </DialogTitle>
            <DialogDescription>
              Informações completas da ação registrada
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data/Hora</label>
                  <p>{formatDate(selectedLog.timestamp)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Usuário</label>
                  <p>{selectedLog.userName} ({selectedLog.userRole})</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Ação</label>
                  <Badge className={getActionColor(selectedLog.action)}>
                    {selectedLog.action}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Módulo</label>
                  <p>{MODULE_NAMES[selectedLog.module] || selectedLog.module}</p>
                </div>
                {selectedLog.entityName && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Entidade</label>
                    <p>{selectedLog.entityName}</p>
                  </div>
                )}
                {selectedLog.ip && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">IP</label>
                    <p>{selectedLog.ip}</p>
                  </div>
                )}
              </div>

              {selectedLog.oldData && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Dados Anteriores</label>
                  <pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.oldData, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.newData && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Novos Dados</label>
                  <pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.newData, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.userAgent && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User Agent</label>
                  <p className="text-xs text-muted-foreground break-all">{selectedLog.userAgent}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
