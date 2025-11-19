import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

// Serviço de Cargos (Positions)
@Injectable()
export class PositionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string) {
    const items = await this.prisma.position.findMany({
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
    const created = await this.prisma.position.create({
      data: {
        companyId: data.companyId,
        name: data.name,
      },
    })
    return created
  }
}
