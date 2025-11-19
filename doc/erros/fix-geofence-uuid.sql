-- ===================================================================
-- FIX: Erro de UUID inválido na tabela Geofence
-- ===================================================================
-- Erro: "Inconsistent column data: Error creating UUID, invalid character: 
--        expected an optional prefix of `urn:uuid:` followed by [0-9a-fA-F-], 
--        found `m` at 3"
--
-- Causa: Existe registro com campo UUID contendo valor inválido
-- ===================================================================

-- PASSO 1: Identificar registros com ID inválido
-- (UUIDs válidos têm formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
SELECT id, name, "companyId", "createdAt"
FROM "Geofence"
WHERE id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- PASSO 2: Identificar registros com companyId inválido
-- (companyId também deve ser UUID)
SELECT id, name, "companyId", "createdAt"
FROM "Geofence"
WHERE "companyId" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- PASSO 3: Ver todos os registros para análise manual
SELECT id, name, "companyId", "createdAt"
FROM "Geofence"
ORDER BY "createdAt" DESC;

-- ===================================================================
-- CORREÇÃO (escolha UMA das opções abaixo)
-- ===================================================================

-- OPÇÃO 1: Deletar registros com ID inválido
-- ⚠️ CUIDADO: Isso remove permanentemente os dados!
-- DELETE FROM "Geofence"
-- WHERE id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- OPÇÃO 2: Deletar registros com companyId inválido
-- ⚠️ CUIDADO: Isso remove permanentemente os dados!
-- DELETE FROM "Geofence"
-- WHERE "companyId" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- OPÇÃO 3: Deletar TODOS os registros de geofence (reset completo)
-- ⚠️ CUIDADO: Isso remove TODAS as geofences!
-- TRUNCATE TABLE "Geofence" CASCADE;

-- ===================================================================
-- VERIFICAÇÃO APÓS CORREÇÃO
-- ===================================================================
-- Confirmar que não há mais UUIDs inválidos
SELECT COUNT(*) as total_registros FROM "Geofence";
SELECT COUNT(*) as ids_invalidos
FROM "Geofence"
WHERE id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- ===================================================================
-- COMO EXECUTAR
-- ===================================================================
-- 1. Via psql:
--    psql -U seu_usuario -d webponto < fix-geofence-uuid.sql
--
-- 2. Via Prisma Studio:
--    - Abra http://localhost:5555
--    - Navegue até a tabela Geofence
--    - Delete manualmente os registros problemáticos
--
-- 3. Via DBeaver/pgAdmin:
--    - Conecte no banco
--    - Execute os comandos SELECT primeiro (identificar)
--    - Execute os comandos DELETE depois (corrigir)
-- ===================================================================
