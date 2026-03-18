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
        _count: {
          select: { employees: true }
        }
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

  // Atualizar cargo
  async update(id: string, data: { name: string }) {
    const updated = await this.prisma.position.update({
      where: { id },
      data: { name: data.name },
    })
    return updated
  }

  // Deletar cargo
  async delete(id: string) {
    // Verificar se há funcionários usando este cargo
    const employeesCount = await this.prisma.employee.count({
      where: { positionId: id },
    })
    
    if (employeesCount > 0) {
      throw new Error(`Não é possível excluir: ${employeesCount} funcionário(s) estão usando este cargo`)
    }
    
    await this.prisma.position.delete({
      where: { id },
    })
    return { success: true }
  }
}
