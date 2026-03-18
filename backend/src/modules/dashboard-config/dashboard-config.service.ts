import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../events/events.gateway';

@Injectable()
export class DashboardConfigService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  // Buscar configurações do dashboard
  async getConfig(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        dashboardShowRecentEntries: true,
        dashboardRecentEntriesLimit: true,
        dashboardShowTotalEmployees: true,
        dashboardShowTodayEntries: true,
        dashboardShowFacialRecognition: true,
        dashboardShowRemoteClock: true,
        dashboardShowOvertime: true,
        dashboardShowAlerts: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return company;
  }

  // Atualizar configurações do dashboard
  async updateConfig(data: {
    companyId: string;
    dashboardShowRecentEntries?: boolean;
    dashboardRecentEntriesLimit?: number;
    dashboardShowTotalEmployees?: boolean;
    dashboardShowTodayEntries?: boolean;
    dashboardShowFacialRecognition?: boolean;
    dashboardShowRemoteClock?: boolean;
    dashboardShowOvertime?: boolean;
    dashboardShowAlerts?: boolean;
  }) {
    const { companyId, ...updateData } = data;

    if (!companyId) {
      throw new Error('companyId é obrigatório');
    }

    // Verificar se empresa existe
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    // Validar limite (mínimo 5, máximo 50)
    if (updateData.dashboardRecentEntriesLimit !== undefined) {
      if (updateData.dashboardRecentEntriesLimit < 5 || updateData.dashboardRecentEntriesLimit > 50) {
        throw new Error('O limite deve estar entre 5 e 50 registros');
      }
    }

    // Atualizar configurações
    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: updateData,
      select: {
        id: true,
        dashboardShowRecentEntries: true,
        dashboardRecentEntriesLimit: true,
        dashboardShowTotalEmployees: true,
        dashboardShowTodayEntries: true,
        dashboardShowFacialRecognition: true,
        dashboardShowRemoteClock: true,
        dashboardShowOvertime: true,
        dashboardShowAlerts: true,
      },
    });

    // Emitir evento WebSocket para atualizar dashboard em tempo real
    this.eventsGateway.server
      .to(`company:${companyId}`)
      .emit('dashboard-config-updated', updated);

    console.log('📡 [DashboardConfig] Evento WebSocket emitido para company:', companyId);

    return updated;
  }
}
