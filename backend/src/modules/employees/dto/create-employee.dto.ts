import { IsString, IsEmail, IsOptional, IsNumber, IsBoolean, IsDateString } from 'class-validator'

export class CreateEmployeeDto {
  // Dados do User
  @IsString()
  name: string

  @IsEmail()
  email: string

  @IsString()
  password: string

  @IsOptional()
  @IsString()
  cpf?: string

  @IsOptional()
  @IsString()
  phone?: string

  // Dados do Employee
  @IsString()
  registrationId: string

  @IsDateString()
  hireDate: string

  @IsNumber()
  baseSalary: number

  @IsOptional()
  @IsString()
  positionId?: string

  @IsOptional()
  @IsString()
  departmentId?: string

  @IsOptional()
  @IsString()
  geofenceId?: string

  // Horários de trabalho
  @IsString()
  workStartTime: string

  @IsString()
  workEndTime: string

  @IsOptional()
  @IsString()
  breakStartTime?: string

  @IsOptional()
  @IsString()
  breakEndTime?: string

  // Permissões
  @IsOptional()
  @IsBoolean()
  allowRemoteClockIn?: boolean

  @IsOptional()
  @IsBoolean()
  allowFacialRecognition?: boolean

  @IsOptional()
  @IsBoolean()
  requireLiveness?: boolean

  @IsString()
  companyId: string
}
