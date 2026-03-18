/**
 * 99 - Generate Documentation Seed
 * Gera o documento CALCULOS-ESPERADOS-TESTE.md automaticamente
 * baseado nos dados reais do banco de dados
 * 
 * Este script deve ser executado APÓS todos os outros seeds
 * para garantir que o documento reflita os dados atuais
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

export async function generateCalculosDoc(prisma: PrismaClient): Promise<void> {
  console.log('  → Gerando documento CALCULOS-ESPERADOS-TESTE.md...')

  // Buscar todas as empresas com configurações
  const companies = await prisma.company.findMany({
    where: {
      tradeName: { in: ['Acme Tech', 'Beta Solutions'] }
    },
    include: {
      payrollConfig: true,
    },
    orderBy: { tradeName: 'asc' }
  })

  // Buscar todos os payslips com dados do funcionário
  const payslips = await prisma.payslip.findMany({
    where: {
      company: {
        tradeName: { in: ['Acme Tech', 'Beta Solutions'] }
      }
    },
    include: {
      employee: {
        include: {
          user: true,
          position: true,
          department: true,
        }
      },
      company: {
        include: {
          payrollConfig: true,
        }
      }
    },
    orderBy: [
      { company: { tradeName: 'asc' } },
      { employee: { registrationId: 'asc' } },
      { referenceYear: 'asc' },
      { referenceMonth: 'asc' },
    ]
  })

  const now = new Date()
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  let doc = `# 📊 Cálculos Esperados - Teste de Holerites (4 Meses)

> ⚠️ **DOCUMENTO GERADO AUTOMATICAMENTE**
> Este documento é gerado pelo seed \`99-generate-doc.seed.ts\` baseado nos dados reais do banco.
> **Última atualização**: ${monthNames[now.getMonth()]}/${now.getFullYear()} - ${now.toLocaleString('pt-BR')}

Este documento contém os cálculos esperados para **TODOS os meses** gerados pelos seeds.
Use para validar se o sistema está calculando corretamente.

---

## 📅 Meses Gerados

| # | Mês/Ano | Status Folha | Status Holerites |
|---|---------|--------------|------------------|
| 1 | **Outubro/2025** | PAID | Todos PAID e assinados |
| 2 | **Novembro/2025** | PAID | Todos PAID e assinados |
| 3 | **Dezembro/2025** | APPROVED | Mistura (PAID, APPROVED, CALCULATED, PENDING) |
| 4 | **Janeiro/2026** | DRAFT | Todos CALCULATED (mês atual - parcial) |

---

## 🏢 Configurações das Empresas

`

  // Adicionar configurações das empresas
  for (const company of companies) {
    const config = company.payrollConfig
    doc += `### ${company.tradeName}
| Config | Valor |
|--------|-------|
| CNPJ | ${company.cnpj} |
| INSS/IRRF/FGTS | ${config?.enableInss ? '✅' : '❌'} Habilitado |
| **Desconto Atrasos** | ${config?.enableLateDiscount ? '✅ `enableLateDiscount = true`' : '❌ `enableLateDiscount = false`'} |
| Vale-Transporte | ${config?.transportVoucherRate || 0}% |
| Plano Saúde | R$ ${Number(config?.healthInsuranceValue || 0).toFixed(2)} |
| Plano Dental | R$ ${Number(config?.dentalInsuranceValue || 0).toFixed(2)} |

`
  }

  doc += `---

`

  // Agrupar payslips por empresa e funcionário
  const byCompany: Record<string, Record<string, any[]>> = {}
  
  for (const ps of payslips) {
    const companyName = ps.company.tradeName
    const empEmail = ps.employee.user?.email || 'unknown'
    
    if (!byCompany[companyName]) byCompany[companyName] = {}
    if (!byCompany[companyName][empEmail]) byCompany[companyName][empEmail] = []
    
    byCompany[companyName][empEmail].push(ps)
  }

  // Gerar seções por empresa
  for (const [companyName, employees] of Object.entries(byCompany)) {
    const company = companies.find(c => c.tradeName === companyName)
    const enableLateDiscount = company?.payrollConfig?.enableLateDiscount
    
    doc += `# 🏭 ${companyName.toUpperCase()}

> ${enableLateDiscount ? '✅ Atrasos são DESCONTADOS do salário' : '⚠️ **IMPORTANTE:** Atrasos são **REGISTRADOS** mas **NÃO DESCONTADOS** do salário!'}

---

`

    // Gerar seção por funcionário
    for (const [email, payslipList] of Object.entries(employees)) {
      const firstPs = payslipList[0]
      const emp = firstPs.employee
      const user = emp.user
      
      doc += `## 👤 ${user?.name || 'N/A'} (${emp.registrationId})

| Dado | Valor |
|------|-------|
| Email | ${email} |
| Cargo | ${emp.position?.name || 'N/A'} |
| Departamento | ${emp.department?.name || 'N/A'} |
| Salário Base | R$ ${Number(emp.baseSalary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} |
| Valor Hora | R$ ${(Number(emp.baseSalary) / 220).toFixed(2)} (${emp.baseSalary}/220) |

`

      // Gerar detalhes por mês
      for (const ps of payslipList) {
        const monthName = monthNames[ps.referenceMonth - 1]
        const statusEmoji = ps.status === 'PAID' ? '✅' : ps.status === 'APPROVED' ? '⏳' : ps.status === 'PENDING' ? '⏸️' : '📊'
        
        doc += `### ${monthName}/${ps.referenceYear} (${ps.status} ${statusEmoji})

| Item | Valor |
|------|-------|
| Status | ${ps.status} |
| Dias Trabalhados | ${ps.workedDays} |
| Faltas/Dias não trabalhados | ${ps.absenceDays} |
| Atrasos | ${ps.lateMinutes} min |

\`\`\`
PROVENTOS:
  Salário Base:                    R$ ${Number(ps.baseSalary).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ ${Number(ps.totalEarnings).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

DESCONTOS:
${ps.absenceDays > 0 ? `  Faltas/Dias não trab. (${ps.absenceDays}):    R$ ${Number(ps.absenceValue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` : ''}\
${ps.lateMinutes > 0 && ps.lateDiscounted ? `  Atrasos (${ps.lateMinutes}min):              R$ ${Number(ps.lateValue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` : ''}\
${ps.lateMinutes > 0 && !ps.lateDiscounted ? `  Atrasos:                         R$     0,00  ← NÃO DESCONTADO!\n` : ''}\
  INSS (${Number(ps.inssRate).toFixed(2)}%):                   R$ ${Number(ps.inssValue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
  IRRF (${Number(ps.irRate).toFixed(2)}%):                   R$ ${Number(ps.irValue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
  Vale-Transporte (6%):            R$ ${Number(ps.transportVoucher).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
${Number(ps.healthInsurance) > 0 ? `  Plano de Saúde:                  R$ ${Number(ps.healthInsurance).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` : ''}\
${Number(ps.dentalInsurance) > 0 ? `  Plano Dental:                    R$ ${Number(ps.dentalInsurance).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` : ''}\
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ ${Number(ps.totalDeductions).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

LÍQUIDO:                           R$ ${Number(ps.netSalary).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
FGTS (8%):                         R$ ${Number(ps.fgtsValue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
${ps.lateMinutes > 0 ? `\n⚠️ DADOS DE ATRASO:\n  lateMinutes: ${ps.lateMinutes}\n  lateValue: R$ ${Number(ps.lateValue).toFixed(2)}\n  lateDiscounted: ${ps.lateDiscounted}` : ''}
\`\`\`

`
      }
      
      doc += `---

`
    }
  }

  // Tabela resumo
  doc += `# 📋 TABELA RESUMO - TODOS OS MESES

> **Valores gerados automaticamente do banco de dados**

`

  for (const [companyName, employees] of Object.entries(byCompany)) {
    const company = companies.find(c => c.tradeName === companyName)
    doc += `## ${companyName} (enableLateDiscount = ${company?.payrollConfig?.enableLateDiscount})

| Funcionário | Salário | Out/25 | Nov/25 | Dez/25 | Jan/26 |
|-------------|---------|--------|--------|--------|--------|
`
    
    for (const [email, payslipList] of Object.entries(employees)) {
      const emp = payslipList[0].employee
      const user = emp.user
      
      const getMonthValue = (month: number, year: number) => {
        const ps = payslipList.find(p => p.referenceMonth === month && p.referenceYear === year)
        if (!ps) return 'N/A'
        return `R$ ${Number(ps.netSalary).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${ps.status})`
      }
      
      doc += `| ${user?.name || 'N/A'} | R$ ${Number(emp.baseSalary).toLocaleString('pt-BR')} | ${getMonthValue(10, 2025)} | ${getMonthValue(11, 2025)} | ${getMonthValue(12, 2025)} | ${getMonthValue(1, 2026)} |
`
    }
    
    doc += `
`
  }

  doc += `---

# 🔍 COMO TESTAR

\`\`\`bash
# 1. Rodar os seeds
cd /root/Apps/webponto/backend
npx prisma db seed

# 2. Verificar no banco
npx prisma studio
# Tabela: Payslip - verificar registros
# Tabela: Payroll - verificar folhas
\`\`\`

## Logins de Teste

| Empresa | Tipo | Email | Senha |
|---------|------|-------|-------|
| Acme Tech | Admin | admin@acmetech.com.br | 123456* |
| Acme Tech | Funcionário | joao.silva@acmetech.com.br | 123456* |
| Beta Solutions | Admin | admin@betasolutions.com.br | 123456* |
| Beta Solutions | Funcionário | lucas.ferreira@betasolutions.com.br | 123456* |

---

*Documento gerado automaticamente em: ${now.toLocaleString('pt-BR')}*
`

  // Salvar arquivo
  const docPath = path.join(__dirname, '../../../doc/CALCULOS-ESPERADOS-TESTE.md')
  fs.writeFileSync(docPath, doc, 'utf-8')
  
  console.log(`  ✓ Documento gerado: ${docPath}`)
}
