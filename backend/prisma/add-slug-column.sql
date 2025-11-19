-- Script para adicionar coluna slug na tabela companies
-- Execute este script quando o PostgreSQL estiver disponível

-- 1. Adicionar coluna slug (opcional, sem constraint unique ainda)
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- 2. Gerar slug automático para empresas existentes
-- Converte tradeName para slug (lowercase, remove espaços e caracteres especiais)
UPDATE companies 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(trade_name, '[áàâãäåéèêëíìîïóòôõöúùûüçñ]', 
        CASE 
          WHEN trade_name ~ '[áàâãäå]' THEN 'a'
          WHEN trade_name ~ '[éèêë]' THEN 'e'
          WHEN trade_name ~ '[íìîï]' THEN 'i'
          WHEN trade_name ~ '[óòôõö]' THEN 'o'
          WHEN trade_name ~ '[úùûü]' THEN 'u'
          WHEN trade_name ~ '[ç]' THEN 'c'
          WHEN trade_name ~ '[ñ]' THEN 'n'
          ELSE ''
        END, 'gi'),
      '[^a-z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  )
)
WHERE slug IS NULL;

-- 3. Resolver duplicatas (adiciona sufixo numérico)
WITH duplicates AS (
  SELECT 
    id,
    slug,
    ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) as rn
  FROM companies
  WHERE slug IS NOT NULL
)
UPDATE companies c
SET slug = c.slug || '-' || d.rn
FROM duplicates d
WHERE c.id = d.id AND d.rn > 1;

-- 4. Adicionar constraint UNIQUE após resolver duplicatas
ALTER TABLE companies 
ADD CONSTRAINT companies_slug_unique UNIQUE (slug);

-- 5. Verificar resultado
SELECT id, slug, trade_name, cnpj 
FROM companies 
ORDER BY trade_name;

-- 6. (Opcional) Se quiser definir slugs manualmente:
-- UPDATE companies SET slug = 'acme-tech' WHERE cnpj = '12345678000190';
-- UPDATE companies SET slug = 'outra-empresa' WHERE cnpj = '98765432000100';
