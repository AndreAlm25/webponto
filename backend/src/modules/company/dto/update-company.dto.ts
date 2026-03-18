import { IsString, IsOptional, IsObject, ValidateNested, IsEnum } from 'class-validator'
import { Type } from 'class-transformer'
import { WorkRegime } from '@prisma/client'

class AddressDto {
  @IsOptional()
  @IsString()
  street?: string

  @IsOptional()
  @IsString()
  number?: string

  @IsOptional()
  @IsString()
  complement?: string

  @IsOptional()
  @IsString()
  neighborhood?: string

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsString()
  state?: string

  @IsOptional()
  @IsString()
  zipCode?: string

  @IsOptional()
  @IsString()
  country?: string
}

class ContactInfoDto {
  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  whatsapp?: string

  @IsOptional()
  @IsString()
  website?: string
}

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  legalName?: string

  @IsOptional()
  @IsString()
  tradeName?: string

  @IsOptional()
  @IsString()
  email?: string

  @IsOptional()
  @IsString()
  workingHoursStart?: string

  @IsOptional()
  @IsString()
  workingHoursEnd?: string

  @IsOptional()
  @IsEnum(WorkRegime)
  workRegime?: WorkRegime

  @IsOptional()
  @IsString()
  timezone?: string

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ContactInfoDto)
  contactInfo?: ContactInfoDto
}
