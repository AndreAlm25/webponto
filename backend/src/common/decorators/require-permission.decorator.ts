import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';

/**
 * Decorator para definir a permissão necessária para acessar uma rota
 * 
 * @example
 * @RequirePermission('employees.view')
 * @Get()
 * findAll() { ... }
 * 
 * @example
 * @RequirePermission('employees.create')
 * @Post()
 * create() { ... }
 */
export const RequirePermission = (permission: string) => 
  SetMetadata(PERMISSION_KEY, permission);
