import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common'
import { DepartmentsService } from './departments.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionGuard } from '../../common/guards'
import { RequirePermission } from '../../common/decorators'

// Controlador de Departamentos
@Controller('departments')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}

  // GET /api/departments?companyId=...
  @Get()
  @RequirePermission('departments.view')
  async list(@Query('companyId') companyId: string) {
    return this.service.list(companyId)
  }

  // POST /api/departments
  @Post()
  @RequirePermission('departments.create')
  async create(@Body() body: { companyId: string; name: string }) {
    return this.service.create(body)
  }
}
