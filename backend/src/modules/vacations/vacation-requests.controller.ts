import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req, Headers, Res } from '@nestjs/common'
import { VacationRequestsService } from './vacation-requests.service'
import { VacationPdfService } from './vacation-pdf.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Response } from 'express'

@Controller('vacation-requests')
@UseGuards(JwtAuthGuard)
export class VacationRequestsController {
  constructor(
    private vacationRequestsService: VacationRequestsService,
    private vacationPdfService: VacationPdfService,
  ) {}

  // ==========================================
  // ENDPOINTS DO FUNCIONÁRIO
  // ==========================================

  // Buscar minhas solicitações de férias
  @Get('my-requests')
  async getMyRequests(@Req() req: any) {
    return this.vacationRequestsService.getEmployeeRequests(req.user.employeeId)
  }

  // Verificar se posso solicitar férias (tem período disponível?)
  @Get('can-request')
  async canRequestVacation(@Req() req: any) {
    return this.vacationRequestsService.canEmployeeRequestVacation(req.user.employeeId)
  }

  // Criar solicitação de férias
  @Post()
  async createRequest(
    @Req() req: any,
    @Body() data: {
      vacationId?: string           // ID do período aquisitivo (opcional, pega o mais antigo disponível)
      requestedStartDate: string    // Data início desejada
      requestedDays: number         // Quantidade de dias
      requestedPeriods?: Array<{    // Divisão em períodos (opcional)
        startDate: string
        days: number
      }>
      sellDays?: number             // Dias a vender (abono pecuniário)
      employeeNotes?: string        // Observações
    },
  ) {
    return this.vacationRequestsService.createRequest(
      req.user.employeeId,
      req.user.companyId,
      data,
    )
  }

  // Responder a contraproposta do admin
  @Put(':id/respond-counter')
  async respondToCounterProposal(
    @Param('id') id: string,
    @Req() req: any,
    @Body() data: {
      accepted: boolean
      notes?: string
    },
  ) {
    return this.vacationRequestsService.respondToCounterProposal(
      id,
      req.user.employeeId,
      data,
    )
  }

  // Assinar aviso de férias (funcionário)
  @Put(':id/employee-sign')
  async employeeSign(
    @Param('id') id: string,
    @Req() req: any,
    @Headers('x-forwarded-for') forwardedFor: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const ip = forwardedFor || req.ip || 'unknown'
    return this.vacationRequestsService.employeeSign(id, req.user.employeeId, ip, userAgent)
  }

  // Marcar como visualizado (funcionário)
  @Put(':id/mark-viewed')
  async markAsViewed(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.vacationRequestsService.markAsViewed(id, req.user.employeeId)
  }

  // Marcar scroll até o final (funcionário)
  @Put(':id/mark-scrolled')
  async markAsScrolled(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.vacationRequestsService.markAsScrolled(id, req.user.employeeId)
  }

  // Cancelar solicitação (funcionário - só se ainda estiver PENDING)
  @Put(':id/cancel')
  async cancelRequest(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.vacationRequestsService.cancelRequest(id, req.user.employeeId)
  }

  // ==========================================
  // ENDPOINTS DO ADMIN
  // ==========================================

  // Listar solicitações da empresa
  @Get()
  async listRequests(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.vacationRequestsService.listRequests(req.user.companyId, { status, employeeId })
  }

  // Buscar solicitação por ID
  @Get(':id')
  async getRequest(@Param('id') id: string, @Req() req: any) {
    return this.vacationRequestsService.getRequest(id, req.user.companyId)
  }

  // Aprovar solicitação (PENDING -> AWAITING_SIGNATURE)
  @Put(':id/approve')
  async approveRequest(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.vacationRequestsService.approveRequest(id, req.user.id, req.user.companyId)
  }

  // Aprovação final do admin (EMPLOYEE_SIGNED -> COMPLETED)
  @Put(':id/final-approve')
  async finalApprove(
    @Param('id') id: string,
    @Req() req: any,
    @Headers('x-forwarded-for') forwardedFor: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const ip = forwardedFor || req.ip || 'unknown'
    return this.vacationRequestsService.finalApprove(id, req.user.id, req.user.companyId, ip, userAgent)
  }

  // Rejeitar solicitação
  @Put(':id/reject')
  async rejectRequest(
    @Param('id') id: string,
    @Req() req: any,
    @Body() data: { reason: string },
  ) {
    return this.vacationRequestsService.rejectRequest(id, req.user.id, req.user.companyId, data.reason)
  }

  // Fazer contraproposta
  @Put(':id/counter-proposal')
  async makeCounterProposal(
    @Param('id') id: string,
    @Req() req: any,
    @Body() data: {
      startDate: string
      days: number
      periods?: Array<{ startDate: string; days: number }>
      sellDays?: number
      notes?: string
    },
  ) {
    return this.vacationRequestsService.makeCounterProposal(id, req.user.id, req.user.companyId, data)
  }

  // Assinar aviso de férias (admin)
  @Put(':id/admin-sign')
  async adminSign(
    @Param('id') id: string,
    @Req() req: any,
    @Headers('x-forwarded-for') forwardedFor: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const ip = forwardedFor || req.ip || 'unknown'
    return this.vacationRequestsService.adminSign(id, req.user.id, req.user.companyId, ip, userAgent)
  }

  // Contar solicitações pendentes (para badge no menu)
  @Get('count/pending')
  async countPending(@Req() req: any) {
    return this.vacationRequestsService.countPendingRequests(req.user.companyId)
  }

  // Gerar/obter PDF do aviso de férias
  @Get(':id/pdf')
  async getVacationPdf(@Param('id') id: string, @Req() req: any) {
    return this.vacationPdfService.getVacationNoticePdf(id)
  }

  // Download do PDF
  @Get(':id/pdf/download')
  async downloadVacationPdf(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const { buffer } = await this.vacationPdfService.generateVacationNoticePdf(id)
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="aviso-ferias-${id}.pdf"`,
      'Content-Length': buffer.length,
    })
    res.send(buffer)
  }
}
