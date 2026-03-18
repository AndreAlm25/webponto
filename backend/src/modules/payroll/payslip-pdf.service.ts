import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { MinioService } from '../../common/minio.service'
import * as PDFDocument from 'pdfkit'
import axios from 'axios'

@Injectable()
export class PayslipPdfService {
  private readonly logger = new Logger(PayslipPdfService.name)

  constructor(
    private prisma: PrismaService,
    private minioService: MinioService,
  ) {}

  // Formatar moeda
  private formatCurrency(value: number | any): string {
    const num = typeof value === 'object' ? Number(value) : Number(value || 0)
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  // Formatar data
  private formatDate(date: Date | string | null): string {
    if (!date) return '-'
    const d = new Date(date)
    return d.toLocaleDateString('pt-BR')
  }

  // Formatar data e hora
  private formatDateTime(date: Date | string | null): string {
    if (!date) return '-'
    const d = new Date(date)
    return d.toLocaleString('pt-BR')
  }

  // Nome do mês
  private getMonthName(month: number): string {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    return months[month - 1] || ''
  }

  // Buscar imagem de URL externa e retornar como buffer
  private async fetchImageBuffer(url: string): Promise<Buffer | null> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 5000,
      })
      return Buffer.from(response.data)
    } catch (error) {
      this.logger.warn(`Não foi possível carregar imagem externa: ${url}`)
      return null
    }
  }

  // Buscar imagem do MinIO e retornar como buffer
  private async fetchImageFromMinio(path: string): Promise<Buffer | null> {
    if (!path) return null
    
    try {
      const { stream } = await this.minioService.getObject(path, 'employees')
      const chunks: Buffer[] = []
      for await (const chunk of stream) {
        chunks.push(chunk)
      }
      return Buffer.concat(chunks)
    } catch (error) {
      this.logger.warn(`Não foi possível carregar imagem do MinIO: ${path}`)
      return null
    }
  }

  // Gerar path para o PDF no MinIO
  generatePayslipPdfPath(companyId: string, employeeId: string, year: number, month: number): string {
    return `${companyId}/payslips/${employeeId}/${year}-${String(month).padStart(2, '0')}.pdf`
  }

  // Gerar PDF do holerite
  async generatePayslipPdf(payslipId: string): Promise<{ buffer: Buffer; path: string; url: string }> {
    // Buscar holerite com dados relacionados
    const payslip = await this.prisma.payslip.findUnique({
      where: { id: payslipId },
      include: {
        company: {
          include: {
            address: true,
            payrollConfig: true,
          },
        },
        employee: {
          include: {
            user: true,
          },
        },
      },
    })

    if (!payslip) {
      throw new NotFoundException('Holerite não encontrado')
    }

    // Verificar se foi assinado (só pode baixar PDF após assinar)
    if (!payslip.signedAt) {
      throw new BadRequestException('O holerite precisa ser assinado antes de baixar o PDF')
    }

    const config = payslip.company.payrollConfig
    const companyDisplayName = payslip.company.tradeName || payslip.company.legalName

    // Buscar imagens do MinIO (logo da empresa e foto do funcionário)
    let companyLogoBuffer: Buffer | null = null
    let employeePhotoBuffer: Buffer | null = null

    // Logo da empresa - buscar do MinIO
    if (payslip.company.logoUrl) {
      this.logger.debug(`Buscando logo da empresa: ${payslip.company.logoUrl}`)
      companyLogoBuffer = await this.fetchImageFromMinio(payslip.company.logoUrl)
      if (companyLogoBuffer) {
        this.logger.debug(`Logo da empresa carregado com sucesso (${companyLogoBuffer.length} bytes)`)
      }
    }

    // Avatar do funcionário - buscar do MinIO
    if (payslip.employee?.user?.avatarUrl) {
      this.logger.debug(`Buscando avatar do funcionário: ${payslip.employee.user.avatarUrl}`)
      employeePhotoBuffer = await this.fetchImageFromMinio(payslip.employee.user.avatarUrl)
      if (employeePhotoBuffer) {
        this.logger.debug(`Avatar do funcionário carregado com sucesso (${employeePhotoBuffer.length} bytes)`)
      }
    }

    // Criar documento PDF
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: {
        Title: `Holerite - ${this.getMonthName(payslip.referenceMonth)}/${payslip.referenceYear}`,
        Author: companyDisplayName,
        Subject: `Holerite de ${payslip.employeeName}`,
      },
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))

    const pageWidth = 515 // 595 - 80 (margens)
    const pageCenter = 297.5 // Centro da página A4

    // ========================================
    // CABEÇALHO DA EMPRESA (logo centralizado no topo)
    // ========================================
    
    // Logo da empresa centralizado
    if (companyLogoBuffer) {
      try {
        const logoWidth = 70
        const logoHeight = 70
        const logoX = pageCenter - (logoWidth / 2)
        doc.image(companyLogoBuffer, logoX, doc.y, { 
          width: logoWidth,
          height: logoHeight,
          fit: [logoWidth, logoHeight],
        })
        doc.y += logoHeight + 10
      } catch (e) {
        this.logger.warn('Erro ao inserir logo da empresa no PDF')
      }
    }

    // Nome da empresa centralizado
    doc.fontSize(16).font('Helvetica-Bold')
    doc.text(companyDisplayName, 40, doc.y, { width: pageWidth, align: 'center' })
    doc.fontSize(9).font('Helvetica')
    
    if (payslip.company.cnpj) {
      doc.text(`CNPJ: ${payslip.company.cnpj}`, 40, doc.y, { width: pageWidth, align: 'center' })
    }
    
    if (payslip.company.address) {
      const addr = payslip.company.address
      const addressParts = [addr.street, addr.number, addr.complement, addr.district].filter(Boolean)
      const cityState = [addr.city, addr.state].filter(Boolean).join('/')
      if (addressParts.length > 0) {
        doc.text(addressParts.join(', '), 40, doc.y, { width: pageWidth, align: 'center' })
      }
      if (cityState || addr.zipCode) {
        doc.text(`${cityState}${addr.zipCode ? ' - CEP: ' + addr.zipCode : ''}`, 40, doc.y, { width: pageWidth, align: 'center' })
      }
    }

    doc.moveDown(0.5)
    this.drawLine(doc)
    doc.moveDown(0.5)

    // ========================================
    // TÍTULO DO DOCUMENTO
    // ========================================
    doc.fontSize(14).font('Helvetica-Bold')
      .text('DEMONSTRATIVO DE PAGAMENTO', { align: 'center' })
    doc.fontSize(11).font('Helvetica')
      .text(`Competência: ${this.getMonthName(payslip.referenceMonth)}/${payslip.referenceYear}`, { align: 'center' })
    
    if (payslip.paidAt) {
      doc.fontSize(9).text(`Data de Pagamento: ${this.formatDate(payslip.paidAt)}`, { align: 'center' })
    }

    doc.moveDown(0.5)
    this.drawLine(doc)
    doc.moveDown(0.5)

    // ========================================
    // DADOS DO FUNCIONÁRIO (com foto à esquerda)
    // ========================================
    doc.fontSize(10).font('Helvetica-Bold').text('DADOS DO FUNCIONÁRIO')
    doc.moveDown(0.3)
    
    const employeeStartY = doc.y
    const photoSize = 45
    let textStartX = 40

    // Foto do funcionário (lado esquerdo dos dados)
    if (employeePhotoBuffer) {
      try {
        doc.image(employeePhotoBuffer, 40, employeeStartY, { 
          width: photoSize,
          height: photoSize,
          fit: [photoSize, photoSize],
        })
        textStartX = 95 // Mover texto para depois da foto
      } catch (e) {
        this.logger.warn('Erro ao inserir foto do funcionário no PDF')
      }
    }

    const col2 = 320

    doc.fontSize(9).font('Helvetica')
    
    // Coluna 1 (após a foto)
    doc.text(`Nome: ${payslip.employeeName}`, textStartX, employeeStartY)
    doc.text(`Cargo: ${payslip.employeePosition || '-'}`, textStartX)
    doc.text(`Departamento: ${payslip.employeeDepartment || '-'}`, textStartX)
    
    // Coluna 2
    let col2Y = employeeStartY
    doc.text(`Matrícula: ${payslip.employeeRegistration || '-'}`, col2, col2Y)
    col2Y += 12
    
    // CPF do funcionário (se disponível)
    if (payslip.employee?.user?.cpf) {
      doc.text(`CPF: ${payslip.employee.user.cpf}`, col2, col2Y)
      col2Y += 12
    }
    
    // Data de admissão
    if (payslip.employee?.hireDate) {
      doc.text(`Admissão: ${this.formatDate(payslip.employee.hireDate)}`, col2, col2Y)
    }

    // Garantir que o cursor está abaixo da foto
    doc.y = Math.max(doc.y, employeeStartY + photoSize + 5)
    doc.moveDown(0.5)
    this.drawLine(doc)
    doc.moveDown(0.5)

    // ========================================
    // PROVENTOS (RENDIMENTOS)
    // ========================================
    doc.fontSize(10).font('Helvetica-Bold').text('PROVENTOS', 40)
    doc.moveDown(0.3)

    // Cabeçalho da tabela
    this.drawTableHeader(doc, ['Descrição', 'Referência', 'Valor'])
    
    const proventos: { desc: string; ref: string; valor: number }[] = []

    // Salário Base
    proventos.push({
      desc: 'Salário Base',
      ref: `${payslip.workedDays} dias`,
      valor: Number(payslip.baseSalary),
    })

    // Horas Extras 50%
    if (Number(payslip.overtimeHours50) > 0) {
      proventos.push({
        desc: 'Horas Extras 50%',
        ref: `${Number(payslip.overtimeHours50)}h`,
        valor: Number(payslip.overtimeValue50),
      })
    }

    // Horas Extras 100%
    if (Number(payslip.overtimeHours100) > 0) {
      proventos.push({
        desc: 'Horas Extras 100%',
        ref: `${Number(payslip.overtimeHours100)}h`,
        valor: Number(payslip.overtimeValue100),
      })
    }

    // Adicional Noturno
    if (config?.enableNightShift && Number(payslip.nightShiftValue) > 0) {
      proventos.push({
        desc: 'Adicional Noturno',
        ref: `${Number(payslip.nightShiftHours)}h`,
        valor: Number(payslip.nightShiftValue),
      })
    }

    // Periculosidade
    if (Number(payslip.hazardPay) > 0) {
      proventos.push({
        desc: 'Adicional de Periculosidade',
        ref: '',
        valor: Number(payslip.hazardPay),
      })
    }

    // Insalubridade
    if (Number(payslip.unhealthyPay) > 0) {
      proventos.push({
        desc: 'Adicional de Insalubridade',
        ref: '',
        valor: Number(payslip.unhealthyPay),
      })
    }

    // Bônus/Gratificações
    if (Number(payslip.bonus) > 0) {
      proventos.push({
        desc: 'Bônus/Gratificação',
        ref: '',
        valor: Number(payslip.bonus),
      })
    }

    // Outros Proventos
    if (Number(payslip.otherEarnings) > 0) {
      proventos.push({
        desc: payslip.otherEarningsDesc || 'Outros Proventos',
        ref: '',
        valor: Number(payslip.otherEarnings),
      })
    }

    // Desenhar linhas de proventos
    proventos.forEach(p => {
      this.drawTableRow(doc, [p.desc, p.ref, this.formatCurrency(p.valor)])
    })

    // Total de Proventos
    doc.moveDown(0.3)
    doc.font('Helvetica-Bold').fontSize(9)
    doc.text('TOTAL DE PROVENTOS', 40)
    doc.text(this.formatCurrency(payslip.totalEarnings), 450, doc.y - 12, { width: 100, align: 'right' })
    doc.font('Helvetica')

    doc.moveDown(0.5)
    this.drawLine(doc)
    doc.moveDown(0.5)

    // ========================================
    // DESCONTOS
    // ========================================
    doc.fontSize(10).font('Helvetica-Bold').text('DESCONTOS', 40)
    doc.moveDown(0.3)

    this.drawTableHeader(doc, ['Descrição', 'Base/Ref', 'Valor'])
    
    const descontos: { desc: string; ref: string; valor: number }[] = []

    // INSS
    if (config?.enableInss && Number(payslip.inssValue) > 0) {
      descontos.push({
        desc: 'INSS',
        ref: `${Number(payslip.inssRate)}% s/ ${this.formatCurrency(payslip.inssBase)}`,
        valor: Number(payslip.inssValue),
      })
    }

    // IRRF
    if (config?.enableIrrf && Number(payslip.irValue) > 0) {
      descontos.push({
        desc: 'IRRF',
        ref: `${Number(payslip.irRate)}% s/ ${this.formatCurrency(payslip.irBase)}`,
        valor: Number(payslip.irValue),
      })
    }

    // Vale Transporte
    if (config?.enableTransportVoucher && Number(payslip.transportVoucher) > 0) {
      descontos.push({
        desc: 'Vale Transporte',
        ref: `${Number(config.transportVoucherRate || 6)}%`,
        valor: Number(payslip.transportVoucher),
      })
    }

    // Vale Refeição
    if (config?.enableMealVoucher && Number(payslip.mealVoucher) > 0) {
      descontos.push({
        desc: 'Vale Refeição',
        ref: '',
        valor: Number(payslip.mealVoucher),
      })
    }

    // Plano de Saúde
    if (config?.enableHealthInsurance && Number(payslip.healthInsurance) > 0) {
      descontos.push({
        desc: 'Plano de Saúde',
        ref: '',
        valor: Number(payslip.healthInsurance),
      })
    }

    // Plano Odontológico
    if (config?.enableDentalInsurance && Number(payslip.dentalInsurance) > 0) {
      descontos.push({
        desc: 'Plano Odontológico',
        ref: '',
        valor: Number(payslip.dentalInsurance),
      })
    }

    // Contribuição Sindical
    if (Number(payslip.unionContribution) > 0) {
      descontos.push({
        desc: 'Contribuição Sindical',
        ref: '',
        valor: Number(payslip.unionContribution),
      })
    }

    // Empréstimo Consignado
    if (Number(payslip.loanDeduction) > 0) {
      descontos.push({
        desc: 'Empréstimo Consignado',
        ref: '',
        valor: Number(payslip.loanDeduction),
      })
    }

    // Adiantamento Salarial (do Modo de Pagamento Vale + Saldo)
    if (Number(payslip.salaryAdvanceValue) > 0) {
      descontos.push({
        desc: 'Adiantamento Salarial',
        ref: '',
        valor: Number(payslip.salaryAdvanceValue),
      })
    }

    // Vales Avulsos
    if (config?.enableExtraAdvance && Number(payslip.extraAdvanceValue) > 0) {
      descontos.push({
        desc: 'Vales Avulsos',
        ref: '',
        valor: Number(payslip.extraAdvanceValue),
      })
    }

    // Faltas
    if (payslip.absenceDays > 0) {
      descontos.push({
        desc: 'Faltas',
        ref: `${payslip.absenceDays} dia(s)`,
        valor: Number(payslip.absenceValue),
      })
    }

    // Atrasos
    if (payslip.lateMinutes > 0) {
      descontos.push({
        desc: 'Atrasos',
        ref: `${payslip.lateMinutes} min`,
        valor: Number(payslip.lateValue),
      })
    }

    // Outros Descontos
    if (Number(payslip.otherDeductions) > 0) {
      descontos.push({
        desc: payslip.otherDeductionsDesc || 'Outros Descontos',
        ref: '',
        valor: Number(payslip.otherDeductions),
      })
    }

    // Desenhar linhas de descontos
    descontos.forEach(d => {
      this.drawTableRow(doc, [d.desc, d.ref, this.formatCurrency(d.valor)])
    })

    // Total de Descontos
    doc.moveDown(0.3)
    doc.font('Helvetica-Bold').fontSize(9)
    doc.text('TOTAL DE DESCONTOS', 40)
    doc.text(this.formatCurrency(payslip.totalDeductions), 450, doc.y - 12, { width: 100, align: 'right' })
    doc.font('Helvetica')

    doc.moveDown(0.5)
    this.drawLine(doc)
    doc.moveDown(0.5)

    // ========================================
    // FGTS (INFORMATIVO)
    // ========================================
    if (config?.enableFgts && Number(payslip.fgtsValue) > 0) {
      doc.fontSize(10).font('Helvetica-Bold').text('FGTS (Informativo - não é desconto do funcionário)', 40)
      doc.moveDown(0.3)
      doc.fontSize(9).font('Helvetica')
      doc.text(`Base de Cálculo: ${this.formatCurrency(payslip.fgtsBase)}`, 40)
      doc.text(`Depósito FGTS (8%): ${this.formatCurrency(payslip.fgtsValue)}`, 40)
      doc.moveDown(0.5)
      this.drawLine(doc)
      doc.moveDown(0.5)
    }

    // ========================================
    // RESUMO FINAL
    // ========================================
    doc.fontSize(10).font('Helvetica-Bold').text('RESUMO', 40)
    doc.moveDown(0.3)

    const resumeY = doc.y
    doc.fontSize(9).font('Helvetica')
    doc.text(`Total de Proventos:`, 40, resumeY)
    doc.text(this.formatCurrency(payslip.totalEarnings), 200, resumeY)
    
    doc.text(`Total de Descontos:`, 40, resumeY + 15)
    doc.text(`- ${this.formatCurrency(payslip.totalDeductions)}`, 200, resumeY + 15)

    doc.moveDown(1.5)
    
    // Valor Líquido em destaque
    doc.rect(40, doc.y, pageWidth, 35).fill('#f0f9ff')
    doc.fill('#000')
    doc.fontSize(12).font('Helvetica-Bold')
    doc.text('VALOR LÍQUIDO A RECEBER', 50, doc.y + 8)
    doc.fontSize(14)
    doc.text(this.formatCurrency(payslip.netSalary), 350, doc.y - 12, { width: 200, align: 'right' })

    doc.moveDown(2)
    this.drawLine(doc)
    doc.moveDown(0.5)

    // ========================================
    // ASSINATURA DIGITAL
    // ========================================
    doc.fontSize(9).font('Helvetica-Bold').text('ASSINATURA DIGITAL', 40)
    doc.moveDown(0.3)
    doc.fontSize(8).font('Helvetica')
    doc.text(`Documento assinado digitalmente em: ${this.formatDateTime(payslip.signedAt)}`, 40)
    doc.text(`IP: ${payslip.signedByIp || '-'}`, 40)
    doc.text(`Dispositivo: ${(payslip.signedByDevice || '-').substring(0, 80)}...`, 40)
    doc.text(`Hash do documento: ${payslip.documentHash || '-'}`, 40)
    doc.moveDown(0.5)
    doc.fontSize(7).fillColor('#666')
    doc.text('Este documento possui validade legal conforme MP 2.200-2/2001. A assinatura digital garante a autenticidade e integridade do documento.', 40, doc.y, { width: pageWidth })

    // Finalizar documento
    doc.end()

    // Aguardar finalização
    return new Promise((resolve, reject) => {
      doc.on('end', async () => {
        const buffer = Buffer.concat(chunks)
        
        // Salvar no MinIO
        const path = this.generatePayslipPdfPath(
          payslip.companyId,
          payslip.employeeId,
          payslip.referenceYear,
          payslip.referenceMonth
        )

        try {
          await this.minioService.upload(buffer, path, 'application/pdf', 'employees')
          
          // Atualizar holerite com o path do PDF
          await this.prisma.payslip.update({
            where: { id: payslipId },
            data: { pdfPath: path },
          })

          this.logger.log(`PDF do holerite gerado e salvo: ${path}`)

          // Gerar URL assinada para download (válida por 1 hora)
          const url = await this.minioService.getPresignedUrl(path, 'employees', 3600)

          resolve({ buffer, path, url })
        } catch (error) {
          this.logger.error(`Erro ao salvar PDF no MinIO: ${error.message}`)
          reject(error)
        }
      })

      doc.on('error', reject)
    })
  }

  // Obter PDF existente ou gerar novo
  async getPayslipPdf(payslipId: string): Promise<{ buffer: Buffer; url: string }> {
    const payslip = await this.prisma.payslip.findUnique({
      where: { id: payslipId },
      select: {
        id: true,
        signedAt: true,
        pdfPath: true,
        companyId: true,
        employeeId: true,
        referenceYear: true,
        referenceMonth: true,
      },
    })

    if (!payslip) {
      throw new NotFoundException('Holerite não encontrado')
    }

    if (!payslip.signedAt) {
      throw new BadRequestException('O holerite precisa ser assinado antes de baixar o PDF')
    }

    // Se já tem PDF salvo, retornar URL
    if (payslip.pdfPath) {
      try {
        const exists = await this.minioService.exists(payslip.pdfPath, 'employees')
        if (exists) {
          const { stream } = await this.minioService.getObject(payslip.pdfPath, 'employees')
          const chunks: Buffer[] = []
          for await (const chunk of stream) {
            chunks.push(chunk)
          }
          const buffer = Buffer.concat(chunks)
          const url = await this.minioService.getPresignedUrl(payslip.pdfPath, 'employees', 3600)
          return { buffer, url }
        }
      } catch (error) {
        this.logger.warn(`PDF não encontrado no MinIO, gerando novo: ${error.message}`)
      }
    }

    // Gerar novo PDF
    const result = await this.generatePayslipPdf(payslipId)
    return { buffer: result.buffer, url: result.url }
  }

  // Helpers para desenhar tabela
  private drawLine(doc: PDFKit.PDFDocument) {
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke()
  }

  private drawTableHeader(doc: PDFKit.PDFDocument, columns: string[]) {
    const y = doc.y
    doc.fontSize(8).font('Helvetica-Bold')
    doc.text(columns[0], 40, y, { width: 250 })
    doc.text(columns[1], 300, y, { width: 100, align: 'center' })
    doc.text(columns[2], 420, y, { width: 130, align: 'right' })
    doc.font('Helvetica')
    doc.moveDown(0.3)
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#ccc').stroke().strokeColor('#000')
    doc.moveDown(0.2)
  }

  private drawTableRow(doc: PDFKit.PDFDocument, columns: string[]) {
    const y = doc.y
    doc.fontSize(8)
    doc.text(columns[0], 40, y, { width: 250 })
    doc.text(columns[1], 300, y, { width: 100, align: 'center' })
    doc.text(columns[2], 420, y, { width: 130, align: 'right' })
    doc.moveDown(0.5)
  }
}
