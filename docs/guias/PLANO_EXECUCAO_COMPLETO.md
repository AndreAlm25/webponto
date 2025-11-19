# 🎯 PLANO DE EXECUÇÃO COMPLETO - WebPonto

**Objetivo:** Implementar o projeto **IGUALZINHO** ao que foi feito, com testes E2E após cada fase.

**Data de Início:** 20/10/2025  
**Metodologia:** Desenvolvimento incremental + Testes E2E

---

## 📋 Estrutura do Plano

Cada fase segue o ciclo:
1. **Implementação** → 2. **Testes E2E** → 3. **Validação Manual** → 4. **Próxima Fase**

---

## 🚀 FASE 1: Componente Facial + CompreFace ✅ CONCLUÍDA

### ✅ Implementação (Dias 1-6)
- [x] Docker Compose com CompreFace (5 serviços)
- [x] MinioService (upload S3)
- [x] ComprefaceService (reconhecimento ML)
- [x] PontosModule (4 endpoints REST)
- [x] Componentes faciais (5 componentes React)
- [x] Rota /ponto/facial
- [x] Dockerfiles de desenvolvimento (hot reload)

### 🧪 Testes E2E (Dia 7)
**Arquivo:** `backend/test/pontos.e2e-spec.ts`

#### Testes Implementados:
- [x] `GET /pontos/facial/status/:id` - Status do funcionário
- [x] `POST /pontos/facial/cadastro` - Cadastrar face
- [x] `GET /pontos/:funcionarioId` - Listar pontos
- [x] Fluxo completo de sequência de pontos

#### Como Executar:
```bash
cd /root/Apps/webponto/backend
npm run test:e2e
```

#### Testes Manuais (Frontend):
- [ ] Abrir http://localhost:3000/ponto/facial?admin=true
- [ ] Cadastrar face de um funcionário
- [ ] Reconhecer face e registrar ponto
- [ ] Verificar liveness detection funcionando
- [ ] Verificar foto no MinIO
- [ ] Verificar registro no PostgreSQL

---

## 🔐 FASE 2: Autenticação Completa (Dias 8-10)

### 📝 Implementação

#### Backend (3 dias)
**Dia 8: AuthModule**
- [ ] `src/modules/auth/auth.module.ts`
- [ ] `src/modules/auth/auth.controller.ts`
- [ ] `src/modules/auth/auth.service.ts`
- [ ] `src/modules/auth/strategies/jwt.strategy.ts`
- [ ] `src/modules/auth/strategies/local.strategy.ts`
- [ ] `src/modules/auth/guards/jwt-auth.guard.ts`
- [ ] `src/modules/auth/guards/roles.guard.ts`
- [ ] `src/modules/auth/decorators/current-user.decorator.ts`
- [ ] DTOs: LoginDto, RegisterDto, RefreshTokenDto

**Dia 9: UsersModule**
- [ ] `src/modules/users/users.module.ts`
- [ ] `src/modules/users/users.controller.ts`
- [ ] `src/modules/users/users.service.ts`
- [ ] CRUD completo de usuários
- [ ] Hash de senhas com bcrypt
- [ ] Gestão de dispositivos

**Dia 10: EmpresasModule**
- [ ] `src/modules/empresas/empresas.module.ts`
- [ ] `src/modules/empresas/empresas.controller.ts`
- [ ] `src/modules/empresas/empresas.service.ts`
- [ ] CRUD de empresas
- [ ] Seed de empresa inicial

#### Frontend (3 dias)
**Dia 8: Autenticação**
- [ ] `src/app/auth/login/page.tsx`
- [ ] `src/app/auth/register/page.tsx`
- [ ] `src/hooks/useAuth.ts`
- [ ] `src/contexts/AuthContext.tsx`
- [ ] Token storage (localStorage + httpOnly cookies)

**Dia 9: Proteção de Rotas**
- [ ] `src/middleware.ts` - Route guards
- [ ] `src/components/ProtectedRoute.tsx`
- [ ] Redirect para login se não autenticado

**Dia 10: Dashboard Layout**
- [ ] `src/app/dashboard/layout.tsx`
- [ ] `src/components/Sidebar.tsx`
- [ ] `src/components/Header.tsx`
- [ ] `src/components/UserMenu.tsx`

### 🧪 Testes E2E
**Arquivo:** `backend/test/auth.e2e-spec.ts`

```typescript
describe('AuthController (E2E)', () => {
  it('POST /auth/register - deve registrar novo usuário')
  it('POST /auth/login - deve fazer login')
  it('POST /auth/refresh - deve renovar token')
  it('GET /auth/profile - deve retornar perfil autenticado')
  it('POST /auth/logout - deve fazer logout')
})
```

#### Testes Manuais:
- [ ] Registrar novo usuário
- [ ] Fazer login
- [ ] Acessar rota protegida
- [ ] Renovar token expirado
- [ ] Fazer logout

---

## 💾 FASE 3: Offline + Sincronização (Dias 11-17)

### 📝 Implementação

#### Backend (4 dias)
**Dia 11: FuncionariosModule**
- [ ] `src/modules/funcionarios/funcionarios.module.ts`
- [ ] CRUD completo
- [ ] Upload de foto de perfil
- [ ] Cadastro de face via endpoint

**Dia 12: Sync Module**
- [ ] `src/modules/sync/sync.module.ts`
- [ ] `POST /sync/pontos` - Sincronizar pontos offline
- [ ] Validação de duplicidade
- [ ] Resolução de conflitos

**Dia 13: WebSocket Gateway**
- [ ] `src/gateways/pontos.gateway.ts`
- [ ] Evento `ponto:novo`
- [ ] Broadcast para empresa
- [ ] Rooms por empresaId

**Dia 14: BullMQ Jobs**
- [ ] `src/jobs/processar-foto.job.ts`
- [ ] `src/jobs/validar-reconhecimento.job.ts`
- [ ] Queue configuration

#### Frontend (3 dias)
**Dia 15: IndexedDB**
- [ ] `src/lib/db.ts` (Dexie)
- [ ] Schemas: pontos, funcionarios, cache
- [ ] CRUD local

**Dia 16: Service Worker + PWA**
- [ ] `public/sw.js`
- [ ] Background Sync API
- [ ] Cache de assets
- [ ] Manifest.json

**Dia 17: Hooks de Sincronização**
- [ ] `src/hooks/useOnlineStatus.ts`
- [ ] `src/hooks/useSyncPontos.ts`
- [ ] `src/components/SyncStatus.tsx`
- [ ] Socket.IO Client integrado

### 🧪 Testes E2E
**Arquivos:**
- `backend/test/funcionarios.e2e-spec.ts`
- `backend/test/sync.e2e-spec.ts`
- `backend/test/websocket.e2e-spec.ts`

```typescript
describe('Sync (E2E)', () => {
  it('POST /sync/pontos - deve sincronizar pontos offline')
  it('deve detectar e evitar duplicatas')
  it('deve resolver conflitos por timestamp')
})

describe('WebSocket (E2E)', () => {
  it('deve emitir evento ponto:novo')
  it('deve receber apenas eventos da própria empresa')
})
```

#### Testes Manuais:
- [ ] Desconectar internet
- [ ] Registrar ponto offline
- [ ] Verificar armazenamento no IndexedDB
- [ ] Reconectar internet
- [ ] Verificar sincronização automática
- [ ] Verificar WebSocket em tempo real

---

## 👨‍💼 FASE 4: RH e Folha CLT (Dias 18-24)

### 📝 Implementação

#### Backend (4 dias)
**Dia 18: Expandir Prisma Schema**
- [ ] Modelos: Ferias, Afastamentos, FolhaPagamento
- [ ] BankOfHoursLedger
- [ ] PayrollParams
- [ ] JornadaConfig
- [ ] Migration completa

**Dia 19: Regras CLT**
- [ ] `src/services/clt-rules.service.ts`
- [ ] Art. 58 §1º - Tolerância
- [ ] Art. 59 - Banco de horas
- [ ] Art. 66 - Interjornada
- [ ] Art. 67 - DSR
- [ ] Art. 71 - Intervalo intrajornada
- [ ] Art. 473 - Faltas justificadas

**Dia 20: JornadaService**
- [ ] `src/modules/jornada/jornada.service.ts`
- [ ] Validação de interjornada
- [ ] Cálculo de horas trabalhadas
- [ ] Detecção de atrasos/extras

**Dia 21: FolhaModule**
- [ ] `src/modules/folha/folha.module.ts`
- [ ] `src/modules/folha/banco-horas.service.ts`
- [ ] `src/modules/folha/folha-pagamento.service.ts`
- [ ] Cálculo de salário
- [ ] Cálculo de encargos (INSS, FGTS, RAT)
- [ ] Provisões (13º, férias + 1/3)
- [ ] Geração de holerite PDF

**Dia 22: Relatórios**
- [ ] `src/modules/relatorios/relatorios.module.ts`
- [ ] Espelho de ponto mensal
- [ ] Relatório de horas extras
- [ ] Relatório de custo por funcionário
- [ ] Calendário de faltas

#### Frontend (2 dias)
**Dia 23: Dashboard RH**
- [ ] `src/app/rh/funcionarios/page.tsx`
- [ ] `src/app/rh/ferias/page.tsx`
- [ ] `src/app/rh/folha/page.tsx`
- [ ] Componentes de tabelas

**Dia 24: Relatórios Interativos**
- [ ] `src/app/relatorios/page.tsx`
- [ ] Gráficos (Recharts)
- [ ] Exportação PDF/Excel
- [ ] Filtros avançados

### 🧪 Testes E2E
**Arquivos:**
- `backend/test/jornada.e2e-spec.ts`
- `backend/test/folha.e2e-spec.ts`
- `backend/test/relatorios.e2e-spec.ts`

```typescript
describe('Jornada CLT (E2E)', () => {
  it('deve aplicar tolerância de 5 min/marcação')
  it('deve calcular banco de horas corretamente')
  it('deve validar interjornada de 11h')
  it('deve detectar intervalo intrajornada inválido')
})

describe('Folha (E2E)', () => {
  it('deve calcular salário base + extras')
  it('deve calcular INSS, FGTS corretamente')
  it('deve gerar holerite PDF')
})
```

#### Testes Manuais:
- [ ] Cadastrar jornada de trabalho
- [ ] Registrar pontos fora do horário
- [ ] Verificar cálculo de horas extras
- [ ] Processar folha do mês
- [ ] Gerar e visualizar holerite
- [ ] Exportar relatórios

---

## 💰 FASE 5: Financeiro + Landing (Dias 25-30)

### 📝 Implementação

#### Backend (3 dias)
**Dia 25: FinanceiroModule**
- [ ] `src/modules/financeiro/financeiro.module.ts`
- [ ] Lançamentos (receitas/despesas)
- [ ] Fluxo de caixa
- [ ] Categorias

**Dia 26: PlanosModule**
- [ ] `src/modules/planos/planos.module.ts`
- [ ] CRUD de planos
- [ ] Stripe integration (opcional)

**Dia 27: AdminModule**
- [ ] `src/modules/admin/admin.module.ts`
- [ ] Gestão de empresas
- [ ] Métricas e analytics
- [ ] Dashboard admin

#### Frontend (3 dias)
**Dia 28: Landing Page**
- [ ] `src/app/page.tsx` (nova)
- [ ] Hero section
- [ ] Features section
- [ ] Pricing section
- [ ] Testimonials
- [ ] Footer

**Dia 29: Painel Financeiro**
- [ ] `src/app/financeiro/page.tsx`
- [ ] Dashboard financeiro
- [ ] Gráficos de receitas/despesas
- [ ] Lançamentos

**Dia 30: Admin SaaS**
- [ ] `src/app/admin/page.tsx`
- [ ] Gestão de empresas
- [ ] Métricas globais
- [ ] Logs de sistema

### 🧪 Testes E2E
**Arquivos:**
- `backend/test/financeiro.e2e-spec.ts`
- `backend/test/planos.e2e-spec.ts`
- `backend/test/admin.e2e-spec.ts`

#### Testes Manuais:
- [ ] Navegar landing page
- [ ] Registrar lançamento financeiro
- [ ] Visualizar fluxo de caixa
- [ ] Acessar painel admin
- [ ] Gerenciar empresas

---

## ✅ FASE 6: Testes Finais + Deploy (Dias 31-35)

### 📝 Implementação

**Dia 31-32: Testes E2E Completos**
- [ ] Rodar todos os testes: `npm run test:e2e`
- [ ] Cobertura mínima: 70%
- [ ] Corrigir bugs encontrados

**Dia 33: Testes Manuais Completos**
- [ ] Fluxo completo employee
- [ ] Fluxo completo admin
- [ ] Fluxo completo RH
- [ ] Testes de carga (opcional)

**Dia 34: Otimização**
- [ ] Lighthouse audit (score > 90)
- [ ] Bundle size optimization
- [ ] Database indexes
- [ ] Caching strategies

**Dia 35: Deploy**
- [ ] Build de produção
- [ ] Docker images
- [ ] Deploy na nuvem (opcional)
- [ ] Configurar domínio e SSL
- [ ] Monitoring e logs

---

## 🛠️ Comandos Úteis

### Desenvolvimento com Hot Reload
```bash
# Subir stack de desenvolvimento
docker-compose -f docker-compose.dev.yml up -d

# Ver logs
docker-compose -f docker-compose.dev.yml logs -f frontend
docker-compose -f docker-compose.dev.yml logs -f backend
```

### Testes E2E
```bash
# Backend
cd backend
npm run test:e2e

# Com coverage
npm run test:e2e -- --coverage

# Um arquivo específico
npm run test:e2e -- pontos.e2e-spec.ts

# Watch mode (roda ao salvar)
npm run test:e2e -- --watch
```

### Banco de Dados
```bash
cd backend
npm run prisma:migrate     # Rodar migrations
npm run prisma:studio      # Visualizar dados
npm run prisma:generate    # Gerar Prisma Client
```

---

## 📊 Checklist de Progresso

### Infraestrutura
- [x] Docker Compose development
- [x] Docker Compose production
- [x] Hot reload configurado
- [ ] CI/CD pipeline

### Backend
- [x] MinioService
- [x] ComprefaceService
- [x] PontosModule
- [ ] AuthModule
- [ ] UsersModule
- [ ] EmpresasModule
- [ ] FuncionariosModule
- [ ] SyncModule
- [ ] WebSocket Gateway
- [ ] JornadaService
- [ ] FolhaModule
- [ ] RelatoriosModule
- [ ] FinanceiroModule

### Frontend
- [x] Componentes faciais
- [x] Rota /ponto/facial
- [ ] Autenticação
- [ ] Dashboard
- [ ] RH pages
- [ ] Relatórios
- [ ] Financeiro
- [ ] Landing page
- [ ] Admin SaaS

### Testes
- [x] E2E setup
- [x] pontos.e2e-spec.ts
- [ ] auth.e2e-spec.ts
- [ ] funcionarios.e2e-spec.ts
- [ ] sync.e2e-spec.ts
- [ ] jornada.e2e-spec.ts
- [ ] folha.e2e-spec.ts
- [ ] relatorios.e2e-spec.ts

---

## 🎯 Próxima Ação Imediata

1. **Testar Fase 1** seguindo [COMO_TESTAR.md](./COMO_TESTAR.md)
2. **Rodar testes E2E:** `cd backend && npm run test:e2e`
3. **Validar hot reload:** Editar componente e ver atualização
4. **Iniciar Fase 2:** AuthModule

---

## 📞 Suporte

**Dúvidas sobre o plano?**
- Consulte este arquivo
- Veja PROGRESSO.md para status atual
- Leia documentação em /docs/

**Encontrou bug?**
- Rode testes E2E primeiro
- Verifique logs do Docker
- Consulte troubleshooting

---

**Última atualização:** 20/10/2025  
**Status:** Fase 1 concluída ✅ | Fase 2 pronta para iniciar 🚀
