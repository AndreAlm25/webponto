# Componentes UI

Esta pasta conterá os componentes shadcn/ui quando forem adicionados.

## Como adicionar componentes shadcn/ui

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
# etc...
```

Os componentes serão criados automaticamente nesta pasta.

## Componentes já configurados

- **ThemeToggle** - Botão para alternar tema dark/light
- **ThemeProvider** - Provider de tema (já integrado no layout)

## Tema

O tema dark/light já está totalmente configurado:
- Usa TailwindCSS com variáveis CSS
- Salva preferência no localStorage
- Respeita preferência do sistema (prefers-color-scheme)
- Componente ThemeToggle pronto para uso

### Como usar o tema em qualquer componente:

```tsx
import { useTheme } from '@/hooks/use-theme';

export function MeuComponente() {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <p>Tema atual: {theme}</p>
      <button onClick={() => setTheme('dark')}>Escuro</button>
      <button onClick={() => setTheme('light')}>Claro</button>
      <button onClick={() => setTheme('system')}>Sistema</button>
    </div>
  );
}
```

### Cores disponíveis (funcionam em ambos os temas):

- `bg-background` / `text-foreground`
- `bg-primary` / `text-primary-foreground`
- `bg-secondary` / `text-secondary-foreground`
- `bg-accent` / `text-accent-foreground`
- `bg-muted` / `text-muted-foreground`
- `bg-card` / `text-card-foreground`
- `bg-destructive` / `text-destructive-foreground`
- `border-border`
- `ring-ring`
