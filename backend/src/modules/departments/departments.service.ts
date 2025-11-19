import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

// Serviço de Departamentos
@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string) {
    const items = await this.prisma.department.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        companyId: true,
      },
    })
    return items
  }

  async create(data: { companyId: string; name: string }) {
    const created = await this.prisma.department.create({
      data: {
        companyId: data.companyId,
        name: data.name,
      },
    })
    return created
  }
}
