/**
 * 05 - Advances Seed
 * Gera vales/adiantamentos em diferentes status
 * 
 * CENÁRIOS:
 * - Vale pago (descontado no holerite)
 * - Vale aprovado (aguardando pagamento)
 * - Vale pendente (aguardando aprovação)
 * - Vale rejeitado
 */

import { PrismaClient, AdvanceStatus } from '@prisma/client'

// Vales por funcionário
const EMPLOYEE_ADVANCES: Record<string, AdvanceConfig[]> = {
  // Paulo Santos - Vale pago
  'paulo.santos@acmetech.com.br': [
    {
      amount: 500,
      status: 'PAID',
      requestedDaysAgo: 15,
      reason: 'Despesas médicas',
    },
  ],

  // João da Silva - Vale aprovado aguardando
  'joao.silva@acmetech.com.br': [
    {
      amount: 300,
      status: 'APPROVED',
      requestedDaysAgo: 5,
      reason: 'Emergência familiar',
    },
  ],

  // Maria Souza - Vale pendente
  'maria.souza@acmetech.com.br': [
    {
      amount: 200,
      status: 'PENDING',
      requestedDaysAgo: 2,
      reason: 'Conserto do carro',
    },
  ],

  // Carlos Pereira - Vale rejeitado
  'carlos.pereira@acmetech.com.br': [
    {
      amount: 400,
      status: 'REJECTED',
      requestedDaysAgo: 10,
      reason: 'Viagem pessoal',
      rejectionReason: 'Valor excede o limite permitido',
    },
  ],

  // Ana Oliveira - Múltiplos vales
  'ana.oliveira@acmetech.com.br': [
    {
      amount: 150,
      status: 'PAID',
      requestedDaysAgo: 30,
      reason: 'Material escolar',
    },
    {
      amount: 250,
      status: 'PENDING',
      requestedDaysAgo: 1,
      reason: 'Conta de luz',
    },
  ],
}

interface AdvanceConfig {
  amount: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED'
  requestedDaysAgo: number
  reason?: string
  rejectionReason?: string
}

export async function seedAdvances(prisma: PrismaClient): Promise<void> {
  // Buscar funcionários
  const employees = await prisma.employee.findMany({
    include: {
      user: true,
      company: true,
    },
  })

  console.log(`  → Gerando vales para funcionários`)

  let totalAdvances = 0

  for (const employee of employees) {
    if (!employee.user) continue

    const advances = EMPLOYEE_ADVANCES[employee.user.email]
    if (!advances || advances.length === 0) continue

    for (const advanceConfig of advances) {
      const requestedAt = new Date()
      requestedAt.setDate(requestedAt.getDate() - advanceConfig.requestedDaysAgo)

      // Datas baseadas no status
      let approvedAt: Date | null = null
      let approvedBy: string | null = null
      let rejectedAt: Date | null = null
      let rejectedBy: string | null = null
      let paidAt: Date | null = null

      // Buscar admin da empresa para aprovação/rejeição
      const admin = await prisma.user.findFirst({
        where: {
          companyId: employee.companyId,
          role: { in: ['COMPANY_ADMIN', 'HR', 'MANAGER'] },
        },
      })

      if (advanceConfig.status === 'APPROVED' || advanceConfig.status === 'PAID') {
        approvedAt = new Date(requestedAt)
        approvedAt.setDate(approvedAt.getDate() + 1)
        approvedBy = admin?.id || null
      }

      if (advanceConfig.status === 'REJECTED') {
        rejectedAt = new Date(requestedAt)
        rejectedAt.setDate(rejectedAt.getDate() + 1)
        rejectedBy = admin?.id || null
      }

      if (advanceConfig.status === 'PAID') {
        paidAt = new Date(requestedAt)
        paidAt.setDate(paidAt.getDate() + 3)
      }

      // Calcular mês/ano de referência
      const refDate = new Date()
      refDate.setDate(refDate.getDate() - advanceConfig.requestedDaysAgo)
      
      await prisma.advance.create({
        data: {
          companyId: employee.companyId,
          employeeId: employee.id,
          type: 'EXTRA_ADVANCE',
          amount: advanceConfig.amount,
          referenceMonth: refDate.getMonth() + 1,
          referenceYear: refDate.getFullYear(),
          status: advanceConfig.status as AdvanceStatus,
          reason: advanceConfig.reason || null,
          requestDate: requestedAt,
          approvedAt,
          approvedById: approvedBy,
          rejectedReason: advanceConfig.rejectionReason || null,
          paymentDate: paidAt,
        },
      })

      totalAdvances++

      // Log de desenvolvimento
      if (process.env.NODE_ENV !== 'production') {
        const statusIcon = {
          PENDING: '⏳',
          APPROVED: '✅',
          REJECTED: '❌',
          PAID: '💰',
          CANCELLED: '🚫',
        }[advanceConfig.status]
        
        console.log(`    ${statusIcon} ${employee.user.name}: R$ ${advanceConfig.amount} (${advanceConfig.status})`)
      }
    }
  }

  console.log(`  → Total: ${totalAdvances} vales gerados`)
}
