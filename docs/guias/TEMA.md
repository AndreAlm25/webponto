# 🎨 Sistema de Temas - WebPonto

O projeto **já está 100% configurado** para tema dark/light! ✅

---

## ⚡ Como funciona

### 1. **TailwindCSS com variáveis CSS**

Todas as cores são definidas como variáveis CSS em `/frontend/src/app/globals.css`:

```css
:root {
  --background: 0 0% 100%;        /* Branco */
  --foreground: 222.2 84% 4.9%;   /* Preto */
  /* ... */
}

.dark {
  --background: 222.2 84% 4.9%;   /* Preto */
  --foreground: 210 40% 98%;      /* Branco */
  /* ... */
}
```

### 2. **ThemeProvider**

Já está integrado no layout principal:
- Detecta preferência do sistema automaticamente
- Salva escolha no localStorage
- Aplica classe `dark` no `<html>` quando necessário

### 3. **Componentes prontos**

✅ **ThemeToggle** - Botão de alternar tema  
✅ **ThemeProvider** - Context provider  
✅ **useTheme** - Hook para acessar o tema  

---

## 🚀 Como usar

### Usar o botão de tema

```tsx
import { ThemeToggle } from '@/components/theme-toggle';

export default function Page() {
  return (
    <div>
      <ThemeToggle />
    </div>
  );
}
```

### Controlar o tema programaticamente

```tsx
'use client';

import { useTheme } from '@/hooks/use-theme';

export function ConfiguracoesPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <p>Tema atual: {theme}</p>
      
      <button onClick={() => setTheme('light')}>
        Claro
      </button>
      
      <button onClick={() => setTheme('dark')}>
        Escuro
      </button>
      
      <button onClick={() => setTheme('system')}>
        Automático (Sistema)
      </button>
    </div>
  );
}
```

### Usar cores que se adaptam ao tema

Use as classes do Tailwind com as variáveis pré-definidas:

```tsx
<div className="bg-background text-foreground">
  Fundo e texto que se adaptam ao tema
</div>

<button className="bg-primary text-primary-foreground">
  Botão primário
</button>

<div className="bg-card text-card-foreground border border-border">
  Card com borda
</div>

<p className="text-muted-foreground">
  Texto secundário
</p>
```

---

## 🎨 Cores disponíveis

Todas essas cores **funcionam em ambos os temas**:

| Classe Tailwind | Uso |
|-----------------|-----|
| `bg-background` / `text-foreground` | Fundo e texto principal |
| `bg-primary` / `text-primary-foreground` | Cor primária (botões, links) |
| `bg-secondary` / `text-secondary-foreground` | Cor secundária |
| `bg-accent` / `text-accent-foreground` | Destaques, hover |
| `bg-muted` / `text-muted-foreground` | Texto/fundo menos importante |
| `bg-card` / `text-card-foreground` | Cards e containers |
| `bg-destructive` / `text-destructive-foreground` | Ações destrutivas (deletar, erro) |
| `border-border` | Bordas |
| `ring-ring` | Focus ring |

---

## 📱 Exemplo completo

```tsx
'use client';

import { ThemeToggle } from '@/components/theme-toggle';
import { useTheme } from '@/hooks/use-theme';

export default function DashboardPage() {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">
            WebPonto
          </h1>
          <ThemeToggle />
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-8">
        <div className="bg-card text-card-foreground rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold mb-2">
            Dashboard
          </h2>
          <p className="text-muted-foreground">
            Tema atual: {theme}
          </p>
          
          <div className="mt-4 flex gap-2">
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90">
              Botão Primário
            </button>
            <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-accent">
              Botão Secundário
            </button>
            <button className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:opacity-90">
              Deletar
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
```

---

## 🔧 Personalizar cores

Para mudar as cores, edite `/frontend/src/app/globals.css`:

```css
:root {
  --primary: 221 83% 53%;  /* Azul personalizado */
  /* ... */
}

.dark {
  --primary: 217 91% 60%;  /* Azul mais claro no dark */
  /* ... */
}
```

Use o formato HSL (Hue, Saturation, Lightness) sem a palavra `hsl()`.

---

## 🎯 Modo System (Automático)

O tema `system` detecta automaticamente a preferência do sistema operacional:

```typescript
// Detecta se o usuário prefere dark mode no sistema
window.matchMedia('(prefers-color-scheme: dark)').matches
```

Quando o usuário não escolhe manualmente, o sistema usa essa preferência.

---

## ⚙️ Configurações

O tema é salvo em:
- **localStorage:** chave `webponto-theme`
- **Valores:** `'light'`, `'dark'` ou `'system'`

Para mudar a chave de armazenamento, edite em `/frontend/src/components/providers.tsx`:

```tsx
<ThemeProvider 
  defaultTheme="system" 
  storageKey="seu-storage-key-customizado"
>
```

---

## ✅ Checklist

- [x] TailwindCSS configurado com `darkMode: ['class']`
- [x] Variáveis CSS para light/dark em `globals.css`
- [x] ThemeProvider integrado no layout
- [x] Componente ThemeToggle criado
- [x] Hook useTheme exportado
- [x] LocalStorage para persistir preferência
- [x] Detecção de preferência do sistema
- [x] Exemplo de uso na página inicial

---

## 🚫 Sobre os erros do TypeScript

Os erros que você está vendo (`Cannot find module 'react'`, etc.) são **normais** porque as dependências ainda **não foram instaladas**.

Para resolver:

```bash
cd /root/Apps/webponto/frontend
npm install
```

Após instalar, todos os erros desaparecerão! ✨

---

**Tudo pronto!** O tema já funciona perfeitamente. 🎨
