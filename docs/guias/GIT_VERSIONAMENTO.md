# 📦 Guia de Versionamento Git - WebPonto

## ✅ Repositório Inicializado

O projeto WebPonto está agora versionado com Git!

- **Branch principal:** `main`
- **Commit inicial:** `21d87bc`
- **Arquivos versionados:** Todo o código-fonte (backend, frontend, docs, scripts)
- **Arquivos ignorados:** node_modules, .env, uploads, logs, etc.

---

## 🎯 Comandos Git Essenciais

### Ver status atual
```bash
git status
```

### Ver histórico de commits
```bash
git log --oneline
git log --graph --oneline --all
```

### Adicionar mudanças
```bash
# Adicionar arquivo específico
git add caminho/do/arquivo.ts

# Adicionar todos os arquivos modificados
git add .

# Adicionar apenas arquivos já rastreados
git add -u
```

### Fazer commit
```bash
# Commit com mensagem
git commit -m "feat: adiciona nova funcionalidade X"

# Commit com mensagem detalhada
git commit -m "feat: adiciona nova funcionalidade X" -m "Descrição detalhada do que foi feito"
```

### Ver diferenças
```bash
# Ver mudanças não commitadas
git diff

# Ver mudanças de um arquivo específico
git diff caminho/do/arquivo.ts

# Ver mudanças já adicionadas (staged)
git diff --staged
```

### Desfazer mudanças
```bash
# Descartar mudanças em um arquivo (CUIDADO!)
git checkout -- caminho/do/arquivo.ts

# Remover arquivo do staging (mas manter mudanças)
git reset HEAD caminho/do/arquivo.ts

# Voltar ao último commit (CUIDADO! Perde todas as mudanças)
git reset --hard HEAD
```

---

## 📝 Padrão de Mensagens de Commit

Seguimos o padrão **Conventional Commits**:

### Tipos de commit:

- **feat:** Nova funcionalidade
  ```bash
  git commit -m "feat: adiciona sistema de relatórios mensais"
  ```

- **fix:** Correção de bug
  ```bash
  git commit -m "fix: corrige erro no cálculo de horas extras"
  ```

- **docs:** Mudanças na documentação
  ```bash
  git commit -m "docs: atualiza guia de instalação"
  ```

- **style:** Formatação, ponto e vírgula, etc (não afeta código)
  ```bash
  git commit -m "style: formata código com prettier"
  ```

- **refactor:** Refatoração de código (não adiciona feature nem corrige bug)
  ```bash
  git commit -m "refactor: reorganiza estrutura de pastas do backend"
  ```

- **perf:** Melhoria de performance
  ```bash
  git commit -m "perf: otimiza consulta de pontos no banco de dados"
  ```

- **test:** Adiciona ou corrige testes
  ```bash
  git commit -m "test: adiciona testes para módulo de geofencing"
  ```

- **chore:** Tarefas de manutenção, build, etc
  ```bash
  git commit -m "chore: atualiza dependências do frontend"
  ```

### Exemplos práticos:

```bash
# Backend
git commit -m "feat(backend): adiciona endpoint de exportação de relatórios"
git commit -m "fix(auth): corrige validação de token JWT"

# Frontend
git commit -m "feat(frontend): adiciona página de histórico de pontos"
git commit -m "fix(ui): corrige alinhamento do botão de ponto"

# Documentação
git commit -m "docs: adiciona guia de deploy em produção"

# Múltiplos arquivos
git commit -m "refactor: padroniza nomenclatura de variáveis em inglês"
```

---

## 🌿 Trabalhando com Branches

### Criar nova branch
```bash
# Criar e mudar para nova branch
git checkout -b feature/nome-da-feature

# Ou (Git 2.23+)
git switch -c feature/nome-da-feature
```

### Listar branches
```bash
# Branches locais
git branch

# Todas as branches (incluindo remotas)
git branch -a
```

### Mudar de branch
```bash
git checkout nome-da-branch

# Ou (Git 2.23+)
git switch nome-da-branch
```

### Mesclar branches
```bash
# Voltar para main
git checkout main

# Mesclar branch de feature
git merge feature/nome-da-feature
```

### Deletar branch
```bash
# Deletar branch local
git branch -d feature/nome-da-feature

# Forçar deleção (se não foi mesclada)
git branch -D feature/nome-da-feature
```

---

## 🔄 Workflow Recomendado

### 1. Desenvolvimento de Nova Feature

```bash
# 1. Criar branch para a feature
git checkout -b feature/sistema-relatorios

# 2. Fazer mudanças no código
# ... editar arquivos ...

# 3. Adicionar e commitar
git add .
git commit -m "feat: adiciona sistema de relatórios mensais"

# 4. Voltar para main e mesclar
git checkout main
git merge feature/sistema-relatorios

# 5. Deletar branch (opcional)
git branch -d feature/sistema-relatorios
```

### 2. Correção de Bug

```bash
# 1. Criar branch para o bugfix
git checkout -b fix/calculo-horas-extras

# 2. Fazer correção
# ... editar arquivos ...

# 3. Commitar
git add .
git commit -m "fix: corrige cálculo de horas extras no fim de semana"

# 4. Mesclar na main
git checkout main
git merge fix/calculo-horas-extras

# 5. Deletar branch
git branch -d fix/calculo-horas-extras
```

### 3. Atualização de Documentação

```bash
# Pode commitar direto na main (se preferir)
git add docs/
git commit -m "docs: atualiza guia de API"
```

---

## 🚀 Conectando com Repositório Remoto

### GitHub

```bash
# Adicionar repositório remoto
git remote add origin https://github.com/seu-usuario/webponto.git

# Enviar código para o GitHub
git push -u origin main

# Próximos pushes
git push
```

### GitLab

```bash
# Adicionar repositório remoto
git remote add origin https://gitlab.com/seu-usuario/webponto.git

# Enviar código
git push -u origin main
```

### Bitbucket

```bash
# Adicionar repositório remoto
git remote add origin https://bitbucket.org/seu-usuario/webponto.git

# Enviar código
git push -u origin main
```

### Verificar repositórios remotos

```bash
git remote -v
```

---

## 📊 Comandos Úteis de Visualização

### Ver histórico detalhado
```bash
# Com gráfico
git log --graph --oneline --decorate --all

# Com estatísticas
git log --stat

# Últimos 5 commits
git log -5

# Commits de um autor específico
git log --author="Nome do Autor"
```

### Ver mudanças de um commit específico
```bash
git show <hash-do-commit>
```

### Ver quem modificou cada linha de um arquivo
```bash
git blame caminho/do/arquivo.ts
```

---

## 🔍 Buscar no Histórico

### Buscar por mensagem de commit
```bash
git log --grep="palavra-chave"
```

### Buscar por mudanças em código
```bash
git log -S "texto-no-codigo"
```

---

## 💾 Salvando Trabalho Temporário (Stash)

```bash
# Salvar mudanças temporariamente
git stash

# Listar stashes
git stash list

# Recuperar último stash
git stash pop

# Recuperar stash específico
git stash apply stash@{0}

# Deletar stash
git stash drop stash@{0}
```

---

## 🏷️ Tags (Versões)

### Criar tag
```bash
# Tag leve
git tag v1.0.0

# Tag anotada (recomendado)
git tag -a v1.0.0 -m "Versão 1.0.0 - Release inicial"
```

### Listar tags
```bash
git tag
```

### Enviar tags para remoto
```bash
# Enviar tag específica
git push origin v1.0.0

# Enviar todas as tags
git push --tags
```

---

## ⚠️ Boas Práticas

### ✅ FAZER:

1. **Commitar frequentemente** - Commits pequenos e frequentes são melhores
2. **Mensagens descritivas** - Explique o "porquê", não apenas o "o quê"
3. **Testar antes de commitar** - Certifique-se que o código funciona
4. **Usar branches** - Para features e bugfixes maiores
5. **Revisar mudanças** - Use `git diff` antes de commitar
6. **Manter .gitignore atualizado** - Nunca versionar node_modules, .env, etc

### ❌ NÃO FAZER:

1. **Commitar código quebrado** - Sempre teste antes
2. **Commitar arquivos sensíveis** - .env, senhas, chaves API
3. **Commits gigantes** - Dificulta revisão e rollback
4. **Mensagens vagas** - "fix", "update", "changes" não ajudam
5. **Reescrever histórico público** - Evite `git push --force` em branches compartilhadas

---

## 🆘 Problemas Comuns

### Commitei arquivo errado
```bash
# Remover arquivo do último commit (mas manter no disco)
git reset HEAD~1 caminho/do/arquivo.ts
git commit --amend
```

### Commitei na branch errada
```bash
# Desfazer último commit (mas manter mudanças)
git reset --soft HEAD~1

# Mudar para branch correta
git checkout branch-correta

# Commitar novamente
git commit -m "mensagem"
```

### Quero mudar a mensagem do último commit
```bash
git commit --amend -m "nova mensagem"
```

### Commitei arquivo sensível (.env)
```bash
# Remover do histórico (CUIDADO!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all
```

---

## 📚 Recursos Adicionais

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)

---

## 🎓 Próximos Passos

1. **Criar repositório remoto** (GitHub, GitLab ou Bitbucket)
2. **Configurar CI/CD** (GitHub Actions, GitLab CI)
3. **Definir estratégia de branches** (Git Flow, GitHub Flow)
4. **Configurar proteção de branches** (require reviews, status checks)
5. **Automatizar testes** antes de merge

---

**Última atualização:** 19/11/2025
