# Gerenciador de Processos do WebPonto

## 📋 Visão Geral

O script `manage-processes.sh` é uma ferramenta interativa para gerenciar todos os processos relacionados ao WebPonto de forma visual e fácil.

## 🚀 Como Usar

### Iniciar o Gerenciador

```bash
cd /root/Apps/webponto
./manage-processes.sh
```

## 🎯 Funcionalidades

### 1. **Visualizar Processos Ativos**

O gerenciador mostra automaticamente todos os processos do WebPonto:

- **Next.js Frontend** - Servidor de desenvolvimento do frontend
- **Nest.js Backend** - API do backend
- **Prisma Studio** - Interface de gerenciamento do banco de dados
- **Docker Containers** - Containers relacionados ao WebPonto

Para cada processo, você verá:
- Número de identificação `[1], [2], [3]...`
- Nome/descrição do processo
- PID (Process ID)
- Porta em uso
- Comando completo

### 2. **Matar Processo Específico**

Digite o número do processo que deseja finalizar:

```
Escolha uma opção: 1
```

Isso vai finalizar apenas o processo selecionado.

### 3. **Matar TODOS os Processos** (Opção A)

```
Escolha uma opção: A
```

**⚠️ ATENÇÃO**: Isso vai parar:
- Todos os processos Next.js
- Todos os processos Nest.js
- Todos os Prisma Studio
- Todos os containers Docker do WebPonto

O sistema pedirá confirmação antes de executar.

### 4. **Verificar Portas** (Opção P)

```
Escolha uma opção: P
```

Mostra o status de todas as portas usadas pelo WebPonto:
- `3000, 3001, 3002` - Frontend (Next.js)
- `4000` - Backend (Nest.js)
- `5555` - Prisma Studio
- `5432` - PostgreSQL
- `6379` - Redis
- `8080` - CompreFace
- `9000, 9001` - MinIO

Para cada porta, mostra se está **LIVRE** ou **EM USO** (com PID e nome do processo).

### 5. **Iniciar Serviços** (Opção S)

```
Escolha uma opção: S
```

Permite iniciar serviços:

1. **Tudo (run-all.sh)** - Inicia frontend, backend e Prisma Studio
2. **Apenas Frontend** - Inicia só o Next.js
3. **Apenas Backend** - Inicia só o Nest.js
4. **Apenas Prisma Studio** - Inicia só o Prisma Studio
5. **Docker Containers** - Inicia os containers (PostgreSQL, Redis, etc.)

### 6. **Atualizar Lista** (Opção R)

```
Escolha uma opção: R
```

Atualiza a lista de processos ativos.

### 7. **Sair** (Opção Q)

```
Escolha uma opção: Q
```

Fecha o gerenciador.

## 💡 Casos de Uso Comuns

### Problema: Porta 3000 em uso

1. Execute `./manage-processes.sh`
2. Pressione `P` para ver as portas
3. Identifique qual processo está usando a porta 3000
4. Digite o número do processo para matá-lo
5. Ou pressione `A` para matar todos e começar do zero

### Problema: Múltiplos processos Next.js rodando

1. Execute `./manage-processes.sh`
2. Veja todos os processos Next.js listados
3. Pressione `A` para matar todos
4. Confirme com `s`
5. Pressione `S` para iniciar novamente

### Verificar se tudo está rodando

1. Execute `./manage-processes.sh`
2. Verifique se aparecem:
   - Next.js Frontend (porta 3000 ou similar)
   - Nest.js Backend (porta 4000)
   - Prisma Studio (porta 5555)
   - Containers Docker (se estiver usando)

### Reiniciar apenas o Frontend

1. Execute `./manage-processes.sh`
2. Encontre o processo Next.js e digite seu número
3. Pressione `S` e escolha opção `2` (Apenas Frontend)

## 🎨 Interface

O gerenciador usa cores para facilitar a visualização:

- 🟢 **Verde** - Números de opções e processos ativos
- 🟡 **Amarelo** - PIDs e avisos
- 🔵 **Azul** - Cabeçalhos e títulos
- 🟣 **Roxo** - Portas
- 🔴 **Vermelho** - Erros e ações destrutivas
- 🔵 **Ciano** - Nomes de containers e informações

## ⚙️ Comandos Equivalentes (Manual)

Se preferir fazer manualmente:

```bash
# Ver processos Next.js
ps aux | grep "next dev"

# Ver processos Nest.js
ps aux | grep "nest start"

# Ver processos Prisma
ps aux | grep "prisma studio"

# Matar processo específico
kill -9 <PID>

# Matar todos os processos Next.js
pkill -9 -f "next dev"

# Matar todos os processos Nest.js
pkill -9 -f "nest start"

# Matar todos os processos Prisma
pkill -9 -f "prisma studio"

# Ver portas em uso
lsof -i :3000
lsof -i :4000
lsof -i :5555

# Ver containers Docker
docker ps --filter "name=webponto"

# Parar containers Docker
docker stop <container_id>
```

## 🔧 Troubleshooting

### O script não executa

```bash
chmod +x manage-processes.sh
```

### Não encontra processos mas sei que estão rodando

- Verifique se está no diretório correto: `/root/Apps/webponto`
- Tente executar como root: `sudo ./manage-processes.sh`

### Erro ao matar processo

- Alguns processos podem precisar de permissões de root
- Tente: `sudo ./manage-processes.sh`

### Número do processo não corresponde ao que aparece na lista

**CORRIGIDO**: Versão anterior tinha um bug no mapeamento de índices. A versão atual usa arquivos temporários para garantir que o número exibido corresponda exatamente ao processo correto.

### Arquivos temporários em /tmp

O script cria arquivos temporários em `/tmp/webponto_pm_*` para armazenar os dados dos processos. Eles são automaticamente limpos ao sair do script (opção Q).

## 📝 Notas

- O script é **não-destrutivo** por padrão - sempre pede confirmação antes de matar todos os processos
- Processos individuais são finalizados imediatamente (sem confirmação)
- A lista de processos é atualizada automaticamente a cada ação
- O script detecta automaticamente containers Docker relacionados ao WebPonto

## 🎯 Dicas

1. **Use a opção R** frequentemente para manter a lista atualizada
2. **Verifique as portas** antes de iniciar novos serviços
3. **Mate processos específicos** em vez de todos quando possível
4. **Use a opção A** quando quiser começar do zero
5. **Mantenha o script aberto** em um terminal separado para monitoramento rápido
