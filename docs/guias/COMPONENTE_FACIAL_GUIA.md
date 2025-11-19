# 🎯 FacialRecognitionFlow - Guia de Uso

**Componente totalmente reutilizável**  
**Migrado de:** `/root/Apps/ponto/src/components/FacialRecognitionFlow.tsx`

---

## 📖 Visão Geral

`FacialRecognitionFlow` é um componente **totalmente encapsulado** e **reutilizável** que fornece reconhecimento facial e cadastro facial completo.

### Benefícios
- ✅ **Reutilizável** - Use em qualquer rota
- ✅ **Encapsulado** - Toda lógica interna
- ✅ **Flexível** - Customizável via props
- ✅ **Consistente** - Mesma UX em todo app
- ✅ **Manutenível** - Correção em 1 lugar só
- ✅ **Type-safe** - TypeScript completo

---

## 🚀 Uso Básico

### 1. Reconhecimento Facial (Clock In/Out)

```tsx
import FacialRecognitionFlow from "@/components/FacialRecognitionFlow"

export default function MyPage() {
  return (
    <FacialRecognitionFlow
      mode="recognition"
      authMode="employee"
      onRecognitionSuccess={(result) => {
        console.log('Ponto registrado:', result)
      }}
      onRecognitionError={(error) => {
        console.log('Erro:', error)
      }}
    />
  )
}
```

### 2. Cadastro Facial

```tsx
import FacialRecognitionFlow from "@/components/FacialRecognitionFlow"

export default function RegisterPage() {
  return (
    <FacialRecognitionFlow
      mode="registration"
      authMode="admin"
      userId="user123"
      userEmail="user@example.com"
      onRegistrationSuccess={(result) => {
        console.log('Cadastro realizado:', result)
      }}
      onRegistrationError={(error) => {
        console.log('Erro:', error)
      }}
    />
  )
}
```

---

## 📋 Props Completas

| Prop | Tipo | Obrigatório | Padrão | Descrição |
|------|------|-------------|--------|-----------|
| `mode` | `'recognition' \| 'registration'` | ✅ Sim | - | Modo de operação |
| `authMode` | `'employee' \| 'admin' \| null` | ❌ Não | `null` | Modo de autenticação |
| `userId` | `string` | ❌ Não | - | ID do usuário (necessário para cadastro) |
| `userEmail` | `string` | ❌ Não | - | Email do usuário |
| `onRecognitionSuccess` | `(result) => void` | ❌ Não | - | Callback sucesso reconhecimento |
| `onRecognitionError` | `(error) => void` | ❌ Não | - | Callback erro reconhecimento |
| `onRegistrationSuccess` | `(result) => void` | ❌ Não | - | Callback sucesso cadastro |
| `onRegistrationError` | `(error) => void` | ❌ Não | - | Callback erro cadastro |
| `buttonLabel` | `string` | ❌ Não | Auto | Texto do botão |
| `buttonIcon` | `React.ReactNode` | ❌ Não | Auto | Ícone do botão |
| `buttonColor` | `string` | ❌ Não | `"#fff"` | Cor do ícone |
| `buttonBgColor` | `string` | ❌ Não | `"#3C83F6"` | Cor de fundo |
| `messageDisplayTime` | `number` | ❌ Não | `7000` | Tempo mensagem (ms) |
| `autoOpenCamera` | `boolean` | ❌ Não | `false` | Abrir câmera auto |
| `showButton` | `boolean` | ❌ Não | `true` | Mostrar botão |

---

## 🎨 Exemplos Avançados

### Abrir Câmera Automaticamente

```tsx
<FacialRecognitionFlow
  mode="recognition"
  authMode="employee"
  autoOpenCamera={true}
  showButton={false}
  onRecognitionSuccess={handleSuccess}
/>
```

### Customizar Botão

```tsx
import { Fingerprint } from "lucide-react"

<FacialRecognitionFlow
  mode="recognition"
  authMode="employee"
  buttonLabel="Fazer Check-in"
  buttonIcon={<Fingerprint />}
  buttonColor="#22c55e"
  buttonBgColor="#16a34a"
  onRecognitionSuccess={handleSuccess}
/>
```

### Modal de Cadastro

```tsx
import { Dialog, DialogContent } from "@/components/ui/dialog"

<Dialog open={showModal} onOpenChange={setShowModal}>
  <DialogContent className="max-w-3xl">
    <FacialRecognitionFlow
      mode="registration"
      authMode="admin"
      userId={selectedEmployee?.id}
      userEmail={selectedEmployee?.email}
      onRegistrationSuccess={() => {
        setShowModal(false)
        toast.success('Cadastro realizado!')
      }}
    />
  </DialogContent>
</Dialog>
```

---

## 📦 Estrutura de Retorno

### RecognitionResult

```typescript
{
  employeeData: {
    id: string
    name: string
    email: string
    position?: string
    role?: string
    avatarUrl?: string | null
    companyId?: string | null
  }
  type: 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END'
  timestamp: string
  clockResult?: any
}
```

### RegistrationResult

```typescript
{
  success: boolean
  message?: string
  employeeData?: {
    id: string
    name: string
    email: string
  }
}
```

---

## 🎯 Casos de Uso Reais

### 1. Tela de Ponto do Funcionário

```tsx
import FacialRecognitionFlow from "@/components/FacialRecognitionFlow"
import { useRouter } from "next/navigation"

export default function EmployeeClockPage() {
  const router = useRouter()

  return (
    <div className="container">
      <h1>Registrar Ponto</h1>
      
      <FacialRecognitionFlow
        mode="recognition"
        authMode="employee"
        onRecognitionSuccess={(result) => {
          toast.success(`${result.type} registrado!`)
          router.push('/dashboard')
        }}
        onRecognitionError={(error) => {
          toast.error(error)
        }}
      />
    </div>
  )
}
```

### 2. Controle de Acesso

```tsx
import FacialRecognitionFlow from "@/components/FacialRecognitionFlow"
import { Shield } from "lucide-react"

export default function AccessControlPage() {
  const unlockDoor = async (employee) => {
    await fetch('/api/door/unlock', {
      method: 'POST',
      body: JSON.stringify({ employeeId: employee.id })
    })
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <FacialRecognitionFlow
        mode="recognition"
        authMode="admin"
        buttonLabel="Verificar Identidade"
        buttonIcon={<Shield />}
        onRecognitionSuccess={(result) => {
          console.log('✅ Acesso liberado:', result.employeeData.name)
          unlockDoor(result.employeeData)
        }}
      />
    </div>
  )
}
```

---

## 💡 Dica PRO: Hook Customizado

```tsx
// hooks/useFacialClock.ts
export function useFacialClock() {
  const [records, setRecords] = useState([])
  
  const handleSuccess = async (result) => {
    // Salvar no backend
    await saveClockRecord(result)
    
    // Atualizar estado local
    setRecords(prev => [...prev, result])
    
    // Notificar
    toast.success(`Ponto registrado: ${result.type}`)
  }
  
  return { records, handleSuccess }
}

// Na página:
export default function Page() {
  const { records, handleSuccess } = useFacialClock()
  
  return (
    <FacialRecognitionFlow
      mode="recognition"
      onRecognitionSuccess={handleSuccess}
    />
  )
}
```

---

## 📊 Comparação: Antes vs Agora

| Aspecto | Antes (sem componente) | Agora (com componente) |
|---------|------------------------|------------------------|
| **Linhas de código** | ~500 | ~10 |
| **Tempo implementar** | 2-3 horas | 5 minutos |
| **Manutenção** | N arquivos | 1 arquivo |
| **Bugs** | N lugares | 1 lugar |
| **Consistência** | Pode variar | Sempre igual |

---

## ✨ Conclusão

Com `FacialRecognitionFlow`, você tem um componente production-ready que pode ser usado em qualquer lugar da aplicação com poucas linhas de código!

**Simples assim!** 🎉
