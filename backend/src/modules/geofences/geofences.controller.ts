import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { GeofencesService } from './geofences.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionGuard } from '../../common/guards'
import { RequirePermission } from '../../common/decorators'

// Controlador de Geofences (cercas geográficas)
// - CRUD básico para gerenciar áreas com raio
@Controller('geofences')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class GeofencesController {
  constructor(private readonly geofences: GeofencesService) {}

  // GET /api/geofences?companyId=...
  @Get()
  @RequirePermission('geofences.view')
  async list(@Query('companyId') companyId: string) {
    return this.geofences.list(companyId)
  }

  // POST /api/geofences
  @Post()
  @RequirePermission('geofences.create')
  async create(@Body() body: any) {
    // body: { companyId, name, centerLat, centerLng, radiusMeters, active? }
    return this.geofences.create(body)
  }

  // GET /api/geofences/:id
  @Get(':id')
  @RequirePermission('geofences.view')
  async getOne(@Param('id') id: string) {
    return this.geofences.findOne(id)
  }

  // PATCH /api/geofences/:id
  @Patch(':id')
  @RequirePermission('geofences.edit')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.geofences.update(id, body)
  }

  // DELETE /api/geofences/:id
  @Delete(':id')
  @RequirePermission('geofences.delete')
  async remove(@Param('id') id: string) {
    return this.geofences.remove(id)
  }
}
