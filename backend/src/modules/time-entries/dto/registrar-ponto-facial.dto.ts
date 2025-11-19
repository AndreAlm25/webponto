import { IsOptional, IsNumber, IsString, IsISO8601, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { TimeEntryType } from '@prisma/client';

export class RegistrarPontoFacialDto {
  @IsOptional()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  dispositivoId?: string;

  @IsOptional()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @IsNumber()
  accuracy?: number;

  @IsOptional()
  @IsISO8601()
  clientCapturedAt?: string;

  @IsOptional()
  @IsString()
  geoMethod?: string;

  @IsOptional()
  @IsString()
  source?: string;

  // Liveness (prova de vida)
  @IsOptional()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @IsNumber()
  livenessScore?: number;

  @IsOptional()
  @Transform(({ value }) => {
    // Converter string 'true'/'false' para boolean
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  @IsBoolean()
  livenessValid?: boolean;

  // Tipo de ponto (decidido pelo frontend)
  @IsOptional()
  @IsEnum(TimeEntryType)
  type?: TimeEntryType;
}
