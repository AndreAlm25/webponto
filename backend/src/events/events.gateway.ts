import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // Em produção, especifique os domínios permitidos
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('EventsGateway');
  private connectedClients = new Map<string, { socket: Socket; companyId?: string; userId?: string }>();

  handleConnection(client: Socket) {
    this.logger.log(`🔌 Cliente conectado: ${client.id}`);
    this.connectedClients.set(client.id, { socket: client });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 Cliente desconectado: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('join-company')
  handleJoinCompany(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    // Aceitar tanto string quanto objeto
    const companyId = typeof data === 'string' ? data : data?.companyId;
    const userId = typeof data === 'object' ? data?.userId : undefined;
    
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    this.logger.log(`👥 [BACKEND] Cliente entrando na empresa`);
    this.logger.log(`👥 [BACKEND] Client ID: ${client.id}`);
    this.logger.log(`👥 [BACKEND] CompanyId recebido: ${companyId}`);
    this.logger.log(`👥 [BACKEND] UserId: ${userId || 'não fornecido'}`);
    this.logger.log(`👥 [BACKEND] Data recebida: ${JSON.stringify(data)}`);
    
    // Atualizar informações do cliente
    this.connectedClients.set(client.id, { socket: client, companyId, userId });
    
    // Entrar na sala da empresa
    client.join(`company:${companyId}`);
    
    this.logger.log(`👥 [BACKEND] Cliente ${client.id} entrou na sala: company:${companyId}`);
    this.logger.log(`👥 [BACKEND] Total de clientes na sala agora: ${this.server.sockets.adapter.rooms.get(`company:${companyId}`)?.size || 0}`);
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    return { success: true, message: `Conectado à empresa ${companyId}` };
  }

  @SubscribeMessage('leave-company')
  handleLeaveCompany(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { companyId: string },
  ) {
    const { companyId } = data;
    this.logger.log(`👥 Cliente ${client.id} saiu da empresa: ${companyId}`);
    
    // Sair da sala da empresa
    client.leave(`company:${companyId}`);
    
    return { success: true, message: `Desconectado da empresa ${companyId}` };
  }

  // ==========================================
  // MÉTODOS PARA EMITIR EVENTOS
  // ==========================================

  /**
   * Emitir evento de novo ponto registrado
   */
  emitTimeEntryCreated(companyId: string, timeEntry: any) {
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    this.logger.log(`📤 [BACKEND] Emitindo time-entry-created`);
    this.logger.log(`📤 [BACKEND] CompanyId: ${companyId}`);
    this.logger.log(`📤 [BACKEND] Sala: company:${companyId}`);
    this.logger.log(`📤 [BACKEND] TimeEntry ID: ${timeEntry.id}`);
    this.logger.log(`📤 [BACKEND] TimeEntry Type: ${timeEntry.type}`);
    this.logger.log(`📤 [BACKEND] Employee: ${JSON.stringify(timeEntry.employee)}`);
    this.logger.log(`📤 [BACKEND] Clientes conectados na sala: ${this.server.sockets.adapter.rooms.get(`company:${companyId}`)?.size || 0}`);
    this.logger.log(`📤 [BACKEND] Total de clientes conectados: ${this.connectedClients.size}`);
    
    // Listar todos os clientes na sala
    const roomClients = this.server.sockets.adapter.rooms.get(`company:${companyId}`);
    if (roomClients) {
      this.logger.log(`📤 [BACKEND] IDs dos clientes na sala:`);
      roomClients.forEach(clientId => {
        const clientInfo = this.connectedClients.get(clientId);
        this.logger.log(`   - ${clientId} (companyId: ${clientInfo?.companyId})`);
      });
    }
    
    this.server.to(`company:${companyId}`).emit('time-entry-created', timeEntry);
    this.logger.log(`📤 [BACKEND] Evento emitido com sucesso!`);
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  }

  /**
   * Emitir evento de ponto atualizado
   */
  emitTimeEntryUpdated(companyId: string, timeEntry: any) {
    this.logger.log(`📤 Emitindo time-entry-updated para empresa ${companyId}`);
    this.server.to(`company:${companyId}`).emit('time-entry-updated', timeEntry);
  }

  /**
   * Emitir evento de ponto deletado
   */
  emitTimeEntryDeleted(companyId: string, timeEntryId: string) {
    this.logger.log(`📤 Emitindo time-entry-deleted para empresa ${companyId}`);
    this.server.to(`company:${companyId}`).emit('time-entry-deleted', { id: timeEntryId });
  }

  /**
   * Emitir evento de funcionário criado
   */
  emitEmployeeCreated(companyId: string, employee: any) {
    this.logger.log(`📤 Emitindo employee-created para empresa ${companyId}`);
    this.server.to(`company:${companyId}`).emit('employee-created', employee);
  }

  /**
   * Emitir evento de funcionário atualizado
   */
  emitEmployeeUpdated(companyId: string, employee: any) {
    this.logger.log(`📤 Emitindo employee-updated para empresa ${companyId}`);
    this.server.to(`company:${companyId}`).emit('employee-updated', employee);
  }

  /**
   * Emitir evento de funcionário deletado
   */
  emitEmployeeDeleted(companyId: string, employeeId: string) {
    this.logger.log(`📤 Emitindo employee-deleted para empresa ${companyId}`);
    this.server.to(`company:${companyId}`).emit('employee-deleted', { id: employeeId });
  }

  /**
   * Emitir evento de reconhecimento facial cadastrado
   */
  emitFaceRegistered(companyId: string, employeeId: string, data: any) {
    this.logger.log(`📤 Emitindo face-registered para empresa ${companyId}`);
    this.server.to(`company:${companyId}`).emit('face-registered', { employeeId, ...data });
  }

  /**
   * Emitir evento de reconhecimento facial removido
   */
  emitFaceDeleted(companyId: string, employeeId: string) {
    this.logger.log(`📤 Emitindo face-deleted para empresa ${companyId}`);
    this.server.to(`company:${companyId}`).emit('face-deleted', { employeeId });
  }

  /**
   * Emitir evento genérico para uma empresa
   */
  emitToCompany(companyId: string, event: string, data: any) {
    this.logger.log(`📤 Emitindo ${event} para empresa ${companyId}`);
    this.server.to(`company:${companyId}`).emit(event, data);
  }

  /**
   * Emitir evento para todos os clientes
   */
  emitToAll(event: string, data: any) {
    this.logger.log(`📤 Emitindo ${event} para todos os clientes`);
    this.server.emit(event, data);
  }

  /**
   * Emitir evento de permissões atualizadas para usuários de um role específico
   * Isso faz com que todos os usuários desse role recarreguem suas permissões
   */
  emitPermissionsUpdated(companyId: string, role: string) {
    this.logger.log(`📤 Emitindo permissions-updated para empresa ${companyId}, role ${role}`);
    
    // Emitir para todos os clientes da empresa
    // O frontend vai verificar se o role do usuário corresponde
    this.server.to(`company:${companyId}`).emit('permissions-updated', { 
      companyId, 
      role,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emitir evento de permissões atualizadas para um usuário específico
   */
  emitPermissionsUpdatedToUser(userId: string) {
    this.logger.log(`📤 Emitindo permissions-updated para usuário ${userId}`);
    
    // Encontrar o socket do usuário
    for (const [clientId, clientInfo] of this.connectedClients.entries()) {
      if (clientInfo.userId === userId) {
        clientInfo.socket.emit('permissions-updated', { 
          userId,
          timestamp: new Date().toISOString()
        });
        this.logger.log(`📤 Evento enviado para socket ${clientId}`);
      }
    }
  }
}
