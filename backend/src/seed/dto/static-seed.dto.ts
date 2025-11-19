import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class StaticSeedDto {
  @IsString()
  @IsNotEmpty()
  staticDir: string

  @IsOptional()
  @IsBoolean()
  reset?: boolean

  @IsOptional()
  @IsBoolean()
  wipeStorage?: boolean
}
