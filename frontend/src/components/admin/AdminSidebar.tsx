"use client"
// Sidebar do Admin (código em inglês; textos em português)
import { useParams, usePathname, useRouter } from 'next/navigation'
import React from 'react'
import { Briefcase, Building2, Clock, MapPin, Settings, Users, LayoutDashboard, ChevronDown, ChevronRight, FileText, ClockAlert, Bell, Scale, ClockIcon, TrendingUp, List, Monitor, Wallet, Shield, FileSearch } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions, PERMISSIONS } from '@/hooks/usePermissions'

export default function AdminSidebar({ collapsed }: { collapsed: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams<{ company?: string }>()
  const company = String(params?.company || '')
  const { user } = useAuth()
  const { hasPermission, hasAnyPermission, loading: permissionsLoading } = usePermissions()
  const [expandedMenus, setExpandedMenus] = React.useState<string[]>([])
  const [dropdownOpen, setDropdownOpen] = React.useState(false)
  const [activeDropdown, setActiveDropdown] = React.useState<string | null>(null)
  const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, left: 0 })
  const [overtimePending, setOvertimePending] = React.useState(0)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  const labelClass = collapsed ? 'hidden' : 'inline'
  const itemClass = collapsed ? 'justify-center gap-0' : 'justify-start gap-3'
  const iconSize = collapsed ? 'h-5 w-5' : 'h-4 w-4'

  const base = company ? `/admin/${encodeURIComponent(company)}` : '/admin'
  
  const toggleMenu = (menuId: string) => {
    if (collapsed) return // Não expande se sidebar está colapsada
    setExpandedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    )
  }
  
  const handleDropdownClick = (e: React.MouseEvent<HTMLButtonElement>, menuId: string = 'gestao') => {
    if (!collapsed) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    setDropdownPosition({
      top: rect.top,
      left: rect.right + 8
    })
    setActiveDropdown(menuId)
    setDropdownOpen(!dropdownOpen)
  }
  
  // Fechar dropdown ao clicar fora
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownOpen &&
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  // Buscar contador de horas extras pendentes
  React.useEffect(() => {
    const fetchOvertimePending = async () => {
      if (!user?.companyId) return
      
      try {
        const token = localStorage.getItem('token')
        if (!token) return

        const api = process.env.NEXT_PUBLIC_API_URL
        const res = await fetch(`${api}/api/overtime/stats?companyId=${user.companyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setOvertimePending(data.pending || 0)
        }
      } catch (error) {
        console.error('Erro ao buscar pendentes:', error)
      }
    }

    fetchOvertimePending()
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchOvertimePending, 30000)
    return () => clearInterval(interval)
  }, [user?.companyId])
  
  const isActive = (href: string) => pathname === href
  const isMenuExpanded = (menuId: string) => expandedMenus.includes(menuId) && !collapsed

  return (
    <aside className={`h-full w-full bg-card shadow-sm flex flex-col`}>
      <nav className="flex-1 overflow-auto py-2 space-y-1">
        {/* Dashboard */}
        {hasPermission(PERMISSIONS.DASHBOARD_VIEW) && (
          <button
            onClick={() => router.push(base)}
            className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${itemClass} ${
              isActive(base) ? 'bg-muted/50 font-medium' : ''
            }`}
          >
            <LayoutDashboard className={`${iconSize}`} />
            <span className={`${labelClass}`}>Dashboard</span>
          </button>
        )}

        {/* Análises */}
        {hasAnyPermission([PERMISSIONS.TIME_ENTRIES_VIEW, PERMISSIONS.OVERTIME_VIEW, PERMISSIONS.COMPLIANCE_VIEW]) && (
          <div className="relative">
            <button
              onClick={(e) => {
                if (collapsed) {
                  handleDropdownClick(e, 'analises')
                } else {
                  toggleMenu('analises')
                }
              }}
              className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${itemClass}`}
            >
              <TrendingUp className={`${iconSize}`} />
              <span className={`${labelClass} flex-1 text-left`}>Análises</span>
              {!collapsed && (
                isMenuExpanded('analises') 
                  ? <ChevronDown className="h-4 w-4" />
                  : <ChevronRight className="h-4 w-4" />
              )}
            </button>
          
            {/* Submenu normal (sidebar aberta) */}
            {isMenuExpanded('analises') && !collapsed && (
              <div className="ml-6 border-l border-border space-y-1">
                {hasPermission(PERMISSIONS.TIME_ENTRIES_VIEW) && (
                  <button
                    onClick={() => router.push(`${base}/analises/registros`)}
                    className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                      isActive(`${base}/analises/registros`) ? 'bg-muted/50 font-medium' : ''
                    }`}
                  >
                    <List className="h-3 w-3 mr-2" />
                    <span>Registros</span>
                  </button>
                )}
                {hasPermission(PERMISSIONS.OVERTIME_VIEW) && (
                  <button
                    onClick={() => router.push(`${base}/analises/hora-extra`)}
                    className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                      isActive(`${base}/analises/hora-extra`) ? 'bg-muted/50 font-medium' : ''
                    }`}
                  >
                    <ClockIcon className="h-3 w-3 mr-2" />
                    <div className="flex items-center justify-between flex-1">
                      <span>Hora Extra</span>
                      {overtimePending > 0 && (
                        <span className="bg-yellow-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {overtimePending}
                        </span>
                      )}
                    </div>
                  </button>
                )}
                {hasPermission(PERMISSIONS.COMPLIANCE_VIEW) && (
                  <button
                    onClick={() => router.push(`${base}/analises/conformidade-clt`)}
                    className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                      isActive(`${base}/analises/conformidade-clt`) ? 'bg-muted/50 font-medium' : ''
                    }`}
                  >
                    <Scale className="h-3 w-3 mr-2" />
                    <span>Conformidade CLT</span>
                  </button>
                )}
              </div>
            )}

          {/* Dropdown (sidebar colapsada) */}
          {collapsed && dropdownOpen && activeDropdown === 'analises' && (
            <div 
              ref={dropdownRef}
              className="fixed z-[100] min-w-[220px] bg-card border border-border rounded-lg shadow-2xl py-2"
              style={{ 
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`
              }}
            >
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border mb-1">
                Análises
              </div>
              {hasPermission(PERMISSIONS.TIME_ENTRIES_VIEW) && (
                <button
                  onClick={() => {
                    router.push(`${base}/analises/registros`)
                    setDropdownOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                    isActive(`${base}/analises/registros`) ? 'bg-muted/50 font-medium' : ''
                  }`}
                >
                  <List className="h-4 w-4 mr-2" />
                  <span>Registros</span>
                </button>
              )}
              {hasPermission(PERMISSIONS.OVERTIME_VIEW) && (
                <button
                  onClick={() => {
                    router.push(`${base}/analises/hora-extra`)
                    setDropdownOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                    isActive(`${base}/analises/hora-extra`) ? 'bg-muted/50 font-medium' : ''
                  }`}
                >
                  <ClockIcon className="h-4 w-4 mr-2" />
                  <div className="flex items-center justify-between flex-1">
                    <span>Hora Extra</span>
                    {overtimePending > 0 && (
                      <span className="bg-yellow-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-2">
                        {overtimePending}
                      </span>
                    )}
                  </div>
                </button>
              )}
              {hasPermission(PERMISSIONS.COMPLIANCE_VIEW) && (
                <button
                  onClick={() => {
                    router.push(`${base}/analises/conformidade-clt`)
                    setDropdownOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                    isActive(`${base}/analises/conformidade-clt`) ? 'bg-muted/50 font-medium' : ''
                  }`}
                >
                  <Scale className="h-4 w-4 mr-2" />
                  <span>Conformidade CLT</span>
                </button>
              )}
            </div>
          )}
          </div>
        )}

        {/* Gestão de Colaboradores */}
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={(e) => {
              if (collapsed) {
                handleDropdownClick(e)
              } else {
                toggleMenu('gestao')
              }
            }}
            className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${itemClass}`}
          >
            <Users className={`${iconSize}`} />
            <span className={`${labelClass} flex-1 text-left`}>G. de Colaboradores</span>
            {!collapsed && (
              isMenuExpanded('gestao') 
                ? <ChevronDown className="h-4 w-4" />
                : <ChevronRight className="h-4 w-4" />
            )}
          </button>
          
          {/* Submenu normal (sidebar aberta) */}
          {isMenuExpanded('gestao') && !collapsed && (
            <div className="ml-6 border-l border-border space-y-1">
              {hasPermission(PERMISSIONS.EMPLOYEES_VIEW) && (
                <button
                  onClick={() => router.push(`${base}/funcionarios`)}
                  className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                    isActive(`${base}/funcionarios`) ? 'bg-muted/50 font-medium' : ''
                  }`}
                >
                  <Users className="h-3 w-3 mr-2" />
                  <span>Funcionários</span>
                </button>
              )}
              {hasPermission(PERMISSIONS.POSITIONS_VIEW) && (
                <button
                  onClick={() => router.push(`${base}/cargos`)}
                  className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                    isActive(`${base}/cargos`) ? 'bg-muted/50 font-medium' : ''
                  }`}
                >
                  <Briefcase className="h-3 w-3 mr-2" />
                  <span>Cargos</span>
                </button>
              )}
              {hasPermission(PERMISSIONS.DEPARTMENTS_VIEW) && (
                <button
                  onClick={() => router.push(`${base}/departamentos`)}
                  className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                    isActive(`${base}/departamentos`) ? 'bg-muted/50 font-medium' : ''
                  }`}
                >
                  <Building2 className="h-3 w-3 mr-2" />
                  <span>Departamentos</span>
                </button>
              )}
              {hasPermission(PERMISSIONS.PAYROLL_VIEW) && (
                <button
                  onClick={() => router.push(`${base}/folha-pagamento`)}
                  className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                    isActive(`${base}/folha-pagamento`) ? 'bg-muted/50 font-medium' : ''
                  }`}
                >
                  <FileText className="h-3 w-3 mr-2" />
                  <span>Folha de Pagamento</span>
                </button>
              )}
              {hasPermission(PERMISSIONS.ADVANCES_VIEW) && (
                <button
                  onClick={() => router.push(`${base}/vales`)}
                  className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                    isActive(`${base}/vales`) ? 'bg-muted/50 font-medium' : ''
                  }`}
                >
                  <Wallet className="h-3 w-3 mr-2" />
                  <span>Vales</span>
                </button>
              )}
              {hasPermission(PERMISSIONS.TERMINAL_VIEW) && (
                <button
                  onClick={() => router.push(`${base}/terminal-de-ponto`)}
                  className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                    isActive(`${base}/terminal-de-ponto`) ? 'bg-muted/50 font-medium' : ''
                  }`}
                >
                  <Clock className="h-3 w-3 mr-2" />
                  <span>Terminal de Ponto</span>
                </button>
              )}
              {hasPermission(PERMISSIONS.GEOFENCES_VIEW) && (
                <button
                  onClick={() => router.push(`${base}/cercas-geograficas`)}
                  className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                    isActive(`${base}/cercas-geograficas`) ? 'bg-muted/50 font-medium' : ''
                  }`}
                >
                  <MapPin className="h-3 w-3 mr-2" />
                  <span>Cercas Geográficas</span>
                </button>
              )}
            </div>
          )}
          
          {/* Dropdown (sidebar colapsada) - por cima de tudo */}
          {collapsed && dropdownOpen && activeDropdown === 'gestao' && (
            <div 
              ref={dropdownRef}
              className="fixed z-[100] min-w-[220px] bg-card border border-border rounded-lg shadow-2xl py-2"
              style={{ 
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`
              }}
            >
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border mb-1">
                Gestão de Colaboradores
              </div>
              {hasPermission(PERMISSIONS.EMPLOYEES_VIEW) && (
                <button
                  onClick={() => {
                    router.push(`${base}/funcionarios`)
                    setDropdownOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                    isActive(`${base}/funcionarios`) ? 'bg-muted/50 font-medium' : ''
                  }`}
                >
                  <Users className="h-4 w-4 mr-2" />
                  <span>Funcionários</span>
                </button>
              )}
              {hasPermission(PERMISSIONS.POSITIONS_VIEW) && (
                <button
                  onClick={() => {
                    router.push(`${base}/cargos`)
                    setDropdownOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                    isActive(`${base}/cargos`) ? 'bg-muted/50 font-medium' : ''
                  }`}
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  <span>Cargos</span>
                </button>
              )}
              {hasPermission(PERMISSIONS.DEPARTMENTS_VIEW) && (
                <button
                  onClick={() => {
                    router.push(`${base}/departamentos`)
                    setDropdownOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                    isActive(`${base}/departamentos`) ? 'bg-muted/50 font-medium' : ''
                  }`}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  <span>Departamentos</span>
                </button>
              )}
              {hasPermission(PERMISSIONS.PAYROLL_VIEW) && (
                <button
                  onClick={() => {
                    router.push(`${base}/folha-pagamento`)
                    setDropdownOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                    isActive(`${base}/folha-pagamento`) ? 'bg-muted/50 font-medium' : ''
                  }`}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  <span>Folha de Pagamento</span>
                </button>
              )}
              {hasPermission(PERMISSIONS.ADVANCES_VIEW) && (
                <button
                  onClick={() => {
                    router.push(`${base}/vales`)
                    setDropdownOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                    isActive(`${base}/vales`) ? 'bg-muted/50 font-medium' : ''
                  }`}
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  <span>Vales</span>
                </button>
              )}
              {hasPermission(PERMISSIONS.TERMINAL_VIEW) && (
                <button
                  onClick={() => {
                    router.push(`${base}/terminal-de-ponto`)
                    setDropdownOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                    isActive(`${base}/terminal-de-ponto`) ? 'bg-muted/50 font-medium' : ''
                  }`}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  <span>Terminal de Ponto</span>
                </button>
              )}
              {hasPermission(PERMISSIONS.GEOFENCES_VIEW) && (
                <button
                  onClick={() => {
                    router.push(`${base}/cercas-geograficas`)
                    setDropdownOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                    isActive(`${base}/cercas-geograficas`) ? 'bg-muted/50 font-medium' : ''
                  }`}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>Cercas Geográficas</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Alertas */}
        {hasPermission(PERMISSIONS.ALERTS_VIEW) && (
          <button
            onClick={() => router.push(`${base}/alertas`)}
            className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${itemClass} ${
              isActive(`${base}/alertas`) ? 'bg-muted/50 font-medium' : ''
            }`}
          >
            <Bell className={`${iconSize}`} />
            <span className={`${labelClass} flex-1 text-left`}>Alertas</span>
          </button>
        )}

        {/* Configurações (Menu Expansível) */}
        <div className="relative">
          <button
            onClick={(e) => {
              if (collapsed) {
                handleDropdownClick(e, 'config')
              } else {
                toggleMenu('configuracoes')
              }
            }}
            className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${itemClass}`}
          >
            <Settings className={`${iconSize}`} />
            <span className={`${labelClass} flex-1 text-left`}>Config. da Empresa</span>
            {!collapsed && (
              isMenuExpanded('configuracoes') ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {/* Submenu normal (sidebar aberta) */}
          {isMenuExpanded('configuracoes') && !collapsed && (
            <div className="ml-6 border-l border-border space-y-1">
              <button
                onClick={() => router.push(`${base}/configuracoes/dashboard`)}
                className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                  isActive(`${base}/configuracoes/dashboard`) ? 'bg-muted/50 font-medium' : ''
                }`}
              >
                <Monitor className="h-3 w-3 mr-2" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => router.push(`${base}/configuracoes/folha-pagamento`)}
                className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                  isActive(`${base}/configuracoes/folha-pagamento`) ? 'bg-muted/50 font-medium' : ''
                }`}
              >
                <FileText className="h-3 w-3 mr-2" />
                <span>Folha de Pagamento</span>
              </button>
              <button
                onClick={() => router.push(`${base}/configuracoes/conformidade`)}
                className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                  isActive(`${base}/configuracoes/conformidade`) ? 'bg-muted/50 font-medium' : ''
                }`}
              >
                <Scale className="h-3 w-3 mr-2" />
                <span>Conformidade CLT</span>
              </button>
              <button
                onClick={() => router.push(`${base}/configuracoes/aplicativo`)}
                className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                  isActive(`${base}/configuracoes/aplicativo`) ? 'bg-muted/50 font-medium' : ''
                }`}
              >
                <Settings className="h-3 w-3 mr-2" />
                <span>Aplicativo</span>
              </button>
              {hasPermission(PERMISSIONS.PERMISSIONS_VIEW) && (
                <button
                  onClick={() => router.push(`${base}/configuracoes/permissoes`)}
                  className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                    isActive(`${base}/configuracoes/permissoes`) ? 'bg-muted/50 font-medium' : ''
                  }`}
                >
                  <Shield className="h-3 w-3 mr-2" />
                  <span>Permissões</span>
                </button>
              )}
              {hasPermission(PERMISSIONS.AUDIT_VIEW) && (
                <button
                  onClick={() => router.push(`${base}/auditoria`)}
                  className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                    isActive(`${base}/auditoria`) ? 'bg-muted/50 font-medium' : ''
                  }`}
                >
                  <FileSearch className="h-3 w-3 mr-2" />
                  <span>Auditoria</span>
                </button>
              )}
            </div>
          )}

          {/* Dropdown (sidebar colapsada) - por cima de tudo */}
          {collapsed && dropdownOpen && activeDropdown === 'config' && (
            <div 
              ref={dropdownRef}
              className="fixed z-[100] min-w-[220px] bg-card border border-border rounded-lg shadow-2xl py-2"
              style={{ 
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`
              }}
            >
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border mb-1">
                Config. da Empresa
              </div>
              <button
                onClick={() => {
                  router.push(`${base}/configuracoes/dashboard`)
                  setDropdownOpen(false)
                }}
                className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                  isActive(`${base}/configuracoes/dashboard`) ? 'bg-muted/50 font-medium' : ''
                }`}
              >
                <Monitor className="h-4 w-4 mr-2" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => {
                  router.push(`${base}/configuracoes/folha-pagamento`)
                  setDropdownOpen(false)
                }}
                className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                  isActive(`${base}/configuracoes/folha-pagamento`) ? 'bg-muted/50 font-medium' : ''
                }`}
              >
                <FileText className="h-4 w-4 mr-2" />
                <span>Folha de Pagamento</span>
              </button>
              <button
                onClick={() => {
                  router.push(`${base}/configuracoes/conformidade`)
                  setDropdownOpen(false)
                }}
                className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                  isActive(`${base}/configuracoes/conformidade`) ? 'bg-muted/50 font-medium' : ''
                }`}
              >
                <Scale className="h-4 w-4 mr-2" />
                <span>Conformidade CLT</span>
              </button>
              <button
                onClick={() => {
                  router.push(`${base}/configuracoes/aplicativo`)
                  setDropdownOpen(false)
                }}
                className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                  isActive(`${base}/configuracoes/aplicativo`) ? 'bg-muted/50 font-medium' : ''
                }`}
              >
                <Settings className="h-4 w-4 mr-2" />
                <span>Aplicativo</span>
              </button>
              {hasPermission(PERMISSIONS.PERMISSIONS_VIEW) && (
                <button
                  onClick={() => {
                    router.push(`${base}/configuracoes/permissoes`)
                    setDropdownOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                    isActive(`${base}/configuracoes/permissoes`) ? 'bg-muted/50 font-medium' : ''
                  }`}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  <span>Permissões</span>
                </button>
              )}
              {hasPermission(PERMISSIONS.AUDIT_VIEW) && (
                <button
                  onClick={() => {
                    router.push(`${base}/auditoria`)
                    setDropdownOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                    isActive(`${base}/auditoria`) ? 'bg-muted/50 font-medium' : ''
                  }`}
                >
                  <FileSearch className="h-4 w-4 mr-2" />
                  <span>Auditoria</span>
                </button>
              )}
            </div>
          )}
        </div>
      </nav>
    </aside>
  )
}
