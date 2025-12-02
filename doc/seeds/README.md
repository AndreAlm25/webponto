# 🌱 Sistema de Seeds - WebPonto

Este documento descreve o sistema de seeds para geração de dados de teste do WebPonto.

## 📁 Estrutura de Arquivos

```
backend/
├── prisma/
│   └── seeds/
│       ├── index.ts                  # CLI interativo
│       ├── 00-reset.seed.ts          # Limpar banco
│       ├── 01-base.seed.ts           # Empresas + Funcionários
│       ├── 02-payroll-config.seed.ts # Configurações de folha
│       ├── 03-time-entries.seed.ts   # Batidas de ponto
│       ├── 04-payroll.seed.ts        # Folha + Holerites
│       └── 05-advances.seed.ts       # Vales/Adiantamentos
│
├── seed-data/
│   ├── seed.json                     # Dados estáticos (empresas, funcionários)
│   └── images/                       # Logos e avatares
│       ├── companies/
│       └── users/
```

## 🚀 Como Usar

### Menu Interativo
```bash
cd backend
npm run seed
```

### Comandos Diretos
```bash
npm run seed:reset    # Limpar banco
npm run seed:base     # Dados base
npm run seed:all      # Todos os seeds
```

### Opções do Menu
| Opção | Descrição |
|-------|-----------|
| 0 | 🗑️ Limpar banco (reset) |
| 1 | 🏢 Base (empresas + funcionários) |
| 2 | ⚙️ Configurações de folha |
| 3 | ⏰ Batidas de ponto |
| 4 | 💰 Folha + Holerites |
| 5 | 💵 Vales/Adiantamentos |
| A | 🚀 Rodar TODOS |
| Q | ❌ Sair |

---

## 🏢 Empresas Geradas

### 1. WebPonto Global
- **CNPJ:** 11.111.111/0001-91
- **Tipo:** Empresa do Super Admin
- **Configuração:** Mínima (só encargos obrigatórios)
- **Admin:** superadmin@webponto.com.br / 123456*

### 2. Acme Tech
- **CNPJ:** 45.987.321/0001-55
- **Tipo:** Empresa completa para testes
- **Configuração:** Todos os benefícios habilitados
- **Admin:** admin@acmetech.com.br / 123456*

---

## 👥 Funcionários e Cenários

### Acme Tech - Funcionários

| Nome | Email | Cargo | Cenário | Salário Base |
|------|-------|-------|---------|--------------|
| João da Silva | joao.silva@acmetech.com.br | Desenvolvedor | Com faltas e atrasos | R$ 5.200 |
| Maria Souza | maria.souza@acmetech.com.br | Analista de RH | Perfeito + Adicional noturno | R$ 6.300 |
| Carlos Pereira | carlos.pereira@acmetech.com.br | Gerente de Projetos | Metade do mês | R$ 8.500 |
| Ana Oliveira | ana.oliveira@acmetech.com.br | Analista Financeiro | Férias (sem batidas) | R$ 5.800 |
| Paulo Santos | paulo.santos@acmetech.com.br | Suporte Técnico | Mês completo + Horas extras | R$ 4.800 |

**Senha de todos:** 123456*

---

## ⏰ Cenários de Batidas de Ponto

### Paulo Santos - `with-overtime`
- ✅ Mês completo (22 dias úteis)
- ✅ 0 faltas, 0 atrasos
- ✅ 15 horas extras 50%
- ✅ 8 horas extras 100%
- ✅ Reconhecimento facial: 95% sucesso, similaridade ~0.92

### João da Silva - `with-absences`
- ⚠️ 4 faltas no mês
- ⚠️ 3 atrasos (~30 min cada)
- ❌ Sem horas extras
- ⚠️ Reconhecimento facial: 85% sucesso, similaridade ~0.78

### Maria Souza - `with-night-shift`
- ✅ Mês completo
- ✅ 0 faltas, 0 atrasos
- ✅ 20 horas de adicional noturno
- ✅ Reconhecimento facial: 100% sucesso, similaridade ~0.95

### Carlos Pereira - `half-month`
- ⚠️ Só metade do mês (11 dias)
- ⚠️ 1 atraso (~15 min)
- ✅ 5 horas extras 50%
- ❌ Não usa reconhecimento facial (batida manual)

### Ana Oliveira - `vacation`
- 🏖️ Férias - sem batidas no mês
- Reconhecimento facial configurado mas não utilizado

---

## 💰 Cenários de Holerite

| Funcionário | Status | Assinado | PDF |
|-------------|--------|----------|-----|
| Paulo Santos | PAID | ✅ Sim (5 dias atrás) | ✅ |
| João da Silva | APPROVED | ❌ Pendente | - |
| Maria Souza | PAID | ✅ Sim (3 dias atrás) | ✅ |
| Carlos Pereira | CALCULATED | ❌ Pendente | - |
| Ana Oliveira | PENDING | ❌ Pendente | - |

---

## 💵 Cenários de Vales

| Funcionário | Valor | Status | Motivo |
|-------------|-------|--------|--------|
| Paulo Santos | R$ 500 | PAID | Despesas médicas |
| João da Silva | R$ 300 | APPROVED | Emergência familiar |
| Maria Souza | R$ 200 | PENDING | Conserto do carro |
| Carlos Pereira | R$ 400 | REJECTED | Viagem pessoal |
| Ana Oliveira | R$ 150 | PAID | Material escolar |
| Ana Oliveira | R$ 250 | PENDING | Conta de luz |

---

## ⚙️ Configurações de Folha

### Acme Tech (Completa)
| Configuração | Valor |
|--------------|-------|
| INSS | ✅ Habilitado |
| IRRF | ✅ Habilitado |
| FGTS | ✅ 8% |
| Adicional Noturno | ✅ 20% |
| Adiantamento Salarial | ✅ 40% dia 15 |
| Vale Avulso | ✅ até 50% |
| Vale Transporte | ✅ 6% |
| Vale Refeição | ✅ R$ 600 |
| Plano de Saúde | ✅ R$ 350 |
| Plano Odontológico | ✅ R$ 50 |

### WebPonto Global (Mínima)
| Configuração | Valor |
|--------------|-------|
| INSS | ✅ Habilitado |
| IRRF | ✅ Habilitado |
| FGTS | ✅ 8% |
| Demais | ❌ Desabilitado |

---

## 🔍 Cenários de Reconhecimento Facial

### Sucesso (Maioria)
- Similaridade: 0.85 - 0.99
- Liveness: 0.90 - 0.99
- Status: VALID

### Falha de Similaridade
- Similaridade: 0.40 - 0.70
- Status: INVALID
- **Log:** `⚠ [DEV] Falha facial simulada: {nome} em {data} (similarity: X.XX)`

### Falha de Liveness
- Liveness: 0.30 - 0.60
- Status: PENDING
- **Log:** `⚠ [DEV] Falha liveness simulada: {nome} em {data}`

---

## 🧪 Como Validar os Testes

### 1. Validação Visual (Frontend)

#### Dashboard do Funcionário
- [ ] Verificar dias trabalhados
- [ ] Verificar horas trabalhadas
- [ ] Verificar último salário
- [ ] Verificar vale disponível

#### Lista de Holerites
- [ ] Paulo Santos: Status "Assinado", botão "Baixar PDF"
- [ ] João da Silva: Status "Pendente", botão "Assinar"
- [ ] Maria Souza: Status "Assinado", botão "Baixar PDF"

#### Visualização do Holerite
- [ ] Logo da empresa visível
- [ ] Dados do funcionário corretos
- [ ] Proventos calculados
- [ ] Descontos calculados
- [ ] Valor líquido correto

### 2. Validação via Logs (Terminal)

Os logs de desenvolvimento só aparecem quando `NODE_ENV !== 'production'`.

#### Logs de Batidas
```
⚠ [DEV] Falha facial simulada: João da Silva em 15/11/2025 (similarity: 0.52)
⚠ [DEV] Falha liveness simulada: Maria Souza em 20/11/2025
```

#### Logs de Holerites
```
✅ Paulo Santos: R$ 4.850,00 (PAID)
⏳ João da Silva: R$ 3.200,00 (APPROVED)
```

### 3. Validação via Banco de Dados

```sql
-- Verificar batidas por funcionário
SELECT 
  u.name,
  COUNT(*) as total_batidas,
  SUM(CASE WHEN te.is_late THEN 1 ELSE 0 END) as atrasos,
  SUM(CASE WHEN te.is_overtime THEN 1 ELSE 0 END) as horas_extras
FROM time_entries te
JOIN employees e ON te.employee_id = e.id
JOIN users u ON u.employee_id = e.id
GROUP BY u.name;

-- Verificar holerites
SELECT 
  u.name,
  p.status,
  p.net_salary,
  p.signed_at IS NOT NULL as assinado
FROM payslips p
JOIN employees e ON p.employee_id = e.id
JOIN users u ON u.employee_id = e.id;

-- Verificar vales
SELECT 
  u.name,
  a.amount,
  a.status,
  a.reason
FROM advances a
JOIN employees e ON a.employee_id = e.id
JOIN users u ON u.employee_id = e.id;
```

---

## 🔧 Manutenção

### Adicionar Nova Empresa
1. Editar `seed-data/seed.json`
2. Adicionar logo em `seed-data/images/companies/`
3. Adicionar configuração em `02-payroll-config.seed.ts`

### Adicionar Novo Funcionário
1. Editar `seed-data/seed.json` na empresa desejada
2. Adicionar avatar em `seed-data/images/users/`
3. Adicionar cenário em `03-time-entries.seed.ts`
4. Adicionar status em `04-payroll.seed.ts`
5. Adicionar vales em `05-advances.seed.ts` (opcional)

### Alterar Cenário de Teste
Editar o arquivo correspondente:
- Batidas: `03-time-entries.seed.ts` → `EMPLOYEE_SCENARIOS`
- Holerites: `04-payroll.seed.ts` → `PAYSLIP_STATUS`
- Vales: `05-advances.seed.ts` → `EMPLOYEE_ADVANCES`

---

## ⚠️ Observações Importantes

1. **Logs de Desenvolvimento**
   - Só aparecem quando `NODE_ENV !== 'production'`
   - Não são compilados para produção

2. **Dados Dinâmicos**
   - Batidas são geradas para mês atual e anterior
   - Datas de assinatura são relativas à data atual

3. **Imagens**
   - Logos e avatares são carregados do `seed-data/images/`
   - Upload para MinIO é feito pelo `seed.service.ts` existente

4. **Ordem de Execução**
   - Os seeds devem ser executados na ordem numérica
   - Usar "Rodar TODOS" garante a ordem correta
