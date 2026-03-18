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
        _count: {
          select: { employees: true }
        }
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

  // Atualizar departamento
  async update(id: string, data: { name: string }) {
    const updated = await this.prisma.department.update({
      where: { id },
      data: { name: data.name },
    })
    return updated
  }

  // Deletar departamento
  async delete(id: string) {
    // Verificar se há funcionários usando este departamento
    const employeesCount = await this.prisma.employee.count({
      where: { departmentId: id },
    })
    
    if (employeesCount > 0) {
      throw new Error(`Não é possível excluir: ${employeesCount} funcionário(s) estão usando este departamento`)
    }
    
    await this.prisma.department.delete({
      where: { id },
    })
    return { success: true }
  }
}
