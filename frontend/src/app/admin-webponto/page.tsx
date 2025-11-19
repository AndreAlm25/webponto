'use client'
import { useAuth } from '@/contexts/AuthContext'
import { ThemeToggle } from '@/components/theme-toggle'

export default function AdminWebPontoPage() {
  const { logout } = useAuth()
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-7xl h-16 px-4 flex items-center justify-between">
          <h1 className="truncate font-semibold">Painel do Super Admin (WebPonto)</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button onClick={logout} className="px-4 py-2 rounded-md border hover:bg-accent transition text-sm">Sair</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <p className="text-sm text-muted-foreground">
          Área para gestão global da plataforma: empresas, usuários e configurações gerais.
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border bg-card p-5">
            <h2 className="font-semibold">Empresas</h2>
            <p className="text-sm text-muted-foreground">Criar/editar empresas</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <h2 className="font-semibold">Usuários</h2>
            <p className="text-sm text-muted-foreground">Gerenciar admins e acessos</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <h2 className="font-semibold">Configurações</h2>
            <p className="text-sm text-muted-foreground">Parâmetros globais</p>
          </div>
        </div>
      </main>
    </div>
  )
}
