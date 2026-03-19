'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Mail, Save, TestTube2, Eye, EyeOff, CheckCircle, XCircle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import PageHeader from '@/components/admin/PageHeader'
import PageContainer from '@/components/admin/PageContainer'
import { ProtectedPage } from '@/components/auth/ProtectedPage'
import { PERMISSIONS } from '@/hooks/usePermissions'

const API = process.env.NEXT_PUBLIC_API_URL

const SMTP_PRESETS = [
  { label: 'Gmail', host: 'smtp.gmail.com', port: 587 },
  { label: 'Outlook / Hotmail', host: 'smtp.office365.com', port: 587 },
  { label: 'Yahoo', host: 'smtp.mail.yahoo.com', port: 587 },
  { label: 'Zoho Mail', host: 'smtp.zoho.com', port: 587 },
  { label: 'Titan Email', host: 'smtp.titan.email', port: 587 },
  { label: 'Locaweb', host: 'email-ssl.com.br', port: 465 },
  { label: 'Personalizado', host: '', port: 587 },
]

export default function EmailConfigPage() {
  const { company } = useParams<{ company: string }>()
  const { user } = useAuth()
  const companyId = user?.companyId

  const [enabled, setEnabled] = useState(false)
  const [host, setHost] = useState('')
  const [port, setPort] = useState(587)
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPass, setSmtpPass] = useState('')
  const [smtpFrom, setSmtpFrom] = useState('')
  const [testTo, setTestTo] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!companyId) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/company/smtp?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setEnabled(data.smtpEnabled || false)
        setHost(data.smtpHost || '')
        setPort(data.smtpPort || 587)
        setSmtpUser(data.smtpUser || '')
        setSmtpFrom(data.smtpFrom || '')
      }
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => { load() }, [load])

  const handlePreset = (preset: typeof SMTP_PRESETS[0]) => {
    setHost(preset.host)
    setPort(preset.port)
  }

  const handleSave = async () => {
    if (!companyId) return
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/company/smtp?companyId=${companyId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpEnabled: enabled,
          smtpHost: host || undefined,
          smtpPort: port || undefined,
          smtpUser: smtpUser || undefined,
          smtpPass: smtpPass || undefined,
          smtpFrom: smtpFrom || undefined,
        }),
      })
      if (res.ok) {
        toast.success('Configuração de email salva!')
        setSmtpPass('')
      } else {
        const err = await res.json()
        toast.error(err.message || 'Erro ao salvar')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!companyId) return
    if (!testTo) { toast.error('Informe o email para teste'); return }
    setTesting(true)
    setTestResult(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/company/smtp/test?companyId=${companyId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost: host,
          smtpPort: port,
          smtpUser: smtpUser,
          smtpPass: smtpPass,
          smtpFrom: smtpFrom || smtpUser,
          testTo,
        }),
      })
      const data = await res.json()
      setTestResult(data)
      if (data.ok) toast.success('Email de teste enviado com sucesso!')
      else toast.error(`Falha: ${data.error}`)
    } catch (e: any) {
      setTestResult({ ok: false, error: e.message })
    } finally {
      setTesting(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>

  return (
    <ProtectedPage permission={PERMISSIONS.SETTINGS_EDIT}>
      <PageHeader
        title="Configuração de Email"
        subtitle="Configure o servidor SMTP para envio de emails da sua empresa"
        icon={<Mail className="h-6 w-6" />}
      />
      <PageContainer>
        <div className="max-w-2xl space-y-6">

          {/* Toggle habilitar */}
          <div className="rounded-xl border bg-card p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Habilitar envio de emails</p>
              <p className="text-sm text-muted-foreground">
                Quando ativo, o sistema envia notificações de férias aprovadas, holerites disponíveis e outros eventos aos funcionários.
              </p>
            </div>
            <button
              onClick={() => setEnabled(v => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Preset de provedores */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <p className="font-medium">Provedor de Email</p>
            <div className="flex flex-wrap gap-2">
              {SMTP_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => handlePreset(p)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${host === p.host ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted/50 border-border'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Info Gmail */}
            {host === 'smtp.gmail.com' && (
              <div className="flex gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>Para Gmail, use uma <strong>Senha de App</strong> (não sua senha normal). Ative a verificação em 2 etapas e gere em: <em>Conta Google → Segurança → Senhas de app</em>.</span>
              </div>
            )}
          </div>

          {/* Configurações SMTP */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <p className="font-medium">Dados do Servidor SMTP</p>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label className="text-sm">Servidor SMTP</Label>
                <Input
                  className="mt-1"
                  placeholder="smtp.gmail.com"
                  value={host}
                  onChange={e => setHost(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm">Porta</Label>
                <Input
                  className="mt-1"
                  type="number"
                  placeholder="587"
                  value={port}
                  onChange={e => setPort(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <Label className="text-sm">Email de envio (usuário SMTP)</Label>
              <Input
                className="mt-1"
                type="email"
                placeholder="rh@suaempresa.com.br"
                value={smtpUser}
                onChange={e => setSmtpUser(e.target.value)}
              />
            </div>

            <div>
              <Label className="text-sm">Senha / App Password</Label>
              <div className="relative mt-1">
                <Input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Deixe em branco para manter a senha atual"
                  value={smtpPass}
                  onChange={e => setSmtpPass(e.target.value)}
                  className="pr-10"
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
              <Label className="text-sm">Nome do remetente (opcional)</Label>
              <Input
                className="mt-1"
                placeholder="RH - Empresa S.A."
                value={smtpFrom}
                onChange={e => setSmtpFrom(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Aparece como "De:" no email. Ex: <em>RH Beta Solutions &lt;rh@betasolutions.com.br&gt;</em></p>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>

          {/* Teste de envio */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <p className="font-medium">Testar Configuração</p>
            <p className="text-sm text-muted-foreground">Envia um email de teste para verificar se o SMTP está funcionando. Preencha os dados acima antes de testar.</p>

            <div className="flex gap-3">
              <Input
                type="email"
                placeholder="Email para receber o teste"
                value={testTo}
                onChange={e => setTestTo(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" onClick={handleTest} disabled={testing}>
                <TestTube2 className="h-4 w-4 mr-2" />
                {testing ? 'Enviando...' : 'Testar'}
              </Button>
            </div>

            {testResult && (
              <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${testResult.ok ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'}`}>
                {testResult.ok
                  ? <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  : <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
                <span>{testResult.ok ? 'Email enviado com sucesso! Verifique sua caixa de entrada.' : `Erro: ${testResult.error}`}</span>
              </div>
            )}
          </div>

          {/* Info sobre quando os emails são enviados */}
          <div className="rounded-xl border bg-muted/30 p-5 space-y-2">
            <p className="font-medium text-sm">Quando os emails são enviados?</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✅ Férias aprovadas pelo admin</li>
              <li>❌ Férias rejeitadas</li>
              <li>📄 Holerite disponível para assinatura</li>
              <li>💰 Vale/adiantamento aprovado</li>
              <li>👋 Boas-vindas ao novo funcionário</li>
            </ul>
          </div>

        </div>
      </PageContainer>
    </ProtectedPage>
  )
}
