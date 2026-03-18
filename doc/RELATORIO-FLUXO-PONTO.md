# 📋 RELATÓRIO: COMO FUNCIONA O SISTEMA DE PONTO HOJE

**Data:** 14/01/2026  
**Objetivo:** Entender o fluxo completo antes de implementar Gestão de Escalas

---

# 1️⃣ COMO FUNCIONA O PONTO HOJE

## Quando o funcionário bate ponto, o que acontece?

### Passo 1: Funcionário clica em "Bater Ponto"
- Pode ser ponto facial (com câmera) ou ponto manual

### Passo 2: Sistema verifica as regras (Conformidade CLT)
O sistema chama o `ComplianceService.validateTimeEntry()` que verifica:

| Verificação | PT-BR: O que faz | Quando bloqueia? |
|-------------|------------------|------------------|
| **Jornada máxima** | Verifica se já trabalhou mais de 10 horas no dia | Se passou de 10h |
| **Descanso mínimo** | Verifica se teve pelo menos 11 horas de descanso desde a última saída | Se descansou menos de 11h |
| **Hora extra máxima** | Verifica se está fazendo mais de 2 horas extras | Se passou de 2h extras |
| **Horário de trabalho** | Verifica se está dentro do horário permitido | Depende da configuração |

### Passo 3: Sistema decide se permite ou bloqueia

Depende do **Nível de Conformidade** da empresa:

| Nível | PT-BR | Comportamento |
|-------|-------|---------------|
| `FULL` | **Rígido (100% CLT)** | BLOQUEIA se tiver violação |
| `PARTIAL` | **Parcial** | Só AVISA, não bloqueia |
| `FLEXIBLE` | **Flexível** | Permite tudo, sem validações |
| `CUSTOM` | **Personalizado** | Você escolhe o que validar |

### Passo 4: Se permitido, registra o ponto no banco de dados

---

# 2️⃣ VALIDAÇÃO DE HORÁRIO - JÁ EXISTE!

✅ **Boa notícia:** O sistema JÁ valida o horário de trabalho do funcionário!

## Como funciona hoje:

```
Arquivo: backend/src/modules/compliance/compliance.service.ts
Linhas: 92-165
```

**O que o código faz:**

1. Pega o horário de trabalho do funcionário (`workStartTime` e `workEndTime`)
2. Pega o horário atual
3. Verifica se está dentro do permitido

**Exemplo:**
- Funcionário trabalha das 08:00 às 18:00
- Ele tenta bater ponto às 06:00
- Sistema verifica: 06:00 está antes das 08:00?
- Se ele NÃO tem hora extra permitida → BLOQUEIA
- Se ele TEM hora extra permitida → Permite (conta como hora extra)

## ⚠️ MAS tem um detalhe importante:

A validação usa o horário do **FUNCIONÁRIO**, não da **EMPRESA**.

**Hoje:**
- Sistema olha: `employee.workStartTime` e `employee.workEndTime`
- NÃO olha: `company.workingHoursStart` e `company.workingHoursEnd`

**Sua ideia (correta):**
- Primeiro verificar se está dentro do horário da EMPRESA
- Depois verificar se está dentro do horário do FUNCIONÁRIO

---

# 3️⃣ O QUE VAI MUDAR (IMPACTO DAS MUDANÇAS)

## Mudança 1: Remover campos obsoletos do banco

| Campo a remover | Onde está | Impacto |
|-----------------|-----------|---------|
| `toleranceEntryAfterMin` | Company (banco) | ✅ ZERO impacto - não é usado em lugar nenhum |
| `toleranceExitAfterMin` | Company (banco) | ✅ ZERO impacto - não é usado em lugar nenhum |

**Risco:** NENHUM. São campos fantasmas.

---

## Mudança 2: Remover tolerância da tela do funcionário

| O que remover | Onde está | Impacto |
|---------------|-----------|---------|
| Campo "Tolerância de Atraso" | Tela de editar funcionário | ✅ ZERO impacto - o campo não salva nada |
| Campo "Tolerância para Hora Extra" | Tela de editar funcionário | ✅ ZERO impacto - o campo não salva nada |

**Risco:** NENHUM. Esses campos aparecem na tela mas não funcionam.

**O que vai acontecer:**
- Antes: Campo aparece, você edita, mas não salva
- Depois: Campo não aparece mais (menos confusão)

**A tolerância continua funcionando?**
- SIM! A tolerância da EMPRESA (Conformidade CLT) continua funcionando normalmente
- Só remove a tolerância individual do funcionário (que nunca funcionou)

---

## Mudança 3: Validar horário do funcionário dentro da empresa

| O que mudar | Onde | Impacto |
|-------------|------|---------|
| Adicionar validação | Tela de cadastro/edição de funcionário | ⚠️ BAIXO impacto |

**O que vai acontecer:**
- Antes: Você podia colocar qualquer horário no funcionário
- Depois: Sistema avisa se horário do funcionário está fora do horário da empresa

**Exemplo:**
- Empresa funciona: 08:00 às 18:00
- Você tenta colocar funcionário: 22:00 às 06:00
- Sistema avisa: "Horário do funcionário está fora do horário de funcionamento da empresa"

**Risco:** BAIXO. É só uma validação na tela, não muda nada no ponto.

---

# 4️⃣ FLUXO COMPLETO DO PONTO (DIAGRAMA)

```
┌─────────────────────────────────────────────────────────────────┐
│                    FUNCIONÁRIO BATE PONTO                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. VERIFICAR PERMISSÕES DO FUNCIONÁRIO                          │
│    - allowRemoteClockIn (pode bater ponto remoto?)              │
│    - allowFacialRecognition (pode usar reconhecimento facial?)  │
│    - geofenceId (está dentro da cerca geográfica?)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. VERIFICAR CONFORMIDADE CLT (ComplianceService)               │
│    - Jornada máxima (10h/dia)                                   │
│    - Descanso mínimo (11h entre jornadas)                       │
│    - Hora extra máxima (2h/dia)                                 │
│    - Horário de trabalho (dentro do permitido)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. DECISÃO BASEADA NO NÍVEL DE CONFORMIDADE                     │
│    - FULL: Bloqueia se tiver violação                           │
│    - PARTIAL: Só avisa                                          │
│    - FLEXIBLE: Permite tudo                                     │
│    - CUSTOM: Depende das configurações                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
            ┌───────────┐       ┌───────────────┐
            │ BLOQUEADO │       │   PERMITIDO   │
            │ (erro)    │       │ (registra)    │
            └───────────┘       └───────────────┘
                                       │
                                       ▼
                        ┌─────────────────────────┐
                        │ 4. DETECTAR EXTRAS      │
                        │    - Hora extra         │
                        │    - Atraso             │
                        │    - Adicional noturno  │
                        └─────────────────────────┘
                                       │
                                       ▼
                        ┌─────────────────────────┐
                        │ 5. SALVAR NO BANCO      │
                        │    - TimeEntry criado   │
                        │    - WebSocket emitido  │
                        └─────────────────────────┘
```

---

# 5️⃣ ESTÁ PRONTO PARA VERSÃO BETA?

## ✅ O que está funcionando bem:

| Funcionalidade | Status | Observação |
|----------------|--------|------------|
| Bater ponto (facial) | ✅ OK | Funciona com reconhecimento facial |
| Bater ponto (manual) | ✅ OK | Admin pode registrar manualmente |
| Validação CLT | ✅ OK | Jornada, descanso, hora extra |
| Cerca geográfica | ✅ OK | Valida localização |
| Tolerâncias | ✅ OK | Funciona na empresa (global) |
| Hora extra | ✅ OK | Detecta e calcula |
| Atraso | ✅ OK | Detecta e registra |
| Dashboard | ✅ OK | Mostra resumo |
| Espelho de ponto | ✅ OK | Relatório mensal |
| Exportar PDF/Excel | ✅ OK | Funciona |

## ⚠️ O que precisa ajustar (pequeno):

| Item | Problema | Solução | Impacto |
|------|----------|---------|---------|
| Campos obsoletos | Existem no banco mas não são usados | Remover | Nenhum |
| Tolerância do funcionário | Aparece na tela mas não salva | Remover da tela | Nenhum |

## ❓ O que falta para Gestão de Escalas:

| Item | Status | Necessário para beta? |
|------|--------|----------------------|
| Escalas (6x1, 5x2, 12x36) | ❌ Não tem | Não obrigatório |
| Banco de horas (tela) | ❌ Não tem | Não obrigatório |

---

# 6️⃣ COMPARAÇÃO COM SISTEMAS DE PONTO PROFISSIONAIS

Pesquisei como funcionam sistemas de ponto profissionais e o seu está bem alinhado:

## ✅ O que você tem que é padrão de mercado:

| Funcionalidade | Seu sistema | Sistemas profissionais |
|----------------|-------------|------------------------|
| Registro de ponto | ✅ Tem | ✅ Tem |
| Reconhecimento facial | ✅ Tem | ✅ Tem (premium) |
| Validação CLT | ✅ Tem | ✅ Tem |
| Tolerâncias | ✅ Tem (empresa) | ✅ Tem (empresa) |
| Cerca geográfica | ✅ Tem | ✅ Tem (premium) |
| Espelho de ponto | ✅ Tem | ✅ Tem |
| Hora extra | ✅ Tem | ✅ Tem |
| Adicional noturno | ✅ Tem | ✅ Tem |

## ⚠️ O que sistemas profissionais têm e você pode adicionar depois:

| Funcionalidade | Seu sistema | Prioridade |
|----------------|-------------|------------|
| Gestão de escalas | ❌ Não tem | Média |
| Banco de horas (tela) | ❌ Não tem | Média |
| Férias | ❌ Não tem | Baixa |
| Atestados | ❌ Não tem | Baixa |
| Integração com folha | Parcial | Baixa |

---

# 7️⃣ CONCLUSÃO

## Pode lançar a versão beta?

**SIM!** O sistema está funcional para uso básico.

## O que fazer antes de lançar:

1. ✅ Remover campos obsoletos (5 minutos)
2. ✅ Remover tolerância da tela do funcionário (5 minutos)
3. ✅ Testar o fluxo completo de ponto

## O que pode fazer depois (versões futuras):

1. Gestão de Escalas (6x1, 5x2, 12x36)
2. Banco de Horas (tela de gestão)
3. Validação de horário empresa vs funcionário

---

# 8️⃣ PLANO DE AÇÃO (se você aprovar)

## Fase 1: Limpeza (hoje - 10 minutos)
1. Remover `toleranceEntryAfterMin` do banco
2. Remover `toleranceExitAfterMin` do banco
3. Remover campos de tolerância da tela do funcionário

## Fase 2: Gestão de Escalas (próxima sessão)
1. Criar modelo de Escala no banco
2. Criar tela de gerenciar escalas
3. Vincular funcionário a uma escala
4. Validar ponto baseado na escala

**Quer que eu execute a Fase 1 agora?**
