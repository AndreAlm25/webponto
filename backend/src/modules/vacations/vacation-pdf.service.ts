import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { MinioService } from '../../common/minio.service'
import * as PDFDocument from 'pdfkit'

@Injectable()
export class VacationPdfService {
  private readonly logger = new Logger(VacationPdfService.name)

  constructor(
    private prisma: PrismaService,
    private minioService: MinioService,
  ) {}

  private formatCurrency(value: number | any): string {
    const num = typeof value === 'object' ? Number(value) : Number(value || 0)
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  private formatDate(date: Date | string | null): string {
    if (!date) return '-'
    const d = new Date(date)
    return d.toLocaleDateString('pt-BR')
  }

  private formatDateTime(date: Date | string | null): string {
    if (!date) return '-'
    const d = new Date(date)
    return d.toLocaleString('pt-BR')
  }

  generateVacationPdfPath(companyId: string, employeeId: string, requestId: string): string {
    return `${companyId}/vacations/${employeeId}/${requestId}.pdf`
  }

  async generateVacationNoticePdf(requestId: string): Promise<{ buffer: Buffer; path: string; url: string }> {
    const request = await this.prisma.vacationRequest.findUnique({
      where: { id: requestId },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
            department: true,
          },
        },
        company: {
          include: {
            address: true,
          },
        },
        vacation: true,
      },
    })

    if (!request) {
      throw new NotFoundException('Solicitação não encontrada')
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk) => chunks.push(chunk))

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text('AVISO DE FÉRIAS', { align: 'center' })
    doc.moveDown(0.5)
    doc.fontSize(10).font('Helvetica').text('(Art. 135 da CLT)', { align: 'center' })
    doc.moveDown(2)

    // Dados da empresa
    doc.fontSize(12).font('Helvetica-Bold').text('DADOS DA EMPRESA')
    doc.moveDown(0.3)
    doc.fontSize(10).font('Helvetica')
    doc.text(`Razão Social: ${request.company.legalName}`)
    doc.text(`Nome Fantasia: ${request.company.tradeName}`)
    doc.text(`CNPJ: ${request.company.cnpj}`)
    if (request.company.address) {
      const addr = request.company.address
      doc.text(`Endereço: ${addr.street}, ${addr.number}${addr.complement ? ` - ${addr.complement}` : ''}, ${addr.district}, ${addr.city}/${addr.state} - CEP: ${addr.zipCode}`)
    }
    doc.moveDown(1.5)

    // Dados do funcionário
    doc.fontSize(12).font('Helvetica-Bold').text('DADOS DO FUNCIONÁRIO')
    doc.moveDown(0.3)
    doc.fontSize(10).font('Helvetica')
    doc.text(`Nome: ${request.employee.user?.name || 'N/A'}`)
    doc.text(`Matrícula: ${request.employee.registrationId}`)
    doc.text(`Cargo: ${request.employee.position?.name || 'N/A'}`)
    doc.text(`Departamento: ${request.employee.department?.name || 'N/A'}`)
    doc.text(`Data de Admissão: ${this.formatDate(request.employee.hireDate)}`)
    doc.moveDown(1.5)

    // Período aquisitivo
    if (request.vacation) {
      doc.fontSize(12).font('Helvetica-Bold').text('PERÍODO AQUISITIVO')
      doc.moveDown(0.3)
      doc.fontSize(10).font('Helvetica')
      doc.text(`Início: ${this.formatDate(request.vacation.acquisitionStart)}`)
      doc.text(`Término: ${this.formatDate(request.vacation.acquisitionEnd)}`)
      doc.moveDown(1.5)
    }

    // Período de gozo
    doc.fontSize(12).font('Helvetica-Bold').text('PERÍODO DE GOZO DAS FÉRIAS')
    doc.moveDown(0.3)
    doc.fontSize(10).font('Helvetica')

    const periods = request.requestedPeriods as Array<{ startDate: string; days: number }> | null
    if (periods && periods.length > 0) {
      periods.forEach((period, index) => {
        const startDate = new Date(period.startDate)
        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + period.days - 1)
        doc.text(`${index + 1}º Período: ${this.formatDate(startDate)} a ${this.formatDate(endDate)} (${period.days} dias)`)
      })
    } else {
      const startDate = new Date(request.requestedStartDate)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + request.requestedDays - 1)
      doc.text(`Início: ${this.formatDate(startDate)}`)
      doc.text(`Término: ${this.formatDate(endDate)}`)
      doc.text(`Total de dias: ${request.requestedDays}`)
    }

    if (request.sellDays > 0) {
      doc.moveDown(0.5)
      doc.text(`Abono Pecuniário: ${request.sellDays} dias vendidos`)
    }
    doc.moveDown(1.5)

    // Valores (se disponível)
    const baseSalary = Number(request.employee.baseSalary) || 0
    if (baseSalary > 0) {
      const dailyRate = baseSalary / 30
      const vacationDays = request.requestedDays
      const baseValue = vacationDays * dailyRate
      const bonusValue = baseValue / 3
      const totalVacation = baseValue + bonusValue

      let abonoValue = 0
      if (request.sellDays > 0) {
        const abonoBase = request.sellDays * dailyRate
        abonoValue = abonoBase + (abonoBase / 3)
      }

      doc.fontSize(12).font('Helvetica-Bold').text('VALORES')
      doc.moveDown(0.3)
      doc.fontSize(10).font('Helvetica')
      doc.text(`Salário Base: ${this.formatCurrency(baseSalary)}`)
      doc.text(`Férias (${vacationDays} dias): ${this.formatCurrency(baseValue)}`)
      doc.text(`1/3 Constitucional: ${this.formatCurrency(bonusValue)}`)
      if (request.sellDays > 0) {
        doc.text(`Abono Pecuniário (${request.sellDays} dias + 1/3): ${this.formatCurrency(abonoValue)}`)
      }
      doc.font('Helvetica-Bold').text(`Total a Receber: ${this.formatCurrency(totalVacation + abonoValue)}`)
      doc.moveDown(1.5)
    }

    // Assinaturas
    doc.fontSize(12).font('Helvetica-Bold').text('ASSINATURAS DIGITAIS')
    doc.moveDown(0.5)
    doc.fontSize(9).font('Helvetica')

    if (request.employeeSignedAt) {
      doc.text(`Funcionário: Assinado digitalmente em ${this.formatDateTime(request.employeeSignedAt)}`)
      if (request.employeeSignedIp) {
        doc.text(`   IP: ${request.employeeSignedIp}`)
      }
      if (request.employeeSignatureHash) {
        doc.text(`   Hash: ${request.employeeSignatureHash.substring(0, 32)}...`)
      }
    } else {
      doc.text('Funcionário: Aguardando assinatura')
    }

    doc.moveDown(0.5)

    if (request.adminSignedAt) {
      doc.text(`Empresa: Assinado digitalmente em ${this.formatDateTime(request.adminSignedAt)}`)
      if (request.adminSignedIp) {
        doc.text(`   IP: ${request.adminSignedIp}`)
      }
      if (request.adminSignatureHash) {
        doc.text(`   Hash: ${request.adminSignatureHash.substring(0, 32)}...`)
      }
    } else {
      doc.text('Empresa: Aguardando assinatura')
    }

    doc.moveDown(2)

    // Rodapé
    if (request.documentHash) {
      doc.fontSize(8).font('Helvetica')
      doc.text(`Hash do documento: ${request.documentHash}`, { align: 'center' })
    }
    doc.fontSize(8).text(`Documento gerado em ${this.formatDateTime(new Date())}`, { align: 'center' })

    doc.end()

    // Aguardar finalização
    await new Promise<void>((resolve) => doc.on('end', resolve))

    const buffer = Buffer.concat(chunks)
    const path = this.generateVacationPdfPath(request.companyId, request.employeeId, requestId)

    // Upload para MinIO
    try {
      await this.minioService.upload(buffer, path, 'application/pdf', 'employees')
      const url = await this.minioService.getPresignedUrl(path, 'employees', 3600)

      // Atualizar request com o path do PDF
      await this.prisma.vacationRequest.update({
        where: { id: requestId },
        data: { pdfPath: path },
      })

      return { buffer, path, url }
    } catch (error) {
      this.logger.error(`Erro ao fazer upload do PDF: ${error}`)
      throw error
    }
  }

  async getVacationNoticePdf(requestId: string): Promise<{ url: string }> {
    const request = await this.prisma.vacationRequest.findUnique({
      where: { id: requestId },
    })

    if (!request) {
      throw new NotFoundException('Solicitação não encontrada')
    }

    if (!request.pdfPath) {
      // Gerar PDF se não existir
      const result = await this.generateVacationNoticePdf(requestId)
      return { url: result.url }
    }

    // Retornar URL do PDF existente
    const url = await this.minioService.getPresignedUrl(request.pdfPath, 'employees', 3600)
    return { url }
  }
}
