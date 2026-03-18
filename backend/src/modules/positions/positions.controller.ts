import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards, BadRequestException } from '@nestjs/common'
import { PositionsService } from './positions.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionGuard } from '../../common/guards'
import { RequirePermission } from '../../common/decorators'

// Controlador de Cargos (Positions)
@Controller('positions')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PositionsController {
  constructor(private readonly service: PositionsService) {}

  // GET /api/positions?companyId=...
  @Get()
  @RequirePermission('positions.view')
  async list(@Query('companyId') companyId: string) {
    return this.service.list(companyId)
  }

  // POST /api/positions
  @Post()
  @RequirePermission('positions.create')
  async create(@Body() body: { companyId: string; name: string }) {
    return this.service.create(body)
  }

  // PUT /api/positions/:id
  @Put(':id')
  @RequirePermission('positions.edit')
  async update(@Param('id') id: string, @Body() body: { name: string }) {
    return this.service.update(id, body)
  }

  // DELETE /api/positions/:id
  @Delete(':id')
  @RequirePermission('positions.delete')
  async delete(@Param('id') id: string) {
    try {
      return await this.service.delete(id)
    } catch (error) {
      throw new BadRequestException(error.message)
    }
  }
}
