import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// LISTA DE TODAS AS PERMISSÕES DO SISTEMA
// ============================================

interface PermissionDef {
  module: string;
  action: string;
  key: string;
  description: string;
}

const PERMISSIONS: PermissionDef[] = [
  // DASHBOARD (1)
  { module: 'dashboard', action: 'view', key: 'dashboard.view', description: 'Visualizar dashboard' },

  // FUNCIONÁRIOS (6)
  { module: 'employees', action: 'view', key: 'employees.view', description: 'Visualizar funcionários' },
  { module: 'employees', action: 'create', key: 'employees.create', description: 'Criar funcionários' },
  { module: 'employees', action: 'edit', key: 'employees.edit', description: 'Editar funcionários' },
  { module: 'employees', action: 'delete', key: 'employees.delete', description: 'Excluir funcionários' },
  { module: 'employees', action: 'export', key: 'employees.export', description: 'Exportar lista de funcionários' },
  { module: 'employees', action: 'manage_face', key: 'employees.manage_face', description: 'Gerenciar reconhecimento facial' },

  // REGISTROS DE PONTO (5)
  { module: 'time_entries', action: 'view', key: 'time_entries.view', description: 'Visualizar registros de ponto' },
  { module: 'time_entries', action: 'create', key: 'time_entries.create', description: 'Registrar ponto manual' },
  { module: 'time_entries', action: 'edit', key: 'time_entries.edit', description: 'Editar registros de ponto' },
  { module: 'time_entries', action: 'delete', key: 'time_entries.delete', description: 'Excluir registros de ponto' },
  { module: 'time_entries', action: 'export', key: 'time_entries.export', description: 'Exportar relatórios de ponto' },

  // HORA EXTRA (4)
  { module: 'overtime', action: 'view', key: 'overtime.view', description: 'Visualizar horas extras' },
  { module: 'overtime', action: 'approve', key: 'overtime.approve', description: 'Aprovar horas extras' },
  { module: 'overtime', action: 'reject', key: 'overtime.reject', description: 'Rejeitar horas extras' },
  { module: 'overtime', action: 'export', key: 'overtime.export', description: 'Exportar relatórios de hora extra' },

  // FOLHA DE PAGAMENTO (7)
  { module: 'payroll', action: 'view', key: 'payroll.view', description: 'Visualizar folha de pagamento' },
  { module: 'payroll', action: 'create', key: 'payroll.create', description: 'Criar folha de pagamento' },
  { module: 'payroll', action: 'edit', key: 'payroll.edit', description: 'Editar holerites' },
  { module: 'payroll', action: 'approve', key: 'payroll.approve', description: 'Aprovar folha de pagamento' },
  { module: 'payroll', action: 'pay', key: 'payroll.pay', description: 'Marcar folha como paga' },
  { module: 'payroll', action: 'generate', key: 'payroll.generate', description: 'Gerar holerites' },
  { module: 'payroll', action: 'export', key: 'payroll.export', description: 'Exportar folha de pagamento' },

  // ADIANTAMENTOS/VALES (5)
  { module: 'advances', action: 'view', key: 'advances.view', description: 'Visualizar adiantamentos' },
  { module: 'advances', action: 'create', key: 'advances.create', description: 'Criar solicitação de adiantamento' },
  { module: 'advances', action: 'approve', key: 'advances.approve', description: 'Aprovar adiantamentos' },
  { module: 'advances', action: 'reject', key: 'advances.reject', description: 'Rejeitar adiantamentos' },
  { module: 'advances', action: 'delete', key: 'advances.delete', description: 'Cancelar adiantamentos' },

  // DEPARTAMENTOS (4)
  { module: 'departments', action: 'view', key: 'departments.view', description: 'Visualizar departamentos' },
  { module: 'departments', action: 'create', key: 'departments.create', description: 'Criar departamentos' },
  { module: 'departments', action: 'edit', key: 'departments.edit', description: 'Editar departamentos' },
  { module: 'departments', action: 'delete', key: 'departments.delete', description: 'Excluir departamentos' },

  // CARGOS (4)
  { module: 'positions', action: 'view', key: 'positions.view', description: 'Visualizar cargos' },
  { module: 'positions', action: 'create', key: 'positions.create', description: 'Criar cargos' },
  { module: 'positions', action: 'edit', key: 'positions.edit', description: 'Editar cargos' },
  { module: 'positions', action: 'delete', key: 'positions.delete', description: 'Excluir cargos' },

  // CERCAS GEOGRÁFICAS (4)
  { module: 'geofences', action: 'view', key: 'geofences.view', description: 'Visualizar cercas geográficas' },
  { module: 'geofences', action: 'create', key: 'geofences.create', description: 'Criar cercas geográficas' },
  { module: 'geofences', action: 'edit', key: 'geofences.edit', description: 'Editar cercas geográficas' },
  { module: 'geofences', action: 'delete', key: 'geofences.delete', description: 'Excluir cercas geográficas' },

  // MENSAGENS (2)
  { module: 'messages', action: 'view', key: 'messages.view', description: 'Visualizar mensagens' },
  { module: 'messages', action: 'create', key: 'messages.create', description: 'Enviar mensagens' },

  // ALERTAS (1)
  { module: 'alerts', action: 'view', key: 'alerts.view', description: 'Visualizar alertas' },

  // CONFORMIDADE CLT (3)
  { module: 'compliance', action: 'view', key: 'compliance.view', description: 'Visualizar conformidade CLT' },
  { module: 'compliance', action: 'edit', key: 'compliance.edit', description: 'Editar configurações de conformidade' },
  { module: 'compliance', action: 'export', key: 'compliance.export', description: 'Exportar relatórios de conformidade' },

  // CONFIGURAÇÕES (2)
  { module: 'settings', action: 'view', key: 'settings.view', description: 'Visualizar configurações' },
  { module: 'settings', action: 'edit', key: 'settings.edit', description: 'Editar configurações' },

  // PERMISSÕES (2)
  { module: 'permissions', action: 'view', key: 'permissions.view', description: 'Visualizar permissões' },
  { module: 'permissions', action: 'edit', key: 'permissions.edit', description: 'Editar permissões' },

  // LOGS DE AUDITORIA (2)
  { module: 'audit', action: 'view', key: 'audit.view', description: 'Visualizar logs de auditoria' },
  { module: 'audit', action: 'export', key: 'audit.export', description: 'Exportar logs de auditoria' },

  // TERMINAL DE PONTO (2)
  { module: 'terminal', action: 'view', key: 'terminal.view', description: 'Visualizar terminal de ponto' },
  { module: 'terminal', action: 'clock_in', key: 'terminal.clock_in', description: 'Bater ponto pelo terminal' },
];

// ============================================
// MATRIZ DE PERMISSÕES PADRÃO POR ROLE
// ============================================

// Permissões que cada role tem por padrão (configurável pelo admin)
const DEFAULT_PERMISSIONS: Record<Role, string[]> = {
  // SUPER_ADMIN e COMPANY_ADMIN: Todas as permissões (bypass no código)
  SUPER_ADMIN: [], // Não precisa - bypass no guard
  COMPANY_ADMIN: [], // Não precisa - bypass no guard

  // MANAGER: Gerente
  MANAGER: [
    'dashboard.view',
    'employees.view',
    'time_entries.view',
    'time_entries.create',
    'time_entries.export',
    'overtime.view',
    'overtime.approve',
    'overtime.reject',
    'departments.view',
    'positions.view',
    'geofences.view',
    'messages.view',
    'messages.create',
    'alerts.view',
    'compliance.view',
    'terminal.view',
    'terminal.clock_in',
  ],

  // HR: Recursos Humanos
  HR: [
    'dashboard.view',
    'employees.view',
    'employees.create',
    'employees.edit',
    'employees.export',
    'employees.manage_face',
    'time_entries.view',
    'time_entries.create',
    'time_entries.edit',
    'time_entries.export',
    'overtime.view',
    'overtime.approve',
    'overtime.reject',
    'overtime.export',
    'payroll.view',
    'payroll.export',
    'advances.view',
    'advances.create',
    'departments.view',
    'departments.create',
    'departments.edit',
    'positions.view',
    'positions.create',
    'positions.edit',
    'geofences.view',
    'messages.view',
    'messages.create',
    'alerts.view',
    'compliance.view',
    'compliance.export',
    'terminal.view',
    'terminal.clock_in',
  ],

  // FINANCIAL: Financeiro
  FINANCIAL: [
    'dashboard.view',
    'payroll.view',
    'payroll.create',
    'payroll.edit',
    'payroll.approve',
    'payroll.pay',
    'payroll.generate',
    'payroll.export',
    'advances.view',
    'advances.approve',
    'advances.reject',
    'advances.delete',
  ],

  // EMPLOYEE: Funcionário (não acessa admin, apenas painel pessoal)
  EMPLOYEE: [],
};

// ============================================
// FUNÇÃO DE SEED
// ============================================

export async function seedPermissions() {
  console.log('🔐 Iniciando seed de permissões...');

  // 1. Criar todas as permissões
  console.log(`📝 Criando ${PERMISSIONS.length} permissões...`);
  
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: {
        module: perm.module,
        action: perm.action,
        description: perm.description,
      },
      create: {
        module: perm.module,
        action: perm.action,
        key: perm.key,
        description: perm.description,
      },
    });
  }

  console.log('✅ Permissões criadas!');

  // 2. Criar permissões padrão para cada empresa existente
  const companies = await prisma.company.findMany({ select: { id: true, tradeName: true } });
  console.log(`🏢 Configurando permissões para ${companies.length} empresas...`);

  for (const company of companies) {
    await seedCompanyPermissions(company.id);
    console.log(`  ✅ ${company.tradeName}`);
  }

  console.log('🎉 Seed de permissões concluído!');
}

// Função para criar permissões padrão de uma empresa
export async function seedCompanyPermissions(companyId: string) {
  const permissions = await prisma.permission.findMany();
  const permissionMap = new Map(permissions.map(p => [p.key, p.id]));

  // Para cada role configurável (MANAGER, HR, FINANCIAL)
  const configurableRoles: Role[] = [Role.MANAGER, Role.HR, Role.FINANCIAL];

  for (const role of configurableRoles) {
    const defaultPerms = DEFAULT_PERMISSIONS[role];

    for (const perm of permissions) {
      const granted = defaultPerms.includes(perm.key);

      await prisma.rolePermission.upsert({
        where: {
          companyId_role_permissionId: {
            companyId,
            role,
            permissionId: perm.id,
          },
        },
        update: { granted },
        create: {
          companyId,
          role,
          permissionId: perm.id,
          granted,
        },
      });
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  seedPermissions()
    .then(() => {
      console.log('✅ Seed executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro no seed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
