'use client'

// Re-export do hook do contexto para facilitar importação
export { usePermissions, Can } from '../contexts/PermissionContext'
export type { PermissionContextType } from '../contexts/PermissionContext'

// Constantes de permissões para uso no código
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',

  // Funcionários
  EMPLOYEES_VIEW: 'employees.view',
  EMPLOYEES_CREATE: 'employees.create',
  EMPLOYEES_EDIT: 'employees.edit',
  EMPLOYEES_DELETE: 'employees.delete',
  EMPLOYEES_EXPORT: 'employees.export',
  EMPLOYEES_MANAGE_FACE: 'employees.manage_face',

  // Registros de Ponto
  TIME_ENTRIES_VIEW: 'time_entries.view',
  TIME_ENTRIES_CREATE: 'time_entries.create',
  TIME_ENTRIES_EDIT: 'time_entries.edit',
  TIME_ENTRIES_DELETE: 'time_entries.delete',
  TIME_ENTRIES_EXPORT: 'time_entries.export',

  // Hora Extra
  OVERTIME_VIEW: 'overtime.view',
  OVERTIME_APPROVE: 'overtime.approve',
  OVERTIME_REJECT: 'overtime.reject',
  OVERTIME_EXPORT: 'overtime.export',

  // Folha de Pagamento
  PAYROLL_VIEW: 'payroll.view',
  PAYROLL_CREATE: 'payroll.create',
  PAYROLL_EDIT: 'payroll.edit',
  PAYROLL_APPROVE: 'payroll.approve',
  PAYROLL_PAY: 'payroll.pay',
  PAYROLL_GENERATE: 'payroll.generate',
  PAYROLL_EXPORT: 'payroll.export',

  // Adiantamentos
  ADVANCES_VIEW: 'advances.view',
  ADVANCES_CREATE: 'advances.create',
  ADVANCES_APPROVE: 'advances.approve',
  ADVANCES_REJECT: 'advances.reject',
  ADVANCES_DELETE: 'advances.delete',

  // Departamentos
  DEPARTMENTS_VIEW: 'departments.view',
  DEPARTMENTS_CREATE: 'departments.create',
  DEPARTMENTS_EDIT: 'departments.edit',
  DEPARTMENTS_DELETE: 'departments.delete',

  // Cargos
  POSITIONS_VIEW: 'positions.view',
  POSITIONS_CREATE: 'positions.create',
  POSITIONS_EDIT: 'positions.edit',
  POSITIONS_DELETE: 'positions.delete',

  // Cercas Geográficas
  GEOFENCES_VIEW: 'geofences.view',
  GEOFENCES_CREATE: 'geofences.create',
  GEOFENCES_EDIT: 'geofences.edit',
  GEOFENCES_DELETE: 'geofences.delete',

  // Mensagens
  MESSAGES_VIEW: 'messages.view',
  MESSAGES_CREATE: 'messages.create',

  // Alertas
  ALERTS_VIEW: 'alerts.view',

  // Conformidade
  COMPLIANCE_VIEW: 'compliance.view',
  COMPLIANCE_EDIT: 'compliance.edit',
  COMPLIANCE_EXPORT: 'compliance.export',

  // Configurações
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',

  // Permissões
  PERMISSIONS_VIEW: 'permissions.view',
  PERMISSIONS_EDIT: 'permissions.edit',

  // Auditoria
  AUDIT_VIEW: 'audit.view',
  AUDIT_EXPORT: 'audit.export',

  // Terminal
  TERMINAL_VIEW: 'terminal.view',
  TERMINAL_CLOCK_IN: 'terminal.clock_in',
} as const

// Tipo para as permissões
export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS]

// Mapeamento de módulos do sidebar para permissões
export const SIDEBAR_PERMISSIONS: Record<string, string[]> = {
  dashboard: [PERMISSIONS.DASHBOARD_VIEW],
  funcionarios: [PERMISSIONS.EMPLOYEES_VIEW],
  registros: [PERMISSIONS.TIME_ENTRIES_VIEW],
  'hora-extra': [PERMISSIONS.OVERTIME_VIEW],
  cargos: [PERMISSIONS.POSITIONS_VIEW],
  departamentos: [PERMISSIONS.DEPARTMENTS_VIEW],
  'folha-pagamento': [PERMISSIONS.PAYROLL_VIEW],
  vales: [PERMISSIONS.ADVANCES_VIEW],
  terminal: [PERMISSIONS.TERMINAL_VIEW],
  geofences: [PERMISSIONS.GEOFENCES_VIEW],
  alertas: [PERMISSIONS.ALERTS_VIEW],
  conformidade: [PERMISSIONS.COMPLIANCE_VIEW],
  configuracoes: [PERMISSIONS.SETTINGS_VIEW],
  permissoes: [PERMISSIONS.PERMISSIONS_VIEW],
  auditoria: [PERMISSIONS.AUDIT_VIEW],
}
