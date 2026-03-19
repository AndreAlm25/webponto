import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { EmailService } from '../../common/email.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async login(loginDto: { email: string; password?: string }) {
    const { email } = loginDto;
    const password = loginDto.password
    
    if (!password) {
      throw new UnauthorizedException('Senha é obrigatória');
    }

    // Buscar usuário
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        company: true,
        employee: { include: { position: true, department: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Email ou password incorretos');
    }

    if (!user.active) {
      throw new UnauthorizedException('Usuário inativo. Entre em contato com o administrador.');
    }

    // Verificar se o funcionário (employee) também está ativo
    if (user.employee && !user.employee.active) {
      throw new UnauthorizedException('Funcionário desativado. Entre em contato com o administrador.');
    }

    if (!user.password) {
      throw new UnauthorizedException('Senha não configurada para este usuário');
    }

    // Verificar password
    const passwordCorrect = await bcrypt.compare(password, user.password);
    
    if (!passwordCorrect) {
      throw new UnauthorizedException('Email ou password incorretos');
    }

    // Gerar token
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        avatarUrl: (user as any).avatarUrl,
        company: {
          id: user.company.id,
          slug: (user.company as any).slug || null,
          tradeName: user.company.tradeName,
          cnpj: user.company.cnpj,
          logoUrl: (user.company as any).logoUrl || null,
        },
        // Retornar employee completo (com position e department já incluídos)
        employee: user.employee ?? null,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const { email, name, password, role, companyId } = registerDto;

    // Verificar se usuário já existe
    const userExiste = await this.prisma.user.findUnique({
      where: { email },
    });

    if (userExiste) {
      throw new ConflictException('Email já cadastrado');
    }

    // Verificar se company existe
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new ConflictException('Empresa não encontrada');
    }

    // Regras de criação por papel (role)
    // Funcionários (inclui MANAGER, HR, FINANCIAL) DEVEM ser criados via fluxo de Employee,
    // que vincula um User automaticamente. Bloqueamos aqui para evitar inconsistência.
    if (
      role === (await import('@prisma/client')).Role.EMPLOYEE ||
      role === (await import('@prisma/client')).Role.MANAGER ||
      role === (await import('@prisma/client')).Role.HR ||
      role === (await import('@prisma/client')).Role.FINANCIAL
    ) {
      throw new ConflictException(
        'Criação inválida: colaboradores (EMPLOYEE/MANAGER/HR/FINANCIAL) devem ser criados pelo fluxo de funcionário (Employee), que vincula o usuário automaticamente.'
      );
    }

    // Hash da password
    const passwordHash = await bcrypt.hash(password, 10);

    // Criar usuário
    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        password: passwordHash,
        role,
        companyId,
        active: true,
      },
      include: {
        company: true,
      },
    });

    // Gerar token
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        avatarUrl: (user as any).avatarUrl,
        company: {
          id: company.id,
          slug: (company as any).slug || null,
          tradeName: company.tradeName,
          cnpj: company.cnpj,
        },
      },
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: true,
        employee: { include: { position: true, department: true } },
      },
    });

    if (!user || !user.active) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      avatarUrl: (user as any).avatarUrl,
      company: user.company,
      // employee já contém position e department
      employee: user.employee,
    };
  }

  async me(userId: string) {
    return this.validateUser(userId);
  }

  // SMTP do SISTEMA — gera token e envia email de recuperação
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } })
    // Não revelar se o email existe (segurança)
    if (!user || !user.active) {
      return { message: 'Se este email estiver cadastrado, você receberá um link em breve.' }
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpires: expires },
    })

    const appUrl = process.env.APP_URL || 'http://localhost:3000'
    const resetUrl = `${appUrl}/redefinir-senha?token=${token}`

    // Usa SEMPRE o SMTP do sistema (.env)
    this.emailService.sendSystem(email, '🔑 Recuperação de Senha - WebPonto', `
      <h2>Olá, ${user.name}!</h2>
      <p>Recebemos uma solicitação para redefinir sua senha no WebPonto.</p>
      <p>
        <a href="${resetUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
          Redefinir Senha
        </a>
      </p>
      <p>Ou copie este link: <a href="${resetUrl}">${resetUrl}</a></p>
      <p><strong>Este link expira em 1 hora.</strong></p>
      <p>Se você não solicitou isso, ignore este email. Sua senha não será alterada.</p>
      <hr><small>WebPonto - Sistema de Ponto Eletrônico</small>
    `)

    return { message: 'Se este email estiver cadastrado, você receberá um link em breve.' }
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token || !newPassword || newPassword.length < 6) {
      throw new BadRequestException('Token e senha (mín. 6 caracteres) são obrigatórios')
    }

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
      },
    })

    if (!user) {
      throw new BadRequestException('Token inválido ou expirado. Solicite um novo link.')
    }

    const hashed = await bcrypt.hash(newPassword, 10)

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    })

    return { message: 'Senha redefinida com sucesso! Você já pode fazer login.' }
  }
}
