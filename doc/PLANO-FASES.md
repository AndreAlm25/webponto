# 📋 PLANO DE FASES - MELHORIAS DO SISTEMA

**Data:** 14/01/2026

---

# ✅ FASE 1: LIMPEZA (CONCLUÍDA)

## O que foi feito:

| Ação | Status |
|------|--------|
| Remover `toleranceEntryAfterMin` do banco | ✅ Feito |
| Remover `toleranceExitAfterMin` do banco | ✅ Feito |
| Remover campo "Tolerância de Atraso" da tela do funcionário | ✅ Feito |
| Remover campo "Tolerância para Hora Extra" da tela do funcionário | ✅ Feito |

## Impacto:
- **ZERO** - Esses campos não eram usados em lugar nenhum

---

# 🔜 FASE 2: VALIDAÇÃO DE HORÁRIO NOTURNO

## O problema:
- Adicional noturno aparece para TODAS as empresas
- Mas se a empresa funciona das 08:00 às 18:00, não faz sentido ter adicional noturno
- Precisa esconder/bloquear essa opção quando não faz sentido

## Onde fica a configuração da empresa:

### Tela de Configurações da Empresa:
```
Admin → Configurações → Conformidade CLT
URL: /admin/[empresa]/configuracoes/conformidade
```

### Campos no banco de dados (Company):
| Campo | PT-BR | Valor Padrão |
|-------|-------|--------------|
| `workingHoursStart` | Horário de Abertura | "08:00" |
| `workingHoursEnd` | Horário de Fechamento | "18:00" |

### Campos no banco de dados (PayrollConfig):
| Campo | PT-BR | Valor Padrão |
|-------|-------|--------------|
| `enableNightShift` | Habilitar Adicional Noturno | true |
| `nightShiftStart` | Início do Horário Noturno | "22:00" |
| `nightShiftEnd` | Fim do Horário Noturno | "05:00" |
| `nightShiftPercentage` | Percentual do Adicional | 20% |

## O que vai ser feito:

### 1. Validação automática:
```
SE empresa funciona das 08:00 às 18:00
   → Adicional noturno NÃO faz sentido
   → Esconder ou desabilitar a opção
   
SE empresa funciona das 18:00 às 06:00
   → Adicional noturno FAZ sentido
   → Mostrar a opção
```

### 2. Onde vai impactar:

| Arquivo | O que muda |
|---------|------------|
| `configuracoes/folha-pagamento/page.tsx` | Esconder seção de adicional noturno se empresa não funciona à noite |
| `EditEmployeeModal.tsx` | Esconder taxa noturna do funcionário se empresa não funciona à noite |

### 3. Lógica de verificação:
```typescript
// Função para verificar se empresa funciona à noite
function empresaFuncionaNoite(workingHoursStart: string, workingHoursEnd: string): boolean {
  const nightStart = 22 * 60; // 22:00 em minutos
  const nightEnd = 5 * 60;    // 05:00 em minutos
  
  const [startH, startM] = workingHoursStart.split(':').map(Number);
  const [endH, endM] = workingHoursEnd.split(':').map(Number);
  
  const empresaStart = startH * 60 + startM;
  const empresaEnd = endH * 60 + endM;
  
  // Verifica se o horário da empresa cruza com o horário noturno (22:00-05:00)
  // Casos:
  // 1. Empresa começa antes das 22:00 e termina depois das 22:00
  // 2. Empresa começa depois das 22:00
  // 3. Empresa termina antes das 05:00 (madrugada)
  
  return (empresaEnd > nightStart) || (empresaStart >= nightStart) || (empresaEnd <= nightEnd && empresaEnd > 0);
}
```

### 4. Impacto no sistema:
- **Baixo** - Apenas esconde opções que não fazem sentido
- **Não muda cálculos** - Só muda a interface
- **Não quebra nada** - Se empresa já tem configurado, continua funcionando

---

# 🔜 FASE 3: GESTÃO DE ESCALAS

## O que vai ser criado:

### 1. Novo modelo no banco (Shift/Escala):
```prisma
model Shift {
  id          String   @id @default(uuid())
  companyId   String
  name        String   // "6x1", "5x2", "12x36"
  type        ShiftType
  workDays    Int      // Dias de trabalho
  restDays    Int      // Dias de folga
  workHours   Int      // Horas por dia
  // ... outras configurações
}

enum ShiftType {
  FIXED      // Horário fixo (ex: 08:00-18:00)
  ROTATING   // Escala rotativa (ex: 6x1)
  ALTERNATING // Escala alternada (ex: 12x36)
}
```

### 2. Nova tela:
```
Admin → Gestão de Colaboradores → Escalas
URL: /admin/[empresa]/escalas
```

### 3. Vincular funcionário a escala:
- No cadastro do funcionário, poder escolher uma escala
- Escala define automaticamente os dias de trabalho/folga

### 4. Validações:
- Se empresa funciona 8h/dia, não permitir escala 12x36
- Se empresa não funciona fim de semana, não permitir escala 6x1

---

# 🔜 FASE 4: VERIFICAR CÁLCULOS

## O que vai ser verificado:

### 1. Cálculos de Ponto:
| Cálculo | O que verifica |
|---------|----------------|
| Hora extra | Se está calculando corretamente (50% a mais) |
| Adicional noturno | Se está calculando corretamente (20% a mais) |
| Atraso | Se está descontando corretamente |
| Falta | Se está descontando dia inteiro |

### 2. Cálculos de Folha:
| Cálculo | O que verifica |
|---------|----------------|
| INSS | Se está descontando corretamente (tabela progressiva) |
| IRRF | Se está descontando corretamente (tabela progressiva) |
| FGTS | Se está calculando corretamente (8%) |
| Vale-transporte | Se está descontando corretamente (6%) |
| Vale-refeição | Se está descontando corretamente |
| Plano de saúde | Se está descontando corretamente |

### 3. Níveis de Conformidade:
| Nível | O que verifica |
|-------|----------------|
| FULL | Bloqueia se tiver violação CLT |
| PARTIAL | Só avisa, não bloqueia |
| FLEXIBLE | Permite tudo |
| CUSTOM | Verifica configurações personalizadas |

### 4. Benefícios:
| Benefício | O que verifica |
|-----------|----------------|
| Vale-transporte | Desconto de 6% do salário |
| Vale-refeição | Valor configurado |
| Plano de saúde | Valor configurado |
| Plano odontológico | Valor configurado |
| Benefícios personalizados | Valores configurados |

---

# 📍 ONDE FICAM AS CONFIGURAÇÕES DA EMPRESA

## Menu no Admin:

```
Admin
├── Dashboard
├── Gestão de Colaboradores
│   ├── Funcionários
│   ├── Cargos
│   └── Departamentos
├── Ponto e Jornada
│   ├── Terminal de Ponto
│   ├── Registros de Ponto
│   └── Cercas Geográficas
├── Financeiro
│   ├── Folha de Pagamento
│   └── Feriados
└── Configurações          ← AQUI
    ├── Conformidade CLT   ← Tolerâncias, validações
    ├── Folha de Pagamento ← Adicional noturno, taxas
    ├── Dashboard          ← Visual do dashboard
    ├── Aplicativo         ← Configurações do app
    └── Permissões         ← Controle de acesso
```

## URLs das configurações:

| Configuração | URL |
|--------------|-----|
| Conformidade CLT | `/admin/[empresa]/configuracoes/conformidade` |
| Folha de Pagamento | `/admin/[empresa]/configuracoes/folha-pagamento` |
| Dashboard | `/admin/[empresa]/configuracoes/dashboard` |
| Aplicativo | `/admin/[empresa]/configuracoes/aplicativo` |
| Permissões | `/admin/[empresa]/configuracoes/permissoes` |

## Campos importantes da empresa:

### Em Conformidade CLT (`/configuracoes/conformidade`):
- Nível de conformidade (FULL, PARTIAL, FLEXIBLE, CUSTOM)
- Tolerância de entrada antecipada
- Tolerância de saída tardia
- Tolerância de atraso
- Taxa de hora extra
- Taxa de feriado

### Em Folha de Pagamento (`/configuracoes/folha-pagamento`):
- Frequência de pagamento (mensal, quinzenal, semanal)
- Dia do pagamento
- Adicional noturno (horário e percentual)
- Benefícios (VT, VR, plano de saúde, etc.)

---

# ✅ RESUMO

| Fase | O que faz | Impacto | Status |
|------|-----------|---------|--------|
| 1 | Limpeza de campos obsoletos | Zero | ✅ Concluída |
| 2 | Validar horário noturno | Baixo | 🔜 Próxima |
| 3 | Gestão de Escalas | Médio | 🔜 Futura |
| 4 | Verificar cálculos | Baixo | 🔜 Futura |

**Quer que eu comece a Fase 2 agora?**
