import { IsBoolean, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class UpdateDashboardConfigDto {
  @IsUUID()
  companyId: string;

  @IsOptional()
  @IsBoolean()
  dashboardShowRecentEntries?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  dashboardRecentEntriesLimit?: number;
}
