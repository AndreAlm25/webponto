# 📋 ANÁLISE DE CONFIGURAÇÕES DO SISTEMA

**Data:** 14/01/2026  
**Objetivo:** Entender todas as configurações do sistema antes de implementar Gestão de Escalas

---

# 1️⃣ HORÁRIOS DE TRABALHO

## Onde está configurado:

### Na Empresa (Company):
| Campo em Inglês | PT-BR: O que significa | Valor Padrão |
|-----------------|------------------------|--------------|
| `workingHoursStart` | **Horário de Abertura da Empresa** - A hora que a empresa ABRE | "08:00" |
| `workingHoursEnd` | **Horário de Fechamento da Empresa** - A hora que a empresa FECHA | "18:00" |

### No Funcionário (Employee):
| Campo em Inglês | PT-BR: O que significa | Valor Padrão |
|-----------------|------------------------|--------------|
| `workStartTime` | **Horário de Entrada do Funcionário** - A hora que o funcionário COMEÇA a trabalhar | "08:00" |
| `workEndTime` | **Horário de Saída do Funcionário** - A hora que o funcionário TERMINA de trabalhar | "18:00" |

## ✅ NÃO É REDUNDANTE - Sua ideia está correta!

**Explicação da sua ideia:**
- **Empresa (08:00 às 18:00)** = Horário que a empresa FUNCIONA (está aberta)
- **Funcionário (08:00 às 14:00)** = Horário que o funcionário TRABALHA (pode ser meio período)

**Regra importante que você mencionou:**
- O funcionário NÃO PODE trabalhar fora do horário da empresa
- Se a empresa funciona das 08:00 às 18:00, o funcionário não pode ter horário das 22:00 às 06:00
- Se a empresa funciona 8 horas por dia, não faz sentido escala 12x36

## 🔧 O QUE PRECISA FAZER:

1. **Validação no sistema:** Quando cadastrar horário do funcionário, verificar se está DENTRO do horário da empresa
2. **Bloquear escalas incompatíveis:** Se empresa funciona 8h, não permitir escala 12x36
3. **Esconder opções que não fazem sentido:** Se empresa funciona das 08:00 às 18:00, esconder "Adicional Noturno"

---

# 2️⃣ TOLERÂNCIAS

## Onde está configurado (na Empresa - Company):

| Campo em Inglês | PT-BR: O que significa | Valor Padrão | Onde aparece na tela |
|-----------------|------------------------|--------------|---------------------|
| `enableTolerances` | **Habilitar Tolerâncias** - Liga ou desliga todas as tolerâncias | true (ligado) | Conformidade CLT |
| `earlyEntryToleranceMinutes` | **Tolerância de Entrada Antecipada** - Quantos minutos o funcionário pode chegar ANTES do horário sem contar como hora extra | 10 minutos | Conformidade CLT |
| `lateExitToleranceMinutes` | **Tolerância de Saída Tardia** - Quantos minutos o funcionário pode sair DEPOIS do horário sem contar como hora extra | 15 minutos | Conformidade CLT |
| `lateArrivalToleranceMinutes` | **Tolerância de Atraso** - Quantos minutos o funcionário pode chegar ATRASADO sem ser marcado como atraso | 15 minutos | Conformidade CLT |
| `toleranceEntryAfterMin` | **❓ CAMPO CONFUSO** - Parece ser a mesma coisa que `earlyEntryToleranceMinutes` | null | ❓ Não sei onde aparece |
| `toleranceExitAfterMin` | **❓ CAMPO CONFUSO** - Parece ser a mesma coisa que `lateExitToleranceMinutes` | null | ❓ Não sei onde aparece |

## Onde aparece no Funcionário (Frontend - EditEmployeeModal):

| Campo em Inglês | PT-BR: O que significa | Existe no Banco de Dados? |
|-----------------|------------------------|---------------------------|
| `lateToleranceMinutes` | **Tolerância de Atraso do Funcionário** - Quantos minutos ESTE funcionário pode atrasar | ❌ **NÃO EXISTE** no banco |
| `toleranceMinutes` | **Tolerância para Hora Extra** - Minutos que não contam como hora extra | ❌ **NÃO EXISTE** no banco |

## ⚠️ PROBLEMA ENCONTRADO:

**O que está acontecendo:**
1. Na tela de editar funcionário, aparece um campo "Tolerância de Atraso (minutos)"
2. Você pode digitar um valor (ex: 20 minutos)
3. Você clica em Salvar
4. **MAS O VALOR NÃO É SALVO!** Porque esse campo não existe no banco de dados
5. Quando você abre a tela de novo, volta para o valor padrão (15 minutos)

**Por que isso acontece:**
- Alguém criou o campo na tela (frontend)
- Mas esqueceu de criar o campo no banco de dados (schema)
- Então a tela mostra, você edita, mas não salva em lugar nenhum

## 🔧 OPÇÕES PARA RESOLVER:

**Opção A - Remover do funcionário (mais simples):**
- Tolerância é regra da EMPRESA, igual para todos
- Remove o campo da tela do funcionário
- Usa apenas a configuração da Conformidade CLT

**Opção B - Criar no banco de dados:**
- Adiciona o campo no banco de dados
- Funcionário pode ter tolerância diferente da empresa
- Se funcionário não tiver configurado → usa o da empresa

**Qual você prefere?**

---

# 3️⃣ TAXAS DE HORA EXTRA E ADICIONAIS

## Onde está configurado:

### Na Empresa (Company) - Configuração GLOBAL para todos:
| Campo em Inglês | PT-BR: O que significa | Valor Padrão |
|-----------------|------------------------|--------------|
| `customOvertimeRate` | **Taxa de Hora Extra** - Quanto paga a mais por hora extra. 1.5 = 50% a mais (R$10/hora vira R$15/hora) | 1.5 (50%) |
| `customHolidayRate` | **Taxa de Feriado** - Quanto paga a mais em feriado. 2.0 = 100% a mais (R$10/hora vira R$20/hora) | 2.0 (100%) |

### No Funcionário (Employee) - Configuração INDIVIDUAL:
| Campo em Inglês | PT-BR: O que significa | Valor Padrão |
|-----------------|------------------------|--------------|
| `overtimeRate` | **Taxa de Hora Extra do Funcionário** - Taxa específica para ESTE funcionário | null (usa da empresa) |
| `weekendRate` | **Taxa de Fim de Semana** - Quanto paga a mais no sábado/domingo | null |
| `holidayRate` | **Taxa de Feriado do Funcionário** - Taxa específica para ESTE funcionário | null |
| `nightShiftRate` | **Taxa de Adicional Noturno** - Quanto paga a mais no horário noturno (22h-05h) | null |

## ✅ COMO FUNCIONA (ou deveria funcionar):

**Exemplo prático:**

1. **Empresa configura:** Taxa de hora extra = 1.5 (50% a mais)
2. **Todos os funcionários** recebem 50% a mais na hora extra
3. **Mas o gerente** é especial, você quer pagar 70% a mais para ele
4. **No cadastro do gerente**, você coloca Taxa de hora extra = 1.7
5. **Resultado:** Gerente recebe 70%, os outros recebem 50%

**Hierarquia:**
```
Se funcionário tem taxa configurada → usa a do funcionário
Se funcionário NÃO tem (null) → usa a da empresa
```

## ⚠️ PRECISA VERIFICAR:

- Essa lógica está implementada no código?
- Ou o campo do funcionário existe mas não é usado?

---

# 4️⃣ ADICIONAL NOTURNO

## Onde está configurado:

### Na Configuração da Folha (PayrollConfig):
| Campo em Inglês | PT-BR: O que significa | Valor Padrão |
|-----------------|------------------------|--------------|
| `enableNightShift` | **Habilitar Adicional Noturno** - Liga ou desliga o adicional noturno | true |
| `nightShiftStart` | **Início do Horário Noturno** - A partir de que hora é considerado noturno | "22:00" |
| `nightShiftEnd` | **Fim do Horário Noturno** - Até que hora é considerado noturno | "05:00" |
| `nightShiftPercentage` | **Percentual do Adicional Noturno** - Quanto % paga a mais. 20 = 20% a mais | 20% |

### No Funcionário (Employee):
| Campo em Inglês | PT-BR: O que significa | Valor Padrão |
|-----------------|------------------------|--------------|
| `nightShiftRate` | **Taxa de Adicional Noturno do Funcionário** - Taxa específica para ESTE funcionário. 1.2 = 20% a mais | null |

## ⚠️ OBSERVAÇÃO IMPORTANTE (sua ideia está correta!):

**Você disse:**
> "Se a empresa trabalha das 08:00 às 18:00, não faz sentido ter adicional noturno"

**Isso está CERTO!** Se a empresa funciona só de dia:
- Nenhum funcionário vai trabalhar à noite
- Não faz sentido mostrar configuração de adicional noturno
- Deveria estar escondido ou bloqueado

## 🔧 O QUE PRECISA FAZER:

1. **Verificar horário da empresa** antes de mostrar opções
2. **Se empresa funciona só de dia** (ex: 08:00-18:00) → esconder adicional noturno
3. **Se empresa funciona à noite** (ex: 18:00-06:00) → mostrar adicional noturno

---

# 5️⃣ CAMPOS OBSOLETOS (NÃO USADOS)

## Na Empresa (Company):

| Campo | PT-BR | Situação |
|-------|-------|----------|
| `toleranceEntryAfterMin` | Tolerância de entrada depois (minutos) | ❌ **NÃO É USADO EM LUGAR NENHUM** |
| `toleranceExitAfterMin` | Tolerância de saída depois (minutos) | ❌ **NÃO É USADO EM LUGAR NENHUM** |

## ✅ VERIFICADO:

Pesquisei em todo o código do projeto e esses dois campos:
- Existem no banco de dados (schema.prisma)
- **MAS não são usados em nenhuma tela**
- **MAS não são usados em nenhum cálculo**
- São campos "fantasmas" - estão lá mas não fazem nada

## 🔧 AÇÃO RECOMENDADA:

**Remover esses campos do banco de dados** - são lixo que só confunde.

---

# 📋 RESUMO - O QUE PRECISA DECIDIR

## Decisão 1: Tolerância por funcionário
- **Opção A:** Tolerância é da empresa, igual para todos (remover da tela do funcionário)
- **Opção B:** Cada funcionário pode ter tolerância diferente (criar campo no banco)

## Decisão 2: Campos duplicados
- Verificar se `toleranceEntryAfterMin` e `toleranceExitAfterMin` são usados
- Se não forem → remover do banco de dados

## Decisão 3: Validações inteligentes
- Bloquear horário do funcionário fora do horário da empresa
- Esconder adicional noturno se empresa não funciona à noite
- Bloquear escalas incompatíveis com horário da empresa

---

# 🎯 ANTES DE IMPLEMENTAR ESCALAS

1. ✅ Resolver as decisões acima
2. ✅ Limpar campos não usados
3. ✅ Implementar validações
4. ✅ Então implementar Gestão de Escalas
