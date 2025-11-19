# Lógica de Geolocalização e Ponto Remoto

## 📋 Resumo das Mudanças

Refatoração completa da lógica de geolocalização para simplificar e remover redundâncias.

### ❌ Campos Removidos (Deprecated)

- `Employee.requireGeolocation` - Redundante com `geofenceId`
- `Employee.minGeoAccuracyMeters` - Redundante com `Geofence.radiusMeters`

### ✅ Campos Mantidos

- `Employee.allowRemoteClockIn` - Permite bater ponto remotamente
- `Employee.allowFacialRecognition` - Permite reconhecimento facial
- `Employee.requireLiveness` - Exige prova de vida
- `Employee.geofenceId` - Cerca geográfica vinculada

---

## 🎯 Nova Lógica de Negócio

### 1️⃣ Login no App

**SEMPRE PERMITIDO** para todos os funcionários.

**Funcionário pode:**
- ✅ Ver histórico de pontos
- ✅ Ver holerites
- ✅ Ver escalas
- ✅ Justificar ausências
- ✅ Solicitar férias

---

### 2️⃣ Bater Ponto no App

#### **Cenário A: Ponto Presencial (allowRemoteClockIn = false)**

```typescript
{
  allowRemoteClockIn: false,
  geofenceId: null
}
```

**Comportamento:**
- ❌ Botão "Bater Ponto" **DESABILITADO** no app
- ℹ️ Mensagem: "Você só pode bater ponto no sistema da empresa"
- ✅ Pode bater ponto no tablet/sistema web da empresa
- 🚫 **Backend rejeita** tentativas de bater ponto via app

---

#### **Cenário B: Ponto Remoto Livre (allowRemoteClockIn = true, sem cerca)**

```typescript
{
  allowRemoteClockIn: true,
  geofenceId: null
}
```

**Comportamento:**
- ✅ Botão "Bater Ponto" **HABILITADO** no app
- ✅ Bate ponto de **qualquer lugar**
- 🌍 Não exige geolocalização
- ✅ Backend aceita sem validação de localização

---

#### **Cenário C: Ponto Remoto com Cerca (allowRemoteClockIn = true, com cerca)**

```typescript
{
  allowRemoteClockIn: true,
  geofenceId: "uuid-da-cerca"
}
```

**Comportamento:**
- ✅ Botão "Bater Ponto" **HABILITADO** no app
- 📍 **Exige geolocalização** automaticamente
- ✅ Se **dentro da cerca**: bate ponto
- ❌ Se **fora da cerca**: nega e explica
  - Mensagem: "Você está fora da área permitida. Distância: 250m (máximo: 100m)"

---

## 🔧 Validação no Backend

### Fluxo de Validação (`validateGeoAndPolicies`)

```typescript
// 1. Buscar funcionário com cerca
const employee = await prisma.employee.findFirst({
  where: { id: employeeId },
  include: { geofence: true }
})

// 2. Se não permite ponto remoto, retorna sem validar
if (!employee.allowRemoteClockIn) {
  return { geofenceStatus: undefined }
}

// 3. Se tem cerca vinculada, valida distância
if (employee.geofence) {
  // 3.1. Exige geolocalização
  if (!latitude || !longitude) {
    throw new BadRequestException('Geolocalização obrigatória')
  }

  // 3.2. Calcula distância
  const distance = haversineMeters(
    latitude, longitude,
    geofence.centerLat, geofence.centerLng
  )

  // 3.3. Valida se está dentro do raio
  if (distance > geofence.radiusMeters) {
    throw new BadRequestException(
      `Fora da área permitida. Distância: ${distance}m (máximo: ${geofence.radiusMeters}m)`
    )
  }
}

// 4. Prossegue com registro do ponto
```

---

## 📱 Interface do Usuário

### Modal de Cadastro de Funcionário

```typescript
// Campos exibidos:
☑️ Permitir ponto remoto
   ↳ Habilita/desabilita botão de ponto no app

☑️ Permitir reconhecimento facial
   ↳ Permite usar face para bater ponto

☑️ Exigir prova de vida
   ↳ Exige piscar/mover cabeça no reconhecimento facial

📍 Cerca Geográfica (select)
   ↳ Nenhuma: não valida localização
   ↳ Selecionar: valida se está dentro da cerca
```

### App Mobile - Tela de Ponto

```typescript
// Se allowRemoteClockIn = false
<Button disabled>
  <Lock className="mr-2" />
  Ponto apenas no sistema da empresa
</Button>

// Se allowRemoteClockIn = true
<Button onClick={handleClockIn}>
  <Clock className="mr-2" />
  Bater Ponto
</Button>
```

---

## 🗄️ Schema do Banco

```prisma
model Employee {
  // ... outros campos

  // Permissões de ponto
  allowRemoteClockIn     Boolean   @default(false)
  allowFacialRecognition Boolean   @default(false)
  requireLiveness        Boolean   @default(false)

  // Campos deprecated (manter por compatibilidade)
  requireGeolocation     Boolean   @default(false) // @deprecated
  minGeoAccuracyMeters   Int?                      // @deprecated

  // Cerca geográfica
  geofenceId             String?   @db.Uuid
  geofence               Geofence? @relation(fields: [geofenceId], references: [id])
}

model Geofence {
  id           String   @id @default(uuid())
  companyId    String   @db.Uuid
  name         String
  centerLat    Float    // Latitude do centro
  centerLng    Float    // Longitude do centro
  radiusMeters Int      // Raio em metros
  active       Boolean  @default(true)
  employees    Employee[]
}
```

---

## 🧪 Casos de Teste

### Teste 1: Funcionário Presencial
```typescript
// Dados
employee = {
  allowRemoteClockIn: false,
  geofenceId: null
}

// Tentativa de bater ponto via app
POST /api/time-entries/facial
{
  employeeId: "...",
  latitude: -23.5505,
  longitude: -46.6333
}

// Resultado esperado
❌ Backend retorna sem validar (early return)
✅ Ponto registrado normalmente (se for via sistema web)
```

### Teste 2: Funcionário Remoto Livre
```typescript
// Dados
employee = {
  allowRemoteClockIn: true,
  geofenceId: null
}

// Tentativa de bater ponto via app
POST /api/time-entries/facial
{
  employeeId: "...",
  latitude: -23.5505,
  longitude: -46.6333
}

// Resultado esperado
✅ Ponto registrado (sem validação de localização)
```

### Teste 3: Funcionário Remoto com Cerca (Dentro)
```typescript
// Dados
employee = {
  allowRemoteClockIn: true,
  geofenceId: "uuid-cerca-matriz"
}
geofence = {
  centerLat: -23.5505,
  centerLng: -46.6333,
  radiusMeters: 100
}

// Tentativa de bater ponto via app (dentro da cerca)
POST /api/time-entries/facial
{
  employeeId: "...",
  latitude: -23.5506, // ~11m de distância
  longitude: -46.6334
}

// Resultado esperado
✅ Ponto registrado (dentro do raio de 100m)
```

### Teste 4: Funcionário Remoto com Cerca (Fora)
```typescript
// Dados
employee = {
  allowRemoteClockIn: true,
  geofenceId: "uuid-cerca-matriz"
}
geofence = {
  centerLat: -23.5505,
  centerLng: -46.6333,
  radiusMeters: 100
}

// Tentativa de bater ponto via app (fora da cerca)
POST /api/time-entries/facial
{
  employeeId: "...",
  latitude: -23.5600, // ~1km de distância
  longitude: -46.6400
}

// Resultado esperado
❌ BadRequestException: "Você está fora da área permitida. Distância: 1050m (máximo: 100m)"
```

---

## 📝 Migração de Dados Existentes

### Opção 1: Manter Campos Deprecated (Recomendado)

- ✅ Não quebra dados existentes
- ✅ Permite rollback se necessário
- ✅ Migração gradual

```sql
-- Nenhuma migração necessária
-- Campos deprecated continuam no schema
```

### Opção 2: Remover Campos Deprecated (Futuro)

```sql
-- Após confirmar que nova lógica funciona
ALTER TABLE employees DROP COLUMN require_geolocation;
ALTER TABLE employees DROP COLUMN min_geo_accuracy_meters;
```

---

## ✅ Checklist de Implementação

- [x] Remover campos do frontend (AddEmployeeModal)
- [x] Marcar campos como deprecated no schema
- [x] Atualizar DTO (remover validações)
- [x] Atualizar service (remover uso dos campos)
- [x] Implementar nova lógica de validação
- [x] Criar documentação
- [ ] Testar cadastro de funcionário
- [ ] Testar ponto presencial
- [ ] Testar ponto remoto livre
- [ ] Testar ponto remoto com cerca

---

## 🚀 Próximos Passos

1. **Testar cadastro completo de funcionário**
   - Abrir modal
   - Preencher campos
   - Verificar criação no banco

2. **Criar EditEmployeeModal**
   - Baseado no AddEmployeeModal
   - Carregar dados existentes

3. **Implementar UI no app mobile**
   - Desabilitar botão se `!allowRemoteClockIn`
   - Exibir mensagem explicativa

4. **Testes de integração**
   - Validar todos os cenários
   - Garantir mensagens de erro claras
