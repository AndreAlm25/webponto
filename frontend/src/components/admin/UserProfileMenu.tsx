"use client"
import { useState } from 'react'
import { LogOut, UserCircle, Pencil, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
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
  const [open, setOpen] = useState(false)
  const [imgError, setImgError] = useState(false)

  const close = () => setOpen(false)

  // Dados do usuário logado
  const name = user?.name || user?.nome || 'Usuário'
  const email = user?.email || ''
  const role = user?.role || ''
  const avatarUrl = user?.avatarUrl || null
  const roleLabel = roleLabels[role] || role

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
