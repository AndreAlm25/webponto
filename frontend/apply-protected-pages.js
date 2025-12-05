const fs = require('fs');
const path = require('path');

// Mapeamento de páginas para permissões
const PAGE_PERMISSIONS = {
  '/admin/[company]/funcionarios/page.tsx': 'PERMISSIONS.EMPLOYEES_VIEW',
  '/admin/[company]/folha-pagamento/page.tsx': 'PERMISSIONS.PAYROLL_VIEW',
  '/admin/[company]/analises/registros/page.tsx': 'PERMISSIONS.TIME_ENTRIES_VIEW',
  '/admin/[company]/analises/hora-extra/page.tsx': 'PERMISSIONS.OVERTIME_VIEW',
  '/admin/[company]/analises/conformidade-clt/page.tsx': 'PERMISSIONS.COMPLIANCE_VIEW',
  '/admin/[company]/cercas-geograficas/page.tsx': 'PERMISSIONS.GEOFENCES_VIEW',
  '/admin/[company]/terminal-de-ponto/page.tsx': 'PERMISSIONS.TERMINAL_VIEW',
  '/admin/[company]/alertas/page.tsx': 'PERMISSIONS.ALERTS_VIEW',
  '/admin/[company]/mensagens/page.tsx': 'PERMISSIONS.MESSAGES_VIEW',
  '/admin/[company]/configuracoes/dashboard/page.tsx': 'PERMISSIONS.SETTINGS_VIEW',
  '/admin/[company]/configuracoes/aplicativo/page.tsx': 'PERMISSIONS.SETTINGS_VIEW',
  '/admin/[company]/configuracoes/conformidade/page.tsx': 'PERMISSIONS.SETTINGS_VIEW',
  '/admin/[company]/configuracoes/folha-pagamento/page.tsx': 'PERMISSIONS.SETTINGS_VIEW',
  '/admin/[company]/configuracoes/permissoes/page.tsx': 'PERMISSIONS.PERMISSIONS_VIEW',
  '/admin/[company]/auditoria/page.tsx': 'PERMISSIONS.AUDIT_VIEW',
};

const basePath = '/root/Apps/webponto/frontend/src/app';

function addProtectedPageToFile(filePath, permission) {
  const fullPath = path.join(basePath, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ Arquivo não encontrado: ${fullPath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Verificar se já tem ProtectedPage
  if (content.includes('ProtectedPage')) {
    console.log(`⏭️  Já protegido: ${filePath}`);
    return;
  }

  // 1. Adicionar import do ProtectedPage
  if (!content.includes("import { ProtectedPage }")) {
    // Encontrar a última linha de import
    const importLines = content.split('\n').filter(line => line.trim().startsWith('import'));
    const lastImportIndex = content.lastIndexOf(importLines[importLines.length - 1]);
    const insertPosition = content.indexOf('\n', lastImportIndex) + 1;
    
    content = content.slice(0, insertPosition) +
      "import { ProtectedPage } from '@/components/auth/ProtectedPage'\n" +
      content.slice(insertPosition);
  }

  // 2. Adicionar import do PERMISSIONS se não tiver
  if (!content.includes('PERMISSIONS') && !content.includes('usePermissions')) {
    const importLines = content.split('\n').filter(line => line.trim().startsWith('import'));
    const lastImportIndex = content.lastIndexOf(importLines[importLines.length - 1]);
    const insertPosition = content.indexOf('\n', lastImportIndex) + 1;
    
    content = content.slice(0, insertPosition) +
      "import { PERMISSIONS } from '@/hooks/usePermissions'\n" +
      content.slice(insertPosition);
  }

  // 3. Envolver o return com ProtectedPage
  // Encontrar o primeiro return ( da função principal
  const functionMatch = content.match(/export default function \w+\([^)]*\) \{/);
  if (!functionMatch) {
    console.log(`❌ Função principal não encontrada: ${filePath}`);
    return;
  }

  const functionStart = functionMatch.index + functionMatch[0].length;
  const returnMatch = content.slice(functionStart).match(/\n\s*return \(/);
  
  if (!returnMatch) {
    console.log(`❌ Return não encontrado: ${filePath}`);
    return;
  }

  const returnIndex = functionStart + returnMatch.index + returnMatch[0].length;
  
  // Inserir <ProtectedPage> após o return (
  content = content.slice(0, returnIndex) +
    `\n    <ProtectedPage permission={${permission}}>` +
    content.slice(returnIndex);

  // 4. Fechar o ProtectedPage antes do último )
  // Encontrar o último ) antes do final da função
  const lastReturnClose = content.lastIndexOf('\n  )\n}');
  if (lastReturnClose > -1) {
    content = content.slice(0, lastReturnClose) +
      '\n    </ProtectedPage>' +
      content.slice(lastReturnClose);
  }

  // Salvar o arquivo
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✅ Protegido: ${filePath} com ${permission}`);
}

// Aplicar em todos os arquivos
console.log('🔒 Aplicando ProtectedPage em todas as páginas...\n');

Object.entries(PAGE_PERMISSIONS).forEach(([filePath, permission]) => {
  addProtectedPageToFile(filePath, permission);
});

console.log('\n✅ Processo concluído!');
