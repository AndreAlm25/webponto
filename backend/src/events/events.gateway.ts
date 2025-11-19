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
    @MessageBody() data: { companyId: string; userId?: string },
  ) {
    const { companyId, userId } = data;
    this.logger.log(`👥 Cliente ${client.id} entrou na empresa: ${companyId}`);
    
    // Atualizar informações do cliente
    this.connectedClients.set(client.id, { socket: client, companyId, userId });
    
    // Entrar na sala da empresa
    client.join(`company:${companyId}`);
    
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
    this.logger.log(`📤 Emitindo time-entry-created para empresa ${companyId}`);
    this.server.to(`company:${companyId}`).emit('time-entry-created', timeEntry);
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
}
