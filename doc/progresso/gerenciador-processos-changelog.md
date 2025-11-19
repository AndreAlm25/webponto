# Changelog - Gerenciador de Processos

## [1.1.0] - 2025-11-18

### 🐛 Correções

**Bug crítico corrigido: Mapeamento incorreto de índices de processos**

#### Problema
Quando o usuário escolhia a opção `[1]` para matar o Prisma Studio, o script estava matando o container Docker que aparecia como `[2]` na lista. Isso acontecia porque os arrays bash não podem ser exportados corretamente como strings simples.

#### Causa Raiz
```bash
# ❌ Código antigo (com bug)
export PROCESS_PIDS="${PIDS[@]}"  # Converte array para string
read -ra PIDS <<< "$PROCESS_PIDS"  # Reconstrói array incorretamente
```

Quando arrays são convertidos para strings e depois reconstruídos, os índices podem ser perdidos ou reorganizados, especialmente quando há espaços nos valores.

#### Solução Implementada
```bash
# ✅ Código novo (corrigido)
# Salvar cada entrada em arquivo separado
for i in $(seq 1 $((index - 1))); do
    echo "${PIDS[$i]}" > "$temp_dir/pid_$i"
    echo "${DESCS[$i]}" > "$temp_dir/desc_$i"
    echo "${PORTS[$i]}" > "$temp_dir/port_$i"
done
```

Agora cada processo é salvo em um arquivo temporário individual em `/tmp/webponto_pm_*/`, garantindo que:
- O índice `[1]` sempre corresponde ao arquivo `pid_1`, `desc_1`, etc.
- Não há perda de dados ou reorganização
- O mapeamento é 100% confiável

#### Melhorias Adicionais

1. **Limpeza automática**: Arquivos temporários são removidos ao sair (opção Q)
2. **Validação de limites**: Verifica se o número escolhido está entre 1 e o total de processos
3. **Mensagens de erro melhoradas**: Indica o intervalo válido quando o usuário digita um número inválido

### 📝 Arquivos Modificados

- `/root/Apps/webponto/manage-processes.sh` - Correção do bug de mapeamento
- `/root/Apps/webponto/doc/guias/gerenciador-processos.md` - Documentação atualizada

### 🧪 Testes Realizados

✅ Listar processos corretamente  
✅ Matar processo específico pelo número correto  
✅ Matar todos os processos  
✅ Verificar portas  
✅ Iniciar serviços  
✅ Limpeza de arquivos temporários ao sair  

### 💡 Exemplo de Uso

```bash
./manage-processes.sh

# Lista mostra:
[1] Prisma Studio (PID: 723707)
[2] Docker: webponto_postgres

# Ao escolher 1:
Escolha uma opção: 1
🔪 Matando processo: Prisma Studio (PID: 723707)  ✅ CORRETO!
```

---

## [1.0.0] - 2025-11-18

### ✨ Funcionalidades Iniciais

- Visualização de processos ativos (Next.js, Nest.js, Prisma, Docker)
- Matar processos específicos ou todos
- Verificar portas em uso
- Iniciar serviços individualmente ou todos
- Interface colorida e interativa
- Atalho rápido `./pm`
