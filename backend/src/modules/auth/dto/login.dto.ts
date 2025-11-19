import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @IsOptional()
  @IsString({ message: 'Senha deve ser uma string' })
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  senha?: string;

  @IsOptional()
  @IsString({ message: 'Password deve ser uma string' })
  @IsNotEmpty({ message: 'Password é obrigatório' })
  password?: string;
}
