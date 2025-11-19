/**
 * Utilitários para lógica de ponto eletrônico
 * Baseado no projeto antigo que funciona perfeitamente
 */

/**
 * Função auxiliar para verificar se está próximo de um horário
 * @param targetTime Horário alvo (HH:MM)
 * @param toleranceMinutes Tolerância em minutos (padrão: 30)
 */
export function isNearTime(targetTime: string, toleranceMinutes: number = 30): boolean {
  if (!targetTime) return false
  const now = new Date()
  const [hours, minutes] = targetTime.split(':').map(Number)
  const target = new Date()
  target.setHours(hours, minutes, 0, 0)
  const diffMinutes = Math.abs((now.getTime() - target.getTime()) / 60000)
  return diffMinutes <= toleranceMinutes
}

/**
 * Decide o próximo tipo de ponto automaticamente
 * Baseado no último registro e horário configurado do funcionário
 * 
 * LÓGICA (do projeto antigo):
 * - Nenhum registro OU último foi SAÍDA → ENTRADA
 * - Último foi ENTRADA:
 *   - Se próximo do horário de intervalo → INÍCIO_INTERVALO (automático)
 *   - Se próximo do horário de saída → SAÍDA (automático)
 *   - Senão → AMBÍGUO (usuário escolhe: intervalo ou saída)
 * - Último foi INÍCIO_INTERVALO → FIM_INTERVALO (sempre)
 * - Último foi FIM_INTERVALO → SAÍDA (sempre)
 */
export function decideNextAction(
  lastType: string | null,
  employeeSchedule: {
    workStart: string
    workEnd: string
    breakStart: string | null
    breakEnd: string | null
  }
): { next: string | null; ambiguous: string[] | null } {
  // Se não tem registro, é ENTRADA
  if (!lastType || lastType === 'CLOCK_OUT') {
    return { next: 'CLOCK_IN', ambiguous: null }
  }
  
  // Se última foi ENTRADA
  if (lastType === 'CLOCK_IN') {
    // Verificar se está próximo do horário de intervalo
    if (employeeSchedule.breakStart && isNearTime(employeeSchedule.breakStart)) {
      return { next: 'BREAK_START', ambiguous: null } // Automático
    }
    // Verificar se está próximo do horário de saída
    if (employeeSchedule.workEnd && isNearTime(employeeSchedule.workEnd)) {
      return { next: 'CLOCK_OUT', ambiguous: null } // Automático
    }
    // Ambíguo: pode ser intervalo OU saída
    return { next: null, ambiguous: ['BREAK_START', 'CLOCK_OUT'] }
  }
  
  // Se última foi INÍCIO DE INTERVALO
  if (lastType === 'BREAK_START') {
    // Verificar se está próximo do fim do intervalo
    if (employeeSchedule.breakEnd && isNearTime(employeeSchedule.breakEnd)) {
      return { next: 'BREAK_END', ambiguous: null } // Automático
    }
    return { next: 'BREAK_END', ambiguous: null } // Sempre fim de intervalo
  }
  
  // Se última foi FIM DE INTERVALO
  if (lastType === 'BREAK_END') {
    // Verificar se está próximo do horário de saída
    if (employeeSchedule.workEnd && isNearTime(employeeSchedule.workEnd)) {
      return { next: 'CLOCK_OUT', ambiguous: null } // Automático
    }
    return { next: 'CLOCK_OUT', ambiguous: null } // Sempre saída
  }
  
  // Fallback
  return { next: 'CLOCK_IN', ambiguous: null }
}

/**
 * Mapear tipos entre frontend e backend
 */
export const TYPE_MAP = {
  'CLOCK_IN': 'ENTRADA',
  'CLOCK_OUT': 'SAIDA',
  'BREAK_START': 'INICIO_INTERVALO',
  'BREAK_END': 'FIM_INTERVALO',
  // Reverso
  'ENTRADA': 'CLOCK_IN',
  'SAIDA': 'CLOCK_OUT',
  'INICIO_INTERVALO': 'BREAK_START',
  'FIM_INTERVALO': 'BREAK_END'
} as const

/**
 * Nomes amigáveis para exibição
 */
export const TYPE_LABELS = {
  'CLOCK_IN': 'Entrada',
  'CLOCK_OUT': 'Saída',
  'BREAK_START': 'Início do Intervalo',
  'BREAK_END': 'Fim do Intervalo'
} as const
