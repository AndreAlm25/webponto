/**
 * 00 - Reset Database
 * Limpa todas as tabelas do banco de dados na ordem correta
 * respeitando as foreign keys.
 */

import { PrismaClient } from '@prisma/client'

export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  console.log('  → Removendo dados em ordem de dependência...')

  // Ordem de deleção (do mais dependente para o menos dependente)
  const tables = [
    // Folha de pagamento
    'payslipBenefit',
    'payslip',
    'payroll',
    
    // Vales/Adiantamentos
    'advance',
    
    // Benefícios
    'employeeBenefit',
    'customBenefit',
    
    // Mensagens
    'messageAttachment',
    'message',
    'messageThread',
    
    // Ponto
    'timeEntry',
    
    // Reconhecimento facial
    'faceProfile',
    
    // Notificações
    'notification',
    
    // Funcionários e relacionados
    'contactInfo',
    'address',
    'employee',
    
    // Usuários
    'user',
    
    // Estrutura da empresa
    'position',
    'department',
    'geofence',
    'payrollConfig',
    'paymentGroup',
    
    // Empresa
    'company',
  ]

  for (const table of tables) {
    try {
      // @ts-ignore - acesso dinâmico às tabelas
      const result = await prisma[table].deleteMany()
      if (result.count > 0) {
        console.log(`    ✓ ${table}: ${result.count} registros removidos`)
      }
    } catch (error: any) {
      // Ignora erros de tabelas que não existem
      if (!error.message.includes('does not exist')) {
        console.log(`    ⚠ ${table}: ${error.message}`)
      }
    }
  }

  console.log('  → Banco de dados limpo!')
}
