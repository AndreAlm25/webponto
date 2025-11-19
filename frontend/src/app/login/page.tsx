'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { LogIn, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)

  // Se já autenticado, redirecionar conforme o papel
  useEffect(() => {
    if (!isAuthenticated || !user) return

    console.log('🔐 [Login] Redirecionando usuário autenticado...')
    console.log('🔐 [Login] User data:', user)
    console.log('🔐 [Login] Company slug do banco:', (user.company as any)?.slug)

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

    // ✅ USA O SLUG DO BANCO, NÃO GERA NOVO
    const companySlug = (user.company as any)?.slug || slugify(user.company?.tradeName || user.empresa?.nomeFantasia) || (user.companyId ? `empresa-${user.companyId}` : 'empresa')
    
    const employeeName = (user as any).employee?.name || (user as any).funcionario?.nome || user.name || user.nome
    const employeeSlug = slugify(employeeName) || ((user as any).employee?.id || (user as any).funcionario?.id ? `func-${(user as any).employee?.id || (user as any).funcionario?.id}` : 'colaborador')

    let nextRoute = '/dashboard'
    if (user.role === 'SUPER_ADMIN') {
      nextRoute = '/admin-webponto'
      console.log('🔐 [Login] SUPER_ADMIN → Redirecionando para:', nextRoute)
    } else if (user.role === 'COMPANY_ADMIN' || user.role === 'MANAGER' || user.role === 'HR' || user.role === 'FINANCIAL') {
      nextRoute = `/admin/${companySlug}`
      console.log('🔐 [Login] COMPANY_ADMIN/MANAGER/HR/FINANCIAL → Redirecionando para:', nextRoute)
    } else if (user.role === 'EMPLOYEE' || !!(user as any).employee || !!(user as any).funcionario) {
      nextRoute = `/${companySlug}/${employeeSlug}`
      console.log('🔐 [Login] EMPLOYEE → Redirecionando para:', nextRoute)
    }

    console.log('🔐 [Login] Rota final:', nextRoute)
    router.replace(nextRoute)
  }, [isAuthenticated, user, router])

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
