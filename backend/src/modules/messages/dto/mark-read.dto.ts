import { IsArray, IsUUID } from 'class-validator';

// DTO para marcar mensagens como lidas
export class MarkReadDto {
  @IsArray()
  @IsUUID('4', { each: true })
  messageIds: string[];
}
