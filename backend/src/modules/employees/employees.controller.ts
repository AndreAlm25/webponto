import { Controller, Get, Param, Query, Put, Body, Delete, Patch, Post, UseGuards } from '@nestjs/common'
import { EmployeesService } from './employees.service'
import { CreateEmployeeDto } from './dto/create-employee.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionGuard } from '../../common/guards'
import { RequirePermission } from '../../common/decorators'

// Controlador de funcionários
// - Expor endpoints relacionados ao status facial
@Controller('employees')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  // POST /api/employees
  // Criar funcionário (User + Employee juntos)
  @Post()
  @RequirePermission('employees.create')
  async createEmployee(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.createEmployee(dto)
  }

  // GET /api/employees
  // Lista funcionários (opcional: filtrar por companyId)
  @Get()
  @RequirePermission('employees.view')
  async listEmployees(@Query('companyId') companyId?: string) {
    return this.employeesService.listEmployees(companyId)
  }

  // GET /api/employees/:id/facial-status
  // Retorna se o funcionário possui face cadastrada
  @Get(':id/facial-status')
  @RequirePermission('employees.view')
  async getFacialStatus(@Param('id') id: string) {
    return this.employeesService.getFacialStatus(id)
  }

  // PUT /api/employees/:id
  // Atualiza campos do funcionário (status e políticas)
  @Put(':id')
  @RequirePermission('employees.edit')
  async updateEmployee(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    // body pode conter: status, allowRemoteClockIn, allowFacialRecognition, requireLiveness, requireGeolocation, minGeoAccuracyMeters
    return this.employeesService.updateEmployee(id, body)
  }

  // DELETE /api/employees/:id
  // Excluir funcionário
  @Delete(':id')
  @RequirePermission('employees.delete')
  async deleteEmployee(@Param('id') id: string) {
    return this.employeesService.deleteEmployee(id)
  }

  // PATCH /api/employees/:id/geofence
  // Vincular/Desvincular geofence ao funcionário
  @Patch(':id/geofence')
  @RequirePermission('employees.edit')
  async setEmployeeGeofence(
    @Param('id') id: string,
    @Body() body: { geofenceId: string | null },
  ) {
    // body.geofenceId pode ser null para remover vínculo
    return this.employeesService.setEmployeeGeofence(id, body?.geofenceId ?? null)
  }

  // PATCH /api/employees/geofence
  // Vincular/Desvincular geofence para vários funcionários
  @Patch('geofence')
  @RequirePermission('employees.edit')
  async setEmployeesGeofence(
    @Body()
    body: {
      geofenceId: string | null
      employeeIds: string[]
    },
  ) {
    const geofenceId = body?.geofenceId ?? null
    const employeeIds = Array.isArray(body?.employeeIds) ? body.employeeIds : []
    return this.employeesService.setEmployeesGeofence(employeeIds, geofenceId)
  }
}
