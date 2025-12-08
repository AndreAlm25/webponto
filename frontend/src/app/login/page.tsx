'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { LogIn, Loader2, Building2, User, X } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  // Modal de escolha para MANAGER/HR/FINANCIAL
  const [showPanelChoice, setShowPanelChoice] = useState(false)
  const [panelRoutes, setPanelRoutes] = useState<{ admin: string; personal: string }>({ admin: '', personal: '' })
  // Estado para mostrar loading após escolher painel
  const [redirecting, setRedirecting] = useState(false)
  const [chosenPanel, setChosenPanel] = useState<'admin' | 'personal' | null>(null)

  // Função para gerar slug
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

  // Se já autenticado, redirecionar conforme o papel
  useEffect(() => {
    if (!isAuthenticated || !user) return

    console.log('🔐 [Login] Redirecionando usuário autenticado...')
    console.log('🔐 [Login] User data:', user)
    console.log('🔐 [Login] User role:', user.role)

    // ✅ USA O SLUG DO BANCO, NÃO GERA NOVO
    const companySlug = (user.company as any)?.slug || slugify(user.company?.tradeName || user.empresa?.nomeFantasia) || (user.companyId ? `empresa-${user.companyId}` : 'empresa')
    
    const employeeName = (user as any).employee?.name || (user as any).funcionario?.nome || user.name || user.nome
    const employeeSlug = slugify(employeeName) || ((user as any).employee?.id || (user as any).funcionario?.id ? `func-${(user as any).employee?.id || (user as any).funcionario?.id}` : 'colaborador')

    // SUPER_ADMIN → Admin do sistema
    if (user.role === 'SUPER_ADMIN') {
      console.log('🔐 [Login] SUPER_ADMIN → Redirecionando para admin-webponto')
      router.replace('/admin-webponto')
      return
    }
    
    // COMPANY_ADMIN → Direto para admin da empresa
    if (user.role === 'COMPANY_ADMIN') {
      console.log('🔐 [Login] COMPANY_ADMIN → Redirecionando para admin da empresa')
      router.replace(`/admin/${companySlug}`)
      return
    }
    
    // MANAGER/HR/FINANCIAL → Modal de escolha (Admin ou Pessoal)
    if (user.role === 'MANAGER' || user.role === 'HR' || user.role === 'FINANCIAL') {
      console.log('🔐 [Login] MANAGER/HR/FINANCIAL → Mostrando modal de escolha')
      setPanelRoutes({
        admin: `/admin/${companySlug}`,
        personal: `/${companySlug}/${employeeSlug}`
      })
      setShowPanelChoice(true)
      return
    }
    
    // EMPLOYEE → Direto para painel pessoal
    if (user.role === 'EMPLOYEE' || !!(user as any).employee || !!(user as any).funcionario) {
      console.log('🔐 [Login] EMPLOYEE → Redirecionando para painel pessoal')
      router.replace(`/${companySlug}/${employeeSlug}`)
      return
    }

    // Fallback
    console.log('🔐 [Login] Fallback → Dashboard')
    router.replace('/dashboard')
  }, [isAuthenticated, user, router])

  // Função para escolher painel
  const handlePanelChoice = (panel: 'admin' | 'personal') => {
    // Não fecha o modal - apenas mostra loading e redireciona
    setChosenPanel(panel)
    setRedirecting(true)
    const route = panel === 'admin' ? panelRoutes.admin : panelRoutes.personal
    console.log(`🔐 [Login] Usuário escolheu: ${panel} → ${route}`)
    router.replace(route)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !senha) {
      toast.error('Preencha todos os campos')
      return
    }

    setLoading(true)
    
    try {
      await login(email, senha)
    } catch (error) {
      // Erro já tratado no AuthContext
    } finally {
      setLoading(false)
    }
  }

  // Modal de escolha de painel
  if (showPanelChoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-yellow-50">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-2xl border-2 border-webponto-blue/10">
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="text-4xl font-black text-webponto-blue">P</div>
              <div className="w-10 h-10 rounded-full border-4 border-webponto-yellow flex items-center justify-center">
                <div className="w-1.5 h-5 bg-webponto-yellow rotate-45"></div>
                <div className="w-1.5 h-5 bg-webponto-yellow -rotate-45 -ml-1.5"></div>
              </div>
              <div className="text-4xl font-black text-webponto-blue">nto</div>
            </div>
          </div>

          {/* Saudação */}
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Olá, {user?.name || 'Usuário'}! 👋
            </h2>
            <p className="text-slate-600">
              {redirecting ? 'Redirecionando...' : 'Para onde você deseja ir?'}
            </p>
          </div>

          {/* Opções ou Loading */}
          {redirecting ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-12 h-12 text-webponto-blue animate-spin mb-4" />
              <p className="text-slate-600 font-medium">
                {chosenPanel === 'admin' ? 'Abrindo Painel Administrativo...' : 'Abrindo Meu Painel...'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Painel Admin */}
              <button
                onClick={() => handlePanelChoice('admin')}
                className="w-full p-4 rounded-xl border-2 border-slate-200 hover:border-webponto-blue hover:bg-blue-50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-webponto-blue/10 flex items-center justify-center group-hover:bg-webponto-blue/20 transition">
                    <Building2 className="w-7 h-7 text-webponto-blue" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-900 text-lg">Painel Administrativo</h3>
                    <p className="text-sm text-slate-500">Gerenciar funcionários, registros e relatórios</p>
                  </div>
                </div>
              </button>

              {/* Painel Pessoal */}
              <button
                onClick={() => handlePanelChoice('personal')}
                className="w-full p-4 rounded-xl border-2 border-slate-200 hover:border-green-500 hover:bg-green-50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition">
                    <User className="w-7 h-7 text-green-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-900 text-lg">Meu Painel</h3>
                    <p className="text-sm text-slate-500">Bater ponto, ver holerite e mensagens</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Info do usuário */}
          <div className="mt-6 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-400 text-center">
              Logado como <span className="font-medium text-slate-600">{user?.email}</span>
              <br />
              <span className="text-slate-500">
                {user?.role === 'MANAGER' && '👔 Gerente'}
                {user?.role === 'HR' && '👥 Recursos Humanos'}
                {user?.role === 'FINANCIAL' && '💰 Financeiro'}
              </span>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-yellow-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-2xl border-2 border-webponto-blue/10">
        {/* Logo/Título */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="text-5xl font-black text-webponto-blue">P</div>
            <div className="w-12 h-12 rounded-full border-4 border-webponto-yellow flex items-center justify-center">
              <div className="w-2 h-6 bg-webponto-yellow rotate-45"></div>
              <div className="w-2 h-6 bg-webponto-yellow -rotate-45 -ml-2"></div>
            </div>
            <div className="text-5xl font-black text-webponto-blue">nto</div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Sistema de Ponto Eletrônico</h1>
          <p className="text-slate-600 mt-2">Faça login para continuar</p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-4 py-3 text-slate-900 bg-white border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-webponto-blue focus:border-webponto-blue outline-none transition placeholder:text-slate-400"
              disabled={loading}
            />
          </div>

          {/* Senha */}
          <div>
            <label htmlFor="senha" className="block text-sm font-medium text-slate-700 mb-2">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 text-slate-900 bg-white border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-webponto-blue focus:border-webponto-blue outline-none transition placeholder:text-slate-400"
              disabled={loading}
            />
          </div>

          {/* Botão */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 text-lg font-semibold bg-webponto-blue hover:bg-webponto-blue-dark text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                Entrar
              </>
            )}
          </Button>
          <div className="mt-4">
            <a
              href="/"
              className="w-full h-12 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-black text-lg font-semibold hover:bg-accent transition"
            >
              Voltar para Home
            </a>
          </div>
        </form>

        

      </div>
    </div>
  )
}
