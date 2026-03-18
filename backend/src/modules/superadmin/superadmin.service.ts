import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import * as bcrypt from 'bcrypt'

@Injectable()
export class SuperAdminService {
  constructor(private prisma: PrismaService) {}

  // ── Empresas ──────────────────────────────────────────────

  async listCompanies(search?: string) {
    const companies = await this.prisma.company.findMany({
      where: search
        ? {
            OR: [
              { tradeName: { contains: search, mode: 'insensitive' } },
              { legalName: { contains: search, mode: 'insensitive' } },
              { cnpj: { contains: search } },
            ],
          }
        : undefined,
      include: {
        _count: { select: { employees: true, users: true } },
      },
      orderBy: { tradeName: 'asc' },
    })
    return companies
  }

  async getCompany(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        address: true,
        contactInfo: true,
        users: {
          where: { role: { in: ['COMPANY_ADMIN', 'SUPER_ADMIN'] } },
          select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
        },
        _count: { select: { employees: true } },
      },
    })
    if (!company) throw new NotFoundException('Empresa não encontrada')
    return company
  }

  async createCompany(data: {
    tradeName: string
    legalName: string
    cnpj: string
    email: string
    adminName: string
    adminEmail: string
    adminPassword: string
    plan?: string
  }) {
    const existing = await this.prisma.company.findUnique({ where: { cnpj: data.cnpj } })
    if (existing) throw new ConflictException('CNPJ já cadastrado')

    const existingUser = await this.prisma.user.findUnique({ where: { email: data.adminEmail } })
    if (existingUser) throw new ConflictException('Email do admin já cadastrado')

    // Gerar slug a partir do nome fantasia
    const slug = data.tradeName
      .normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')

    const company = await this.prisma.company.create({
      data: {
        tradeName: data.tradeName,
        legalName: data.legalName,
        cnpj: data.cnpj,
        email: data.email,
        slug,
        plan: (data.plan as any) || 'BASIC',
        status: 'ACTIVE',
        active: true,
      } as any,
    })

    // Criar PayrollConfig padrão
    await this.prisma.payrollConfig.create({
      data: { companyId: company.id } as any,
    })

    // Criar admin da empresa
    const passwordHash = await bcrypt.hash(data.adminPassword, 10)
    const admin = await this.prisma.user.create({
      data: {
        email: data.adminEmail,
        name: data.adminName,
        password: passwordHash,
        role: 'COMPANY_ADMIN',
        companyId: company.id,
        active: true,
      },
    })

    return { company, admin: { id: admin.id, email: admin.email, name: admin.name } }
  }

  async updateCompany(id: string, data: {
    tradeName?: string
    legalName?: string
    email?: string
    plan?: string
    active?: boolean
  }) {
    const company = await this.prisma.company.findUnique({ where: { id } })
    if (!company) throw new NotFoundException('Empresa não encontrada')

    const updated = await this.prisma.company.update({
      where: { id },
      data: {
        tradeName: data.tradeName,
        legalName: data.legalName,
        email: data.email,
        plan: data.plan as any,
        active: data.active,
      } as any,
    })
    return updated
  }

  async toggleCompanyActive(id: string) {
    const company = await this.prisma.company.findUnique({ where: { id } })
    if (!company) throw new NotFoundException('Empresa não encontrada')

    const updated = await this.prisma.company.update({
      where: { id },
      data: { active: !(company as any).active } as any,
    })
    return updated
  }

  // ── Usuários Admin ─────────────────────────────────────────

  async listCompanyAdmins(companyId: string) {
    return this.prisma.user.findMany({
      where: { companyId, role: { in: ['COMPANY_ADMIN', 'MANAGER', 'HR', 'FINANCIAL'] } },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { name: 'asc' },
    })
  }

  async createCompanyAdmin(companyId: string, data: { name: string; email: string; password: string; role?: string }) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } })
    if (!company) throw new NotFoundException('Empresa não encontrada')

    const existing = await this.prisma.user.findUnique({ where: { email: data.email } })
    if (existing) throw new ConflictException('Email já cadastrado')

    const passwordHash = await bcrypt.hash(data.password, 10)
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: passwordHash,
        role: (data.role as any) || 'COMPANY_ADMIN',
        companyId,
        active: true,
      },
    })
    return { id: user.id, email: user.email, name: user.name, role: user.role }
  }

  async toggleAdminActive(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('Usuário não encontrado')

    return this.prisma.user.update({
      where: { id: userId },
      data: { active: !user.active },
      select: { id: true, name: true, email: true, active: true },
    })
  }

  async resetAdminPassword(userId: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('Usuário não encontrado')

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await this.prisma.user.update({ where: { id: userId }, data: { password: passwordHash } })
    return { success: true, message: 'Senha redefinida com sucesso' }
  }

  // ── Estatísticas globais ───────────────────────────────────

  async getStats() {
    const [totalCompanies, activeCompanies, totalEmployees, totalUsers] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.company.count({ where: { active: true } as any }),
      this.prisma.employee.count({ where: { active: true } }),
      this.prisma.user.count({ where: { active: true } }),
    ])
    return { totalCompanies, activeCompanies, totalEmployees, totalUsers }
  }
}
