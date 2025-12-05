import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common'
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
}
