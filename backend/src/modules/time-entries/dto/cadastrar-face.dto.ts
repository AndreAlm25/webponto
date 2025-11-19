import { IsUUID } from 'class-validator';

export class CadastrarFaceDto {
  @IsUUID('4', { message: 'employeeId deve ser um UUID válido' })
  employeeId: string;
}
