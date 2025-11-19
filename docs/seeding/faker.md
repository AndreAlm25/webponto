# Seed com Faker + Uploads no MinIO

Este guia explica como popular o banco de dados via API usando Faker e salvar imagens reais no MinIO, além de como limpar seletivamente os arquivos gerados.

## Visão geral

- Endpoint: `POST /api/seed/faker`
- Entidades criadas: Company, User (admin opcional + employees), Employee
- Extras criados por empresa: Positions e Departments
- Imagens: baixadas de URLs públicas (Faker) e salvas no MinIO (buckets `employees` e `time-entries`)
- IDs: UUID (string), conforme schema atual
- Rota: não autenticada (apenas para testes; não deve subir para produção)

## Como testar

### Exemplo padrão (1 empresa, 5 funcionários, com admin, sem reset)

```bash
curl -X POST http://localhost:4000/api/seed/faker \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Com reset e mais dados

```bash
curl -X POST http://localhost:4000/api/seed/faker \
  -H "Content-Type: application/json" \
  -d '{
    "companies": 2,
    "employeesPerCompany": 8,
    "createAdmins": true,
    "reset": true
  }'
```

## Pré-requisitos

- Backend rodando em `http://localhost:4000` (ou conforme variável de ambiente)
- MinIO configurado e acessível (envs `MINIO_*`)
- Prisma Client gerado e banco disponível

## Parâmetros (JSON)

- `companies` (number, default 1): quantidade de empresas
- `employeesPerCompany` (number, default 5): funcionários por empresa
- `createAdmins` (boolean, default true): cria usuário admin por empresa
- `reset` (boolean, default false): apaga todos os dados do banco antes de popular
- `wipeStorage` (boolean, default false): executa limpeza de mídia no MinIO
- `companyIdsToWipe` (string[UUID], opcional): remove mídia de todos os funcionários/arquivos desses `companyId`
- `employeeIdsToWipe` (string[UUID], opcional): remove mídia apenas dos funcionários informados (usa `companyId` do banco para montar o prefixo correto)

Observações:
- `wipeStorage` não apaga o banco, apenas mídias (arquivos) no MinIO; utilize em conjunto com `reset` se quiser limpar tudo.

## Exemplos de uso

### 1) Execução padrão (1 empresa, 5 funcionários, cria admin, sem reset)
```bash
curl -X POST http://localhost:4000/api/seed/faker \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 2) Popular mais dados com reset (2 empresas, 8 funcionários cada)
```bash
curl -X POST http://localhost:4000/api/seed/faker \
  -H "Content-Type: application/json" \
  -d '{
    "companies": 2,
    "employeesPerCompany": 8,
    "createAdmins": true,
    "reset": true
  }'
```

### 3) Limpar mídias sem tocar no banco (wipeStorage por company)
```bash
curl -X POST http://localhost:4000/api/seed/faker \
  -H "Content-Type: application/json" \
  -d '{
    "wipeStorage": true,
    "companyIdsToWipe": ["<UUID_COMPANY_1>", "<UUID_COMPANY_2>"]
  }'
```

### 4) Limpar mídias de funcionários específicos
```bash
curl -X POST http://localhost:4000/api/seed/faker \
  -H "Content-Type: application/json" \
  -d '{
    "wipeStorage": true,
    "employeeIdsToWipe": ["<UUID_EMP_1>", "<UUID_EMP_2>"]
  }'
```

## Onde os arquivos são salvos

- Perfil de funcionário (bucket `employees`):
  - Path: `{companyId}/{employeeId}/profile.jpg`
- Fotos de ponto (bucket `time-entries`):
  - Path: `{companyId}/{employeeId}/{YYYY-MM}/{timestamp}.jpg`

A limpeza por prefixo apaga todos os objetos iniciados por `{companyId}/` (por empresa) ou `{companyId}/{employeeId}/` (por funcionário).

## Como testar rapidamente

1. Abrir Prisma Studio: `http://localhost:5555` e acompanhar tabelas `companies`, `users`, `employees`.
2. Rodar um dos `curl` acima.
3. Verificar no Studio as linhas criadas e no MinIO os arquivos (logs do backend mostram upload e remoção).
4. Fazer login com um dos usuários criados (senha padrão: `senha123`).

## Como remover esta rota em produção

Esta rota é apenas para desenvolvimento/testes e NÃO deve ser publicada em produção.

Opções:
- Remover o módulo de seed do `AppModule` (comentando a importação do `SeedModule`).
- Remover/ comentar a rota `SeedController` antes de buildar a imagem.
- Alternativamente, condicionar a importação do `SeedModule` a uma variável de ambiente (ex.: `ENABLE_SEED_ROUTES=false`).

Sugestão simples (manual):
- Comentar/remover `SeedModule` no `AppModule` antes do build para produção.

## Campos e dados criados

- Company: `legalName`, `tradeName`, `cnpj` (fake), `email`, `active`
- User:
  - Admin (opcional): `COMPANY_ADMIN`, senha `senha123`
  - Employee: `EMPLOYEE`, senha `senha123`
- Employee: `name`, `cpf` (fake), `registrationId`, `hireDate`, `baseSalary`, `photoUrl` (após upload no MinIO)
- Positions padrão: `Analyst`, `Developer`, `Manager`, `HR`, `Finance Analyst`
- Departments padrão: `Operations`, `Technology`, `Human Resources`, `Finance`

## Notas

- As imagens são baixadas via `@faker-js/faker` (URLs públicas) e salvas no MinIO com `MinioService`.
- `wipeStorage` usa deleção por prefixo (rápido e seguro para desenvolvimento). Em produção, faça com cautela.
- Todas as chaves (IDs) são UUIDs.
