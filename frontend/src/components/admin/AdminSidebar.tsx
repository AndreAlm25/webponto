"use client"
// Sidebar do Admin (código em inglês; textos em português)
import { useParams, usePathname, useRouter } from 'next/navigation'
import React from 'react'
import { Briefcase, Building2, Clock, MapPin, Settings, Users, LayoutDashboard, ChevronDown, ChevronRight, FileText } from 'lucide-react'

export default function AdminSidebar({ collapsed }: { collapsed: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams<{ company?: string }>()
  const company = String(params?.company || '')
  const [expandedMenus, setExpandedMenus] = React.useState<string[]>(['gestao'])
  const [dropdownOpen, setDropdownOpen] = React.useState(false)
  const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, left: 0 })
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
  
  const handleDropdownClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!collapsed) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    setDropdownPosition({
      top: rect.top,
      left: rect.right + 8
    })
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
  
  const isActive = (href: string) => pathname === href
  const isMenuExpanded = (menuId: string) => expandedMenus.includes(menuId) && !collapsed

  return (
    <aside className={`h-full w-full bg-card shadow-sm flex flex-col`}>
      <nav className="flex-1 overflow-auto py-2 space-y-1">
        {/* Dashboard */}
        <button
          onClick={() => router.push(base)}
          className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${itemClass} ${
            isActive(base) ? 'bg-muted/50 font-medium' : ''
          }`}
        >
          <LayoutDashboard className={`${iconSize}`} />
          <span className={`${labelClass}`}>Dashboard</span>
        </button>

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
              <button
                onClick={() => router.push(`${base}/funcionarios`)}
                className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                  isActive(`${base}/funcionarios`) ? 'bg-muted/50 font-medium' : ''
                }`}
              >
                <Users className="h-3 w-3 mr-2" />
                <span>Funcionários</span>
              </button>
              <button
                onClick={() => router.push(`${base}/cargos`)}
                className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                  isActive(`${base}/cargos`) ? 'bg-muted/50 font-medium' : ''
                }`}
              >
                <Briefcase className="h-3 w-3 mr-2" />
                <span>Cargos</span>
              </button>
              <button
                onClick={() => router.push(`${base}/departamentos`)}
                className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                  isActive(`${base}/departamentos`) ? 'bg-muted/50 font-medium' : ''
                }`}
              >
                <Building2 className="h-3 w-3 mr-2" />
                <span>Departamentos</span>
              </button>
              <button
                onClick={() => router.push(`${base}/folha-pagamento`)}
                className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${
                  isActive(`${base}/folha-pagamento`) ? 'bg-muted/50 font-medium' : ''
                }`}
              >
                <FileText className="h-3 w-3 mr-2" />
                <span>Folha de Pagamento</span>
              </button>
            </div>
          )}
          
          {/* Dropdown (sidebar colapsada) - por cima de tudo */}
          {collapsed && dropdownOpen && (
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
            </div>
          )}
        </div>

        {/* Terminal de Ponto */}
        <button
          onClick={() => router.push(`${base}/terminal`)}
          className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${itemClass} ${
            isActive(`${base}/terminal`) ? 'bg-muted/50 font-medium' : ''
          }`}
        >
          <Clock className={`${iconSize}`} />
          <span className={`${labelClass}`}>Terminal de Ponto</span>
        </button>

        {/* Cercas geográficas */}
        <button
          onClick={() => router.push(`${base}/geofences`)}
          className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${itemClass} ${
            isActive(`${base}/geofences`) ? 'bg-muted/50 font-medium' : ''
          }`}
        >
          <MapPin className={`${iconSize}`} />
          <span className={`${labelClass}`}>Cercas Geográficas</span>
        </button>

        {/* Configurações */}
        <button
          onClick={() => router.push(`${base}/configuracoes`)}
          className={`w-full flex items-center px-3 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors ${itemClass} ${
            isActive(`${base}/configuracoes`) ? 'bg-muted/50 font-medium' : ''
          }`}
        >
          <Settings className={`${iconSize}`} />
          <span className={`${labelClass}`}>Config. da Empresa</span>
        </button>
      </nav>
    </aside>
  )
}
