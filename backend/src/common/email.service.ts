import { Injectable, Logger } from '@nestjs/common'
import * as nodemailer from 'nodemailer'
import { PrismaService } from '../prisma/prisma.service'

interface SmtpConfig {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)

  constructor(private readonly prisma: PrismaService) {}

  // Retorna config SMTP da empresa (DB) ou fallback global (.env)
  private async resolveConfig(companyId?: string): Promise<SmtpConfig | null> {
    // Tentar configuração da empresa primeiro
    if (companyId) {
      try {
        const company = await this.prisma.company.findUnique({
          where: { id: companyId },
          select: { smtpEnabled: true, smtpHost: true, smtpPort: true, smtpUser: true, smtpPass: true, smtpFrom: true },
        })
        if (company?.smtpEnabled && company.smtpHost && company.smtpUser && company.smtpPass) {
          return {
            host: company.smtpHost,
            port: company.smtpPort || 587,
            user: company.smtpUser,
            pass: company.smtpPass,
            from: company.smtpFrom || company.smtpUser,
          }
        }
      } catch { /* fallback */ }
    }

    // Fallback: config global do .env
    const host = process.env.SMTP_HOST
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS
    if (host && user && pass) {
      return {
        host,
        port: parseInt(process.env.SMTP_PORT || '587'),
        user,
        pass,
        from: process.env.SMTP_FROM || user,
      }
    }

    return null
  }

  private createTransporter(cfg: SmtpConfig): nodemailer.Transporter {
    return nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: { user: cfg.user, pass: cfg.pass },
    })
  }

  // Email de empresa: tenta SMTP da empresa, fallback para .env
  async send(to: string, subject: string, html: string, companyId?: string): Promise<boolean> {
    const cfg = await this.resolveConfig(companyId)
    if (!cfg) {
      this.logger.warn(`Email não enviado (sem config SMTP): ${subject} → ${to}`)
      return false
    }
    try {
      const transporter = this.createTransporter(cfg)
      await transporter.sendMail({ from: cfg.from, to, subject, html })
      this.logger.log(`✉️ Email enviado [${companyId ? 'empresa' : 'global'}]: ${subject} → ${to}`)
      return true
    } catch (err: any) {
      this.logger.error(`Erro ao enviar email: ${err.message}`)
      return false
    }
  }

  // Email do SISTEMA: usa SEMPRE o SMTP do .env (recuperação de senha, avisos do sistema)
  async sendSystem(to: string, subject: string, html: string): Promise<boolean> {
    const host = process.env.SMTP_HOST
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS
    if (!host || !user || !pass) {
      this.logger.warn(`Email do sistema não enviado (SMTP_HOST/SMTP_USER/SMTP_PASS não configurados): ${subject} → ${to}`)
      return false
    }
    const cfg: SmtpConfig = {
      host,
      port: parseInt(process.env.SMTP_PORT || '587'),
      user,
      pass,
      from: process.env.SMTP_FROM || user,
    }
    try {
      const transporter = this.createTransporter(cfg)
      await transporter.sendMail({ from: cfg.from, to, subject, html })
      this.logger.log(`✉️ Email do sistema enviado: ${subject} → ${to}`)
      return true
    } catch (err: any) {
      this.logger.error(`Erro ao enviar email do sistema: ${err.message}`)
      return false
    }
  }

  // Testar configuração SMTP (chamado pela tela de config)
  async testSmtp(cfg: SmtpConfig, testTo: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const transporter = this.createTransporter(cfg)
      await transporter.verify()
      await transporter.sendMail({
        from: cfg.from,
        to: testTo,
        subject: '✅ Teste de Email - WebPonto',
        html: '<h2>Configuração de email funcionando!</h2><p>Seu SMTP está configurado corretamente no WebPonto.</p>',
      })
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  }

  // Templates

  async sendVacationApproved(to: string, employeeName: string, startDate: string, endDate: string, days: number, companyId?: string) {
    return this.send(to, '✅ Férias Aprovadas - WebPonto', `
      <h2>Olá, ${employeeName}!</h2>
      <p>Suas férias foram <strong>aprovadas</strong>!</p>
      <ul>
        <li><strong>Início:</strong> ${startDate}</li>
        <li><strong>Fim:</strong> ${endDate}</li>
        <li><strong>Dias:</strong> ${days}</li>
      </ul>
      <p>Acesse o sistema para assinar a ordem de férias.</p>
      <hr><small>WebPonto - Sistema de Ponto Eletrônico</small>
    `, companyId)
  }

  async sendVacationRejected(to: string, employeeName: string, reason?: string, companyId?: string) {
    return this.send(to, '❌ Férias Não Aprovadas - WebPonto', `
      <h2>Olá, ${employeeName}!</h2>
      <p>Sua solicitação de férias <strong>não foi aprovada</strong>.</p>
      ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
      <p>Entre em contato com o RH para mais informações.</p>
      <hr><small>WebPonto - Sistema de Ponto Eletrônico</small>
    `, companyId)
  }

  async sendPayslipAvailable(to: string, employeeName: string, month: string, year: number, companyId?: string) {
    return this.send(to, `📄 Holerite ${month}/${year} Disponível - WebPonto`, `
      <h2>Olá, ${employeeName}!</h2>
      <p>Seu holerite de <strong>${month}/${year}</strong> está disponível para visualização e assinatura.</p>
      <p>Acesse o sistema WebPonto para conferir os valores e assinar digitalmente.</p>
      <hr><small>WebPonto - Sistema de Ponto Eletrônico</small>
    `, companyId)
  }

  async sendAdvanceApproved(to: string, employeeName: string, amount: string, companyId?: string) {
    return this.send(to, '✅ Vale/Adiantamento Aprovado - WebPonto', `
      <h2>Olá, ${employeeName}!</h2>
      <p>Seu vale/adiantamento no valor de <strong>R$ ${amount}</strong> foi <strong>aprovado</strong>.</p>
      <p>O valor será descontado no próximo holerite.</p>
      <hr><small>WebPonto - Sistema de Ponto Eletrônico</small>
    `, companyId)
  }

  async sendWelcome(to: string, employeeName: string, loginUrl: string, tempPassword?: string, companyId?: string) {
    return this.send(to, '👋 Bem-vindo ao WebPonto!', `
      <h2>Olá, ${employeeName}!</h2>
      <p>Sua conta no WebPonto foi criada com sucesso.</p>
      <p><strong>Acesse:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
      ${tempPassword ? `<p><strong>Senha temporária:</strong> ${tempPassword}</p><p><em>Altere sua senha após o primeiro acesso.</em></p>` : ''}
      <hr><small>WebPonto - Sistema de Ponto Eletrônico</small>
    `, companyId)
  }
}
