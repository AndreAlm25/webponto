# 🎯 Modal de Funcionários - Progresso

## Objetivo

Replicar completamente o modal de adicionar/editar funcionário do app antigo (`/root/Apps/ponto`) para o novo app (`/root/Apps/webponto`), incluindo:

- ✅ Upload de avatar com câmera e editor de imagem
- ✅ Todos os campos (nome, email, senha, telefone, cargo, departamento, salário, data início, horários)
- ✅ Permissões (ponto remoto, reconhecimento facial, tolerância)
- ⏳ **Geofence** (vincular funcionário a cerca geográfica)
- ⏳ Modal de edição

---

## ✅ Componentes Copiados

### 1. **AvatarUpload** (`/root/Apps/webponto/frontend/src/components/admin/AvatarUpload.tsx`)

Componente completo com:
- Upload de arquivo ou câmera
- Editor fullscreen com crop circular 512x512
- Zoom, pan, espelhamento, brilho
- Suporte a pinch-to-zoom (mobile)
- Máscara visual circular
- Output: arquivo JPEG 512x512

### 2. **InputWithIcon** (`/root/Apps/webponto/frontend/src/components/ui/input-with-icon.tsx`)

Input com ícone e label:
```tsx
<InputWithIcon
  icon={<User className="h-4 w-4" />}
  label="Nome Completo *"
  name="name"
  value={formData.name}
  onChange={handleChange}
  required
/>
```

### 3. **SelectWithCreate** (`/root/Apps/webponto/frontend/src/components/ui/select-with-create.tsx`)

Select com botão para criar novo item inline:
```tsx
<SelectWithCreate
  icon={<Briefcase className="h-4 w-4" />}
  label="Cargo"
  placeholder="Selecione um cargo"
  value={formData.position}
  onValueChange={(value) => setFormData({...})}
  options={positions}
  onCreateNew={addNewPosition}
/>
```

### 4. **CheckboxWithIcon** (`/root/Apps/webponto/frontend/src/components/ui/checkbox-with-icon.tsx`)

Checkbox com ícone, label e descrição:
```tsx
<CheckboxWithIcon
  icon={<MapPin className="h-4 w-4" />}
  label="Permitir ponto remoto"
  description="Permite que o funcionário registre ponto mesmo quando não estiver na localização da empresa."
  checked={formData.allowRemoteClockIn}
  onCheckedChange={(checked) => setFormData({...})}
/>
```

### 5. **Componentes Shadcn/UI**

- `checkbox.tsx` - Checkbox do Radix UI
- `select.tsx` - Select do Radix UI

---

## ⏳ Próximos Passos

### 1. **Atualizar AddEmployeeModal** (ATUAL)

Arquivo: `/root/Apps/webponto/frontend/src/components/admin/AddEmployeeModal.tsx`

**Adicionar**:
- ✅ AvatarUpload no topo
- ✅ Todos os campos do app antigo
- ⏳ **Campo de Geofence** (select com lista de geofences da empresa)
- ⏳ Validação completa
- ⏳ Upload de avatar após criar funcionário

**Estrutura do Modal**:
```tsx
<AddEmployeeModal isOpen={} onClose={} onEmployeeAdded={}>
  <AvatarUpload onFileSelected={setAvatarFile} />
  
  {/* Dados Pessoais */}
  <InputWithIcon label="Nome" ... />
  <InputWithIcon label="Email" ... />
  <InputWithIcon label="Senha" ... />
  <InputWithIcon label="Telefone" ... />
  
  {/* Dados Profissionais */}
  <SelectWithCreate label="Cargo" ... />
  <SelectWithCreate label="Departamento" ... />
  <InputWithIcon label="Salário" ... />
  <InputWithIcon label="Data de Início" ... />
  
  {/* Horários */}
  <InputWithIcon label="Horário de Início" type="time" ... />
  <InputWithIcon label="Horário de Fim" type="time" ... />
  <InputWithIcon label="Início do Intervalo" type="time" ... />
  <InputWithIcon label="Fim do Intervalo" type="time" ... />
  
  {/* Permissões */}
  <CheckboxWithIcon label="Permitir ponto remoto" ... />
  <CheckboxWithIcon label="Permitir reconhecimento facial" ... />
  <CheckboxWithIcon label="Aplicar tolerância da empresa" ... />
  
  {/* Geofence */}
  <Select label="Cerca Geográfica" ... />
  
  <Button type="submit">Cadastrar Funcionário</Button>
</AddEmployeeModal>
```

---

### 2. **Campo de Geofence**

**Backend** (já existe):
- ✅ `Employee.geofenceId` no schema
- ✅ API `PATCH /api/employees/:id/geofence` para vincular
- ✅ API `GET /api/geofences` para listar

**Frontend** (adicionar):
```tsx
const [geofences, setGeofences] = useState<{id: string, name: string}[]>([])

// Carregar geofences da empresa
useEffect(() => {
  loadGeofences()
}, [])

const loadGeofences = async () => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/geofences`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const data = await response.json()
  setGeofences(data.geofences || [])
}

// No formulário
<div className="space-y-2">
  <Label>Cerca Geográfica</Label>
  <Select
    value={formData.geofenceId}
    onValueChange={(value) => setFormData(prev => ({ ...prev, geofenceId: value }))}
  >
    <SelectTrigger>
      <SelectValue placeholder="Selecione uma cerca (opcional)" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="">Nenhuma</SelectItem>
      {geofences.map((gf) => (
        <SelectItem key={gf.id} value={gf.id}>
          {gf.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  <p className="text-xs text-gray-500">
    Se selecionado, o funcionário só poderá bater ponto dentro desta cerca geográfica.
  </p>
</div>
```

---

### 3. **API de Cadastro**

**Problema Atual**:
- Backend cria Employee separado de User
- Precisa criar User primeiro, depois Employee, depois vincular

**Solução**:
Criar endpoint `POST /api/employees` que cria User + Employee juntos:

```typescript
// Backend: employees.controller.ts
@Post()
async createEmployee(@Body() dto: CreateEmployeeDto) {
  // 1. Criar User com email, name, cpf, password
  const user = await this.prisma.user.create({
    data: {
      email: dto.email,
      name: dto.name,
      cpf: dto.cpf,
      password: hashedPassword,
      role: 'EMPLOYEE',
      companyId: dto.companyId,
    },
  })
  
  // 2. Criar Employee
  const employee = await this.prisma.employee.create({
    data: {
      registrationId: dto.registrationId,
      hireDate: dto.hireDate,
      baseSalary: dto.baseSalary,
      positionId: dto.positionId,
      departmentId: dto.departmentId,
      geofenceId: dto.geofenceId, // ← Geofence
      allowRemoteClockIn: dto.allowRemoteClockIn,
      allowFacialRecognition: dto.allowFacialRecognition,
      workStartTime: dto.workStartTime,
      workEndTime: dto.workEndTime,
      breakStartTime: dto.breakStartTime,
      breakEndTime: dto.breakEndTime,
      companyId: dto.companyId,
    },
  })
  
  // 3. Vincular User ao Employee
  await this.prisma.user.update({
    where: { id: user.id },
    data: { employeeId: employee.id },
  })
  
  return { employee, user }
}
```

---

### 4. **EditEmployeeModal**

Criar modal de edição baseado no app antigo:

Arquivo: `/root/Apps/webponto/frontend/src/components/admin/EditEmployeeModal.tsx`

**Diferenças do AddEmployeeModal**:
- Carrega dados existentes
- Não tem campo de senha (ou tem "Alterar senha" opcional)
- Pode alterar geofence
- Pode alterar avatar

---

### 5. **Upload de Avatar**

Após criar funcionário, fazer upload do avatar:

```typescript
// Frontend: AddEmployeeModal.tsx
const handleSubmit = async (e) => {
  // 1. Criar funcionário
  const response = await fetch(`${API_URL}/api/employees`, {
    method: 'POST',
    body: JSON.stringify(formData),
  })
  const { employee, user } = await response.json()
  
  // 2. Upload de avatar (se houver)
  if (avatarFile && user.id) {
    const fd = new FormData()
    fd.append('userId', user.id)
    fd.append('photo', avatarFile)
    
    await fetch(`${API_URL}/api/upload/avatar`, {
      method: 'POST',
      body: fd,
    })
  }
  
  // 3. Notificar pai
  onEmployeeAdded(employee)
}
```

---

## 📋 Checklist

### Componentes UI
- [x] AvatarUpload
- [x] InputWithIcon
- [x] SelectWithCreate
- [x] CheckboxWithIcon
- [x] Checkbox (shadcn)
- [x] Select (shadcn)

### AddEmployeeModal
- [ ] Integrar AvatarUpload
- [ ] Adicionar todos os campos
- [ ] Adicionar campo de Geofence
- [ ] Validação completa
- [ ] Upload de avatar após criar
- [ ] Testar criação

### EditEmployeeModal
- [ ] Criar componente
- [ ] Carregar dados existentes
- [ ] Permitir alterar geofence
- [ ] Permitir alterar avatar
- [ ] Testar edição

### Backend
- [ ] Verificar endpoint POST /api/employees
- [ ] Garantir que cria User + Employee juntos
- [ ] Suportar geofenceId no cadastro
- [ ] Endpoint de upload de avatar

### Testes
- [ ] Cadastrar funcionário completo
- [ ] Editar funcionário
- [ ] Vincular/desvincular geofence
- [ ] Upload de avatar
- [ ] Validações

---

## 🎯 Próxima Ação

**AGORA**: Atualizar `AddEmployeeModal.tsx` com todos os campos e geofence.

**Arquivo**: `/root/Apps/webponto/frontend/src/components/admin/AddEmployeeModal.tsx`

**Referência**: `/root/Apps/ponto/src/components/AddEmployeeModal.tsx`
