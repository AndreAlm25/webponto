'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import PageHeader from '@/components/admin/PageHeader'
import { LayoutDashboard, Save, Eye, EyeOff } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { useCompanySlug } from '@/hooks/useCompanySlug'
import { toast } from 'sonner'
import { ProtectedPage } from '@/components/auth/ProtectedPage'
import { PERMISSIONS } from '@/hooks/usePermissions'

interface DashboardConfig {
  dashboardShowRecentEntries: boolean
  dashboardRecentEntriesLimit: number
}

export default function DashboardConfigPage() {
  const params = useParams()
  const company = params?.company as string
  
  // Hook para obter o companyId (UUID) a partir do slug
  const { companyId, loading: loadingAuth } = useCompanySlug()

  const base = company ? `/admin/${encodeURIComponent(company)}` : '/admin'

  const [config, setConfig] = useState<DashboardConfig>({
    dashboardShowRecentEntries: true,
    dashboardRecentEntriesLimit: 10,
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Carregar configurações
  useEffect(() => {
    if (loadingAuth || !companyId) return

    const fetchConfig = async () => {
      try {
        const token = localStorage.getItem('token')
        const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

        const res = await fetch(`${api}/api/dashboard-config?companyId=${companyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          const data = await res.json()
          setConfig({
            dashboardShowRecentEntries: data.dashboardShowRecentEntries,
            dashboardRecentEntriesLimit: data.dashboardRecentEntriesLimit,
          })
        } else {
          const errorData = await res.json()
          toast.error(errorData?.message || 'Erro ao carregar configurações')
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error)
        toast.error('Erro ao carregar configurações')
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [companyId, loadingAuth])

  // Salvar configurações
  const handleSave = async () => {
    if (!companyId) {
      toast.error('ID da empresa não encontrado')
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

      const res = await fetch(`${api}/api/dashboard-config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyId,
          ...config,
        }),
      })

      if (res.ok) {
        toast.success('Configurações salvas com sucesso!')
      } else {
        const errorData = await res.json()
        toast.error(errorData?.message || 'Erro ao salvar configurações')
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
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
        icon={<LayoutDashboard className="h-6 w-6" />}
        title="Configurações do Dashboard"
        description="Configure a exibição e comportamento do dashboard principal"
        breadcrumbs={[
          { label: 'Admin', href: base },
          { label: 'Config. da Empresa' },
          { label: 'Dashboard' },
        ]}
      />

      <div className="max-w-4xl space-y-6">
        {/* Card de Registros Recentes */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Registros Recentes</h2>
              <p className="text-sm text-muted-foreground">
                Configure a exibição dos registros de ponto recentes
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Toggle: Mostrar Registros Recentes */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                {config.dashboardShowRecentEntries ? (
                  <Eye className="h-5 w-5 text-primary" />
                ) : (
                  <EyeOff className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <Label className="text-base font-medium">
                    Exibir Registros Recentes
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Mostra a lista de registros de ponto recentes no dashboard
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    dashboardShowRecentEntries: !prev.dashboardShowRecentEntries,
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.dashboardShowRecentEntries
                    ? 'bg-primary'
                    : 'bg-muted-foreground/30'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.dashboardShowRecentEntries ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Input: Quantidade de Registros */}
            {config.dashboardShowRecentEntries && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <Label htmlFor="limit" className="text-base font-medium">
                  Quantidade de Registros
                </Label>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Número de registros recentes a serem exibidos (mínimo 5, máximo 50)
                </p>
                <div className="flex items-center gap-4">
                  <input
                    id="limit"
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={config.dashboardRecentEntriesLimit}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        dashboardRecentEntriesLimit: parseInt(e.target.value),
                      }))
                    }
                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex items-center justify-center w-16 h-10 bg-primary/10 text-primary font-semibold rounded-lg">
                    {config.dashboardRecentEntriesLimit}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>5 registros</span>
                  <span>50 registros</span>
                </div>
              </div>
            )}
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
