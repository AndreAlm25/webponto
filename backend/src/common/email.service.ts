import { Injectable, Logger } from '@nestjs/common'
import * as nodemailer from 'nodemailer'

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private transporter: nodemailer.Transporter | null = null

  constructor() {
    const host = process.env.SMTP_HOST
    const port = parseInt(process.env.SMTP_PORT || '587')
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      })
      this.logger.log(`📧 Email configurado: ${host}:${port} (${user})`)
    } else {
      this.logger.warn('⚠️ Email não configurado. Defina SMTP_HOST, SMTP_USER e SMTP_PASS.')
    }
  }

  private get from() {
    return process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@webponto.com.br'
  }

  async send(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(`Email não enviado (sem configuração): ${subject} → ${to}`)
      return false
    }
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html })
      this.logger.log(`✉️ Email enviado: ${subject} → ${to}`)
      return true
    } catch (err: any) {
      this.logger.error(`Erro ao enviar email: ${err.message}`)
      return false
    }
  }

  // Templates prontos

  async sendVacationApproved(to: string, employeeName: string, startDate: string, endDate: string, days: number) {
    return this.send(to, '✅ Férias Aprovadas - WebPonto', `
      <h2>Olá, ${employeeName}!</h2>
      <p>Suas férias foram <strong>aprovadas</strong>!</p>
      <ul>
        <li><strong>Início:</strong> ${startDate}</li>
        <li><strong>Fim:</strong> ${endDate}</li>
        <li><strong>Dias:</strong> ${days}</li>
      </ul>
      <p>Acesse o sistema para assinar a ordem de férias.</p>
      <hr>
      <small>WebPonto - Sistema de Ponto Eletrônico</small>
    `)
  }

  async sendVacationRejected(to: string, employeeName: string, reason?: string) {
    return this.send(to, '❌ Férias Não Aprovadas - WebPonto', `
      <h2>Olá, ${employeeName}!</h2>
      <p>Sua solicitação de férias <strong>não foi aprovada</strong>.</p>
      ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
      <p>Entre em contato com o RH para mais informações.</p>
      <hr>
      <small>WebPonto - Sistema de Ponto Eletrônico</small>
    `)
  }

  async sendPayslipAvailable(to: string, employeeName: string, month: string, year: number) {
    return this.send(to, `📄 Holerite ${month}/${year} Disponível - WebPonto`, `
      <h2>Olá, ${employeeName}!</h2>
      <p>Seu holerite de <strong>${month}/${year}</strong> está disponível para visualização e assinatura.</p>
      <p>Acesse o sistema WebPonto para conferir os valores e assinar digitalmente.</p>
      <hr>
      <small>WebPonto - Sistema de Ponto Eletrônico</small>
    `)
  }

  async sendAdvanceApproved(to: string, employeeName: string, amount: string) {
    return this.send(to, '✅ Vale/Adiantamento Aprovado - WebPonto', `
      <h2>Olá, ${employeeName}!</h2>
      <p>Seu vale/adiantamento no valor de <strong>R$ ${amount}</strong> foi <strong>aprovado</strong>.</p>
      <p>O valor será descontado no próximo holerite.</p>
      <hr>
      <small>WebPonto - Sistema de Ponto Eletrônico</small>
    `)
  }

  async sendWelcome(to: string, employeeName: string, loginUrl: string, tempPassword?: string) {
    return this.send(to, '👋 Bem-vindo ao WebPonto!', `
      <h2>Olá, ${employeeName}!</h2>
      <p>Sua conta no WebPonto foi criada com sucesso.</p>
      <p><strong>Acesse:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
      ${tempPassword ? `<p><strong>Senha temporária:</strong> ${tempPassword}</p><p><em>Altere sua senha após o primeiro acesso.</em></p>` : ''}
      <hr>
      <small>WebPonto - Sistema de Ponto Eletrônico</small>
    `)
  }
}
