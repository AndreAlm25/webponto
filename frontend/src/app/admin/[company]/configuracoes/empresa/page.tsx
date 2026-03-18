'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import PageHeader from '@/components/admin/PageHeader'
import PageContainer from '@/components/admin/PageContainer'
import { Building2, Save, Clock, MapPin, Phone, Mail } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useCompanySlug } from '@/hooks/useCompanySlug'
import { toast } from 'sonner'
import { ProtectedPage } from '@/components/auth/ProtectedPage'
import { PERMISSIONS } from '@/hooks/usePermissions'

type WorkRegime = 'SINGLE_SHIFT' | 'MULTIPLE_SHIFTS' | 'CONTINUOUS_24H'

interface CompanyConfig {
  legalName: string
  tradeName: string
  cnpj: string
  email: string
  workingHoursStart: string
  workingHoursEnd: string
  workRegime: WorkRegime
  timezone: string
  address: {
    street: string
    number: string
    complement: string
    neighborhood: string
    city: string
    state: string
    zipCode: string
  }
  contactInfo: {
    phone: string
    whatsapp: string
  }
}

export default function CompanySettingsPage() {
  const params = useParams()
  const company = params?.company as string
  const { companyId, loading: loadingAuth } = useCompanySlug()

  const [config, setConfig] = useState<CompanyConfig>({
    legalName: '',
    tradeName: '',
    cnpj: '',
    email: '',
    workingHoursStart: '08:00',
    workingHoursEnd: '18:00',
    workRegime: 'SINGLE_SHIFT',
    timezone: 'America/Sao_Paulo',
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: '',
    },
    contactInfo: {
      phone: '',
      whatsapp: '',
    },
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!companyId || loadingAuth) return

    const fetchConfig = async () => {
      try {
        const token = localStorage.getItem('token')
        const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

        const res = await fetch(`${api}/api/company?companyId=${companyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          const data = await res.json()
          setConfig({
            legalName: data.legalName || '',
            tradeName: data.tradeName || '',
            cnpj: data.cnpj || '',
            email: data.email || '',
            workingHoursStart: data.workingHoursStart || '08:00',
            workingHoursEnd: data.workingHoursEnd || '18:00',
            workRegime: data.workRegime || 'SINGLE_SHIFT',
            timezone: data.timezone || 'America/Sao_Paulo',
            address: {
              street: data.address?.street || '',
              number: data.address?.number || '',
              complement: data.address?.complement || '',
              neighborhood: data.address?.district || '',
              city: data.address?.city || '',
              state: data.address?.state || '',
              zipCode: data.address?.zipCode || '',
            },
            contactInfo: {
              phone: data.contactInfo?.phoneFixed || '',
              whatsapp: data.contactInfo?.phoneWhatsapp || '',
            },
          })
        } else {
          const errorData = await res.json()
          toast.error(errorData?.message || 'Erro ao carregar dados da empresa')
        }
      } catch (error) {
        console.error('Erro ao carregar dados da empresa:', error)
        toast.error('Erro ao carregar dados da empresa')
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [companyId, loadingAuth])

  const handleSave = async () => {
    if (!companyId) {
      toast.error('ID da empresa não encontrado')
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

      const res = await fetch(`${api}/api/company?companyId=${companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          legalName: config.legalName,
          tradeName: config.tradeName,
          email: config.email,
          workingHoursStart: config.workingHoursStart,
          workingHoursEnd: config.workingHoursEnd,
          workRegime: config.workRegime,
          timezone: config.timezone,
          address: config.address,
          contactInfo: config.contactInfo,
        }),
      })

      if (res.ok) {
        toast.success('Dados da empresa salvos com sucesso!')
      } else {
        const errorData = await res.json()
        console.error('Erro ao salvar:', errorData)
        toast.error(errorData?.message || 'Erro ao salvar dados da empresa')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar dados da empresa')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader
          title="Dados da Empresa"
          description="Configure as informações da empresa"
          icon={<Building2 className="h-6 w-6" />}
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${company}` },
            { label: 'Configurações' },
            { label: 'Empresa' },
          ]}
        />
        <div className="mt-6 text-center text-muted-foreground">
          Carregando...
        </div>
      </div>
    )
  }

  return (
    <ProtectedPage permission={PERMISSIONS.SETTINGS_VIEW}>
      <PageContainer>
        <PageHeader
          title="Dados da Empresa"
          description="Configure as informações da empresa"
          icon={<Building2 className="h-6 w-6" />}
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${company}` },
            { label: 'Configurações' },
            { label: 'Empresa' },
          ]}
        />

        <div className="mt-6 space-y-6">
          {/* Dados Básicos */}
          <div className="bg-background border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Dados da Empresa
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="legalName">Razão Social</Label>
                <Input
                  id="legalName"
                  value={config.legalName}
                  onChange={(e) => setConfig({ ...config, legalName: e.target.value })}
                  placeholder="Razão Social da Empresa LTDA"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tradeName">Nome Fantasia</Label>
                <Input
                  id="tradeName"
                  value={config.tradeName}
                  onChange={(e) => setConfig({ ...config, tradeName: e.target.value })}
                  placeholder="Nome Fantasia"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={config.cnpj}
                  disabled
                  className="bg-muted"
                  placeholder="00.000.000/0000-00"
                />
                <p className="text-xs text-muted-foreground">
                  O CNPJ não pode ser alterado
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={config.email}
                    onChange={(e) => setConfig({ ...config, email: e.target.value })}
                    placeholder="empresa@email.com"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Horário de Funcionamento */}
          <div className="bg-background border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horário de Funcionamento
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="workRegime">Regime de Trabalho</Label>
                <select
                  id="workRegime"
                  value={config.workRegime}
                  onChange={(e) => setConfig({ ...config, workRegime: e.target.value as WorkRegime })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="SINGLE_SHIFT">Turno Único (horário comercial)</option>
                  <option value="MULTIPLE_SHIFTS">Múltiplos Turnos (manhã, tarde, noite)</option>
                  <option value="CONTINUOUS_24H">Operação 24 Horas</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Define como a empresa organiza seus turnos de trabalho
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Fuso Horário</Label>
                <select
                  id="timezone"
                  value={config.timezone}
                  onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                  <option value="America/Manaus">Manaus (GMT-4)</option>
                  <option value="America/Cuiaba">Cuiabá (GMT-4)</option>
                  <option value="America/Rio_Branco">Rio Branco (GMT-5)</option>
                  <option value="America/Noronha">Fernando de Noronha (GMT-2)</option>
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="workingHoursStart">Horário de Abertura</Label>
                <Input
                  id="workingHoursStart"
                  type="time"
                  value={config.workingHoursStart}
                  onChange={(e) => setConfig({ ...config, workingHoursStart: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  {config.workRegime === 'SINGLE_SHIFT' 
                    ? 'Horário que a empresa abre' 
                    : 'Início do primeiro turno'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workingHoursEnd">Horário de Fechamento</Label>
                <Input
                  id="workingHoursEnd"
                  type="time"
                  value={config.workingHoursEnd}
                  onChange={(e) => setConfig({ ...config, workingHoursEnd: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  {config.workRegime === 'SINGLE_SHIFT' 
                    ? 'Horário que a empresa fecha' 
                    : 'Fim do último turno'}
                </p>
              </div>
            </div>

            {config.workRegime === 'SINGLE_SHIFT' && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Turno Único:</strong> A empresa funciona apenas em horário comercial diurno.
                  Adicional noturno não será aplicável.
                </p>
              </div>
            )}

            {config.workRegime === 'MULTIPLE_SHIFTS' && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Múltiplos Turnos:</strong> A empresa opera em turnos (T1, T2, T3).
                  Funcionários que trabalham entre 22h e 5h terão direito ao adicional noturno.
                </p>
              </div>
            )}

            {config.workRegime === 'CONTINUOUS_24H' && (
              <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md">
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  <strong>Operação 24 Horas:</strong> A empresa funciona ininterruptamente (hospitais, fábricas, segurança).
                  Funcionários que trabalham entre 22h e 5h terão direito ao adicional noturno.
                </p>
              </div>
            )}
          </div>

          {/* Endereço */}
          <div className="bg-background border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Endereço
            </h3>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zipCode">CEP</Label>
                <Input
                  id="zipCode"
                  value={config.address.zipCode}
                  onChange={(e) => setConfig({ 
                    ...config, 
                    address: { ...config.address, zipCode: e.target.value } 
                  })}
                  placeholder="00000-000"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="street">Rua</Label>
                <Input
                  id="street"
                  value={config.address.street}
                  onChange={(e) => setConfig({ 
                    ...config, 
                    address: { ...config.address, street: e.target.value } 
                  })}
                  placeholder="Rua, Avenida, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="number">Número</Label>
                <Input
                  id="number"
                  value={config.address.number}
                  onChange={(e) => setConfig({ 
                    ...config, 
                    address: { ...config.address, number: e.target.value } 
                  })}
                  placeholder="123"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="complement">Complemento</Label>
                <Input
                  id="complement"
                  value={config.address.complement}
                  onChange={(e) => setConfig({ 
                    ...config, 
                    address: { ...config.address, complement: e.target.value } 
                  })}
                  placeholder="Sala, Andar, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={config.address.neighborhood}
                  onChange={(e) => setConfig({ 
                    ...config, 
                    address: { ...config.address, neighborhood: e.target.value } 
                  })}
                  placeholder="Bairro"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={config.address.city}
                  onChange={(e) => setConfig({ 
                    ...config, 
                    address: { ...config.address, city: e.target.value } 
                  })}
                  placeholder="Cidade"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <select
                  id="state"
                  value={config.address.state}
                  onChange={(e) => setConfig({ 
                    ...config, 
                    address: { ...config.address, state: e.target.value } 
                  })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">Selecione...</option>
                  <option value="AC">Acre</option>
                  <option value="AL">Alagoas</option>
                  <option value="AP">Amapá</option>
                  <option value="AM">Amazonas</option>
                  <option value="BA">Bahia</option>
                  <option value="CE">Ceará</option>
                  <option value="DF">Distrito Federal</option>
                  <option value="ES">Espírito Santo</option>
                  <option value="GO">Goiás</option>
                  <option value="MA">Maranhão</option>
                  <option value="MT">Mato Grosso</option>
                  <option value="MS">Mato Grosso do Sul</option>
                  <option value="MG">Minas Gerais</option>
                  <option value="PA">Pará</option>
                  <option value="PB">Paraíba</option>
                  <option value="PR">Paraná</option>
                  <option value="PE">Pernambuco</option>
                  <option value="PI">Piauí</option>
                  <option value="RJ">Rio de Janeiro</option>
                  <option value="RN">Rio Grande do Norte</option>
                  <option value="RS">Rio Grande do Sul</option>
                  <option value="RO">Rondônia</option>
                  <option value="RR">Roraima</option>
                  <option value="SC">Santa Catarina</option>
                  <option value="SP">São Paulo</option>
                  <option value="SE">Sergipe</option>
                  <option value="TO">Tocantins</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contato */}
          <div className="bg-background border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contato
            </h3>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={config.contactInfo.phone}
                    onChange={(e) => setConfig({ 
                      ...config, 
                      contactInfo: { ...config.contactInfo, phone: e.target.value } 
                    })}
                    placeholder="(00) 0000-0000"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="whatsapp"
                    value={config.contactInfo.whatsapp}
                    onChange={(e) => setConfig({ 
                      ...config, 
                      contactInfo: { ...config.contactInfo, whatsapp: e.target.value } 
                    })}
                    placeholder="(00) 00000-0000"
                    className="pl-10"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Botão Salvar */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="min-w-[150px]"
            >
              {saving ? (
                <>Salvando...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </div>
      </PageContainer>
    </ProtectedPage>
  )
}
