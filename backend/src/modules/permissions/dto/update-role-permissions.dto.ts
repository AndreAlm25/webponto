import { IsString, IsArray, IsBoolean, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '@prisma/client';

export class PermissionUpdateItem {
  @IsString()
  permissionKey: string;

  @IsBoolean()
  granted: boolean;
}

export class UpdateRolePermissionsDto {
  @IsEnum(Role)
  role: Role;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionUpdateItem)
  permissions: PermissionUpdateItem[];
}
