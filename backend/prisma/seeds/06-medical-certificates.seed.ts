/**
 * 06 - Medical Certificates Seed
 * Gera atestados médicos para funcionários
 * 
 * CENÁRIOS:
 * - Atestado aprovado (justifica faltas)
 * - Atestado pendente (aguardando aprovação)
 * - Atestado rejeitado
 */

import { PrismaClient, MedicalCertificateStatus } from '@prisma/client'

// Atestados por funcionário (identificado pelo email)
const EMPLOYEE_CERTIFICATES: Record<string, MedicalCertificateConfig[]> = {
  // João da Silva - Atestado aprovado de 2 dias (justifica 2 das 4 faltas)
  'joao.silva@acmetech.com.br': [
    {
      daysAgo: 20,        // Quando começou o atestado (dias atrás)
      days: 2,            // Duração do atestado
      status: 'APPROVED',
      reason: 'Gripe forte - CID J11',
      doctorName: 'Dr. Roberto Almeida',
      doctorCrm: 'CRM/SP 123456',
      notes: 'Repouso absoluto recomendado',
    },
  ],

  // Maria Souza - Atestado aprovado de 1 dia
  'maria.souza@acmetech.com.br': [
    {
      daysAgo: 10,
      days: 1,
      status: 'APPROVED',
      reason: 'Consulta médica - CID Z00',
      doctorName: 'Dra. Fernanda Costa',
      doctorCrm: 'CRM/SP 654321',
      notes: 'Exames de rotina',
    },
  ],

  // Carlos Pereira - Atestado pendente (não vai justificar ainda)
  'carlos.pereira@acmetech.com.br': [
    {
      daysAgo: 5,
      days: 3,
      status: 'PENDING',
      reason: 'Procedimento cirúrgico - CID K40',
      doctorName: 'Dr. Marcos Silva',
      doctorCrm: 'CRM/MG 789012',
      notes: 'Cirurgia de hérnia',
    },
  ],

  // Ana Oliveira - Atestado rejeitado (documento ilegível)
  'ana.oliveira@acmetech.com.br': [
    {
      daysAgo: 15,
      days: 2,
      status: 'REJECTED',
      reason: 'Dor nas costas',
      doctorName: 'Dr. ???',
      doctorCrm: 'Ilegível',
      notes: 'Documento com assinatura ilegível',
      rejectionReason: 'Documento ilegível, favor apresentar novo atestado',
    },
  ],

  // Paulo Santos - Sem atestados (todas as faltas contam)
  'paulo.santos@acmetech.com.br': [],
}

interface MedicalCertificateConfig {
  daysAgo: number           // Quantos dias atrás começou
  days: number              // Duração em dias
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reason?: string
  doctorName?: string
  doctorCrm?: string
  notes?: string
  rejectionReason?: string
}

export async function seedMedicalCertificates(prisma: PrismaClient): Promise<void> {
  // Buscar funcionários
  const employees = await prisma.employee.findMany({
    include: {
      user: true,
      company: true,
    },
  })

  console.log(`  → Gerando atestados médicos para funcionários`)

  let totalCertificates = 0

  for (const employee of employees) {
    if (!employee.user) continue

    const certificates = EMPLOYEE_CERTIFICATES[employee.user.email]
    if (!certificates || certificates.length === 0) continue

    // Buscar admin da empresa para aprovação/rejeição
    const admin = await prisma.user.findFirst({
      where: {
        companyId: employee.companyId,
        role: { in: ['COMPANY_ADMIN', 'HR', 'MANAGER'] },
      },
    })

    for (const certConfig of certificates) {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - certConfig.daysAgo)
      startDate.setHours(0, 0, 0, 0)

      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + certConfig.days - 1)
      endDate.setHours(23, 59, 59, 999)

      // Datas de aprovação/rejeição
      let approvedAt: Date | null = null
      let approvedBy: string | null = null
      let rejectedAt: Date | null = null
      let rejectedBy: string | null = null

      if (certConfig.status === 'APPROVED') {
        approvedAt = new Date(startDate)
        approvedAt.setDate(approvedAt.getDate() + 1)
        approvedBy = admin?.id || null
      }

      if (certConfig.status === 'REJECTED') {
        rejectedAt = new Date(startDate)
        rejectedAt.setDate(rejectedAt.getDate() + 1)
        rejectedBy = admin?.id || null
      }

      await prisma.medicalCertificate.create({
        data: {
          companyId: employee.companyId,
          employeeId: employee.id,
          startDate,
          endDate,
          days: certConfig.days,
          reason: certConfig.reason || null,
          doctorName: certConfig.doctorName || null,
          doctorCrm: certConfig.doctorCrm || null,
          notes: certConfig.notes || null,
          status: certConfig.status as MedicalCertificateStatus,
          approvedAt,
          approvedBy,
          rejectedAt,
          rejectedBy,
          rejectionReason: certConfig.rejectionReason || null,
        },
      })

      totalCertificates++

      // Log de desenvolvimento
      if (process.env.NODE_ENV !== 'production') {
        const statusIcon = {
          PENDING: '⏳',
          APPROVED: '✅',
          REJECTED: '❌',
        }[certConfig.status]
        
        console.log(`    ${statusIcon} ${employee.user.name}: ${certConfig.days} dia(s) - ${certConfig.status}`)
      }
    }
  }

  console.log(`  → Total: ${totalCertificates} atestados gerados`)
}
