export default function SuperAdminPage() {
  return (
    <main className="min-h-screen container mx-auto px-6 py-10">
      <h1 className="text-3xl font-extrabold">Painel do Super Admin</h1>
      <p className="mt-2 text-muted-foreground">
        Gerencie empresas, usuários e configurações globais da plataforma.
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Empresas</h2>
          <p className="text-sm text-muted-foreground">Criar/editar empresas</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Usuários</h2>
          <p className="text-sm text-muted-foreground">Gerenciar administradores e acessos</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Configurações</h2>
          <p className="text-sm text-muted-foreground">Parâmetros globais do sistema</p>
        </div>
      </div>
    </main>
  )
}
