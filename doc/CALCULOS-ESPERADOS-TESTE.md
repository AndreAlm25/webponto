# 📊 Cálculos Esperados - Teste de Holerites (4 Meses)

> ⚠️ **DOCUMENTO GERADO AUTOMATICAMENTE**
> Este documento é gerado pelo seed `99-generate-doc.seed.ts` baseado nos dados reais do banco.
> **Última atualização**: Janeiro/2026 - 29/01/2026, 07:08:40

Este documento contém os cálculos esperados para **TODOS os meses** gerados pelos seeds.
Use para validar se o sistema está calculando corretamente.

---

## 📅 Meses Gerados

| # | Mês/Ano | Status Folha | Status Holerites |
|---|---------|--------------|------------------|
| 1 | **Outubro/2025** | PAID | Todos PAID e assinados |
| 2 | **Novembro/2025** | PAID | Todos PAID e assinados |
| 3 | **Dezembro/2025** | APPROVED | Mistura (PAID, APPROVED, CALCULATED, PENDING) |
| 4 | **Janeiro/2026** | DRAFT | Todos CALCULATED (mês atual - parcial) |

---

## 🏢 Configurações das Empresas

### Acme Tech
| Config | Valor |
|--------|-------|
| CNPJ | 45.987.321/0001-55 |
| INSS/IRRF/FGTS | ✅ Habilitado |
| **Desconto Atrasos** | ✅ `enableLateDiscount = true` |
| Vale-Transporte | 6% |
| Plano Saúde | R$ 350.00 |
| Plano Dental | R$ 50.00 |

### Beta Solutions
| Config | Valor |
|--------|-------|
| CNPJ | 78.654.321/0001-88 |
| INSS/IRRF/FGTS | ✅ Habilitado |
| **Desconto Atrasos** | ❌ `enableLateDiscount = false` |
| Vale-Transporte | 6% |
| Plano Saúde | R$ 400.00 |
| Plano Dental | R$ 0.00 |

---

# 🏭 ACME TECH

> ✅ Atrasos são DESCONTADOS do salário

---

## 👤 João da Silva (REG001)

| Dado | Valor |
|------|-------|
| Email | joao.silva@acmetech.com.br |
| Cargo | Desenvolvedor |
| Departamento | Tecnologia |
| Salário Base | R$ 5.200,00 |
| Valor Hora | R$ 23.64 (5200/220) |

### Outubro/2025 (PAID ✅)

| Item | Valor |
|------|-------|
| Status | PAID |
| Dias Trabalhados | 19 |
| Faltas/Dias não trabalhados | 3 |
| Atrasos | 90 min |

```
PROVENTOS:
  Salário Base:                    R$ 5.200,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 5.200,00

DESCONTOS:
  Faltas/Dias não trab. (3):    R$ 520,00
  Atrasos (90min):              R$ 35,45
  INSS (10.52%):                   R$ 546,82
  IRRF (8.26%):                   R$ 384,20
  Vale-Transporte (6%):            R$ 312,00
  Plano de Saúde:                  R$ 350,00
  Plano Dental:                    R$ 50,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 2.198,47

LÍQUIDO:                           R$ 3.001,53
FGTS (8%):                         R$ 416,00

⚠️ DADOS DE ATRASO:
  lateMinutes: 90
  lateValue: R$ 35.45
  lateDiscounted: true
```

### Novembro/2025 (PAID ✅)

| Item | Valor |
|------|-------|
| Status | PAID |
| Dias Trabalhados | 16 |
| Faltas/Dias não trabalhados | 6 |
| Atrasos | 90 min |

```
PROVENTOS:
  Salário Base:                    R$ 5.200,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 5.200,00

DESCONTOS:
  Faltas/Dias não trab. (6):    R$ 1.040,00
  Atrasos (90min):              R$ 35,45
  INSS (10.52%):                   R$ 546,82
  IRRF (8.26%):                   R$ 384,20
  Vale-Transporte (6%):            R$ 312,00
  Plano de Saúde:                  R$ 350,00
  Plano Dental:                    R$ 50,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 2.718,47

LÍQUIDO:                           R$ 2.481,53
FGTS (8%):                         R$ 416,00

⚠️ DADOS DE ATRASO:
  lateMinutes: 90
  lateValue: R$ 35.45
  lateDiscounted: true
```

### Dezembro/2025 (APPROVED ⏳)

| Item | Valor |
|------|-------|
| Status | APPROVED |
| Dias Trabalhados | 19 |
| Faltas/Dias não trabalhados | 3 |
| Atrasos | 90 min |

```
PROVENTOS:
  Salário Base:                    R$ 5.200,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 5.200,00

DESCONTOS:
  Faltas/Dias não trab. (3):    R$ 520,00
  Atrasos (90min):              R$ 35,45
  INSS (10.52%):                   R$ 546,82
  IRRF (8.26%):                   R$ 384,20
  Vale-Transporte (6%):            R$ 312,00
  Plano de Saúde:                  R$ 350,00
  Plano Dental:                    R$ 50,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 2.198,47

LÍQUIDO:                           R$ 3.001,53
FGTS (8%):                         R$ 416,00

⚠️ DADOS DE ATRASO:
  lateMinutes: 90
  lateValue: R$ 35.45
  lateDiscounted: true
```

### Janeiro/2026 (CALCULATED 📊)

| Item | Valor |
|------|-------|
| Status | CALCULATED |
| Dias Trabalhados | 16 |
| Faltas/Dias não trabalhados | 6 |
| Atrasos | 90 min |

```
PROVENTOS:
  Salário Base:                    R$ 5.200,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 5.200,00

DESCONTOS:
  Faltas/Dias não trab. (6):    R$ 1.040,00
  Atrasos (90min):              R$ 35,45
  INSS (10.52%):                   R$ 546,82
  IRRF (8.26%):                   R$ 384,20
  Vale-Transporte (6%):            R$ 312,00
  Plano de Saúde:                  R$ 350,00
  Plano Dental:                    R$ 50,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 2.718,47

LÍQUIDO:                           R$ 2.481,53
FGTS (8%):                         R$ 416,00

⚠️ DADOS DE ATRASO:
  lateMinutes: 90
  lateValue: R$ 35.45
  lateDiscounted: true
```

---

## 👤 Maria Souza (REG002)

| Dado | Valor |
|------|-------|
| Email | maria.souza@acmetech.com.br |
| Cargo | Analista de RH |
| Departamento | Recursos Humanos |
| Salário Base | R$ 6.300,00 |
| Valor Hora | R$ 28.64 (6300/220) |

### Outubro/2025 (PAID ✅)

| Item | Valor |
|------|-------|
| Status | PAID |
| Dias Trabalhados | 23 |
| Faltas/Dias não trabalhados | 0 |
| Atrasos | 0 min |

```
PROVENTOS:
  Salário Base:                    R$ 6.300,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 6.300,00

DESCONTOS:
  INSS (11.12%):                   R$ 700,82
  IRRF (11.50%):                   R$ 643,77
  Vale-Transporte (6%):            R$ 378,00
  Plano de Saúde:                  R$ 350,00
  Plano Dental:                    R$ 50,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 2.122,59

LÍQUIDO:                           R$ 4.177,41
FGTS (8%):                         R$ 504,00

```

### Novembro/2025 (PAID ✅)

| Item | Valor |
|------|-------|
| Status | PAID |
| Dias Trabalhados | 20 |
| Faltas/Dias não trabalhados | 2 |
| Atrasos | 0 min |

```
PROVENTOS:
  Salário Base:                    R$ 6.300,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 6.300,00

DESCONTOS:
  Faltas/Dias não trab. (2):    R$ 420,00
  INSS (11.12%):                   R$ 700,82
  IRRF (11.50%):                   R$ 643,77
  Vale-Transporte (6%):            R$ 378,00
  Plano de Saúde:                  R$ 350,00
  Plano Dental:                    R$ 50,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 2.542,59

LÍQUIDO:                           R$ 3.757,41
FGTS (8%):                         R$ 504,00

```

### Dezembro/2025 (PAID ✅)

| Item | Valor |
|------|-------|
| Status | PAID |
| Dias Trabalhados | 23 |
| Faltas/Dias não trabalhados | 0 |
| Atrasos | 0 min |

```
PROVENTOS:
  Salário Base:                    R$ 6.300,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 6.300,00

DESCONTOS:
  INSS (11.12%):                   R$ 700,82
  IRRF (11.50%):                   R$ 643,77
  Vale-Transporte (6%):            R$ 378,00
  Plano de Saúde:                  R$ 350,00
  Plano Dental:                    R$ 50,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 2.122,59

LÍQUIDO:                           R$ 4.177,41
FGTS (8%):                         R$ 504,00

```

### Janeiro/2026 (CALCULATED 📊)

| Item | Valor |
|------|-------|
| Status | CALCULATED |
| Dias Trabalhados | 20 |
| Faltas/Dias não trabalhados | 2 |
| Atrasos | 0 min |

```
PROVENTOS:
  Salário Base:                    R$ 6.300,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 6.300,00

DESCONTOS:
  Faltas/Dias não trab. (2):    R$ 420,00
  INSS (11.12%):                   R$ 700,82
  IRRF (11.50%):                   R$ 643,77
  Vale-Transporte (6%):            R$ 378,00
  Plano de Saúde:                  R$ 350,00
  Plano Dental:                    R$ 50,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 2.542,59

LÍQUIDO:                           R$ 3.757,41
FGTS (8%):                         R$ 504,00

```

---

## 👤 Carlos Pereira (REG003)

| Dado | Valor |
|------|-------|
| Email | carlos.pereira@acmetech.com.br |
| Cargo | Gerente de Projetos |
| Departamento | Tecnologia |
| Salário Base | R$ 8.500,00 |
| Valor Hora | R$ 38.64 (8500/220) |

### Outubro/2025 (PAID ✅)

| Item | Valor |
|------|-------|
| Status | PAID |
| Dias Trabalhados | 11 |
| Faltas/Dias não trabalhados | 11 |
| Atrasos | 15 min |

```
PROVENTOS:
  Salário Base:                    R$ 8.500,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 8.500,00

DESCONTOS:
  Faltas/Dias não trab. (11):    R$ 3.116,67
  Atrasos (15min):              R$ 9,66
  INSS (10.69%):                   R$ 908,86
  IRRF (15.70%):                   R$ 1.191,56
  Vale-Transporte (6%):            R$ 510,00
  Plano de Saúde:                  R$ 350,00
  Plano Dental:                    R$ 50,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 6.136,75

LÍQUIDO:                           R$ 2.363,25
FGTS (8%):                         R$ 680,00

⚠️ DADOS DE ATRASO:
  lateMinutes: 15
  lateValue: R$ 9.66
  lateDiscounted: true
```

### Novembro/2025 (PAID ✅)

| Item | Valor |
|------|-------|
| Status | PAID |
| Dias Trabalhados | 10 |
| Faltas/Dias não trabalhados | 12 |
| Atrasos | 15 min |

```
PROVENTOS:
  Salário Base:                    R$ 8.500,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 8.500,00

DESCONTOS:
  Faltas/Dias não trab. (12):    R$ 3.400,00
  Atrasos (15min):              R$ 9,66
  INSS (10.69%):                   R$ 908,86
  IRRF (15.70%):                   R$ 1.191,56
  Vale-Transporte (6%):            R$ 510,00
  Plano de Saúde:                  R$ 350,00
  Plano Dental:                    R$ 50,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 6.420,08

LÍQUIDO:                           R$ 2.079,92
FGTS (8%):                         R$ 680,00

⚠️ DADOS DE ATRASO:
  lateMinutes: 15
  lateValue: R$ 9.66
  lateDiscounted: true
```

### Dezembro/2025 (CALCULATED 📊)

| Item | Valor |
|------|-------|
| Status | CALCULATED |
| Dias Trabalhados | 11 |
| Faltas/Dias não trabalhados | 11 |
| Atrasos | 15 min |

```
PROVENTOS:
  Salário Base:                    R$ 8.500,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 8.500,00

DESCONTOS:
  Faltas/Dias não trab. (11):    R$ 3.116,67
  Atrasos (15min):              R$ 9,66
  INSS (10.69%):                   R$ 908,86
  IRRF (15.70%):                   R$ 1.191,56
  Vale-Transporte (6%):            R$ 510,00
  Plano de Saúde:                  R$ 350,00
  Plano Dental:                    R$ 50,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 6.136,75

LÍQUIDO:                           R$ 2.363,25
FGTS (8%):                         R$ 680,00

⚠️ DADOS DE ATRASO:
  lateMinutes: 15
  lateValue: R$ 9.66
  lateDiscounted: true
```

### Janeiro/2026 (CALCULATED 📊)

| Item | Valor |
|------|-------|
| Status | CALCULATED |
| Dias Trabalhados | 10 |
| Faltas/Dias não trabalhados | 12 |
| Atrasos | 15 min |

```
PROVENTOS:
  Salário Base:                    R$ 8.500,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 8.500,00

DESCONTOS:
  Faltas/Dias não trab. (12):    R$ 3.400,00
  Atrasos (15min):              R$ 9,66
  INSS (10.69%):                   R$ 908,86
  IRRF (15.70%):                   R$ 1.191,56
  Vale-Transporte (6%):            R$ 510,00
  Plano de Saúde:                  R$ 350,00
  Plano Dental:                    R$ 50,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 6.420,08

LÍQUIDO:                           R$ 2.079,92
FGTS (8%):                         R$ 680,00

⚠️ DADOS DE ATRASO:
  lateMinutes: 15
  lateValue: R$ 9.66
  lateDiscounted: true
```

---

## 👤 Ana Oliveira (REG004)

| Dado | Valor |
|------|-------|
| Email | ana.oliveira@acmetech.com.br |
| Cargo | Analista Financeiro |
| Departamento | Financeiro |
| Salário Base | R$ 5.800,00 |
| Valor Hora | R$ 26.36 (5800/220) |

### Outubro/2025 (PAID ✅)

| Item | Valor |
|------|-------|
| Status | PAID |
| Dias Trabalhados | 0 |
| Faltas/Dias não trabalhados | 22 |
| Atrasos | 0 min |

```
PROVENTOS:
  Salário Base:                    R$ 5.800,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 5.800,00

DESCONTOS:
  Faltas/Dias não trab. (22):    R$ 4.253,33
  INSS (10.88%):                   R$ 630,82
  IRRF (10.17%):                   R$ 525,52
  Vale-Transporte (6%):            R$ 348,00
  Plano de Saúde:                  R$ 350,00
  Plano Dental:                    R$ 50,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 6.157,68

LÍQUIDO:                           R$ -357,68
FGTS (8%):                         R$ 464,00

```

### Novembro/2025 (PAID ✅)

| Item | Valor |
|------|-------|
| Status | PAID |
| Dias Trabalhados | 0 |
| Faltas/Dias não trabalhados | 22 |
| Atrasos | 0 min |

```
PROVENTOS:
  Salário Base:                    R$ 5.800,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 5.800,00

DESCONTOS:
  Faltas/Dias não trab. (22):    R$ 4.253,33
  INSS (10.88%):                   R$ 630,82
  IRRF (10.17%):                   R$ 525,52
  Vale-Transporte (6%):            R$ 348,00
  Plano de Saúde:                  R$ 350,00
  Plano Dental:                    R$ 50,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 6.157,68

LÍQUIDO:                           R$ -357,68
FGTS (8%):                         R$ 464,00

```

### Dezembro/2025 (PENDING ⏸️)

| Item | Valor |
|------|-------|
| Status | PENDING |
| Dias Trabalhados | 0 |
| Faltas/Dias não trabalhados | 22 |
| Atrasos | 0 min |

```
PROVENTOS:
  Salário Base:                    R$ 5.800,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 5.800,00

DESCONTOS:
  Faltas/Dias não trab. (22):    R$ 4.253,33
  INSS (10.88%):                   R$ 630,82
  IRRF (10.17%):                   R$ 525,52
  Vale-Transporte (6%):            R$ 348,00
  Plano de Saúde:                  R$ 350,00
  Plano Dental:                    R$ 50,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 6.157,68

LÍQUIDO:                           R$ -357,68
FGTS (8%):                         R$ 464,00

```

### Janeiro/2026 (CALCULATED 📊)

| Item | Valor |
|------|-------|
| Status | CALCULATED |
| Dias Trabalhados | 0 |
| Faltas/Dias não trabalhados | 22 |
| Atrasos | 0 min |

```
PROVENTOS:
  Salário Base:                    R$ 5.800,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 5.800,00

DESCONTOS:
  Faltas/Dias não trab. (22):    R$ 4.253,33
  INSS (10.88%):                   R$ 630,82
  IRRF (10.17%):                   R$ 525,52
  Vale-Transporte (6%):            R$ 348,00
  Plano de Saúde:                  R$ 350,00
  Plano Dental:                    R$ 50,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 6.157,68

LÍQUIDO:                           R$ -357,68
FGTS (8%):                         R$ 464,00

```

---

## 👤 Paulo Santos (REG005)

| Dado | Valor |
|------|-------|
| Email | paulo.santos@acmetech.com.br |
| Cargo | Suporte Técnico |
| Departamento | Operações |
| Salário Base | R$ 4.800,00 |
| Valor Hora | R$ 21.82 (4800/220) |

### Outubro/2025 (PAID ✅)

| Item | Valor |
|------|-------|
| Status | PAID |
| Dias Trabalhados | 23 |
| Faltas/Dias não trabalhados | 0 |
| Atrasos | 0 min |

```
PROVENTOS:
  Salário Base:                    R$ 4.800,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 4.800,00

DESCONTOS:
  INSS (10.23%):                   R$ 490,82
  IRRF (7.12%):                   R$ 306,80
  Vale-Transporte (6%):            R$ 288,00
  Plano de Saúde:                  R$ 350,00
  Plano Dental:                    R$ 50,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 1.485,61

LÍQUIDO:                           R$ 3.314,39
FGTS (8%):                         R$ 384,00

```

### Novembro/2025 (PAID ✅)

| Item | Valor |
|------|-------|
| Status | PAID |
| Dias Trabalhados | 20 |
| Faltas/Dias não trabalhados | 2 |
| Atrasos | 0 min |

```
PROVENTOS:
  Salário Base:                    R$ 4.800,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 4.800,00

DESCONTOS:
  Faltas/Dias não trab. (2):    R$ 320,00
  INSS (10.23%):                   R$ 490,82
  IRRF (7.12%):                   R$ 306,80
  Vale-Transporte (6%):            R$ 288,00
  Plano de Saúde:                  R$ 350,00
  Plano Dental:                    R$ 50,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 1.805,61

LÍQUIDO:                           R$ 2.994,39
FGTS (8%):                         R$ 384,00

```

### Dezembro/2025 (PAID ✅)

| Item | Valor |
|------|-------|
| Status | PAID |
| Dias Trabalhados | 23 |
| Faltas/Dias não trabalhados | 0 |
| Atrasos | 0 min |

```
PROVENTOS:
  Salário Base:                    R$ 4.800,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 4.800,00

DESCONTOS:
  INSS (10.23%):                   R$ 490,82
  IRRF (7.12%):                   R$ 306,80
  Vale-Transporte (6%):            R$ 288,00
  Plano de Saúde:                  R$ 350,00
  Plano Dental:                    R$ 50,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 1.485,61

LÍQUIDO:                           R$ 3.314,39
FGTS (8%):                         R$ 384,00

```

### Janeiro/2026 (CALCULATED 📊)

| Item | Valor |
|------|-------|
| Status | CALCULATED |
| Dias Trabalhados | 20 |
| Faltas/Dias não trabalhados | 2 |
| Atrasos | 0 min |

```
PROVENTOS:
  Salário Base:                    R$ 4.800,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 4.800,00

DESCONTOS:
  Faltas/Dias não trab. (2):    R$ 320,00
  INSS (10.23%):                   R$ 490,82
  IRRF (7.12%):                   R$ 306,80
  Vale-Transporte (6%):            R$ 288,00
  Plano de Saúde:                  R$ 350,00
  Plano Dental:                    R$ 50,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 1.805,61

LÍQUIDO:                           R$ 2.994,39
FGTS (8%):                         R$ 384,00

```

---

# 🏭 BETA SOLUTIONS

> ⚠️ **IMPORTANTE:** Atrasos são **REGISTRADOS** mas **NÃO DESCONTADOS** do salário!

---

## 👤 Lucas Ferreira (BETA001)

| Dado | Valor |
|------|-------|
| Email | lucas.ferreira@betasolutions.com.br |
| Cargo | Desenvolvedor Junior |
| Departamento | Tecnologia |
| Salário Base | R$ 4.500,00 |
| Valor Hora | R$ 20.45 (4500/220) |

### Outubro/2025 (PAID ✅)

| Item | Valor |
|------|-------|
| Status | PAID |
| Dias Trabalhados | 23 |
| Faltas/Dias não trabalhados | 0 |
| Atrasos | 100 min |

```
PROVENTOS:
  Salário Base:                    R$ 4.500,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 4.500,00

DESCONTOS:
  Atrasos:                         R$     0,00  ← NÃO DESCONTADO!
  INSS (9.97%):                   R$ 448,82
  IRRF (6.14%):                   R$ 248,75
  Vale-Transporte (6%):            R$ 270,00
  Plano de Saúde:                  R$ 400,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 1.367,56

LÍQUIDO:                           R$ 3.132,44
FGTS (8%):                         R$ 360,00

⚠️ DADOS DE ATRASO:
  lateMinutes: 100
  lateValue: R$ 34.09
  lateDiscounted: false
```

### Novembro/2025 (PAID ✅)

| Item | Valor |
|------|-------|
| Status | PAID |
| Dias Trabalhados | 20 |
| Faltas/Dias não trabalhados | 2 |
| Atrasos | 100 min |

```
PROVENTOS:
  Salário Base:                    R$ 4.500,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 4.500,00

DESCONTOS:
  Faltas/Dias não trab. (2):    R$ 300,00
  Atrasos:                         R$     0,00  ← NÃO DESCONTADO!
  INSS (9.97%):                   R$ 448,82
  IRRF (6.14%):                   R$ 248,75
  Vale-Transporte (6%):            R$ 270,00
  Plano de Saúde:                  R$ 400,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 1.667,56

LÍQUIDO:                           R$ 2.832,44
FGTS (8%):                         R$ 360,00

⚠️ DADOS DE ATRASO:
  lateMinutes: 100
  lateValue: R$ 34.09
  lateDiscounted: false
```

### Dezembro/2025 (PAID ✅)

| Item | Valor |
|------|-------|
| Status | PAID |
| Dias Trabalhados | 23 |
| Faltas/Dias não trabalhados | 0 |
| Atrasos | 100 min |

```
PROVENTOS:
  Salário Base:                    R$ 4.500,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 4.500,00

DESCONTOS:
  Atrasos:                         R$     0,00  ← NÃO DESCONTADO!
  INSS (9.97%):                   R$ 448,82
  IRRF (6.14%):                   R$ 248,75
  Vale-Transporte (6%):            R$ 270,00
  Plano de Saúde:                  R$ 400,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 1.367,56

LÍQUIDO:                           R$ 3.132,44
FGTS (8%):                         R$ 360,00

⚠️ DADOS DE ATRASO:
  lateMinutes: 100
  lateValue: R$ 34.09
  lateDiscounted: false
```

### Janeiro/2026 (CALCULATED 📊)

| Item | Valor |
|------|-------|
| Status | CALCULATED |
| Dias Trabalhados | 20 |
| Faltas/Dias não trabalhados | 2 |
| Atrasos | 100 min |

```
PROVENTOS:
  Salário Base:                    R$ 4.500,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 4.500,00

DESCONTOS:
  Faltas/Dias não trab. (2):    R$ 300,00
  Atrasos:                         R$     0,00  ← NÃO DESCONTADO!
  INSS (9.97%):                   R$ 448,82
  IRRF (6.14%):                   R$ 248,75
  Vale-Transporte (6%):            R$ 270,00
  Plano de Saúde:                  R$ 400,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 1.667,56

LÍQUIDO:                           R$ 2.832,44
FGTS (8%):                         R$ 360,00

⚠️ DADOS DE ATRASO:
  lateMinutes: 100
  lateValue: R$ 34.09
  lateDiscounted: false
```

---

## 👤 Juliana Costa (BETA002)

| Dado | Valor |
|------|-------|
| Email | juliana.costa@betasolutions.com.br |
| Cargo | Analista de RH |
| Departamento | Recursos Humanos |
| Salário Base | R$ 5.500,00 |
| Valor Hora | R$ 25.00 (5500/220) |

### Outubro/2025 (PAID ✅)

| Item | Valor |
|------|-------|
| Status | PAID |
| Dias Trabalhados | 23 |
| Faltas/Dias não trabalhados | 0 |
| Atrasos | 0 min |

```
PROVENTOS:
  Salário Base:                    R$ 5.500,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 5.500,00

DESCONTOS:
  INSS (10.71%):                   R$ 588,82
  IRRF (9.26%):                   R$ 454,57
  Vale-Transporte (6%):            R$ 330,00
  Plano de Saúde:                  R$ 400,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 1.773,39

LÍQUIDO:                           R$ 3.726,61
FGTS (8%):                         R$ 440,00

```

### Novembro/2025 (PAID ✅)

| Item | Valor |
|------|-------|
| Status | PAID |
| Dias Trabalhados | 20 |
| Faltas/Dias não trabalhados | 2 |
| Atrasos | 0 min |

```
PROVENTOS:
  Salário Base:                    R$ 5.500,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 5.500,00

DESCONTOS:
  Faltas/Dias não trab. (2):    R$ 366,67
  INSS (10.71%):                   R$ 588,82
  IRRF (9.26%):                   R$ 454,57
  Vale-Transporte (6%):            R$ 330,00
  Plano de Saúde:                  R$ 400,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 2.140,06

LÍQUIDO:                           R$ 3.359,94
FGTS (8%):                         R$ 440,00

```

### Dezembro/2025 (APPROVED ⏳)

| Item | Valor |
|------|-------|
| Status | APPROVED |
| Dias Trabalhados | 23 |
| Faltas/Dias não trabalhados | 0 |
| Atrasos | 0 min |

```
PROVENTOS:
  Salário Base:                    R$ 5.500,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 5.500,00

DESCONTOS:
  INSS (10.71%):                   R$ 588,82
  IRRF (9.26%):                   R$ 454,57
  Vale-Transporte (6%):            R$ 330,00
  Plano de Saúde:                  R$ 400,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 1.773,39

LÍQUIDO:                           R$ 3.726,61
FGTS (8%):                         R$ 440,00

```

### Janeiro/2026 (CALCULATED 📊)

| Item | Valor |
|------|-------|
| Status | CALCULATED |
| Dias Trabalhados | 20 |
| Faltas/Dias não trabalhados | 2 |
| Atrasos | 0 min |

```
PROVENTOS:
  Salário Base:                    R$ 5.500,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 5.500,00

DESCONTOS:
  Faltas/Dias não trab. (2):    R$ 366,67
  INSS (10.71%):                   R$ 588,82
  IRRF (9.26%):                   R$ 454,57
  Vale-Transporte (6%):            R$ 330,00
  Plano de Saúde:                  R$ 400,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 2.140,06

LÍQUIDO:                           R$ 3.359,94
FGTS (8%):                         R$ 440,00

```

---

## 👤 Roberto Almeida (BETA003)

| Dado | Valor |
|------|-------|
| Email | roberto.almeida@betasolutions.com.br |
| Cargo | Diretor de Operações |
| Departamento | Diretoria |
| Salário Base | R$ 9.200,00 |
| Valor Hora | R$ 41.82 (9200/220) |

### Outubro/2025 (PAID ✅)

| Item | Valor |
|------|-------|
| Status | PAID |
| Dias Trabalhados | 23 |
| Faltas/Dias não trabalhados | 0 |
| Atrasos | 20 min |

```
PROVENTOS:
  Salário Base:                    R$ 9.200,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 9.200,00

DESCONTOS:
  Atrasos:                         R$     0,00  ← NÃO DESCONTADO!
  INSS (9.88%):                   R$ 908,86
  IRRF (16.69%):                   R$ 1.384,06
  Vale-Transporte (6%):            R$ 552,00
  Plano de Saúde:                  R$ 400,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 3.244,92

LÍQUIDO:                           R$ 5.955,08
FGTS (8%):                         R$ 736,00

⚠️ DADOS DE ATRASO:
  lateMinutes: 20
  lateValue: R$ 13.94
  lateDiscounted: false
```

### Novembro/2025 (PAID ✅)

| Item | Valor |
|------|-------|
| Status | PAID |
| Dias Trabalhados | 20 |
| Faltas/Dias não trabalhados | 2 |
| Atrasos | 20 min |

```
PROVENTOS:
  Salário Base:                    R$ 9.200,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 9.200,00

DESCONTOS:
  Faltas/Dias não trab. (2):    R$ 613,33
  Atrasos:                         R$     0,00  ← NÃO DESCONTADO!
  INSS (9.88%):                   R$ 908,86
  IRRF (16.69%):                   R$ 1.384,06
  Vale-Transporte (6%):            R$ 552,00
  Plano de Saúde:                  R$ 400,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 3.858,26

LÍQUIDO:                           R$ 5.341,74
FGTS (8%):                         R$ 736,00

⚠️ DADOS DE ATRASO:
  lateMinutes: 20
  lateValue: R$ 13.94
  lateDiscounted: false
```

### Dezembro/2025 (PAID ✅)

| Item | Valor |
|------|-------|
| Status | PAID |
| Dias Trabalhados | 23 |
| Faltas/Dias não trabalhados | 0 |
| Atrasos | 20 min |

```
PROVENTOS:
  Salário Base:                    R$ 9.200,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 9.200,00

DESCONTOS:
  Atrasos:                         R$     0,00  ← NÃO DESCONTADO!
  INSS (9.88%):                   R$ 908,86
  IRRF (16.69%):                   R$ 1.384,06
  Vale-Transporte (6%):            R$ 552,00
  Plano de Saúde:                  R$ 400,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 3.244,92

LÍQUIDO:                           R$ 5.955,08
FGTS (8%):                         R$ 736,00

⚠️ DADOS DE ATRASO:
  lateMinutes: 20
  lateValue: R$ 13.94
  lateDiscounted: false
```

### Janeiro/2026 (CALCULATED 📊)

| Item | Valor |
|------|-------|
| Status | CALCULATED |
| Dias Trabalhados | 20 |
| Faltas/Dias não trabalhados | 2 |
| Atrasos | 20 min |

```
PROVENTOS:
  Salário Base:                    R$ 9.200,00
  ─────────────────────────────────────────────
  TOTAL PROVENTOS:                 R$ 9.200,00

DESCONTOS:
  Faltas/Dias não trab. (2):    R$ 613,33
  Atrasos:                         R$     0,00  ← NÃO DESCONTADO!
  INSS (9.88%):                   R$ 908,86
  IRRF (16.69%):                   R$ 1.384,06
  Vale-Transporte (6%):            R$ 552,00
  Plano de Saúde:                  R$ 400,00
  ─────────────────────────────────────────────
  TOTAL DESCONTOS:                 R$ 3.858,26

LÍQUIDO:                           R$ 5.341,74
FGTS (8%):                         R$ 736,00

⚠️ DADOS DE ATRASO:
  lateMinutes: 20
  lateValue: R$ 13.94
  lateDiscounted: false
```

---

# 📋 TABELA RESUMO - TODOS OS MESES

> **Valores gerados automaticamente do banco de dados**

## Acme Tech (enableLateDiscount = true)

| Funcionário | Salário | Out/25 | Nov/25 | Dez/25 | Jan/26 |
|-------------|---------|--------|--------|--------|--------|
| João da Silva | R$ 5.200 | R$ 3.001,53 (PAID) | R$ 2.481,53 (PAID) | R$ 3.001,53 (APPROVED) | R$ 2.481,53 (CALCULATED) |
| Maria Souza | R$ 6.300 | R$ 4.177,41 (PAID) | R$ 3.757,41 (PAID) | R$ 4.177,41 (PAID) | R$ 3.757,41 (CALCULATED) |
| Carlos Pereira | R$ 8.500 | R$ 2.363,25 (PAID) | R$ 2.079,92 (PAID) | R$ 2.363,25 (CALCULATED) | R$ 2.079,92 (CALCULATED) |
| Ana Oliveira | R$ 5.800 | R$ -357,68 (PAID) | R$ -357,68 (PAID) | R$ -357,68 (PENDING) | R$ -357,68 (CALCULATED) |
| Paulo Santos | R$ 4.800 | R$ 3.314,39 (PAID) | R$ 2.994,39 (PAID) | R$ 3.314,39 (PAID) | R$ 2.994,39 (CALCULATED) |

## Beta Solutions (enableLateDiscount = false)

| Funcionário | Salário | Out/25 | Nov/25 | Dez/25 | Jan/26 |
|-------------|---------|--------|--------|--------|--------|
| Lucas Ferreira | R$ 4.500 | R$ 3.132,44 (PAID) | R$ 2.832,44 (PAID) | R$ 3.132,44 (PAID) | R$ 2.832,44 (CALCULATED) |
| Juliana Costa | R$ 5.500 | R$ 3.726,61 (PAID) | R$ 3.359,94 (PAID) | R$ 3.726,61 (APPROVED) | R$ 3.359,94 (CALCULATED) |
| Roberto Almeida | R$ 9.200 | R$ 5.955,08 (PAID) | R$ 5.341,74 (PAID) | R$ 5.955,08 (PAID) | R$ 5.341,74 (CALCULATED) |

---

# 🔍 COMO TESTAR

```bash
# 1. Rodar os seeds
cd /root/Apps/webponto/backend
npx prisma db seed

# 2. Verificar no banco
npx prisma studio
# Tabela: Payslip - verificar registros
# Tabela: Payroll - verificar folhas
```

## Logins de Teste

| Empresa | Tipo | Email | Senha |
|---------|------|-------|-------|
| Acme Tech | Admin | admin@acmetech.com.br | 123456* |
| Acme Tech | Funcionário | joao.silva@acmetech.com.br | 123456* |
| Beta Solutions | Admin | admin@betasolutions.com.br | 123456* |
| Beta Solutions | Funcionário | lucas.ferreira@betasolutions.com.br | 123456* |

---

*Documento gerado automaticamente em: 29/01/2026, 07:08:40*
