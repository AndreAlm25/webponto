import { Controller, Get, Post, Body, Query } from '@nestjs/common'
import { PositionsService } from './positions.service'

// Controlador de Cargos (Positions)
@Controller('positions')
export class PositionsController {
  constructor(private readonly service: PositionsService) {}

  // GET /api/positions?companyId=...
  @Get()
  async list(@Query('companyId') companyId: string) {
    return this.service.list(companyId)
  }

  // POST /api/positions
  @Post()
  async create(@Body() body: { companyId: string; name: string }) {
    return this.service.create(body)
  }
}
