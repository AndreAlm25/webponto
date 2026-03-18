import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common'
import { VacationsService } from './vacations.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('vacations')
@UseGuards(JwtAuthGuard)
export class VacationsController {
  constructor(private vacationsService: VacationsService) {}

  // Buscar férias do funcionário logado (para dashboard do funcionário)
  @Get('my-vacations')
  async getMyVacations(@Req() req: any) {
    console.log('[FÉRIAS BACKEND] req.user:', JSON.stringify(req.user, null, 2))
    console.log('[FÉRIAS BACKEND] employeeId:', req.user?.employeeId)
    console.log('[FÉRIAS BACKEND] employee:', req.user?.employee?.id)
    const employeeId = req.user?.employeeId || req.user?.employee?.id
    console.log('[FÉRIAS BACKEND] employeeId final:', employeeId)
    return this.vacationsService.getEmployeeVacations(employeeId)
  }

  // Listar funcionários com status de férias (DEVE vir ANTES de :id)
  @Get('employees')
  async listEmployeesWithVacationStatus(@Req() req: any) {
    return this.vacationsService.listEmployeesWithVacationStatus(req.user.companyId)
  }

  // Buscar períodos de férias em um mês (DEVE vir ANTES de :id)
  @Get('employee/:employeeId/month')
  async getVacationPeriodsInMonth(
    @Param('employeeId') employeeId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.vacationsService.getVacationPeriodsInMonth(
      employeeId,
      parseInt(month),
      parseInt(year),
    )
  }

  // Regularizar férias (para migração de sistema - férias já pagas/gozadas)
  // DEVE vir ANTES de rotas com :id
  @Post('regularize')
  async regularizeVacation(
    @Req() req: any,
    @Body() data: {
      employeeId: string
      acquisitionStart: string
      regularizationType: 'ENJOYED' | 'PAID_DOUBLE'
      regularizationDate: string
      startDate?: string  // Data início do período de gozo (para ENJOYED)
      endDate?: string    // Data fim do período de gozo (para ENJOYED)
      notes?: string
    },
  ) {
    return this.vacationsService.regularizeVacation(req.user.companyId, req.user.id, data)
  }

  // Listar férias da empresa
  @Get()
  async listVacations(
    @Req() req: any,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('year') year?: string,
  ) {
    return this.vacationsService.listVacations(req.user.companyId, {
      employeeId,
      status,
      year: year ? parseInt(year) : undefined,
    })
  }

  // Buscar férias por ID (DEVE vir DEPOIS de rotas específicas)
  @Get(':id')
  async getVacation(@Param('id') id: string) {
    return this.vacationsService.getVacation(id)
  }

  // Programar férias
  @Post()
  async scheduleVacation(
    @Req() req: any,
    @Body() data: {
      employeeId: string
      acquisitionStart: string
      soldDays?: number
      periods: Array<{
        startDate: string
        days: number
      }>
      notes?: string
    },
  ) {
    return this.vacationsService.scheduleVacation(req.user.companyId, data, req.user.id)
  }

  // Atualizar férias
  @Put(':id')
  async updateVacation(
    @Param('id') id: string,
    @Req() req: any,
    @Body() data: {
      soldDays?: number
      periods?: Array<{
        id?: string
        startDate: string
        days: number
      }>
      notes?: string
    },
  ) {
    return this.vacationsService.updateVacation(id, data, req.user.id)
  }

  // Cancelar férias
  @Delete(':id')
  async cancelVacation(@Param('id') id: string, @Req() req: any) {
    return this.vacationsService.cancelVacation(id, req.user.id)
  }
}
