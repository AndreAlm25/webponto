'use client'

import dynamic from 'next/dynamic'
import { ReactNode } from 'react'

// Importar WebSocketProvider apenas no cliente (sem SSR)
const WebSocketProvider = dynamic(
  () => import('@/contexts/WebSocketContext').then(mod => ({ default: mod.WebSocketProvider })),
  { ssr: false }
)

export function ClientOnlyWebSocket({ children }: { children: ReactNode }) {
  return <WebSocketProvider>{children}</WebSocketProvider>
}
