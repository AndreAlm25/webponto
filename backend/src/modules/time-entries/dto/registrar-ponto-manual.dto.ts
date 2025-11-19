import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, IsISO8601 } from 'class-validator'
import { TimeEntryType } from '@prisma/client'

export class RegistrarPontoManualDto {
  @IsUUID('4')
  employeeId: string

  @IsEnum(TimeEntryType)
  type: TimeEntryType

  @IsOptional()
  @IsNumber()
  latitude?: number

  @IsOptional()
  @IsNumber()
  longitude?: number

  @IsOptional()
  @IsNumber()
  accuracy?: number

  @IsOptional()
  @IsISO8601()
  clientCapturedAt?: string

  @IsOptional()
  @IsString()
  geoMethod?: string

  @IsOptional()
  @IsString()
  source?: string

  @IsOptional()
  @IsString()
  notes?: string
}
