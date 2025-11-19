# 🚀 Git - Referência Rápida WebPonto

## 📊 Status Atual do Repositório

```bash
Branch: main
Commits: 3
Último commit: adfc7f2 - chore: adiciona .gitattributes
```

---

## ⚡ Comandos Mais Usados

### Ver o que mudou
```bash
git status                    # Ver arquivos modificados
git diff                      # Ver mudanças detalhadas
git log --oneline -10        # Ver últimos 10 commits
```

### Salvar mudanças
```bash
git add .                     # Adicionar todos os arquivos
git commit -m "mensagem"      # Fazer commit
git push                      # Enviar para repositório remoto
```

### Trabalhar com branches
```bash
git checkout -b feature/nome  # Criar nova branch
git checkout main             # Voltar para main
git merge feature/nome        # Mesclar branch
git branch -d feature/nome    # Deletar branch
```

### Desfazer mudanças
```bash
git checkout -- arquivo.ts    # Descartar mudanças em arquivo
git reset HEAD arquivo.ts     # Remover do staging
git reset --soft HEAD~1       # Desfazer último commit (manter mudanças)
```

---

## 📝 Padrão de Commits

```bash
feat:     # Nova funcionalidade
fix:      # Correção de bug
docs:     # Documentação
style:    # Formatação
refactor: # Refatoração
perf:     # Performance
test:     # Testes
chore:    # Manutenção
```

### Exemplos:
```bash
git commit -m "feat: adiciona relatório de horas extras"
git commit -m "fix: corrige cálculo de ponto noturno"
git commit -m "docs: atualiza README com instruções de deploy"
```

---

## 🌐 Conectar com GitHub/GitLab

### Primeira vez:
```bash
# GitHub
git remote add origin https://github.com/seu-usuario/webponto.git
git push -u origin main

# GitLab
git remote add origin https://gitlab.com/seu-usuario/webponto.git
git push -u origin main
```

### Próximos pushes:
```bash
git push
```

---

## 🔄 Workflow Diário

```bash
# 1. Ver o que mudou
git status

# 2. Adicionar mudanças
git add .

# 3. Commitar
git commit -m "feat: adiciona nova funcionalidade"

# 4. Enviar para remoto (se configurado)
git push
```

---

## 📚 Documentação Completa

Para guia detalhado, veja: `/docs/guias/GIT_VERSIONAMENTO.md`

---

## 🆘 Ajuda Rápida

```bash
git help                      # Ajuda geral
git help commit              # Ajuda sobre comando específico
git status                   # Ver estado atual
```

---

**Dica:** Sempre faça `git status` antes de commitar para revisar o que será salvo!
