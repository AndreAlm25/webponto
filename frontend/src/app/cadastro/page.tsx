import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { CompanyRegistrationWizard } from './components/CompanyRegistrationWizard'

export const metadata: Metadata = {
  title: 'Cadastro de Empresa - WebPonto',
  description: 'Cadastre sua empresa no WebPonto e comece a controlar o ponto dos seus funcionários',
}

export default function CadastroPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-webponto-blue-50 to-white dark:from-webponto-blue-950/20 dark:to-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Home
          </Link>
          
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-webponto-blue flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="font-semibold">WebPonto</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="py-8">
          <CompanyRegistrationWizard />
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground mt-12">
          <p>Já tem uma conta?{' '}
            <Link href="/login" className="text-webponto-blue hover:underline">
              Faça login
            </Link>
          </p>
          <p className="mt-2">
            Ao cadastrar, você concorda com nossos{' '}
            <Link href="#" className="text-webponto-blue hover:underline">
              Termos de Uso
            </Link>
            {' '}e{' '}
            <Link href="#" className="text-webponto-blue hover:underline">
              Política de Privacidade
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
