import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards, BadRequestException } from '@nestjs/common'
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

  // PUT /api/departments/:id
  @Put(':id')
  @RequirePermission('departments.edit')
  async update(@Param('id') id: string, @Body() body: { name: string }) {
    return this.service.update(id, body)
  }

  // DELETE /api/departments/:id
  @Delete(':id')
  @RequirePermission('departments.delete')
  async delete(@Param('id') id: string) {
    try {
      return await this.service.delete(id)
    } catch (error) {
      throw new BadRequestException(error.message)
    }
  }
}
