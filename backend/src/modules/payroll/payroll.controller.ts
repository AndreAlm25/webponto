import { Controller, Get, Post, Put, Patch, Delete, Param, Query, Body, Req, Res } from '@nestjs/common'
import { Response } from 'express'
import { PayrollService } from './payroll.service'
import { PayslipPdfService } from './payslip-pdf.service'
import { PrismaService } from '../../prisma/prisma.service'

// Controlador de Folha de Pagamento
// - Gerencia folhas de pagamento, holerites, configurações e benefícios
@Controller('payroll')
export class PayrollController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly payslipPdfService: PayslipPdfService,
    private readonly prisma: PrismaService,
  ) {}

  // ==========================================
  // CONFIGURAÇÕES
  // ==========================================

  // GET /api/payroll/config
  // Buscar configurações de folha da empresa
  @Get('config')
  async getConfig(@Query('companyId') companyId: string) {
    return this.payrollService.getOrCreateConfig(companyId)
  }

  // PUT /api/payroll/config
  // Atualizar configurações de folha
  @Put('config')
  async updateConfig(
    @Query('companyId') companyId: string,
    @Body() data: any,
  ) {
    return this.payrollService.updateConfig(companyId, data)
  }

  // ==========================================
  // BENEFÍCIOS PERSONALIZADOS
  // ==========================================

  // GET /api/payroll/benefits
  // Listar benefícios da empresa
  @Get('benefits')
  async listBenefits(@Query('companyId') companyId: string) {
    return this.payrollService.listBenefits(companyId)
  }

  // POST /api/payroll/benefits
  // Criar benefício personalizado
  @Post('benefits')
  async createBenefit(
    @Query('companyId') companyId: string,
    @Body() data: { name: string; description?: string; value: number; type: 'EARNING' | 'DEDUCTION' },
  ) {
    return this.payrollService.createBenefit(companyId, data)
  }

  // GET /api/payroll/benefits/:id
  // Buscar benefício com funcionários vinculados
  @Get('benefits/:id')
  async getBenefitWithEmployees(@Param('id') id: string) {
    return this.payrollService.getBenefitWithEmployees(id)
  }

  // PUT /api/payroll/benefits/:id
  // Atualizar benefício
  @Put('benefits/:id')
  async updateBenefit(
    @Param('id') id: string,
    @Body() data: { name?: string; description?: string; value?: number; type?: 'EARNING' | 'DEDUCTION'; active?: boolean },
  ) {
    return this.payrollService.updateBenefit(id, data)
  }

  // DELETE /api/payroll/benefits/:id
  // Excluir benefício
  @Delete('benefits/:id')
  async deleteBenefit(@Param('id') id: string) {
    return this.payrollService.deleteBenefit(id)
  }

  // POST /api/payroll/benefits/:id/employees
  // Vincular funcionário a benefício
  @Post('benefits/:id/employees')
  async addEmployeeToBenefit(
    @Param('id') benefitId: string,
    @Body() data: { employeeId: string; customValue?: number },
  ) {
    return this.payrollService.addEmployeeToBenefit(benefitId, data.employeeId, data.customValue)
  }

  // DELETE /api/payroll/benefits/:id/employees/:employeeId
  // Desvincular funcionário de benefício
  @Delete('benefits/:id/employees/:employeeId')
  async removeEmployeeFromBenefit(
    @Param('id') benefitId: string,
    @Param('employeeId') employeeId: string,
  ) {
    return this.payrollService.removeEmployeeFromBenefit(benefitId, employeeId)
  }

  // ==========================================
  // FOLHAS DE PAGAMENTO
  // ==========================================

  // GET /api/payroll
  // Lista folhas de pagamento da empresa
  @Get()
  async listPayrolls(
    @Query('companyId') companyId: string,
    @Query('year') year?: string,
  ) {
    return this.payrollService.listPayrolls(companyId, year ? parseInt(year) : undefined)
  }

  // GET /api/payroll/summary
  // Resumo anual da folha de pagamento
  @Get('summary')
  async getPayrollSummary(
    @Query('companyId') companyId: string,
    @Query('year') year: string,
  ) {
    return this.payrollService.getPayrollSummary(companyId, parseInt(year))
  }

  // GET /api/payroll/current
  // Buscar ou criar folha do mês atual
  @Get('current')
  async getCurrentPayroll(
    @Query('companyId') companyId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const now = new Date()
    const m = month ? parseInt(month) : now.getMonth() + 1
    const y = year ? parseInt(year) : now.getFullYear()
    return this.payrollService.getOrCreatePayroll(companyId, m, y)
  }

  // ==========================================
  // ROTAS ESPECÍFICAS (devem vir ANTES das rotas com :id)
  // ==========================================

  // GET /api/payroll/payslips/employee/:employeeId
  // Listar holerites de um funcionário
  @Get('payslips/employee/:employeeId')
  async listEmployeePayslips(@Param('employeeId') employeeId: string) {
    return this.payrollService.listEmployeePayslips(employeeId)
  }

  // GET /api/payroll/preview/:employeeId
  // Previsão em tempo real do holerite do mês atual (sem salvar no banco)
  // Usado no dashboard do funcionário para mostrar estimativa antes do fechamento
  @Get('preview/:employeeId')
  async getPayslipPreview(
    @Param('employeeId') employeeId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const now = new Date()
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1
    const targetYear = year ? parseInt(year) : now.getFullYear()
    return this.payrollService.getPayslipPreview(employeeId, targetMonth, targetYear)
  }

  // POST /api/payroll/payslips/approve
  // Aprovar múltiplos holerites
  @Post('payslips/approve')
  async approveMultiplePayslips(@Body() data: { payslipIds: string[] }, @Req() req: any) {
    const userId = req.user?.id || 'system'
    return this.payrollService.approveMultiplePayslips(data.payslipIds, userId)
  }

  // POST /api/payroll/payslips/pay
  // Pagar múltiplos holerites
  @Post('payslips/pay')
  async payMultiplePayslips(@Body() data: { payslipIds: string[] }, @Req() req: any) {
    const userId = req.user?.id || 'system'
    return this.payrollService.payMultiplePayslips(data.payslipIds, userId)
  }

  // ==========================================
  // ROTAS COM :id (devem vir DEPOIS das rotas específicas)
  // ==========================================

  // GET /api/payroll/:id
  // Buscar folha de pagamento por ID
  @Get(':id')
  async getPayrollById(@Param('id') id: string) {
    return this.payrollService.getPayrollById(id)
  }

  // POST /api/payroll/:id/generate
  // Gerar holerites para todos os funcionários
  @Post(':id/generate')
  async generatePayslips(@Param('id') id: string) {
    return this.payrollService.generatePayslips(id)
  }

  // POST /api/payroll/:id/approve
  // Aprovar folha de pagamento
  @Post(':id/approve')
  async approvePayroll(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || 'system'
    return this.payrollService.approvePayroll(id, userId)
  }

  // POST /api/payroll/:id/pay
  // Marcar folha como paga
  @Post(':id/pay')
  async markAsPaid(@Param('id') id: string) {
    return this.payrollService.markAsPaid(id)
  }

  // GET /api/payroll/payslip/:id
  // Buscar holerite individual
  @Get('payslip/:id')
  async getPayslip(@Param('id') id: string) {
    return this.payrollService.getPayslip(id)
  }

  // PUT /api/payroll/payslip/:id
  // Atualizar holerite individual (ajustes manuais)
  @Put('payslip/:id')
  async updatePayslip(@Param('id') id: string, @Body() data: any) {
    return this.payrollService.updatePayslip(id, data)
  }

  // POST /api/payroll/payslip/:id/approve
  // Aprovar holerite individual
  @Post('payslip/:id/approve')
  async approvePayslip(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || 'system'
    return this.payrollService.approvePayslip(id, userId)
  }

  // POST /api/payroll/payslip/:id/pay
  // Pagar holerite individual
  @Post('payslip/:id/pay')
  async payPayslip(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || 'system'
    return this.payrollService.payPayslip(id, userId)
  }

  // POST /api/payroll/payslip/:id/viewed
  // Marcar holerite como visualizado
  @Post('payslip/:id/viewed')
  async markPayslipViewed(@Param('id') id: string) {
    return this.payrollService.markPayslipViewed(id)
  }

  // POST /api/payroll/payslip/:id/scrolled
  // Marcar que o usuário rolou até o final do holerite
  @Post('payslip/:id/scrolled')
  async markPayslipScrolled(@Param('id') id: string) {
    return this.payrollService.markPayslipScrolled(id)
  }

  // POST /api/payroll/payslip/:id/sign
  // Assinar holerite digitalmente (funcionário)
  @Post('payslip/:id/sign')
  async signPayslip(
    @Param('id') id: string,
    @Body() data: { acceptTerms: boolean },
    @Req() req: any,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown'
    const device = req.headers['user-agent'] || 'unknown'
    return this.payrollService.signPayslip(id, data.acceptTerms, ip, device)
  }

  // POST /api/payroll/payslip/:id/accept
  // Funcionário aceita o holerite (👍)
  @Post('payslip/:id/accept')
  async acceptPayslip(@Param('id') id: string, @Req() req: any) {
    // Buscar o holerite para pegar o employeeId
    const payslip = await this.prisma.payslip.findUnique({ where: { id } })
    if (!payslip) {
      throw new Error('Holerite não encontrado')
    }
    
    console.log('[ACCEPT] payslip.employeeId:', payslip.employeeId, 'user:', req.user?.email)
    
    return this.payrollService.acceptPayslip(id, payslip.employeeId)
  }

  // POST /api/payroll/payslip/:id/reject
  // Funcionário rejeita o holerite (👎)
  @Post('payslip/:id/reject')
  async rejectPayslip(
    @Param('id') id: string,
    @Body() data: { reason: string },
    @Req() req: any,
  ) {
    // Buscar o holerite para pegar o employeeId
    const payslip = await this.prisma.payslip.findUnique({ where: { id } })
    if (!payslip) {
      throw new Error('Holerite não encontrado')
    }
    
    console.log('[REJECT] payslip.employeeId:', payslip.employeeId, 'reason:', data.reason)
    
    return this.payrollService.rejectPayslip(id, payslip.employeeId, data.reason)
  }

  // POST /api/payroll/payslip/:id/reapprove
  // Admin reaprova holerite rejeitado
  @Post('payslip/:id/reapprove')
  async reapprovePayslip(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || 'system'
    return this.payrollService.reapprovePayslip(id, userId)
  }

  // ==========================================
  // PARCELAS DE PAGAMENTO (INSTALLMENTS)
  // ==========================================

  // GET /api/payroll/payslip/:id/installments
  // Listar parcelas de um holerite
  @Get('payslip/:id/installments')
  async listPayslipInstallments(@Param('id') id: string) {
    return this.payrollService.listPayslipInstallments(id)
  }

  // POST /api/payroll/installment/:id/pay
  // Pagar uma parcela específica
  @Post('installment/:id/pay')
  async payInstallment(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || 'system'
    return this.payrollService.payInstallment(id, userId)
  }

  // POST /api/payroll/payslip/:id/pay-all-installments
  // Pagar todas as parcelas pendentes de um holerite
  @Post('payslip/:id/pay-all-installments')
  async payAllInstallments(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || 'system'
    return this.payrollService.payAllInstallments(id, userId)
  }

  // GET /api/payroll/overdue-installments
  // Listar parcelas atrasadas (para alertas/notificações)
  @Get('overdue-installments')
  async listOverdueInstallments(@Query('companyId') companyId: string) {
    return this.payrollService.listOverdueInstallments(companyId)
  }

  // GET /api/payroll/payslip/:id/pdf
  // Baixar PDF do holerite (somente após assinatura)
  @Get('payslip/:id/pdf')
  async downloadPayslipPdf(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer } = await this.payslipPdfService.getPayslipPdf(id)
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="holerite-${id}.pdf"`)
    res.setHeader('Content-Length', buffer.length)
    res.send(buffer)
  }

  // GET /api/payroll/payslip/:id/pdf/url
  // Obter URL assinada para download do PDF
  @Get('payslip/:id/pdf/url')
  async getPayslipPdfUrl(@Param('id') id: string) {
    const { url } = await this.payslipPdfService.getPayslipPdf(id)
    return { success: true, url }
  }

  // ==========================================
  // GRUPOS DE PAGAMENTO
  // ==========================================

  // GET /api/payroll/payment-groups
  // Listar grupos de pagamento da empresa
  @Get('payment-groups')
  async listPaymentGroups(@Query('companyId') companyId: string) {
    return this.payrollService.listPaymentGroups(companyId)
  }

  // POST /api/payroll/payment-groups
  // Criar grupo de pagamento
  @Post('payment-groups')
  async createPaymentGroup(
    @Query('companyId') companyId: string,
    @Body() data: {
      name: string
      description?: string
      paymentDay1: number
      paymentDay2?: number
      advanceDay?: number
      advancePercentage?: number
    },
  ) {
    return this.payrollService.createPaymentGroup(companyId, data)
  }

  // PUT /api/payroll/payment-groups/:id
  // Atualizar grupo de pagamento
  @Put('payment-groups/:id')
  async updatePaymentGroup(
    @Param('id') id: string,
    @Body() data: {
      name?: string
      description?: string
      paymentDay1?: number
      paymentDay2?: number
      advanceDay?: number
      advancePercentage?: number
      active?: boolean
    },
  ) {
    return this.payrollService.updatePaymentGroup(id, data)
  }

  // DELETE /api/payroll/payment-groups/:id
  // Excluir grupo de pagamento
  @Delete('payment-groups/:id')
  async deletePaymentGroup(@Param('id') id: string) {
    return this.payrollService.deletePaymentGroup(id)
  }

  // POST /api/payroll/payment-groups/:id/employees
  // Vincular funcionário a grupo de pagamento
  @Post('payment-groups/:id/employees')
  async addEmployeeToPaymentGroup(
    @Param('id') groupId: string,
    @Body() data: { employeeId: string },
  ) {
    return this.payrollService.addEmployeeToPaymentGroup(groupId, data.employeeId)
  }

  // DELETE /api/payroll/payment-groups/:id/employees/:employeeId
  // Desvincular funcionário de grupo de pagamento
  @Delete('payment-groups/:id/employees/:employeeId')
  async removeEmployeeFromPaymentGroup(
    @Param('id') groupId: string,
    @Param('employeeId') employeeId: string,
  ) {
    return this.payrollService.removeEmployeeFromPaymentGroup(groupId, employeeId)
  }

  // ==========================================
  // ADIANTAMENTOS E VALES
  // ==========================================

  // GET /api/payroll/advances
  // Listar adiantamentos da empresa
  @Get('advances')
  async listAdvances(
    @Query('companyId') companyId: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.payrollService.listAdvances(companyId, {
      status: status as any,
      type: type as any,
      month: month ? parseInt(month) : undefined,
      year: year ? parseInt(year) : undefined,
    })
  }

  // GET /api/payroll/advances/stats
  // Estatísticas de adiantamentos
  @Get('advances/stats')
  async getAdvanceStats(@Query('companyId') companyId: string) {
    return this.payrollService.getAdvanceStats(companyId)
  }

  // GET /api/payroll/advances/employee/:employeeId
  // Listar adiantamentos de um funcionário
  @Get('advances/employee/:employeeId')
  async listEmployeeAdvances(
    @Param('employeeId') employeeId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.payrollService.listEmployeeAdvances(employeeId, {
      month: month ? parseInt(month) : undefined,
      year: year ? parseInt(year) : undefined,
    })
  }

  // POST /api/payroll/advances
  // Criar adiantamento (solicitação de vale)
  @Post('advances')
  async createAdvance(
    @Query('companyId') companyId: string,
    @Body() data: {
      employeeId: string
      type: 'SALARY_ADVANCE' | 'EXTRA_ADVANCE'
      amount: number
      percentage?: number
      reason?: string
      referenceMonth?: number
      referenceYear?: number
    },
  ) {
    return this.payrollService.createAdvance(companyId, data)
  }

  // POST /api/payroll/advances/:id/approve
  // Aprovar adiantamento
  @Post('advances/:id/approve')
  async approveAdvance(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || 'system'
    return this.payrollService.approveAdvance(id, userId)
  }

  // POST /api/payroll/advances/:id/reject
  // Rejeitar adiantamento
  @Post('advances/:id/reject')
  async rejectAdvance(
    @Param('id') id: string,
    @Body() data: { reason?: string },
  ) {
    return this.payrollService.rejectAdvance(id, data.reason)
  }

  // POST /api/payroll/advances/:id/pay
  // Marcar adiantamento como pago
  @Post('advances/:id/pay')
  async markAdvanceAsPaid(@Param('id') id: string) {
    return this.payrollService.markAdvanceAsPaid(id)
  }

  // DELETE /api/payroll/advances/:id
  // Cancelar adiantamento
  @Delete('advances/:id')
  async cancelAdvance(@Param('id') id: string) {
    return this.payrollService.cancelAdvance(id)
  }

  // ==========================================
  // ATESTADOS MÉDICOS
  // ==========================================

  // GET /api/payroll/medical-certificates
  // Listar atestados médicos
  @Get('medical-certificates')
  async listMedicalCertificates(
    @Query('companyId') companyId: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    try {
      console.log('[PayrollController] listMedicalCertificates', { companyId, employeeId, status, month, year })
      const result = await this.payrollService.listMedicalCertificates(companyId, {
        employeeId,
        status,
        month: month ? parseInt(month) : undefined,
        year: year ? parseInt(year) : undefined,
      })
      console.log('[PayrollController] listMedicalCertificates result:', result)
      return result
    } catch (error) {
      console.error('[PayrollController] listMedicalCertificates ERROR:', error)
      throw error
    }
  }

  // GET /api/payroll/medical-certificates/:id
  // Buscar atestado médico por ID
  @Get('medical-certificates/:id')
  async getMedicalCertificate(@Param('id') id: string) {
    return this.payrollService.getMedicalCertificate(id)
  }

  // POST /api/payroll/medical-certificates
  // Criar atestado médico
  @Post('medical-certificates')
  async createMedicalCertificate(
    @Query('companyId') companyId: string,
    @Body() data: {
      employeeId: string
      startDate: string
      endDate: string
      reason?: string
      doctorName?: string
      doctorCrm?: string
      attachmentUrl?: string
      notes?: string
    },
  ) {
    return this.payrollService.createMedicalCertificate(companyId, data)
  }

  // PUT /api/payroll/medical-certificates/:id
  // Atualizar atestado médico
  @Put('medical-certificates/:id')
  async updateMedicalCertificate(
    @Param('id') id: string,
    @Body() data: {
      startDate?: string
      endDate?: string
      reason?: string
      doctorName?: string
      doctorCrm?: string
      attachmentUrl?: string
      notes?: string
    },
  ) {
    return this.payrollService.updateMedicalCertificate(id, data)
  }

  // POST /api/payroll/medical-certificates/:id/approve
  // Aprovar atestado médico
  @Post('medical-certificates/:id/approve')
  async approveMedicalCertificate(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || 'system'
    return this.payrollService.approveMedicalCertificate(id, userId)
  }

  // POST /api/payroll/medical-certificates/:id/reject
  // Rejeitar atestado médico
  @Post('medical-certificates/:id/reject')
  async rejectMedicalCertificate(
    @Param('id') id: string,
    @Body() data: { reason?: string },
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'system'
    return this.payrollService.rejectMedicalCertificate(id, userId, data.reason)
  }

  // DELETE /api/payroll/medical-certificates/:id
  // Excluir atestado médico
  @Delete('medical-certificates/:id')
  async deleteMedicalCertificate(@Param('id') id: string) {
    return this.payrollService.deleteMedicalCertificate(id)
  }

  // GET /api/payroll/medical-certificates/stats
  // Estatísticas de atestados médicos
  @Get('medical-certificates-stats')
  async getMedicalCertificateStats(@Query('companyId') companyId: string) {
    return this.payrollService.getMedicalCertificateStats(companyId)
  }
}
