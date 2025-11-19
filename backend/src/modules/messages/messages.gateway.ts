import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      // Armazenar socket do usuário
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(client.id);

      // Adicionar userId ao socket para uso posterior
      (client as any).userId = userId;

      // Cliente conectado ao gateway de mensagens
    } catch (error) {
      console.error('[MessagesGateway] Erro na autenticação:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).userId;
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(client.id);
      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);
      }
    }
    // Cliente desconectado
  }

  // Emitir nova mensagem para destinatário
  async emitNewMessage(message: any, threadId: string) {
    try {
      const thread = await this.prisma.messageThread.findUnique({
        where: { id: threadId },
        include: {
          employee: {
            include: {
              user: {
                select: { id: true },
              },
            },
          },
        },
      });

      if (!thread) return;

      // Determinar destinatário
      let recipientUserId: string;
      
      if (message.senderUserId) {
        // Mensagem do admin -> enviar para funcionário
        recipientUserId = thread.employee.user?.id;
      } else if (message.senderEmployeeId) {
        // Mensagem do funcionário -> enviar para admins da empresa
        const admins = await this.prisma.user.findMany({
          where: {
            companyId: thread.companyId,
            role: 'COMPANY_ADMIN',
          },
          select: { id: true },
        });

        // Emitir para todos os admins
        for (const admin of admins) {
          this.emitToUser(admin.id, 'message-received', {
            message,
            threadId,
            employeeId: thread.employeeId,
          });
        }
        return;
      }

      // Emitir para destinatário
      if (recipientUserId) {
        this.emitToUser(recipientUserId, 'message-received', {
          message,
          threadId,
        });
      }
    } catch (error) {
      console.error('[MessagesGateway] Erro ao emitir mensagem:', error);
    }
  }

  // Emitir mensagem lida
  async emitMessageRead(messageIds: string[], userId: string) {
    try {
      const messages = await this.prisma.message.findMany({
        where: { id: { in: messageIds } },
        include: {
          thread: true,
        },
      });

      for (const message of messages) {
        // Notificar remetente que mensagem foi lida
        let senderUserId: string;
        
        if (message.senderUserId) {
          senderUserId = message.senderUserId;
        } else if (message.senderEmployeeId) {
          const employee = await this.prisma.employee.findUnique({
            where: { id: message.senderEmployeeId },
            include: {
              user: {
                select: { id: true },
              },
            },
          });
          senderUserId = employee?.user?.id;
        }

        const eventData = {
          messageIds,
          threadId: message.threadId,
        };

        // Notificar remetente (para atualizar check marks)
        if (senderUserId) {
          this.emitToUser(senderUserId, 'message-read', eventData);
        }

        // Notificar quem leu (para atualizar dropdown/dashboard)
        this.emitToUser(userId, 'message-read', eventData);
      }
    } catch (error) {
      console.error('[MessagesGateway] Erro ao emitir leitura:', error);
    }
  }

  // Método auxiliar para emitir para usuário específico
  private emitToUser(userId: string, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit(event, data);
      });
    }
  }
}
