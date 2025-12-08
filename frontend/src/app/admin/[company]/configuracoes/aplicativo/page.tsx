'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import PageHeader from '@/components/admin/PageHeader'
import { Settings, Save, Clock, Monitor } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { useCompanySlug } from '@/hooks/useCompanySlug'
import { toast } from 'sonner'
import { ProtectedPage } from '@/components/auth/ProtectedPage'
import { PERMISSIONS } from '@/hooks/usePermissions'

interface AppSettings {
  successMessageDuration: number
}

export default function AppSettingsPage() {
  const params = useParams()
  const company = params?.company as string
  
  const { companyId, loading: loadingAuth } = useCompanySlug()

  const base = company ? `/admin/${encodeURIComponent(company)}` : '/admin'

  const [settings, setSettings] = useState<AppSettings>({
    successMessageDuration: 10,
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Carregar configurações
  useEffect(() => {
    if (!companyId || loadingAuth) return

    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem('token')
        const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

        const res = await fetch(`${api}/api/companies/settings/app`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          const data = await res.json()
          setSettings({
            successMessageDuration: data.successMessageDuration || 10,
          })
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [companyId, loadingAuth])

  // Salvar configurações
  const handleSave = async () => {
    if (!companyId) return

    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

      const res = await fetch(`${api}/api/companies/settings/app`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      })

      if (res.ok) {
        toast.success('Configurações salvas com sucesso!')
      } else {
        const errorData = await res.json()
        toast.error(errorData?.message || 'Erro ao salvar configurações')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  if (loading || loadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <ProtectedPage permission={PERMISSIONS.SETTINGS_VIEW}>
      <PageHeader
        icon={<Settings className="h-6 w-6" />}
        title="Configurações do Aplicativo"
        description="Configure o comportamento do sistema de ponto"
        breadcrumbs={[
          { label: 'Admin', href: base },
          { label: 'Config. da Empresa' },
          { label: 'Aplicativo' },
        ]}
      />

      <div className="max-w-4xl space-y-6">
        {/* Card: Terminal de Ponto */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Terminal de Ponto</h2>
              <p className="text-sm text-muted-foreground">
                Configurações do terminal de ponto
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Tempo da mensagem de sucesso */}
            <div className="p-4 bg-muted/30 rounded-lg">
              <Label htmlFor="successMessageDuration" className="text-base font-medium">
                Tempo da Mensagem de Sucesso
              </Label>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Tempo em segundos que a mensagem de sucesso fica visível após bater o ponto (mínimo 3, máximo 60)
              </p>
              <div className="flex items-center gap-4">
                <input
                  id="successMessageDuration"
                  type="range"
                  min="3"
                  max="60"
                  step="1"
                  value={settings.successMessageDuration}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      successMessageDuration: parseInt(e.target.value),
                    }))
                  }
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex items-center justify-center w-16 h-10 bg-primary/10 text-primary font-semibold rounded-lg">
                  {settings.successMessageDuration}s
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>3 segundos</span>
                <span>60 segundos</span>
              </div>
            </div>

            {/* Dica */}
            <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <Clock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-primary">Dica</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Recomendamos entre 5 e 15 segundos. Tempo muito curto pode não dar tempo do funcionário 
                  ver a confirmação, tempo muito longo pode atrasar a fila.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <Save className="h-5 w-5" />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>
    </ProtectedPage>
  )
}
