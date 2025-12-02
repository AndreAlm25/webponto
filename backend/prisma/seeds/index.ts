#!/usr/bin/env ts-node
/**
 * CLI Interativo para Seeds do WebPonto
 * 
 * Uso:
 *   npm run seed          # Menu interativo
 *   npm run seed:reset    # Limpar banco
 *   npm run seed:base     # Dados base (empresas, funcionários)
 *   npm run seed:all      # Todos os seeds
 */

import * as readline from 'readline'
import { PrismaClient } from '@prisma/client'
import { resetDatabase } from './00-reset.seed'
import { seedBase } from './01-base.seed'
import { seedPayrollConfig } from './02-payroll-config.seed'
import { seedTimeEntries } from './03-time-entries.seed'
import { seedPayroll } from './04-payroll.seed'
import { seedAdvances } from './05-advances.seed'

const prisma = new PrismaClient()

// Cores para o terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function printHeader() {
  console.clear()
  log('╔════════════════════════════════════════════════════════════╗', 'cyan')
  log('║                    🌱 WEBPONTO SEEDS                       ║', 'cyan')
  log('║              Sistema de Dados de Teste                     ║', 'cyan')
  log('╚════════════════════════════════════════════════════════════╝', 'cyan')
  console.log()
}

function printMenu() {
  log('Selecione uma opção:', 'bright')
  console.log()
  log('  [0] 🗑️  Limpar banco (reset)', 'red')
  log('  [1] 🏢 Base (empresas + funcionários)', 'green')
  log('  [2] ⚙️  Configurações de folha de pagamento', 'yellow')
  log('  [3] ⏰ Batidas de ponto (mês atual + anterior)', 'blue')
  log('  [4] 💰 Folha de pagamento + Holerites', 'magenta')
  log('  [5] 💵 Vales/Adiantamentos', 'cyan')
  console.log()
  log('  [A] 🚀 RODAR TODOS (reset + todos os seeds)', 'bright')
  log('  [Q] ❌ Sair', 'reset')
  console.log()
}

async function runSeed(option: string): Promise<boolean> {
  try {
    switch (option.toUpperCase()) {
      case '0':
        log('\n🗑️  Limpando banco de dados...', 'red')
        await resetDatabase(prisma)
        log('✅ Banco limpo com sucesso!', 'green')
        break

      case '1':
        log('\n🏢 Criando dados base...', 'green')
        await seedBase(prisma)
        log('✅ Dados base criados!', 'green')
        break

      case '2':
        log('\n⚙️  Configurando folha de pagamento...', 'yellow')
        await seedPayrollConfig(prisma)
        log('✅ Configurações criadas!', 'green')
        break

      case '3':
        log('\n⏰ Gerando batidas de ponto...', 'blue')
        await seedTimeEntries(prisma)
        log('✅ Batidas geradas!', 'green')
        break

      case '4':
        log('\n💰 Gerando folha de pagamento...', 'magenta')
        await seedPayroll(prisma)
        log('✅ Folha gerada!', 'green')
        break

      case '5':
        log('\n💵 Gerando vales/adiantamentos...', 'cyan')
        await seedAdvances(prisma)
        log('✅ Vales gerados!', 'green')
        break

      case 'A':
        log('\n🚀 Executando TODOS os seeds...', 'bright')
        
        log('\n[1/6] 🗑️  Limpando banco...', 'red')
        await resetDatabase(prisma)
        
        log('[2/6] 🏢 Criando dados base...', 'green')
        await seedBase(prisma)
        
        log('[3/6] ⚙️  Configurando folha...', 'yellow')
        await seedPayrollConfig(prisma)
        
        log('[4/6] ⏰ Gerando batidas...', 'blue')
        await seedTimeEntries(prisma)
        
        log('[5/6] 💰 Gerando folha...', 'magenta')
        await seedPayroll(prisma)
        
        log('[6/6] 💵 Gerando vales...', 'cyan')
        await seedAdvances(prisma)
        
        log('\n✅ TODOS os seeds executados com sucesso!', 'green')
        break

      case 'Q':
        log('\n👋 Até logo!', 'cyan')
        return false

      default:
        log('\n❌ Opção inválida!', 'red')
    }
  } catch (error: any) {
    log(`\n❌ Erro: ${error.message}`, 'red')
    console.error(error)
  }

  return true
}

async function main() {
  const args = process.argv.slice(2)

  // Se passou argumento direto, executa e sai
  if (args.length > 0) {
    const option = args[0]
    await runSeed(option)
    await prisma.$disconnect()
    process.exit(0)
  }

  // Menu interativo
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const askQuestion = () => {
    printHeader()
    printMenu()

    rl.question('Digite a opção: ', async (answer) => {
      const shouldContinue = await runSeed(answer.trim())
      
      if (shouldContinue) {
        console.log('\nPressione ENTER para continuar...')
        rl.question('', () => askQuestion())
      } else {
        rl.close()
        await prisma.$disconnect()
        process.exit(0)
      }
    })
  }

  askQuestion()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
