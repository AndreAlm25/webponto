/*
  Seed inicial do banco
  - Cria uma Company
  - Cria um User ADMIN vinculado a essa Company
  - (Opcional) Cria um Employee de demonstração
*/

import { PrismaClient, Role, Prisma } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import { seedPermissions } from './seed-permissions'

const prisma = new PrismaClient()

async function main() {
  // Company base
  const company = await prisma.company.upsert({
    where: { cnpj: '11111111000191' },
    update: {},
    create: {
      cnpj: '11111111000191',
      legalName: 'Empresa Exemplo Ltda',
      tradeName: 'Empresa Exemplo',
      email: 'contato@exemplo.com',
      plan: 'TRIAL',
      status: 'ACTIVE',
      workingHoursStart: '08:00',
      workingHoursEnd: '18:00',
    },
  })

  // User admin base (login)
  const adminEmail = 'admin@exemplo.com'
  const adminPass = 'admin123'
  const passwordHash = await bcrypt.hash(adminPass, 10)

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Admin',
      password: passwordHash,
      role: Role.SUPER_ADMIN,
      companyId: company.id,
      active: true,
      avatarUrl: null,
    },
  })

  // Criar User para funcionário demo (para login do funcionário)
  const employeeUserEmail = 'funcionario@exemplo.com'
  const employeeUserPass = 'senha123'
  const employeeUserHash = await bcrypt.hash(employeeUserPass, 10)

  // Employee do funcionário (criar primeiro)
  const employee = await prisma.employee.create({
    data: {
      company: { connect: { id: company.id } },
      registrationId: 'FUNC001',
      hireDate: new Date('2024-01-02'),
      baseSalary: new Prisma.Decimal('3500.00'),
      workStartTime: '08:00',
      workEndTime: '18:00',
      active: true,
      allowRemoteClockIn: true,
    },
  })

  // User do funcionário (com CPF e vinculado ao Employee)
  const employeeUser = await prisma.user.create({
    data: {
      name: 'Funcionário Demo',
      email: employeeUserEmail,
      cpf: '12345678909',
      password: employeeUserHash,
      role: Role.EMPLOYEE,
      companyId: company.id,
      active: true,
      avatarUrl: null,
      employeeId: employee.id,
    },
  })

  // Saída no console para facilitar testes
  console.log('\nSeed concluído com sucesso!')
  console.log('Company:', { id: company.id, cnpj: company.cnpj, tradeName: company.tradeName })
  console.log('Admin user:', { id: admin.id, email: admin.email, role: admin.role })
  console.log('Login com:', { email: adminEmail, password: adminPass })
  console.log('Employee demo:', { id: employee.id, name: employeeUser.name, cpf: employeeUser.cpf, login: { email: employeeUserEmail, password: employeeUserPass } })

  // Seed de permissões
  await seedPermissions()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
