'use client'

import { useState, useEffect } from 'react'

export interface TimeClock {
  id: number
  employeeId: number
  type: 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END'
  method: string
  timestamp: string
  message: string
}

/**
 * Hook para gerenciar pontos do dia atual
 * Usa localStorage para persistir (cliente)
 */
export function useTodayTimeClocks() {
  const [records, setRecords] = useState<TimeClock[]>([])
  const [lastType, setLastType] = useState<string | null>(null)

  // Carregar pontos do localStorage ao montar
  useEffect(() => {
    const loadRecords = () => {
      try {
        const stored = localStorage.getItem('pontos_hoje')
        if (stored) {
          const parsed = JSON.parse(stored)
          setRecords(parsed)
          if (parsed.length > 0) {
            setLastType(parsed[parsed.length - 1].type)
          }
        }
      } catch (e) {
        console.error('[useTodayTimeClocks] Erro ao carregar:', e)
      }
    }

    loadRecords()

    // Limpar pontos à meia-noite
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    const msUntilMidnight = tomorrow.getTime() - now.getTime()

    const timer = setTimeout(() => {
      localStorage.removeItem('pontos_hoje')
      setRecords([])
      setLastType(null)
    }, msUntilMidnight)

    return () => clearTimeout(timer)
  }, [])

  // Adicionar novo ponto
  const addTimeClock = (timeClock: TimeClock) => {
    const updated = [...records, timeClock]
    setRecords(updated)
    setLastType(timeClock.type)
    localStorage.setItem('pontos_hoje', JSON.stringify(updated))
  }

  // Limpar pontos (útil para testes)
  const clearRecords = () => {
    setRecords([])
    setLastType(null)
    localStorage.removeItem('pontos_hoje')
  }

  return {
    records,
    lastType,
    addTimeClock,
    clearRecords
  }
}
