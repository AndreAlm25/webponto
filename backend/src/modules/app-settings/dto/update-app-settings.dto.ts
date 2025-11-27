import { IsInt, Min, Max, IsOptional } from 'class-validator';

export class UpdateAppSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(60)
  successMessageDuration?: number;
}
