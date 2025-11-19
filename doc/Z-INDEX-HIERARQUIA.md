# 🎨 Hierarquia de Z-Index

## Problema Resolvido

O mapa do Leaflet estava sobrepondo modais e menus devido a z-index muito alto.

## Hierarquia Correta (do mais alto para o mais baixo)

```
┌─────────────────────────────────────┐
│  Modal (z-index: 9999/10000)       │  ← Mais alto (sempre visível)
├─────────────────────────────────────┤
│  Menu Usuário (z-index: 100)       │  ← Acima do header
├─────────────────────────────────────┤
│  Backdrop Menu (z-index: 99)       │  ← Fundo do menu
├─────────────────────────────────────┤
│  Botão Toggle (z-index: 50)        │  ← Botão de colapsar sidebar
├─────────────────────────────────────┤
│  Header (z-index: 40)              │  ← Barra superior
├─────────────────────────────────────┤
│  Conteúdo Normal (z-index: auto)   │  ← Conteúdo da página
├─────────────────────────────────────┤
│  Mapa (z-index: 0)                 │  ← Mais baixo (não sobrepõe nada)
└─────────────────────────────────────┘
```

## Valores Definidos

### 1. **Modal** (z-index: 9999/10000)
**Arquivo**: `/frontend/src/components/ui/ConfirmDialog.tsx`

```tsx
<div className="fixed inset-0 bg-black bg-opacity-50 z-[9999]">
  <div className="bg-white rounded-lg z-[10000]">
    {/* Conteúdo do modal */}
  </div>
</div>
```

**Por que?**
- Deve estar sempre visível
- Acima de tudo (mapa, menus, header)
- Valor muito alto para garantir prioridade

---

### 2. **Menu do Usuário** (z-index: 100)
**Arquivo**: `/frontend/src/components/admin/UserProfileMenu.tsx`

```tsx
{/* Backdrop */}
<div className="fixed inset-0 z-[99]" onClick={close} />

{/* Menu */}
<div className="absolute right-0 top-full z-[100]">
  {/* Conteúdo do menu */}
</div>
```

**Por que?**
- Deve ficar acima do header
- Abaixo dos modais
- Backdrop (z-99) fica atrás do menu (z-100)

---

### 3. **Botão Toggle Sidebar** (z-index: 50)
**Arquivo**: `/frontend/src/app/admin/[company]/layout.tsx`

```tsx
<button className="absolute z-50">
  {/* Ícone de colapsar */}
</button>
```

**Por que?**
- Deve ficar acima do conteúdo
- Abaixo do menu do usuário
- Sempre visível para colapsar sidebar

---

### 4. **Header** (z-index: 40)
**Arquivo**: `/frontend/src/app/admin/[company]/layout.tsx`

```tsx
<div className="sticky top-0 z-40 bg-background border-b">
  {/* Conteúdo do header */}
</div>
```

**Por que?**
- Deve ficar fixo no topo
- Acima do conteúdo da página
- Abaixo dos menus e modais

---

### 5. **Mapa** (z-index: 0)
**Arquivo**: `/frontend/src/components/geo/MapGeofence.tsx`

```tsx
<div className="w-full h-[480px] relative z-0">
  <MapContainer style={{ zIndex: 0 }}>
    {/* Conteúdo do mapa */}
  </MapContainer>
</div>
```

**Por que?**
- Deve ficar abaixo de tudo
- Não pode sobrepor modais, menus ou header
- Leaflet usa z-index altos por padrão, então forçamos z-0

---

## Problema Original

### Antes ❌
```
Mapa (z-index: auto/alto do Leaflet)
  ↓ Sobrepunha
Modal (z-index: 50)
Menu (z-index: 50)
```

**Resultado**: Mapa aparecia por cima do modal e do menu

### Depois ✅
```
Modal (z-index: 9999)     ← Sempre visível
Menu (z-index: 100)       ← Acima do header
Header (z-index: 40)      ← Fixo no topo
Mapa (z-index: 0)         ← Abaixo de tudo
```

**Resultado**: Hierarquia correta, nada sobrepõe indevidamente

---

## Como o Leaflet Funciona

O Leaflet (biblioteca do mapa) usa z-index altos por padrão:

- **Tiles (ladrilhos)**: z-index: 200
- **Overlays (sobreposições)**: z-index: 400
- **Markers (marcadores)**: z-index: 600
- **Tooltips**: z-index: 800
- **Popups**: z-index: 1000

Por isso, precisamos:
1. Forçar `z-index: 0` no container do mapa
2. Usar z-index muito altos (9999) para modais

---

## Regras para Novos Componentes

### Modais e Overlays
```tsx
// Use z-index muito alto (9999+)
<div className="fixed inset-0 z-[9999]">
```

### Menus Dropdown
```tsx
// Use z-index médio-alto (100-500)
<div className="absolute z-[100]">
```

### Headers e Navbars
```tsx
// Use z-index médio (40-50)
<div className="sticky top-0 z-40">
```

### Conteúdo Normal
```tsx
// Use z-index auto ou baixo (0-10)
<div className="relative z-0">
```

### Mapas e Iframes
```tsx
// Use z-index 0 (mais baixo)
<div className="relative z-0">
  <MapContainer style={{ zIndex: 0 }}>
```

---

## Teste Visual

### 1. Abrir Modal
```
✅ Modal deve aparecer por cima de tudo
✅ Mapa deve ficar atrás do modal
✅ Header deve ficar atrás do modal
```

### 2. Abrir Menu do Usuário
```
✅ Menu deve aparecer por cima do header
✅ Menu deve aparecer por cima do mapa
✅ Backdrop deve cobrir tudo exceto o menu
```

### 3. Scroll da Página
```
✅ Header deve ficar fixo no topo
✅ Mapa deve rolar normalmente
✅ Nada deve sobrepor o header
```

---

## Resumo

### Valores de Z-Index
- **Modal**: 9999/10000
- **Menu Usuário**: 100
- **Backdrop Menu**: 99
- **Botão Toggle**: 50
- **Header**: 40
- **Conteúdo**: auto
- **Mapa**: 0

### Arquivos Modificados
- ✅ `/frontend/src/components/ui/ConfirmDialog.tsx`
- ✅ `/frontend/src/components/admin/UserProfileMenu.tsx`
- ✅ `/frontend/src/components/geo/MapGeofence.tsx`

**Problema resolvido!** 🎨
