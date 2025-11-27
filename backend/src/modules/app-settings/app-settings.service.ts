import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto';

@Injectable()
export class AppSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // Buscar configurações do app
  async getSettings(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        successMessageDuration: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return {
      successMessageDuration: company.successMessageDuration || 10,
    };
  }

  // Atualizar configurações do app
  async updateSettings(companyId: string, dto: UpdateAppSettingsDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        successMessageDuration: dto.successMessageDuration,
      },
      select: {
        successMessageDuration: true,
      },
    });

    return {
      successMessageDuration: updated.successMessageDuration,
      message: 'Configurações salvas com sucesso',
    };
  }
}
