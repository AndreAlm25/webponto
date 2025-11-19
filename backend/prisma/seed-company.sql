-- Script para criar empresa de exemplo
-- Execute este script no PostgreSQL para criar a empresa ACME Tech

-- Insere empresa de exemplo
INSERT INTO companies (
  id,
  cnpj,
  legal_name,
  trade_name,
  email,
  active,
  plan,
  status,
  allow_remote_clock_in,
  require_geolocation,
  geofencing_enabled,
  require_facial_recognition,
  require_liveness,
  working_hours_start,
  working_hours_end,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '12345678000190',
  'ACME Tech Ltda',
  'ACME Tech',
  'contato@acme-tech.com.br',
  true,
  'TRIAL',
  'ACTIVE',
  true,
  true,
  true,
  false,
  false,
  '08:00',
  '18:00',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  legal_name = EXCLUDED.legal_name,
  trade_name = EXCLUDED.trade_name,
  email = EXCLUDED.email,
  updated_at = NOW();

-- Verifica se foi criado
SELECT id, cnpj, legal_name, trade_name, email 
FROM companies 
WHERE id = '00000000-0000-0000-0000-000000000001';
