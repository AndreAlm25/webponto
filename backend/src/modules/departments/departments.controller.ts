import { Controller, Get, Post, Body, Query } from '@nestjs/common'
import { DepartmentsService } from './departments.service'

// Controlador de Departamentos
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}

  // GET /api/departments?companyId=...
  @Get()
  async list(@Query('companyId') companyId: string) {
    return this.service.list(companyId)
  }

  // POST /api/departments
  @Post()
  async create(@Body() body: { companyId: string; name: string }) {
    return this.service.create(body)
  }
}
