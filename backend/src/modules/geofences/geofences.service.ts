import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

// Serviço de Geofences
// - CRUD simples para cercas com centro (lat/lng) e raio em metros
@Injectable()
export class GeofencesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string) {
    // Se companyId não for UUID, não aplicar filtro por empresa para evitar erro do Prisma
    const isUuid = typeof companyId === 'string' && /^[0-9a-fA-F-]{36}$/.test(companyId)
    const where: any = { active: true }
    if (isUuid) where.companyId = companyId

    const items = await this.prisma.geofence.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        companyId: true,
        centerLat: true,
        centerLng: true,
        radiusMeters: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    return items
  }

  async findOne(id: string) {
    const item = await this.prisma.geofence.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        companyId: true,
        centerLat: true,
        centerLng: true,
        radiusMeters: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    if (!item) return { success: false, message: 'Geofence não encontrada' }
    return item
  }

  async create(body: any) {
    const data: any = {}
    
    // Valida se companyId é um UUID válido
    const isUuid = typeof body.companyId === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(body.companyId)
    if (!isUuid) {
      throw new Error('companyId deve ser um UUID válido')
    }
    
    data.companyId = body.companyId
    data.name = String(body.name || 'Geofence')
    data.centerLat = Number(body.centerLat)
    data.centerLng = Number(body.centerLng)
    data.radiusMeters = Math.max(1, Number(body.radiusMeters || 200))
    if (typeof body.active === 'boolean') data.active = body.active

    const created = await this.prisma.geofence.create({ data })
    return created
  }

  async update(id: string, body: any) {
    const data: any = {}
    if (typeof body.name === 'string') data.name = body.name
    if (typeof body.centerLat === 'number') data.centerLat = body.centerLat
    if (typeof body.centerLng === 'number') data.centerLng = body.centerLng
    if (typeof body.radiusMeters === 'number') data.radiusMeters = Math.max(1, body.radiusMeters)
    if (typeof body.active === 'boolean') data.active = body.active

    const updated = await this.prisma.geofence.update({ where: { id }, data })
    return updated
  }

  async remove(id: string) {
    // Comentário: Employee.geofenceId possui onDelete: SetNull; remoção é segura
    await this.prisma.geofence.delete({ where: { id } })
    return { success: true }
  }
}
