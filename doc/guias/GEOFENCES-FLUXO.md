# 📍 Fluxo de Geofences (Cercas Geográficas)

## O que são Geofences?

**Geofence** (cerca geográfica) é uma área circular definida por:
- **Centro**: Latitude e Longitude (coordenadas GPS)
- **Raio**: Distância em metros a partir do centro
- **Nome**: Identificação da cerca (ex: "Entrada Principal", "Filial Centro")

## Fluxo Completo

### 1. Criar uma Geofence

1. Acesse `/admin/acme-tech/geofences`
2. Preencha:
   - **Nome do ponto**: Ex: "Entrada Principal"
   - **Endereço**: Busque ou clique no mapa
   - **Coordenadas**: Ou cole diretamente (formato: `lat, lng`)
   - **Raio da cerca**: Ajuste o slider (50m a 1000m, padrão 200m)
3. Clique em **"Salvar geofence"**
4. A cerca é salva no banco de dados

### 2. Associar Geofence a um Funcionário

1. Acesse a tela de edição do funcionário
2. No campo **"Geofence"**, selecione a cerca desejada
3. Salve as alterações
4. Agora o funcionário está vinculado àquela cerca

### 3. Bater Ponto com Geofence

Quando o funcionário for bater ponto:

1. **Sistema captura a localização GPS** do dispositivo
2. **Calcula a distância** entre a localização atual e o centro da geofence
3. **Valida se está dentro do raio**:
   - ✅ **Dentro**: Permite bater ponto
   - ❌ **Fora**: Bloqueia e mostra mensagem de erro

## Modelo de Dados

### Tabela `geofences`

```sql
CREATE TABLE geofences (
  id           UUID PRIMARY KEY,
  company_id   UUID NOT NULL,          -- Empresa dona da cerca
  name         VARCHAR NOT NULL,        -- Nome da cerca
  center_lat   FLOAT NOT NULL,          -- Latitude do centro
  center_lng   FLOAT NOT NULL,          -- Longitude do centro
  radius_meters INT NOT NULL,           -- Raio em metros
  active       BOOLEAN DEFAULT true,    -- Ativa/Inativa
  created_at   TIMESTAMP,
  updated_at   TIMESTAMP
);
```

### Tabela `employees`

```sql
CREATE TABLE employees (
  id           UUID PRIMARY KEY,
  company_id   UUID NOT NULL,
  name         VARCHAR NOT NULL,
  geofence_id  UUID,                    -- Cerca associada (opcional)
  -- ... outros campos
);
```

## Exemplo Prático

### Cenário: Empresa com 2 filiais

**Filial Centro**:
- Nome: "Filial Centro"
- Centro: `-23.550520, -46.633308` (Av. Paulista)
- Raio: 200 metros

**Filial Zona Sul**:
- Nome: "Filial Zona Sul"
- Centro: `-23.654321, -46.712345`
- Raio: 300 metros

**Funcionários**:
- João → Associado à "Filial Centro"
- Maria → Associada à "Filial Zona Sul"
- Pedro → Sem geofence (pode bater ponto de qualquer lugar)

**Validação**:
- João tenta bater ponto na Av. Paulista (dentro de 200m) → ✅ Permitido
- João tenta bater ponto na Zona Sul → ❌ Bloqueado (fora da cerca)
- Maria tenta bater ponto na Zona Sul → ✅ Permitido
- Pedro bate ponto de qualquer lugar → ✅ Permitido (sem cerca)

## Configuração Atual

### Frontend

**Mapeamento de Slug para UUID**:
```typescript
const COMPANY_SLUG_TO_UUID = {
  'acme-tech': '00000000-0000-0000-0000-000000000001',
}
```

- URL usa **slug** (ex: `/admin/acme-tech/geofences`)
- Backend usa **UUID** (ex: `00000000-0000-0000-0000-000000000001`)
- Mapeamento converte slug → UUID

### Backend

**Validação de UUID**:
- `companyId` deve ser um UUID válido (formato: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
- Se não for UUID, retorna erro 400

## Próximos Passos

1. ✅ Criar empresa de exemplo no banco com UUID `00000000-0000-0000-0000-000000000001`
2. ✅ Testar criação de geofence
3. ⏳ Implementar tela de edição de funcionário com seleção de geofence
4. ⏳ Implementar validação de geofence no endpoint de bater ponto

## Comandos Úteis

### Criar empresa de exemplo (SQL)

```sql
INSERT INTO companies (
  id,
  cnpj,
  legal_name,
  trade_name,
  email,
  active
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '12345678000190',
  'ACME Tech Ltda',
  'ACME Tech',
  'contato@acme-tech.com.br',
  true
);
```

### Listar geofences de uma empresa

```sql
SELECT * FROM geofences 
WHERE company_id = '00000000-0000-0000-0000-000000000001' 
AND active = true;
```

### Associar geofence a funcionário

```sql
UPDATE employees 
SET geofence_id = '<ID_DA_GEOFENCE>' 
WHERE id = '<ID_DO_FUNCIONARIO>';
```
