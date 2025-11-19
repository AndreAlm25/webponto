// Componente: Exibe erro quando slug da URL não corresponde ao slug do usuário
// - Usado em todas as páginas /admin/[company]/*

import Link from 'next/link'

interface SlugMismatchErrorProps {
  urlSlug: string
  correctSlug: string
  currentPath?: string
}

export function SlugMismatchError({ urlSlug, correctSlug, currentPath = '' }: SlugMismatchErrorProps) {
  // Remove /admin/[slug] do path para manter o resto da rota
  const pathWithoutSlug = currentPath.replace(`/admin/${urlSlug}`, '')
  const correctUrl = `/admin/${correctSlug}${pathWithoutSlug}`
  
  return (
    <div className="p-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h2 className="text-red-800 font-semibold mb-2">⚠️ Acesso Negado</h2>
        <p className="text-red-700 text-sm mb-2">
          A URL acessada (<code className="bg-red-100 px-1 rounded">/admin/{urlSlug}</code>) 
          não corresponde à sua empresa (<code className="bg-red-100 px-1 rounded">/admin/{correctSlug}</code>).
        </p>
        <p className="text-red-600 text-xs mb-3">
          Por segurança, você só pode acessar páginas da sua própria empresa.
        </p>
        <Link 
          href={correctUrl}
          className="inline-block mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
        >
          Ir para minha empresa
        </Link>
      </div>
    </div>
  )
}
