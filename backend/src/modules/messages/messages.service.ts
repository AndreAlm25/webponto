import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../common/minio.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { MessageType, Role } from '@prisma/client';
import { MessagesGateway } from './messages.gateway';
import { extname } from 'path';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => MessagesGateway))
    private messagesGateway: MessagesGateway,
    private minioService: MinioService,
  ) {}

  // Buscar ou criar thread entre empresa e funcionário
  async getOrCreateThread(companyId: string, employeeId: string) {
    let thread = await this.prisma.messageThread.findUnique({
      where: {
        companyId_employeeId: {
          companyId,
          employeeId,
        },
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
            position: true,
          },
        },
      },
    });

    if (!thread) {
      thread = await this.prisma.messageThread.create({
        data: {
          companyId,
          employeeId,
          status: 'OPEN',
        },
        include: {
          employee: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                },
              },
              position: true,
            },
          },
        },
      });
    }

    return thread;
  }

  // Listar threads da empresa (para admin)
  async getCompanyThreads(companyId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, companyId: true },
    });

    if (!user || user.companyId !== companyId) {
      throw new ForbiddenException('Acesso negado');
    }

    const threads = await this.prisma.messageThread.findMany({
      where: { companyId },
      include: {
        employee: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
            position: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            createdAt: true,
            isRead: true,
            senderUserId: true,
            senderEmployeeId: true,
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                isRead: false,
                senderEmployeeId: { not: null }, // Apenas mensagens do funcionário não lidas
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return threads.map((thread) => ({
      id: thread.id,
      employeeId: thread.employeeId,
      employeeName: thread.employee.user?.name || 'Funcionário',
      employeePosition: thread.employee.position?.name || '',
      employeeAvatar: thread.employee.user?.avatarUrl || null,
      lastMessage: thread.messages[0] || null,
      unreadCount: thread._count.messages,
      status: thread.status,
      updatedAt: thread.updatedAt,
    }));
  }

  // Buscar mensagens de uma thread
  async getThreadMessages(
    threadId: string,
    userId: string,
    dto: GetMessagesDto,
  ) {
    // Buscar mensagens da thread

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

    if (!thread) {
      throw new NotFoundException('Conversa não encontrada');
    }

    // Thread encontrada

    // Verificar permissão
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, companyId: true, employeeId: true },
    });

    const isAdmin = user.role === Role.COMPANY_ADMIN && user.companyId === thread.companyId;
    const isEmployee = user.employeeId === thread.employeeId;

    // Verificar tipo de usuário

    if (!isAdmin && !isEmployee) {
      throw new ForbiddenException('Acesso negado');
    }

    // Buscar mensagens
    const page = dto.page || 1;
    const limit = dto.limit || 50;
    const skip = (page - 1) * limit;

    const where = { threadId };

    // Buscar mensagens paginadas

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        include: {
          senderUser: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          senderEmployee: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                },
              },
              position: {
                select: {
                  name: true,
                },
              },
            },
          },
          attachments: true,
        },
        orderBy: { createdAt: 'asc' }, // Ordenar da mais antiga para a mais recente
        skip,
        take: limit,
      }),
      this.prisma.message.count({ where }),
    ]);

    // Mensagens encontradas

    const result = {
      messages: messages, // Já vem ordenado da mais antiga para a mais recente
      total,
      page,
      limit,
      hasMore: skip + messages.length < total,
    };

    return result;
  }

  // Enviar mensagem
  async sendMessage(
    threadId: string,
    userId: string,
    dto: CreateMessageDto,
    file?: Express.Multer.File,
  ) {
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

    if (!thread) {
      throw new NotFoundException('Conversa não encontrada');
    }

    // Verificar permissão
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, companyId: true, employeeId: true },
    });

    const isAdmin = user.role === Role.COMPANY_ADMIN && user.companyId === thread.companyId;
    const isEmployee = user.employeeId === thread.employeeId;

    if (!isAdmin && !isEmployee) {
      throw new ForbiddenException('Acesso negado');
    }

    // Criar mensagem
    const message = await this.prisma.message.create({
      data: {
        threadId,
        companyId: thread.companyId,
        employeeId: thread.employeeId,
        senderUserId: isAdmin ? userId : null,
        senderEmployeeId: isEmployee ? user.employeeId : null,
        type: dto.type || MessageType.TEXT,
        content: dto.content || '', // String vazia se não houver conteúdo
        isRead: false,
      },
      include: {
        senderUser: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        senderEmployee: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
        attachments: true,
      },
    });

    // Upload de anexo se houver
    if (file) {
      const senderUserId = isAdmin ? userId : thread.employee.user.id;
      
      // Decodificar nome do arquivo corretamente (fix para acentos e caracteres especiais)
      // O Multer pode enviar o nome em latin1, então precisamos converter para UTF-8
      let originalFilename = file.originalname;
      try {
        // Tentar decodificar se vier em latin1
        originalFilename = Buffer.from(file.originalname, 'latin1').toString('utf8');
      } catch (error) {
        // Se falhar, manter o nome original
        console.warn('Não foi possível decodificar nome do arquivo:', error);
      }
      
      const ext = extname(originalFilename);
      const timestamp = Date.now();
      const filename = `${message.id}-${timestamp}${ext}`;
      
      // Path: {companyId}/messages/{userId}/{filename}
      const path = `${thread.companyId}/messages/${senderUserId}/${filename}`;
      
      // Upload para MinIO
      await this.minioService.upload(file.buffer, path, file.mimetype);
      
      // Criar registro de anexo com nome decodificado
      await this.prisma.messageAttachment.create({
        data: {
          messageId: message.id,
          url: path,
          filename: originalFilename,
          mimeType: file.mimetype,
          sizeBytes: file.size,
        },
      });
    }

    // Atualizar thread
    await this.prisma.messageThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    // Buscar mensagem completa com anexos
    const messageWithAttachments = await this.prisma.message.findUnique({
      where: { id: message.id },
      include: {
        senderUser: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        senderEmployee: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
            position: {
              select: {
                name: true,
              },
            },
          },
        },
        attachments: true,
      },
    });

    // Emitir evento WebSocket
    await this.messagesGateway.emitNewMessage(messageWithAttachments, threadId);

    return messageWithAttachments;
  }

  // Marcar mensagens como lidas
  async markAsRead(messageIds: string[], userId: string) {
    // Verificar permissão para cada mensagem
    const messages = await this.prisma.message.findMany({
      where: { id: { in: messageIds } },
      include: {
        thread: true,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, companyId: true, employeeId: true },
    });

    for (const message of messages) {
      const isAdmin = user.role === Role.COMPANY_ADMIN && user.companyId === message.companyId;
      const isEmployee = user.employeeId === message.employeeId;

      if (!isAdmin && !isEmployee) {
        throw new ForbiddenException('Acesso negado');
      }
    }

    await this.prisma.message.updateMany({
      where: { id: { in: messageIds } },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    // Emitir evento WebSocket
    await this.messagesGateway.emitMessageRead(messageIds, userId);

    return { success: true, count: messageIds.length };
  }

  // Contador de mensagens não lidas
  async getUnreadCount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, companyId: true, employeeId: true },
    });

    if (user.role === Role.COMPANY_ADMIN) {
      // Admin: contar mensagens não lidas dos funcionários
      const count = await this.prisma.message.count({
        where: {
          companyId: user.companyId,
          isRead: false,
          senderEmployeeId: { not: null }, // Apenas mensagens de funcionários
        },
      });
      return { unreadCount: count };
    } else {
      // Funcionário: contar mensagens não lidas do admin
      const count = await this.prisma.message.count({
        where: {
          employeeId: user.employeeId,
          isRead: false,
          senderUserId: { not: null }, // Apenas mensagens do admin
        },
      });
      return { unreadCount: count };
    }
  }

  // Criar ou buscar thread com funcionário (admin)
  async getOrCreateThreadByEmployeeId(employeeId: string, userId: string) {
    // Verificar se usuário é admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, companyId: true },
    });

    if (user.role !== Role.COMPANY_ADMIN) {
      throw new ForbiddenException('Apenas administradores podem criar threads');
    }

    // Verificar se funcionário existe e pertence à empresa
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        position: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Funcionário não encontrado');
    }

    if (employee.companyId !== user.companyId) {
      throw new ForbiddenException('Funcionário não pertence à sua empresa');
    }

    // Buscar ou criar thread
    const thread = await this.getOrCreateThread(user.companyId, employeeId);

    // Retornar thread com dados do funcionário
    return {
      ...thread,
      employee: {
        id: employee.id,
        name: employee.user?.name || 'Funcionário',
        position: employee.position?.name || '',
        avatarUrl: employee.user?.avatarUrl,
      },
    };
  }

  // Buscar thread do funcionário (para funcionário)
  async getEmployeeThread(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { employeeId: true, companyId: true },
    });

    if (!user.employeeId) {
      throw new NotFoundException('Funcionário não encontrado');
    }

    const thread = await this.getOrCreateThread(user.companyId, user.employeeId);
    return thread;
  }

  // Buscar estatísticas de mensagens da empresa
  async getMessageStats(companyId: string, userId: string) {
    // Verificar permissão
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, companyId: true },
    });

    if (!user || user.companyId !== companyId) {
      throw new ForbiddenException('Acesso negado');
    }

    // Contar total de mensagens
    const totalMessages = await this.prisma.message.count({
      where: { companyId },
    });

    // Contar mensagens não lidas (enviadas por funcionários)
    const unreadMessages = await this.prisma.message.count({
      where: {
        companyId,
        isRead: false,
        senderEmployeeId: { not: null },
      },
    });

    // Contar mensagens lidas
    const readMessages = await this.prisma.message.count({
      where: {
        companyId,
        isRead: true,
      },
    });

    return {
      totalMessages,
      unreadMessages,
      readMessages,
    };
  }
}
