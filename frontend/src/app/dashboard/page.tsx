'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { LogOut, User, Building2, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardPage() {
  const { user, logout, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200">
      {/* Header */}
      <header className="bg-gradient-to-r from-webponto-blue to-webponto-blue-dark shadow-lg border-b-4 border-webponto-yellow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="text-3xl font-black text-white">P</div>
              <div className="w-8 h-8 rounded-full border-3 border-webponto-yellow flex items-center justify-center">
                <div className="w-1.5 h-5 bg-webponto-yellow rotate-45"></div>
                <div className="w-1.5 h-5 bg-webponto-yellow -rotate-45 -ml-1.5"></div>
              </div>
              <div className="text-3xl font-black text-white">nto</div>
            </div>
            <div className="border-l-2 border-white/30 pl-3">
              <p className="text-sm text-white/90 font-medium">Sistema de Ponto Eletrônico</p>
            </div>
          </div>
          <Button
            onClick={logout}
            variant="outline"
            className="flex items-center gap-2 bg-white/10 text-white border-white/30 hover:bg-white/20"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            Olá, {user.nome}! 👋
          </h2>
          <p className="text-slate-600">
            Bem-vindo ao painel de controle do WebPonto
          </p>
        </div>

        {/* User Info Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Perfil */}
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-webponto-blue">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-webponto-blue/10 rounded-lg">
                <User className="w-6 h-6 text-webponto-blue" />
              </div>
              <h3 className="font-semibold text-slate-900">Seu Perfil</h3>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-slate-600">
                <strong>Email:</strong> {user.email}
              </p>
              <p className="text-slate-600">
                <strong>Função:</strong> {user.role}
              </p>
              {user.funcionario && (
                <p className="text-slate-600">
                  <strong>Matrícula:</strong> {user.funcionario.matricula}
                </p>
              )}
            </div>
          </div>

          {/* Empresa */}
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-webponto-yellow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-webponto-yellow/20 rounded-lg">
                <Building2 className="w-6 h-6 text-webponto-yellow-dark" />
              </div>
              <h3 className="font-semibold text-slate-900">Empresa</h3>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-slate-600">
                <strong>Nome:</strong> {user.company?.tradeName || user.empresa?.nomeFantasia || 'N/A'}
              </p>
              <p className="text-slate-600">
                <strong>CNPJ:</strong> {user.company?.cnpj || user.empresa?.cnpj || 'N/A'}
              </p>
            </div>
          </div>

          {/* Ações Rápidas */}
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-webponto-blue">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-webponto-blue/10 rounded-lg">
                <Calendar className="w-6 h-6 text-webponto-blue" />
              </div>
              <h3 className="font-semibold text-slate-900">Ações</h3>
            </div>
            <div className="space-y-2">
              <Button
                onClick={() => router.push('/ponto/facial')}
                className="w-full bg-webponto-blue hover:bg-webponto-blue-dark"
                size="sm"
              >
                Registrar Ponto
              </Button>
              <Button
                onClick={() => router.push('/ponto/historico')}
                variant="outline"
                className="w-full border-webponto-yellow text-webponto-yellow-dark hover:bg-webponto-yellow/10"
                size="sm"
              >
                Ver Histórico
              </Button>
            </div>
          </div>
        </div>

        {/* Sistema Funcionando */}
        <div className="bg-gradient-to-r from-green-500 via-green-600 to-green-700 rounded-xl shadow-lg p-8 text-white border-4 border-green-300">
          <h3 className="text-2xl font-bold mb-2">
            ✅ Sistema Operacional!
          </h3>
          <p className="text-green-100 mb-4">
            WebPonto conectado ao banco de dados e pronto para uso!
          </p>
          <ul className="space-y-2 text-sm text-green-50">
            <li>✅ Autenticação com PostgreSQL</li>
            <li>✅ Reconhecimento Facial (CompreFace)</li>
            <li>✅ Armazenamento de Fotos (MinIO)</li>
            <li>✅ Registro de Pontos em Tempo Real</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
