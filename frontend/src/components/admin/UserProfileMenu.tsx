"use client"
import { useState } from 'react'
import { LogOut, UserCircle, Pencil, User, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

// Mapeamento de roles para português
const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  COMPANY_ADMIN: 'Administrador',
  MANAGER: 'Gestor',
  HR: 'RH',
  FINANCIAL: 'Financeiro',
  EMPLOYEE: 'Colaborador',
}

export default function UserProfileMenu({ onEditProfile }: { onEditProfile: () => void }) {
  const { logout, user } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [imgError, setImgError] = useState(false)

  const close = () => setOpen(false)

  // Dados do usuário logado
  const name = user?.name || user?.nome || 'Usuário'
  const email = user?.email || ''
  const role = user?.role || ''
  const avatarUrl = user?.avatarUrl || null
  const roleLabel = roleLabels[role] || role

  // Utilitário para gerar slugs seguros na URL (mesmo do login)
  const slugify = (value?: string) => {
    if (!value) return ''
    return value
      .toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
  }

  // Dados para navegação ao painel do funcionário
  const companyName = (user as any)?.company?.tradeName || (user as any)?.empresa?.nomeFantasia
  const employeeName = (user as any)?.employee?.name || (user as any)?.funcionario?.nome || name
  const employeeIdRaw = (user as any)?.employee?.id || (user as any)?.funcionario?.id
  const companyIdRaw = user?.companyId

  const companySlug = slugify(companyName) || (companyIdRaw ? `empresa-${companyIdRaw}` : '')
  const employeeSlug = slugify(employeeName) || (employeeIdRaw ? `func-${employeeIdRaw}` : '')

  // Roles que podem acessar o painel do funcionário (não admin)
  const canAccessEmployeePanel = ['MANAGER', 'HR', 'FINANCIAL'].includes(role) && employeeIdRaw && companySlug && employeeSlug

  // Navegar para o painel do funcionário
  const goToMyPanel = () => {
    if (companySlug && employeeSlug) {
      router.push(`/${companySlug}/${employeeSlug}`)
      close()
    }
  }

  // URL completa do avatar (MinIO)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
  const fullAvatarUrl = avatarUrl ? `${apiUrl}/api/files/avatar/${avatarUrl}` : null

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)} aria-label="Abrir menu do usuário" className="flex">
        <User className="h-5 w-5" />
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-card border border-border rounded-lg shadow-lg z-[100] overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center space-x-3">
              {/* Avatar do usuário */}
              {fullAvatarUrl && !imgError ? (
                <Image
                  src={fullAvatarUrl}
                  alt={name}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <UserCircle className="h-10 w-10 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{name}</p>
                <p className="text-xs text-muted-foreground truncate">{email}</p>
                {roleLabel && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full">
                    {roleLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="py-1">
            <button
              onClick={() => { onEditProfile(); close() }}
              className="flex items-center w-full px-4 py-2 text-sm hover:bg-accent"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Editar Perfil
            </button>
            {/* Botão Meu Painel - só para MANAGER, HR e FINANCIAL */}
            {canAccessEmployeePanel && (
              <button
                onClick={goToMyPanel}
                className="flex items-center w-full px-4 py-2 text-sm hover:bg-accent text-primary"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Meu Painel
              </button>
            )}
            <div className="my-1 h-px bg-border" />
            <button
              onClick={() => { logout(); close() }}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </button>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[99]" onClick={() => setOpen(false)} />
      )}
    </div>
  )
}
