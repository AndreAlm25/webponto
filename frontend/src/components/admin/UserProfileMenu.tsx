"use client"
import { useState, useEffect } from 'react'
import { LogOut, UserCircle, Pencil, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

export default function UserProfileMenu({ onEditProfile }: { onEditProfile: () => void }) {
  const { logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState<string>('')
  const [name, setName] = useState<string>('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user')
      if (raw) {
        const u = JSON.parse(raw)
        setEmail(u?.email || '')
        setName(u?.name || '')
      }
    } catch {}
  }, [])

  const close = () => setOpen(false)

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)} aria-label="Abrir menu do usuário" className="flex">
        <User className="h-5 w-5" />
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-card border border-border rounded-lg shadow-lg z-[100] overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center space-x-3">
              <UserCircle className="h-8 w-8 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{name || 'Usuário'}</p>
                <p className="text-xs text-muted-foreground truncate">{email}</p>
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
