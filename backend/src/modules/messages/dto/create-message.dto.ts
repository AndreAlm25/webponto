import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { MessageType } from '@prisma/client';

// DTO para criar uma nova mensagem
export class CreateMessageDto {
  @IsString()
  @IsOptional() // Opcional quando há anexo
  content?: string;

  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType = MessageType.TEXT;
}
