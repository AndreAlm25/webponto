'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Building2, User, CheckCircle, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import { useCnpjLookup, formatCNPJ, cleanCNPJ } from '@/hooks/useCnpjLookup'

// Tipos
interface CompanyData {
  cnpj: string
  razaoSocial: string
  nomeFantasia: string
  email: string
  telefone: string
  cnae: string
  endereco: {
    logradouro: string
    numero: string
    complemento: string
    bairro: string
    cidade: string
    uf: string
    cep: string
  }
}

interface AdminData {
  nome: string
  email: string
  senha: string
  confirmarSenha: string
}

interface FormData {
  company: CompanyData
  admin: AdminData
}

// Componente Step 1: Dados da Empresa
function StepCompany({
  data,
  onChange,
  cnpjLookup,
  cnpjData,
  cnpjLoading,
  cnpjError
}: {
  data: CompanyData
  onChange: (data: CompanyData) => void
  cnpjLookup: (cnpj: string) => void
  cnpjData: ReturnType<typeof useCnpjLookup>['data']
  cnpjLoading: boolean
  cnpjError: string | null
}) {
  // Track last fetched CNPJ to know when data should be refreshed
  const lastFetchedCNPJRef = useRef<string>('')

  const handleCNPJChange = (value: string) => {
    const formatted = formatCNPJ(value)
    const clean = cleanCNPJ(value)

    // Clear auto-filled fields when CNPJ changes
    if (clean.length < 14 && clean !== cleanCNPJ(data.cnpj)) {
      onChange({
        ...data,
        cnpj: formatted,
        razaoSocial: '',
        nomeFantasia: '',
        email: '',
        telefone: '',
        cnae: '',
        endereco: {
          logradouro: '',
          numero: '',
          complemento: '',
          bairro: '',
          cidade: '',
          uf: '',
          cep: ''
        }
      })
      return
    }

    onChange({ ...data, cnpj: formatted })

    // Auto-consultar quando tiver 14 dígitos
    if (clean.length === 14) {
      cnpjLookup(clean)
    }
  }

  // Preencher dados quando a API retornar (always update on new fetch)
  if (cnpjData && cnpjData.cnpj !== lastFetchedCNPJRef.current) {
    lastFetchedCNPJRef.current = cnpjData.cnpj
    onChange({
      ...data,
      razaoSocial: cnpjData.razaoSocial,
      nomeFantasia: cnpjData.nomeFantasia,
      email: cnpjData.email || '',
      telefone: formatTelefone(cnpjData.telefone || ''),
      cnae: cnpjData.cnae,
      endereco: {
        ...cnpjData.endereco,
        complemento: cnpjData.endereco.complemento || ''
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cnpj">CNPJ *</Label>
        <Input
          id="cnpj"
          placeholder="00.000.000/0000-00"
          value={data.cnpj}
          onChange={(e) => handleCNPJChange(e.target.value)}
          maxLength={18}
        />
        {cnpjLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Consultando Receita Federal...
          </div>
        )}
        {cnpjError && (
          <p className="text-sm text-red-500">{cnpjError}</p>
        )}
        {cnpjData && (
          <p className="text-sm text-green-600 flex items-center gap-1">
            <CheckCircle className="h-4 w-4" />
            Empresa encontrada: {cnpjData.nomeFantasia}
          </p>
        )}
      </div>

      {cnpjLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="razaoSocial">Razão Social *</Label>
            <Input
              id="razaoSocial"
              placeholder="Nome oficial da empresa"
              value={data.razaoSocial}
              onChange={(e) => onChange({ ...data, razaoSocial: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nomeFantasia">Nome Fantasia *</Label>
            <Input
              id="nomeFantasia"
              placeholder="Nome comercial"
              value={data.nomeFantasia}
              onChange={(e) => onChange({ ...data, nomeFantasia: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email da Empresa</Label>
              <Input
                id="email"
                type="email"
                placeholder="empresa@email.com"
                value={data.email}
                onChange={(e) => onChange({ ...data, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                placeholder="(00) 00000-0000"
                value={data.telefone}
                onChange={(e) => onChange({ ...data, telefone: formatTelefone(e.target.value) })}
                maxLength={15}
              />
            </div>
          </div>

          {/* Endereço */}
          <div className="pt-2 border-t border-border/50">
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-webponto-blue" />
              Endereço
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="logradouro">Logradouro</Label>
                <Input
                  id="logradouro"
                  placeholder="Rua, Avenida, etc."
                  value={data.endereco.logradouro}
                  onChange={(e) => onChange({ ...data, endereco: { ...data.endereco, logradouro: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  placeholder="123"
                  value={data.endereco.numero}
                  onChange={(e) => onChange({ ...data, endereco: { ...data.endereco, numero: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  placeholder="Sala 101"
                  value={data.endereco.complemento}
                  onChange={(e) => onChange({ ...data, endereco: { ...data.endereco, complemento: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  placeholder="Bairro"
                  value={data.endereco.bairro}
                  onChange={(e) => onChange({ ...data, endereco: { ...data.endereco, bairro: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  placeholder="Cidade"
                  value={data.endereco.cidade}
                  onChange={(e) => onChange({ ...data, endereco: { ...data.endereco, cidade: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uf">UF</Label>
                <Input
                  id="uf"
                  placeholder="SP"
                  value={data.endereco.uf}
                  maxLength={2}
                  onChange={(e) => onChange({ ...data, endereco: { ...data.endereco, uf: e.target.value.toUpperCase() } })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  placeholder="00000-000"
                  value={data.endereco.cep}
                  maxLength={9}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '').slice(0, 8)
                    const formatted = clean.length > 5 ? clean.replace(/(\d{5})(\d{3})/, '$1-$2') : clean
                    onChange({ ...data, endereco: { ...data.endereco, cep: formatted } })
                  }}
                />
              </div>
            </div>
          </div>

          {/* CNAE */}
          {data.cnae && (
            <div className="pt-2">
              <div className="space-y-2">
                <Label htmlFor="cnae">CNAE Principal</Label>
                <Input
                  id="cnae"
                  value={`${data.cnae}`}
                  disabled
                  className="bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">
                  {cnpjData?.cnaeDescricao || ''}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Componente Step 2: Dados do Administrador
function StepAdmin({
  data,
  onChange,
  socios
}: {
  data: AdminData
  onChange: (data: AdminData) => void
  socios: { nome: string; qualificacao: string }[]
}) {
  // Prefill admin name with first socio-administrador if empty
  const prefilledRef = useRef(false)
  if (!prefilledRef.current && socios.length > 0 && !data.nome) {
    const socioAdmin = socios.find(s =>
      s.qualificacao.toLowerCase().includes('admin') ||
      s.qualificacao.toLowerCase().includes('sócio-administrador') ||
      s.qualificacao.toLowerCase().includes('socio-administrador')
    ) || socios[0]
    if (socioAdmin) {
      onChange({ ...data, nome: socioAdmin.nome })
      prefilledRef.current = true
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome Completo *</Label>
        <Input
          id="nome"
          placeholder="Seu nome"
          value={data.nome}
          onChange={(e) => onChange({ ...data, nome: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="emailAdmin">Email *</Label>
        <Input
          id="emailAdmin"
          type="email"
          placeholder="seu@email.com"
          value={data.email}
          onChange={(e) => onChange({ ...data, email: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Este será seu login no sistema
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="senha">Senha *</Label>
        <Input
          id="senha"
          type="password"
          placeholder="Mínimo 6 caracteres"
          value={data.senha}
          onChange={(e) => onChange({ ...data, senha: e.target.value })}
        />
        {data.senha && data.senha.length < 6 && (
          <p className="text-sm text-red-500">Senha deve ter pelo menos 6 caracteres</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmarSenha">Confirmar Senha *</Label>
        <Input
          id="confirmarSenha"
          type="password"
          placeholder="Repita a senha"
          value={data.confirmarSenha}
          onChange={(e) => onChange({ ...data, confirmarSenha: e.target.value })}
        />
        {data.confirmarSenha && data.senha !== data.confirmarSenha && (
          <p className="text-sm text-red-500">Senhas não conferem</p>
        )}
      </div>
    </div>
  )
}

// Componente Step 3: Confirmação
function StepConfirm({
  company,
  admin
}: {
  company: CompanyData
  admin: AdminData
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-muted p-4 space-y-3">
        <h4 className="font-medium flex items-center gap-2">
          <Building2 className="h-4 w-4 text-webponto-blue" />
          Dados da Empresa
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">CNPJ:</span>
            <p>{company.cnpj}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Nome:</span>
            <p className="font-medium">{company.nomeFantasia}</p>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Razão Social:</span>
            <p>{company.razaoSocial}</p>
          </div>
          {company.email && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Email:</span>
              <p>{company.email}</p>
            </div>
          )}
          {company.telefone && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Telefone:</span>
              <p>{company.telefone}</p>
            </div>
          )}
          {(company.endereco.logradouro || company.endereco.cidade) && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Endereço:</span>
              <p>
                {company.endereco.logradouro}, {company.endereco.numero}
                {company.endereco.complemento ? ` - ${company.endereco.complemento}` : ''}
                <br />
                {company.endereco.bairro}, {company.endereco.cidade} - {company.endereco.uf}
                {company.endereco.cep ? `, CEP ${company.endereco.cep}` : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-muted p-4 space-y-3">
        <h4 className="font-medium flex items-center gap-2">
          <User className="h-4 w-4 text-webponto-blue" />
          Dados do Administrador
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="col-span-2">
            <span className="text-muted-foreground">Nome:</span>
            <p className="font-medium">{admin.nome}</p>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Email (login):</span>
            <p>{admin.email}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4">
        <p className="text-sm text-green-700 dark:text-green-300">
          <CheckCircle className="h-4 w-4 inline mr-1" />
          Após confirmar, você terá acesso a um período de teste gratuito de 14 dias.
        </p>
      </div>
    </div>
  )
}

// Componente Principal
export function CompanyRegistrationWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { data: cnpjData, loading: cnpjLoading, error: cnpjError, lookup: cnpjLookup } = useCnpjLookup()

  const [formData, setFormData] = useState<FormData>({
    company: {
      cnpj: '',
      razaoSocial: '',
      nomeFantasia: '',
      email: '',
      telefone: '',
      cnae: '',
      endereco: {
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: '',
        cep: ''
      }
    },
    admin: {
      nome: '',
      email: '',
      senha: '',
      confirmarSenha: ''
    }
  })

  const updateCompany = useCallback((data: CompanyData) => {
    setFormData(prev => ({ ...prev, company: data }))
  }, [])

  const updateAdmin = useCallback((data: AdminData) => {
    setFormData(prev => ({ ...prev, admin: data }))
  }, [])

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(
          formData.company.cnpj &&
          formData.company.razaoSocial &&
          formData.company.nomeFantasia
        )
      case 2:
        return !!(
          formData.admin.nome &&
          formData.admin.email &&
          formData.admin.senha.length >= 6 &&
          formData.admin.senha === formData.admin.confirmarSenha
        )
      default:
        return true
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3))
    } else {
      toast.error('Preencha todos os campos obrigatórios')
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/auth/register-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeName: formData.company.nomeFantasia,
          legalName: formData.company.razaoSocial,
          cnpj: cleanCNPJ(formData.company.cnpj),
          email: formData.company.email,
          adminName: formData.admin.nome,
          adminEmail: formData.admin.email,
          adminPassword: formData.admin.senha
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao criar empresa')
      }

      toast.success('Empresa cadastrada com sucesso!')
      
      // Redirecionar para login
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao cadastrar empresa')
    } finally {
      setIsSubmitting(false)
    }
  }

  const steps = [
    { number: 1, title: 'Empresa', icon: Building2 },
    { number: 2, title: 'Administrador', icon: User },
    { number: 3, title: 'Confirmação', icon: CheckCircle }
  ]

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Cadastro de Empresa</CardTitle>
        <CardDescription>
          Preencha os dados para começar a usar o WebPonto
        </CardDescription>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mt-6">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div
                className={`flex flex-col items-center gap-1 ${
                  currentStep >= step.number ? 'text-webponto-blue' : 'text-muted-foreground'
                }`}
              >
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                    currentStep >= step.number
                      ? 'border-webponto-blue bg-webponto-blue/10'
                      : 'border-muted'
                  }`}
                >
                  <step.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium">{step.title}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-2 ${
                  currentStep > step.number ? 'bg-webponto-blue' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <div className="transition-all duration-300 ease-in-out">
          {currentStep === 1 && (
            <StepCompany
              data={formData.company}
              onChange={updateCompany}
              cnpjLookup={cnpjLookup}
              cnpjData={cnpjData}
              cnpjLoading={cnpjLoading}
              cnpjError={cnpjError}
            />
          )}
          {currentStep === 2 && (
            <StepAdmin data={formData.admin} onChange={updateAdmin} socios={cnpjData?.socios || []} />
          )}
          {currentStep === 3 && (
            <StepConfirm company={formData.company} admin={formData.admin} />
          )}
        </div>

        <div className="flex justify-between mt-8 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          
          {currentStep < 3 ? (
            <Button
              onClick={handleNext}
              className="flex items-center gap-2 bg-webponto-blue hover:bg-webponto-blue-700"
            >
              Próximo
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-webponto-blue hover:bg-webponto-blue-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Confirmar Cadastro
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Helper: format Brazilian phone number
function formatTelefone(telefone: string): string {
  const clean = telefone.replace(/\D/g, '')
  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  if (clean.length === 10) {
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  return telefone
}
