# 📋 O que é Matrícula (registrationId)?

## Definição

**Matrícula** é um **código único** que identifica o funcionário dentro da empresa.

## Exemplos

- `FUNC001` - Funcionário 001
- `EMP-2024-001` - Empregado 2024 número 001
- `TI-001` - TI número 001
- `ADM-001` - Administrativo número 001

## Características

- ✅ **Obrigatório** no cadastro
- ✅ **Único** por empresa
- ✅ **Permanente** (não muda mesmo se funcionário mudar de cargo/departamento)
- ✅ **Formato livre** (cada empresa define seu padrão)

## Uso no Sistema

A matrícula é usada para:

1. **Identificação rápida** do funcionário
2. **Relatórios** e exportações
3. **Integração** com outros sistemas (folha de pagamento, ERP, etc)
4. **Busca** de funcionários

## Diferença entre Matrícula e ID

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| **ID** | Identificador interno do banco de dados (UUID) | `3b12c72d-f657-40c9-9f9d-2baaee50745c` |
| **Matrícula** | Código legível para humanos | `FUNC001` |

## Boas Práticas

### ✅ Recomendado

- Usar padrão sequencial: `FUNC001`, `FUNC002`, `FUNC003`
- Incluir ano: `2024-001`, `2024-002`
- Incluir departamento: `TI-001`, `ADM-001`

### ❌ Evitar

- Usar CPF como matrícula (dados sensíveis)
- Usar nome como matrícula (pode mudar)
- Usar números muito longos (dificulta memorização)

## Exemplo de Padrões por Empresa

### Empresa Pequena (< 50 funcionários)
```
FUNC001
FUNC002
FUNC003
```

### Empresa Média (50-500 funcionários)
```
2024-001
2024-002
2024-003
```

### Empresa Grande (> 500 funcionários)
```
TI-2024-001    (TI = Tecnologia da Informação)
ADM-2024-001   (ADM = Administrativo)
VEN-2024-001   (VEN = Vendas)
```

## No Sistema WebPonto

- Campo: `Employee.registrationId`
- Tipo: `String`
- Validação: Único por empresa (`@@unique([companyId, registrationId])`)
- Placeholder: `FUNC001`
