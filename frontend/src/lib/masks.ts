// Funções de máscara para formatação de campos

/**
 * Máscara de CPF: 000.000.000-00
 */
export function maskCPF(value: string): string {
  if (!value) return ''
  
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '')
  
  // Limita a 11 dígitos
  const limited = numbers.slice(0, 11)
  
  // Aplica a máscara
  return limited
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

/**
 * Máscara de Telefone: (00) 00000-0000 ou (00) 0000-0000
 */
export function maskPhone(value: string): string {
  if (!value) return ''
  
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '')
  
  // Limita a 11 dígitos
  const limited = numbers.slice(0, 11)
  
  // Aplica a máscara
  if (limited.length <= 10) {
    // Telefone fixo: (00) 0000-0000
    return limited
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  } else {
    // Celular: (00) 00000-0000
    return limited
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
  }
}

/**
 * Remove máscara e retorna apenas números
 */
export function unmask(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Formata data para input date (YYYY-MM-DD)
 */
export function formatDateForInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
