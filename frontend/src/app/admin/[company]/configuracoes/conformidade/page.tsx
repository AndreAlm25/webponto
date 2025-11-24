'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PageHeader from '@/components/admin/PageHeader'
import { Scale, AlertTriangle, Save } from 'lucide-react'
import { Label } from '@/components/ui/label'

type ComplianceLevel = 'FULL' | 'FLEXIBLE' | 'CUSTOM'

interface ComplianceConfig {
  complianceLevel: ComplianceLevel
  enforceWorkHours: boolean
  enforceRestPeriod: boolean
  enforceOvertimeRules: boolean
  enforceTimeBankRules: boolean
  allowNegativeBalance: boolean
  customOvertimeRate: number
  customHolidayRate: number
  warnOnViolation: boolean
  enableTolerances: boolean
  earlyEntryToleranceMinutes: number
  lateExitToleranceMinutes: number
  lateArrivalToleranceMinutes: number
}

export default function CompliancePage() {
  const params = useParams()
  const router = useRouter()
  const company = params?.company as string

  const [config, setConfig] = useState<ComplianceConfig>({
    complianceLevel: 'FULL',
    enforceWorkHours: true,
    enforceRestPeriod: true,
    enforceOvertimeRules: true,
    enforceTimeBankRules: true,
    allowNegativeBalance: false,
    customOvertimeRate: 1.5,
    customHolidayRate: 2.0,
    warnOnViolation: true,
    enableTolerances: true,
    earlyEntryToleranceMinutes: 10,
    lateExitToleranceMinutes: 15,
    lateArrivalToleranceMinutes: 15,
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Carregar configurações
  useEffect(() => {
    if (!company) return

    const fetchConfig = async () => {
      try {
        const token = localStorage.getItem('token')
        const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

        const res = await fetch(`${api}/api/compliance?companyId=${company}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          const data = await res.json()
          setConfig({
            ...data,
            customOvertimeRate: Number(data.customOvertimeRate) || 1.5,
            customHolidayRate: Number(data.customHolidayRate) || 2.0,
          })
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [company])

  // Salvar configurações
  const handleSave = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

      const res = await fetch(`${api}/api/compliance?companyId=${company}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      })

      if (res.ok) {
        alert('✅ Configurações salvas com sucesso!')
      } else {
        alert('❌ Erro ao salvar configurações')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('❌ Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader
          title="Conformidade CLT"
          description="Configure o nível de conformidade da empresa"
          icon={<Scale className="h-6 w-6" />}
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${company}` },
            { label: 'Configurações' },
            { label: 'Conformidade CLT' },
          ]}
        />
        <div className="mt-6 text-center text-muted-foreground">
          Carregando...
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Conformidade CLT"
        description="Configure o nível de conformidade da empresa"
        icon={<Scale className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Admin', href: `/admin/${company}` },
          { label: 'Configurações' },
          { label: 'Conformidade CLT' },
        ]}
      />

      <div className="mt-6 max-w-4xl">
        {/* Nível de Conformidade */}
        <div className="bg-background border border-border rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Nível de Conformidade</h3>
          
          <div className="space-y-4">
            {/* FULL */}
            <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="radio"
                name="complianceLevel"
                value="FULL"
                checked={config.complianceLevel === 'FULL'}
                onChange={(e) => setConfig({ ...config, complianceLevel: e.target.value as ComplianceLevel })}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-semibold">FULL - Rígido (100% CLT)</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Segue todas as regras da CLT. <strong>Bloqueia</strong> registros que violem as leis trabalhistas.
                  Recomendado para empresas com CNPJ que precisam estar 100% em conformidade.
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
                  ✅ Máximo 10h/dia • ✅ Mínimo 11h descanso • ✅ Máximo 2h extras/dia
                </div>
              </div>
            </label>

            {/* FLEXIBLE */}
            <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="radio"
                name="complianceLevel"
                value="FLEXIBLE"
                checked={config.complianceLevel === 'FLEXIBLE'}
                onChange={(e) => setConfig({ ...config, complianceLevel: e.target.value as ComplianceLevel })}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-semibold">FLEXIBLE - Flexível (Sem Validações)</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Não valida regras CLT. Admin tem controle total sobre horários e horas extras.
                  Para empresas informais ou MEI que precisam de flexibilidade.
                </p>
                <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                  ⚠️ Pode gerar passivo trabalhista se usado incorretamente
                </div>
              </div>
            </label>

            {/* CUSTOM */}
            <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="radio"
                name="complianceLevel"
                value="CUSTOM"
                checked={config.complianceLevel === 'CUSTOM'}
                onChange={(e) => setConfig({ ...config, complianceLevel: e.target.value as ComplianceLevel })}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-semibold">CUSTOM - Customizado (Você Escolhe)</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Escolha quais regras CLT ativar e defina taxas personalizadas.
                  Ideal para empresas que querem conformidade parcial.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Regras Customizadas (só aparece se CUSTOM) */}
        {config.complianceLevel === 'CUSTOM' && (
          <div className="bg-background border border-border rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Regras Customizadas</h3>

            <div className="space-y-4">
              {/* Validar horas de trabalho */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enforceWorkHours}
                  onChange={(e) => setConfig({ ...config, enforceWorkHours: e.target.checked })}
                  className="h-4 w-4"
                />
                <div>
                  <div className="font-medium">Validar horas de trabalho</div>
                  <p className="text-sm text-muted-foreground">
                    Máximo 10h/dia (8h normais + 2h extras)
                  </p>
                </div>
              </label>

              {/* Validar período de descanso */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enforceRestPeriod}
                  onChange={(e) => setConfig({ ...config, enforceRestPeriod: e.target.checked })}
                  className="h-4 w-4"
                />
                <div>
                  <div className="font-medium">Validar período de descanso</div>
                  <p className="text-sm text-muted-foreground">
                    Mínimo 11h entre jornadas (CLT Art. 66)
                  </p>
                </div>
              </label>

              {/* Validar regras de hora extra */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enforceOvertimeRules}
                  onChange={(e) => setConfig({ ...config, enforceOvertimeRules: e.target.checked })}
                  className="h-4 w-4"
                />
                <div>
                  <div className="font-medium">Validar regras de hora extra</div>
                  <p className="text-sm text-muted-foreground">
                    Máximo 2h extras/dia (CLT Art. 59)
                  </p>
                </div>
              </label>

              {/* Validar banco de horas */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enforceTimeBankRules}
                  onChange={(e) => setConfig({ ...config, enforceTimeBankRules: e.target.checked })}
                  className="h-4 w-4"
                />
                <div>
                  <div className="font-medium">Validar regras de banco de horas</div>
                  <p className="text-sm text-muted-foreground">
                    Compensação em até 6 meses (CLT Art. 59 §5º)
                  </p>
                </div>
              </label>

              {/* Permitir saldo negativo */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.allowNegativeBalance}
                  onChange={(e) => setConfig({ ...config, allowNegativeBalance: e.target.checked })}
                  className="h-4 w-4"
                />
                <div>
                  <div className="font-medium">Permitir saldo negativo no banco de horas</div>
                  <p className="text-sm text-muted-foreground">
                    Funcionário pode "dever" horas ao banco
                  </p>
                </div>
              </label>

              {/* Taxas personalizadas */}
              <div className="pt-4 border-t border-border">
                <h4 className="font-medium mb-3">Taxas de Hora Extra</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Taxa Normal (dias úteis)</Label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="3"
                      value={config.customOvertimeRate}
                      onChange={(e) => setConfig({ ...config, customOvertimeRate: parseFloat(e.target.value) })}
                      className="w-full mt-2 px-3 py-2 border border-border rounded-md bg-background"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      CLT padrão: 1.5 (50% adicional)
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm">Taxa Feriado/DSR</Label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="3"
                      value={config.customHolidayRate}
                      onChange={(e) => setConfig({ ...config, customHolidayRate: parseFloat(e.target.value) })}
                      className="w-full mt-2 px-3 py-2 border border-border rounded-md bg-background"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      CLT padrão: 2.0 (100% adicional)
                    </p>
                  </div>
                </div>
              </div>

              {/* Apenas avisar */}
              <label className="flex items-center gap-3 cursor-pointer pt-4 border-t border-border">
                <input
                  type="checkbox"
                  checked={config.warnOnViolation}
                  onChange={(e) => setConfig({ ...config, warnOnViolation: e.target.checked })}
                  className="h-4 w-4"
                />
                <div>
                  <div className="font-medium">Apenas avisar (não bloquear)</div>
                  <p className="text-sm text-muted-foreground">
                    Mostra alertas mas permite o registro mesmo com violações
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Tolerâncias Gerais */}
        <div className="bg-background border border-border rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              id="enableTolerances"
              checked={config.enableTolerances}
              onChange={(e) => setConfig({ ...config, enableTolerances: e.target.checked })}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="enableTolerances" className="text-lg font-semibold cursor-pointer">
              Ativar Tolerâncias (Para Todos os Funcionários)
            </label>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">
            Tolerâncias permitem que funcionários batam ponto alguns minutos antes/depois do horário configurado.
            Aplicam-se tanto com hora extra quanto sem.
          </p>

          {config.enableTolerances && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-8 border-l-2 border-primary/20">
                <div>
              <Label className="text-sm">Tolerância de Entrada Antecipada</Label>
              <input
                type="number"
                min="0"
                max="60"
                value={config.earlyEntryToleranceMinutes}
                onChange={(e) => setConfig({ ...config, earlyEntryToleranceMinutes: parseInt(e.target.value) || 0 })}
                className="w-full mt-2 px-3 py-2 border border-border rounded-md bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Funcionário pode entrar até {config.earlyEntryToleranceMinutes} minutos antes do horário
              </p>
            </div>

            <div>
              <Label className="text-sm">Tolerância de Saída Tardia</Label>
              <input
                type="number"
                min="0"
                max="60"
                value={config.lateExitToleranceMinutes}
                onChange={(e) => setConfig({ ...config, lateExitToleranceMinutes: parseInt(e.target.value) || 0 })}
                className="w-full mt-2 px-3 py-2 border border-border rounded-md bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Avisa se sair mais de {config.lateExitToleranceMinutes} minutos depois (não bloqueia)
              </p>
            </div>

            <div>
              <Label className="text-sm">Tolerância de Atraso</Label>
              <input
                type="number"
                min="0"
                max="60"
                value={config.lateArrivalToleranceMinutes}
                onChange={(e) => setConfig({ ...config, lateArrivalToleranceMinutes: parseInt(e.target.value) || 0 })}
                className="w-full mt-2 px-3 py-2 border border-border rounded-md bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Atraso tolerado sem marcar como atrasado
              </p>
            </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Exemplo:</strong> Horário 08:00-18:00, tolerância entrada 10min, tolerância saída 15min.
                  <br />
                  • Pode entrar a partir de 07:50 (10min antes)
                  <br />
                  • Avisa se sair após 18:15 (15min depois)
                </p>
              </div>
            </>
          )}
        </div>

        {/* Aviso Legal */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Aviso Legal</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                O modo FLEXIBLE pode gerar passivo trabalhista se não seguir as leis da CLT.
                Consulte um advogado trabalhista antes de usar este modo.
                O sistema apenas auxilia no controle, a responsabilidade legal é da empresa.
              </p>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>
    </div>
  )
}
