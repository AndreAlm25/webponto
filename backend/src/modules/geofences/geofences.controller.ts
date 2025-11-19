import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { GeofencesService } from './geofences.service'

// Controlador de Geofences (cercas geográficas)
// - CRUD básico para gerenciar áreas com raio
@Controller('geofences')
export class GeofencesController {
  constructor(private readonly geofences: GeofencesService) {}

  // GET /api/geofences?companyId=...
  @Get()
  async list(@Query('companyId') companyId: string) {
    return this.geofences.list(companyId)
  }

  // POST /api/geofences
  @Post()
  async create(@Body() body: any) {
    // body: { companyId, name, centerLat, centerLng, radiusMeters, active? }
    return this.geofences.create(body)
  }

  // GET /api/geofences/:id
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.geofences.findOne(id)
  }

  // PATCH /api/geofences/:id
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.geofences.update(id, body)
  }

  // DELETE /api/geofences/:id
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.geofences.remove(id)
  }
}
