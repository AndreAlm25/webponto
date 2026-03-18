'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function TerminalPage() {
  const router = useRouter()
  const { company } = useParams<{ company: string }>()

  useEffect(() => {
    router.replace(`/admin/${company}/terminal-de-ponto`)
  }, [company, router])

  return null
}