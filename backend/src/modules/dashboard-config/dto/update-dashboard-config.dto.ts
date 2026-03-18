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

  @IsOptional()
  @IsBoolean()
  dashboardShowTotalEmployees?: boolean;

  @IsOptional()
  @IsBoolean()
  dashboardShowTodayEntries?: boolean;

  @IsOptional()
  @IsBoolean()
  dashboardShowFacialRecognition?: boolean;

  @IsOptional()
  @IsBoolean()
  dashboardShowRemoteClock?: boolean;

  @IsOptional()
  @IsBoolean()
  dashboardShowOvertime?: boolean;

  @IsOptional()
  @IsBoolean()
  dashboardShowAlerts?: boolean;
}
