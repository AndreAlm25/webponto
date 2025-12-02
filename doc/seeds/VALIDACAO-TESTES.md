# 🧪 Guia de Validação de Testes - Seeds WebPonto

Este documento descreve como validar se os dados gerados pelos seeds estão corretos.

---

## 📋 Checklist de Validação

### Pré-requisitos
- [ ] Backend rodando (`npm run start:dev`)
- [ ] Frontend rodando (`npm run dev`)
- [ ] Seeds executados (`npm run seed:all`)

---

## 🏢 1. Validação de Empresas

### No Frontend (Admin)

1. Acessar: `http://localhost:3000/login`
2. Login: `admin@acmetech.com.br` / `123456*`

**Verificar:**
- [ ] Logo da empresa aparece no header
- [ ] Nome "Acme Tech" aparece corretamente
- [ ] Menu de navegação funciona

### No Banco de Dados

```sql
SELECT id, trade_name, cnpj, logo_url FROM companies;
```

**Esperado:** 2 empresas (WebPonto Global e Acme Tech)

---

## 👥 2. Validação de Funcionários

### No Frontend (Admin)

1. Menu: Funcionários
2. Verificar lista

**Esperado:**
| Nome | Cargo | Departamento | Status |
|------|-------|--------------|--------|
| Paulo Santos | Suporte Técnico | Operações | Ativo |
| João da Silva | Desenvolvedor | Tecnologia | Ativo |
| Maria Souza | Analista de RH | Recursos Humanos | Ativo |
| Carlos Pereira | Gerente de Projetos | Tecnologia | Ativo |
| Ana Oliveira | Analista Financeiro | Financeiro | Ativo |

### No Banco de Dados

```sql
SELECT 
  u.name, 
  u.email, 
  p.name as cargo, 
  d.name as departamento,
  e.active
FROM employees e
JOIN users u ON u.employee_id = e.id
LEFT JOIN positions p ON e.position_id = p.id
LEFT JOIN departments d ON e.department_id = d.id
WHERE e.company_id = (SELECT id FROM companies WHERE trade_name = 'Acme Tech');
```

---

## ⏰ 3. Validação de Batidas de Ponto

### Logs de Desenvolvimento (Terminal do Backend)

Ao executar `npm run seed:time`, deve aparecer:

```
⏰ Gerando batidas de ponto...
  → Gerando batidas para 5 funcionários
    ✓ Paulo Santos: 176 batidas (with-overtime)
    ✓ João da Silva: 144 batidas (with-absences)
      ⚠ [DEV] Falha facial simulada: João da Silva em 15/11/2025 (similarity: 0.52)
    ✓ Maria Souza: 176 batidas (with-night-shift)
    ✓ Carlos Pereira: 88 batidas (half-month)
    ✓ Ana Oliveira: 0 batidas (vacation)
  → Total: 584 batidas geradas
```

### No Banco de Dados

```sql
-- Resumo por funcionário
SELECT 
  u.name,
  COUNT(*) as total_batidas,
  SUM(CASE WHEN te.type = 'CLOCK_IN' THEN 1 ELSE 0 END) as entradas,
  SUM(CASE WHEN te.is_late THEN 1 ELSE 0 END) as atrasos,
  SUM(CASE WHEN te.is_overtime THEN 1 ELSE 0 END) as horas_extras,
  SUM(CASE WHEN te.status = 'INVALID' THEN 1 ELSE 0 END) as falhas_facial
FROM time_entries te
JOIN employees e ON te.employee_id = e.id
JOIN users u ON u.employee_id = e.id
GROUP BY u.name
ORDER BY u.name;
```

**Esperado:**

| Nome | Batidas | Entradas | Atrasos | HE | Falhas |
|------|---------|----------|---------|-----|--------|
| Ana Oliveira | 0 | 0 | 0 | 0 | 0 |
| Carlos Pereira | ~88 | ~22 | 1 | ~5 | 0 |
| João da Silva | ~144 | ~36 | 3 | 0 | ~5 |
| Maria Souza | ~176 | ~44 | 0 | 0 | 0 |
| Paulo Santos | ~176 | ~44 | 0 | ~23 | ~2 |

### Validação de Falhas de Reconhecimento Facial

```sql
-- Batidas com falha de reconhecimento
SELECT 
  u.name,
  te.timestamp,
  te.similarity,
  te.liveness_valid,
  te.status
FROM time_entries te
JOIN employees e ON te.employee_id = e.id
JOIN users u ON u.employee_id = e.id
WHERE te.status IN ('INVALID', 'PENDING')
ORDER BY te.timestamp DESC
LIMIT 10;
```

**Esperado:** Algumas batidas com:
- `similarity` < 0.70 e `status` = 'INVALID'
- `liveness_valid` = false e `status` = 'PENDING'

---

## 💰 4. Validação de Holerites

### No Frontend (Painel do Funcionário)

1. Login: `paulo.santos@acmetech.com.br` / `123456*`
2. Menu: Holerites

**Verificar Paulo Santos:**
- [ ] Status: "Assinado" (verde)
- [ ] Botão "Baixar PDF" visível
- [ ] Valor líquido calculado corretamente

3. Login: `joao.silva@acmetech.com.br` / `123456*`

**Verificar João da Silva:**
- [ ] Status: "Pendente" (amarelo)
- [ ] Botão "Assinar" visível
- [ ] Ao clicar, abre modal de visualização

### Logs de Desenvolvimento (Terminal)

```
💰 Gerando folha de pagamento...
  → Gerando folha de Outubro/2025
    ✅ Paulo Santos: R$ 4.850,00 (PAID)
    ⏳ João da Silva: R$ 3.200,00 (APPROVED)
    ✅ Maria Souza: R$ 5.100,00 (PAID)
    ⏳ Carlos Pereira: R$ 3.800,00 (CALCULATED)
    ⏳ Ana Oliveira: R$ 0,00 (PENDING)
    ✓ Acme Tech: 5 holerites gerados
```

### No Banco de Dados

```sql
SELECT 
  u.name,
  p.status,
  p.base_salary,
  p.gross_salary,
  p.total_deductions,
  p.net_salary,
  p.signed_at IS NOT NULL as assinado,
  p.absence_days as faltas,
  p.late_minutes as atrasos_min
FROM payslips p
JOIN employees e ON p.employee_id = e.id
JOIN users u ON u.employee_id = e.id
ORDER BY u.name;
```

**Esperado:**

| Nome | Status | Bruto | Descontos | Líquido | Assinado | Faltas |
|------|--------|-------|-----------|---------|----------|--------|
| Ana Oliveira | PENDING | ~0 | ~0 | ~0 | ❌ | 22 |
| Carlos Pereira | CALCULATED | ~9.000 | ~1.500 | ~7.500 | ❌ | 11 |
| João da Silva | APPROVED | ~5.200 | ~1.200 | ~4.000 | ❌ | 4 |
| Maria Souza | PAID | ~6.300 | ~1.100 | ~5.200 | ✅ | 0 |
| Paulo Santos | PAID | ~6.500 | ~1.200 | ~5.300 | ✅ | 0 |

---

## 💵 5. Validação de Vales

### Logs de Desenvolvimento

```
💵 Gerando vales/adiantamentos...
  → Gerando vales para funcionários
    💰 Paulo Santos: R$ 500 (PAID)
    ✅ João da Silva: R$ 300 (APPROVED)
    ⏳ Maria Souza: R$ 200 (PENDING)
    ❌ Carlos Pereira: R$ 400 (REJECTED)
    💰 Ana Oliveira: R$ 150 (PAID)
    ⏳ Ana Oliveira: R$ 250 (PENDING)
  → Total: 6 vales gerados
```

### No Banco de Dados

```sql
SELECT 
  u.name,
  a.amount,
  a.status,
  a.reason,
  a.rejection_reason
FROM advances a
JOIN employees e ON a.employee_id = e.id
JOIN users u ON u.employee_id = e.id
ORDER BY u.name, a.requested_at;
```

**Esperado:**

| Nome | Valor | Status | Motivo |
|------|-------|--------|--------|
| Ana Oliveira | 150 | PAID | Material escolar |
| Ana Oliveira | 250 | PENDING | Conta de luz |
| Carlos Pereira | 400 | REJECTED | Viagem pessoal |
| João da Silva | 300 | APPROVED | Emergência familiar |
| Maria Souza | 200 | PENDING | Conserto do carro |
| Paulo Santos | 500 | PAID | Despesas médicas |

---

## ⚙️ 6. Validação de Configurações

### No Banco de Dados

```sql
SELECT 
  c.trade_name,
  pc.enable_inss,
  pc.enable_irrf,
  pc.enable_fgts,
  pc.enable_night_shift,
  pc.enable_salary_advance,
  pc.enable_extra_advance,
  pc.enable_transport_voucher,
  pc.enable_meal_voucher,
  pc.enable_health_insurance
FROM payroll_configs pc
JOIN companies c ON pc.company_id = c.id;
```

**Esperado:**

| Empresa | INSS | IRRF | FGTS | Noturno | Adiant. | Vale | VT | VR | Saúde |
|---------|------|------|------|---------|---------|------|----|----|-------|
| WebPonto Global | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Acme Tech | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🔍 7. Validação de PDF do Holerite

### Pré-requisito
- Holerite assinado (Paulo Santos ou Maria Souza)

### Passos
1. Login como funcionário com holerite assinado
2. Ir em Holerites
3. Clicar em "Baixar PDF"

**Verificar no PDF:**
- [ ] Logo da empresa no topo (centralizado)
- [ ] Nome da empresa e CNPJ
- [ ] Endereço da empresa
- [ ] Foto do funcionário (ao lado dos dados)
- [ ] Nome, CPF, Cargo, Matrícula
- [ ] Proventos calculados
- [ ] Descontos calculados
- [ ] FGTS informativo
- [ ] Valor líquido em destaque
- [ ] Assinatura digital (data, IP, hash)

---

## 🚨 Problemas Comuns

### Seed não executa
```bash
# Verificar se o banco está acessível
npm run prisma:studio

# Regenerar cliente Prisma
npm run prisma:generate
```

### Imagens não aparecem
- Verificar se as imagens existem em `seed-data/images/`
- Verificar se o MinIO está rodando
- Executar seed via API: `POST /api/seed/static`

### Dados inconsistentes
```bash
# Limpar e recriar tudo
npm run seed:all
```

---

## ✅ Resumo da Validação

| Item | Frontend | Backend Log | Banco |
|------|----------|-------------|-------|
| Empresas | ✅ Logo, nome | - | ✅ Query |
| Funcionários | ✅ Lista | - | ✅ Query |
| Batidas | - | ✅ Contagem | ✅ Query |
| Falhas Facial | - | ✅ Warnings | ✅ Query |
| Holerites | ✅ Status, valores | ✅ Valores | ✅ Query |
| Vales | ✅ Lista | ✅ Status | ✅ Query |
| PDF | ✅ Download | - | - |
