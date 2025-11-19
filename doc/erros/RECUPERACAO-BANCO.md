# 🔧 Recuperação do Banco de Dados

## Problema Atual

O PostgreSQL está em **modo de recuperação** e não aceita conexões ainda.

**Erro**:
```
FATAL: the database system is not yet accepting connections
DETAIL: Consistent recovery state has not been yet reached.
```

## Solução

### 1. Aguardar PostgreSQL inicializar

```bash
# Verificar status do PostgreSQL
sudo systemctl status postgresql

# Ou verificar logs
sudo journalctl -u postgresql -f
```

### 2. Testar conexão

```bash
# Tentar conectar
psql -U postgres -d webponto_db -c "SELECT 1"

# Se conectar com sucesso, prossiga para o passo 3
```

### 3. Aplicar migração do schema

**Opção A: Via Prisma (recomendado)**

```bash
cd /root/Apps/webponto/backend
npx prisma db push --schema prisma/schema.prisma
```

**Opção B: Via SQL direto**

```bash
cd /root/Apps/webponto/backend
psql -U postgres -d webponto_db -f prisma/add-slug-column.sql
```

### 4. Verificar se coluna foi criada

```bash
psql -U postgres -d webponto_db -c "SELECT id, slug, trade_name FROM companies"
```

**Resultado esperado**:
```
                  id                  |     slug      |  trade_name
--------------------------------------+---------------+-------------
 uuid-empresa-1                       | acme-tech     | ACME Tech
 uuid-empresa-2                       | outra-empresa | Outra Empresa
```

### 5. Definir slugs manualmente (se necessário)

Se os slugs gerados automaticamente não estiverem bons:

```sql
-- Conectar ao banco
psql -U postgres -d webponto_db

-- Atualizar slugs
UPDATE companies SET slug = 'acme-tech' WHERE cnpj = '12345678000190';
UPDATE companies SET slug = 'minha-empresa' WHERE cnpj = '98765432000100';

-- Verificar
SELECT id, slug, trade_name, cnpj FROM companies;

-- Sair
\q
```

### 6. Reiniciar backend

```bash
cd /root/Apps/webponto/backend
npm run dev
```

### 7. Testar endpoint /api/auth/me

```bash
# Fazer login primeiro (se necessário)
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@acme-tech.com.br",
    "password": "sua-senha"
  }'

# Copiar o accessToken da resposta e testar /me
curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Deve retornar company.slug
```

## Comandos Úteis

### Verificar se PostgreSQL está rodando

```bash
sudo systemctl status postgresql
```

### Reiniciar PostgreSQL (se necessário)

```bash
sudo systemctl restart postgresql
```

### Ver logs do PostgreSQL

```bash
sudo journalctl -u postgresql -n 50 --no-pager
```

### Conectar ao banco manualmente

```bash
psql -U postgres -d webponto_db
```

### Listar todas as colunas da tabela companies

```sql
\d companies
```

## Troubleshooting

### Erro: "column slug does not exist"

**Causa**: Migração não foi aplicada

**Solução**: Execute o passo 3 novamente

### Erro: "duplicate key value violates unique constraint"

**Causa**: Duas empresas com o mesmo slug

**Solução**: Defina slugs únicos manualmente (passo 5)

### Erro: "database system is in recovery mode"

**Causa**: PostgreSQL ainda está inicializando

**Solução**: Aguarde alguns segundos e tente novamente

## Próximos Passos

Após aplicar a migração com sucesso:

1. ✅ Verificar que `/api/auth/me` retorna `company.slug`
2. ✅ Testar criação de geofence em `/admin/{slug}/geofences`
3. ✅ Confirmar que não há mais erro de UUID inválido
