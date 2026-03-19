'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { KeyRound, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL

function RedefinirSenhaForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    if (!token) {
      setResult({ ok: false, message: 'Link inválido. Solicite um novo link de recuperação.' })
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setResult({ ok: false, message: 'A senha deve ter pelo menos 6 caracteres.' })
      return
    }
    if (password !== confirm) {
      setResult({ ok: false, message: 'As senhas não coincidem.' })
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ ok: true, message: data.message || 'Senha redefinida com sucesso!' })
        setTimeout(() => router.push('/login'), 3000)
      } else {
        setResult({ ok: false, message: data.message || 'Erro ao redefinir senha.' })
      }
    } catch {
      setResult({ ok: false, message: 'Erro de conexão. Tente novamente.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-card p-8 shadow-sm space-y-6">

          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Redefinir Senha</h1>
            <p className="text-sm text-muted-foreground">Digite sua nova senha</p>
          </div>

          {result?.ok ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300">
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">{result.message}</p>
                  <p className="mt-1 text-xs opacity-75">Redirecionando para o login...</p>
                </div>
              </div>
              <Link href="/login">
                <Button className="w-full">Ir para o Login</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pr-10"
                    autoFocus
                    disabled={!token}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirm">Confirmar Nova Senha</Label>
                <Input
                  id="confirm"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Repita a nova senha"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="mt-1"
                  disabled={!token}
                />
              </div>

              {result && !result.ok && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                  <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{result.message}</span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading || !token}>
                {loading ? 'Redefinindo...' : 'Redefinir Senha'}
              </Button>
            </form>
          )}

          <div className="text-center">
            <Link href="/esqueci-senha" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Solicitar novo link
            </Link>
            {' · '}
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Voltar ao login
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Carregando...</p></div>}>
      <RedefinirSenhaForm />
    </Suspense>
  )
}
