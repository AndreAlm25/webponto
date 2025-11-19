import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { MarkReadDto } from './dto/mark-read.dto';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // Listar threads da empresa (admin)
  @Get('threads')
  async getThreads(@Request() req) {
    const userId = req.user.id;
    const companyId = req.user.companyId;
    return this.messagesService.getCompanyThreads(companyId, userId);
  }

  // Buscar thread do funcionário (funcionário)
  @Get('my-thread')
  async getMyThread(@Request() req) {
    const userId = req.user.id;
    return this.messagesService.getEmployeeThread(userId);
  }

  // Buscar mensagens de uma thread
  @Get('threads/:threadId/messages')
  async getMessages(
    @Param('threadId') threadId: string,
    @Request() req,
    @Query() dto: GetMessagesDto,
  ) {
    const userId = req.user.id;
    return this.messagesService.getThreadMessages(threadId, userId, dto);
  }

  // Enviar mensagem
  @Post('threads/:threadId/messages')
  @UseInterceptors(FileInterceptor('attachment'))
  async sendMessage(
    @Param('threadId') threadId: string,
    @Request() req,
    @Body() dto: CreateMessageDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const userId = req.user.id;
    
    // Validar tipo de arquivo se houver anexo
    if (file) {
      const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException('Apenas arquivos PDF, JPG e PNG são permitidos');
      }
      
      // Validar tamanho (máximo 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new BadRequestException('Arquivo muito grande. Tamanho máximo: 10MB');
      }
    }
    
    return this.messagesService.sendMessage(threadId, userId, dto, file);
  }

  // Marcar mensagens como lidas
  @Patch('mark-read')
  async markAsRead(@Request() req, @Body() dto: MarkReadDto) {
    const userId = req.user.id;
    return this.messagesService.markAsRead(dto.messageIds, userId);
  }

  // Contador de mensagens não lidas
  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const userId = req.user.id;
    return this.messagesService.getUnreadCount(userId);
  }

  // Criar ou buscar thread com funcionário (admin)
  @Post('threads/employee/:employeeId')
  async getOrCreateThreadWithEmployee(
    @Param('employeeId') employeeId: string,
    @Request() req,
  ) {
    const userId = req.user.id;
    return this.messagesService.getOrCreateThreadByEmployeeId(employeeId, userId);
  }

  // Estatísticas de mensagens (admin)
  @Get('stats')
  async getStats(@Request() req) {
    const userId = req.user.id;
    const companyId = req.user.companyId;
    return this.messagesService.getMessageStats(companyId, userId);
  }
}
